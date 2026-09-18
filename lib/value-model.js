export const MODEL_VERSION = '1.2';

export const VALUE_RULES = Object.freeze({
  minModelProbability: 0.65,
  minEdge: 0.04,
  minExpectedValue: 0.05,
  minHeat: 2,
  maxContradictions: 1,
  maxCorePicks: 6,
});

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

export function parseProbability(value) {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    const cleaned = trimmed.replace('%', '');
    const parsed = Number(cleaned);
    if (!Number.isFinite(parsed)) return null;
    const normalised = trimmed.endsWith('%') || parsed > 1 ? parsed / 100 : parsed;
    return normalised >= 0 && normalised <= 1 ? normalised : null;
  }

  if (!Number.isFinite(value)) return null;
  if (value > 1 && value <= 100) return value / 100;
  return value >= 0 && value <= 1 ? value : null;
}

export function parseHeat(value) {
  if (Number.isFinite(value)) return value;
  if (typeof value !== 'string') return null;

  const parsed = Number(value.split('/')[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

function normaliseMarket(pick) {
  const marketOdds = pick?.marketOdds;
  if (!marketOdds || typeof marketOdds !== 'object') {
    return { error: 'Complete market odds are required for a no-vig price.' };
  }

  const entries = Array.isArray(marketOdds)
    ? marketOdds.map((odds, index) => [String(index), odds])
    : Object.entries(marketOdds);

  if (entries.length < 2) {
    return { error: 'At least two mutually exclusive market outcomes are required.' };
  }

  const parsedEntries = entries.map(([outcome, odds]) => [outcome, Number(odds)]);
  if (parsedEntries.some(([, odds]) => !Number.isFinite(odds) || odds <= 1)) {
    return { error: 'Every market outcome must have valid decimal odds above 1.00.' };
  }

  const requestedOutcomes = Array.isArray(pick.coveredOutcomes)
    ? pick.coveredOutcomes.map(String)
    : pick.selectionOutcome !== undefined
      ? [String(pick.selectionOutcome)]
      : pick.selectionIndex !== undefined
        ? [String(pick.selectionIndex)]
        : [];

  if (requestedOutcomes.length === 0) {
    return { error: 'coveredOutcomes or selectionOutcome is required.' };
  }

  const availableOutcomes = new Set(parsedEntries.map(([outcome]) => outcome));
  if (requestedOutcomes.some((outcome) => !availableOutcomes.has(outcome))) {
    return { error: 'A covered outcome is missing from marketOdds.' };
  }

  const overround = parsedEntries.reduce((total, [, odds]) => total + 1 / odds, 0);
  const noVigProbability = parsedEntries.reduce(
    (total, [outcome, odds]) =>
      requestedOutcomes.includes(outcome) ? total + (1 / odds) / overround : total,
    0
  );

  return { noVigProbability, overround };
}

function rankScore({ modelProbability, edge, expectedValue, heat }) {
  const probabilityScore = clamp(
    (modelProbability - VALUE_RULES.minModelProbability) /
      (0.95 - VALUE_RULES.minModelProbability)
  );
  const edgeScore = clamp((edge - VALUE_RULES.minEdge) / (0.15 - VALUE_RULES.minEdge));
  const evScore = clamp(
    (expectedValue - VALUE_RULES.minExpectedValue) /
      (0.25 - VALUE_RULES.minExpectedValue)
  );
  const heatScore = clamp(heat / 8);

  return Math.round(
    (probabilityScore * 0.45 +
      edgeScore * 0.3 +
      evScore * 0.15 +
      heatScore * 0.1) *
      1000
  ) / 10;
}

export function evaluatePick(pick) {
  const reasons = [];
  const modelProbability = parseProbability(pick?.probability);
  const odds = Number(pick?.odds);
  const heat = parseHeat(pick?.heat);
  const contradictions = Number(pick?.contradictions);
  const market = normaliseMarket(pick);

  if (modelProbability === null) reasons.push('A valid model probability is required.');
  if (!Number.isFinite(odds) || odds <= 1) reasons.push('Valid decimal selection odds are required.');
  if (market.error) reasons.push(market.error);
  if (heat === null) reasons.push('A Heat count is required.');
  if (!Number.isFinite(contradictions)) reasons.push('A contradiction count is required.');
  if (pick?.modelAgreement !== true) reasons.push('Form/xG and the goal model must agree.');
  if (pick?.floorsPassed !== true) reasons.push('All selection floors must pass.');

  if (reasons.length > 0) {
    return { qualifies: false, reasons };
  }

  const rawImpliedProbability = 1 / odds;
  const fairOdds = 1 / modelProbability;
  const edge = modelProbability - market.noVigProbability;
  const expectedValue = modelProbability * odds - 1;

  if (modelProbability < VALUE_RULES.minModelProbability) {
    reasons.push('Model probability is below 65%.');
  }
  if (edge < VALUE_RULES.minEdge) reasons.push('No-vig edge is below 4 percentage points.');
  if (expectedValue < VALUE_RULES.minExpectedValue) reasons.push('Expected value is below 5%.');
  if (heat < VALUE_RULES.minHeat) reasons.push('Heat is below 2.');
  if (contradictions > VALUE_RULES.maxContradictions) {
    reasons.push('More than one contradiction is present.');
  }

  const value = {
    odds,
    modelProbability,
    fairOdds,
    rawImpliedProbability,
    noVigMarketProbability: market.noVigProbability,
    edge,
    expectedValue,
    bookmakerMargin: market.overround - 1,
    heat,
  };

  return {
    qualifies: reasons.length === 0,
    reasons,
    value: {
      ...value,
      rankScore: rankScore(value),
    },
  };
}

export function selectCorePicks(picks) {
  const evaluated = (Array.isArray(picks) ? picks : []).map((pick) => ({
    pick,
    assessment: evaluatePick(pick),
  }));

  const qualified = evaluated
    .filter(({ assessment }) => assessment.qualifies)
    .map(({ pick, assessment }) => ({ ...pick, value: assessment.value }))
    .sort((a, b) => b.value.rankScore - a.value.rankScore);

  const core = qualified.slice(0, VALUE_RULES.maxCorePicks);

  const rejected = evaluated
    .filter(({ assessment }) => !assessment.qualifies)
    .map(({ pick, assessment }) => ({ ...pick, valueReasons: assessment.reasons }));

  const belowCut = qualified.slice(VALUE_RULES.maxCorePicks);

  return { core, rejected, belowCut };
}

export function formatPercent(value, digits = 1) {
  return `${(value * 100).toFixed(digits)}%`;
}
