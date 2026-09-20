export const MODEL_VERSION = '1.4';

export const VALUE_RULES = Object.freeze({
  minWatchlistProbability: 0.60,
  minCoreProbability: 0.65,
  minEdge: 0.04,
  minExpectedValue: 0.05,
  minHeat: 2,
  maxContradictions: 1,
  minIndependentModels: 2,
  minIndependentSupportRate: 0.67,
  maxWatchlistPicks: 12,
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
    return { available: false, error: 'Complete market odds are not available.' };
  }

  const entries = Array.isArray(marketOdds)
    ? marketOdds.map((odds, index) => [String(index), odds])
    : Object.entries(marketOdds);

  if (entries.length < 2) {
    return { available: false, error: 'At least two mutually exclusive market outcomes are required.' };
  }

  const parsedEntries = entries.map(([outcome, odds]) => [outcome, Number(odds)]);
  if (parsedEntries.some(([, odds]) => !Number.isFinite(odds) || odds <= 1)) {
    return { available: false, error: 'Every market outcome needs valid decimal odds above 1.00.' };
  }

  const requestedOutcomes = Array.isArray(pick.coveredOutcomes)
    ? pick.coveredOutcomes.map(String)
    : pick.selectionOutcome !== undefined
      ? [String(pick.selectionOutcome)]
      : pick.selectionIndex !== undefined
        ? [String(pick.selectionIndex)]
        : [];

  if (requestedOutcomes.length === 0) {
    return { available: false, error: 'The priced selection outcome is not identified.' };
  }

  const availableOutcomes = new Set(parsedEntries.map(([outcome]) => outcome));
  if (requestedOutcomes.some((outcome) => !availableOutcomes.has(outcome))) {
    return { available: false, error: 'A covered outcome is missing from market odds.' };
  }

  const overround = parsedEntries.reduce((total, [, odds]) => total + 1 / odds, 0);
  const noVigProbability = parsedEntries.reduce(
    (total, [outcome, odds]) =>
      requestedOutcomes.includes(outcome) ? total + (1 / odds) / overround : total,
    0
  );

  return { available: true, noVigProbability, overround };
}

function footballRankScore({ modelProbability, heat, contradictions }) {
  const probabilityScore = clamp(
    (modelProbability - VALUE_RULES.minWatchlistProbability) /
      (0.95 - VALUE_RULES.minWatchlistProbability)
  );
  const heatScore = heat === null ? 0.25 : clamp(heat / 8);
  const contradictionPenalty = Number.isFinite(contradictions)
    ? clamp(contradictions / 3)
    : 0.2;

  return Math.round(
    (probabilityScore * 0.75 + heatScore * 0.25 - contradictionPenalty * 0.15) * 1000
  ) / 10;
}

function normaliseSignal(value) {
  if (value === true || value === 'pass' || value === 'support') return true;
  if (value === false || value === 'fail' || value === 'oppose') return false;
  return null;
}

export function validateFootballEvidence(pick) {
  const evidence = pick?.footballEvidence;
  if (!evidence || typeof evidence !== 'object') {
    return {
      complete: false,
      readyForCore: false,
      majorDisagreement: false,
      supportRate: null,
      reasons: ['Structured football evidence is missing.'],
    };
  }

  const signals = {
    recentForm: normaliseSignal(evidence.recentForm),
    homeAway: normaliseSignal(evidence.homeAway),
    goalsOrXg: normaliseSignal(evidence.goalsOrXg),
    poissonDc: normaliseSignal(evidence.poissonDc),
  };

  const missingSignals = Object.entries(signals)
    .filter(([, value]) => value === null)
    .map(([name]) => name);

  const failedSignals = Object.entries(signals)
    .filter(([, value]) => value === false)
    .map(([name]) => name);

  const independent = evidence.independentModels || {};
  const checked = Number(independent.checked);
  const supporting = Number(independent.supporting);
  const opposing = Number(independent.opposing ?? 0);
  const validCounts =
    Number.isFinite(checked) &&
    Number.isFinite(supporting) &&
    Number.isFinite(opposing) &&
    checked >= 0 &&
    supporting >= 0 &&
    opposing >= 0 &&
    supporting + opposing <= checked;
  const supportRate = validCounts && checked > 0 ? supporting / checked : null;

  const independentReady =
    validCounts &&
    checked >= VALUE_RULES.minIndependentModels &&
    supportRate >= VALUE_RULES.minIndependentSupportRate;

  const majorDisagreement =
    evidence.majorDisagreement === true ||
    failedSignals.length > 0 ||
    (validCounts && opposing >= 2) ||
    (supportRate !== null && supportRate < 0.5);

  const reasons = [];
  if (missingSignals.length) reasons.push(`Missing football signals: ${missingSignals.join(', ')}.`);
  if (failedSignals.length) reasons.push(`Football signals oppose the selection: ${failedSignals.join(', ')}.`);
  if (!validCounts || checked < VALUE_RULES.minIndependentModels) {
    reasons.push(`At least ${VALUE_RULES.minIndependentModels} independent model checks are required.`);
  } else if (supportRate < VALUE_RULES.minIndependentSupportRate) {
    reasons.push('Independent-model support is below 67%.');
  }
  if (evidence.majorDisagreement === true) reasons.push('A major football-model disagreement is recorded.');

  const complete = missingSignals.length === 0 && validCounts;
  const readyForCore =
    complete &&
    failedSignals.length === 0 &&
    independentReady &&
    evidence.majorDisagreement !== true;

  return {
    complete,
    readyForCore,
    majorDisagreement,
    supportRate,
    signals,
    independent: validCounts ? { checked, supporting, opposing } : null,
    reasons,
  };
}

export function footballStrengthScore({ modelProbability, heat, contradictions, footballValidation }) {
  const probabilityPoints = clamp(modelProbability) * 70;
  const heatPoints = clamp((heat ?? 0) / 8) * 10;
  const agreementPoints = clamp(footballValidation?.supportRate ?? 0) * 15;
  const completenessPoints = footballValidation?.complete ? 5 : 0;
  const contradictionPenalty = Number.isFinite(contradictions) ? contradictions * 5 : 5;
  return Math.round(clamp(probabilityPoints + heatPoints + agreementPoints + completenessPoints - contradictionPenalty, 0, 100) * 10) / 10;
}

export function valueStrengthScore({ edge, expectedValue }) {
  const edgeScore = clamp(edge / 0.15) * 60;
  const evScore = clamp(expectedValue / 0.20) * 40;
  return Math.round(clamp(edgeScore + evScore, 0, 100) * 10) / 10;
}

export function overallCoreRating({ footballStrength, valueStrength }) {
  return Math.round((footballStrength * 0.7 + valueStrength * 0.3) * 10) / 10;
}

export function valueRankScore({ modelProbability, edge, expectedValue, heat }) {
  const probabilityScore = clamp(
    (modelProbability - VALUE_RULES.minCoreProbability) /
      (0.95 - VALUE_RULES.minCoreProbability)
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

export function ratingBand(score) {
  if (score >= 85) return 'ELITE';
  if (score >= 75) return 'STRONG';
  if (score >= 68) return 'SOLID';
  return 'QUALIFIED';
}

export function evaluatePick(pick) {
  const reasons = [];
  const footballNotes = [];
  const priceNotes = [];
  const modelProbability = parseProbability(pick?.probability);
  const odds = Number(pick?.odds);
  const heat = parseHeat(pick?.heat);
  const contradictions = Number(pick?.contradictions);
  const market = normaliseMarket(pick);
  const footballValidation = validateFootballEvidence(pick);

  if (modelProbability === null) {
    return {
      grade: 'skip',
      qualifies: false,
      reasons: ['A valid football-model probability is required.'],
      priceStatus: 'not-assessed',
    };
  }

  if (modelProbability < VALUE_RULES.minWatchlistProbability) {
    reasons.push('Football-model probability is below 60%.');
  }
  if (Number.isFinite(contradictions) && contradictions > VALUE_RULES.maxContradictions) {
    reasons.push('More than one football contradiction is present.');
  }
  if (pick?.floorsPassed === false) {
    reasons.push('One or more football selection floors failed.');
  }

  if (reasons.length > 0) {
    return {
      grade: 'skip',
      qualifies: false,
      reasons,
      priceStatus: 'not-assessed',
      footballScore: footballRankScore({ modelProbability, heat, contradictions }),
    };
  }

  const coreFootballReady =
    modelProbability >= VALUE_RULES.minCoreProbability &&
    heat !== null &&
    heat >= VALUE_RULES.minHeat &&
    Number.isFinite(contradictions) &&
    contradictions <= VALUE_RULES.maxContradictions &&
    footballValidation.readyForCore &&
    pick?.floorsPassed === true;

  if (modelProbability < VALUE_RULES.minCoreProbability) {
    footballNotes.push('Football probability is strong enough for Watchlist but below the 65% Core floor.');
  }
  if (heat === null) footballNotes.push('Heat confirmation is pending.');
  else if (heat < VALUE_RULES.minHeat) footballNotes.push('Heat is below the Core floor of 2.');
  if (!Number.isFinite(contradictions)) footballNotes.push('Contradiction count is pending.');
  if (!footballValidation.readyForCore) footballNotes.push(...footballValidation.reasons);
  if (pick?.floorsPassed !== true) footballNotes.push('Full floor confirmation is pending.');

  const footballScore = footballRankScore({ modelProbability, heat, contradictions });
  const hasSelectionOdds = Number.isFinite(odds) && odds > 1;

  if (!hasSelectionOdds || !market.available) {
    if (!hasSelectionOdds) priceNotes.push('Selection price is pending.');
    if (!market.available) priceNotes.push(market.error);

    return {
      grade: 'watchlist',
      qualifies: false,
      reasons: [...footballNotes, ...priceNotes],
      priceStatus: 'pending',
      footballScore,
      football: { modelProbability, heat, contradictions, validation: footballValidation },
    };
  }

  const rawImpliedProbability = 1 / odds;
  const fairOdds = 1 / modelProbability;
  const edge = modelProbability - market.noVigProbability;
  const expectedValue = modelProbability * odds - 1;

  if (edge < VALUE_RULES.minEdge) priceNotes.push('No-vig edge is below 4 percentage points.');
  if (expectedValue < VALUE_RULES.minExpectedValue) priceNotes.push('Expected value is below 5%.');

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

  const corePriceReady = edge >= VALUE_RULES.minEdge && expectedValue >= VALUE_RULES.minExpectedValue;

  if (coreFootballReady && corePriceReady) {
    return {
      grade: 'core',
      qualifies: true,
      reasons: [],
      priceStatus: 'verified-value',
      footballScore,
      value: (() => {
        const rankScore = valueRankScore(value);
        const footballStrength = footballStrengthScore({ modelProbability, heat, contradictions, footballValidation });
        const valueStrength = valueStrengthScore(value);
        const rating = overallCoreRating({ footballStrength, valueStrength });
        return {
          ...value,
          rankScore,
          footballStrength,
          valueStrength,
          rating,
          ratingBand: ratingBand(rating),
        };
      })(),
    };
  }

  return {
    grade: 'watchlist',
    qualifies: false,
    reasons: [...footballNotes, ...priceNotes],
    priceStatus: corePriceReady ? 'verified-football-pending' : 'verified-no-core-value',
    footballScore,
    value: (() => {
      const rankScore = valueRankScore(value);
      const footballStrength = footballStrengthScore({ modelProbability, heat, contradictions, footballValidation });
      const valueStrength = valueStrengthScore(value);
      const rating = overallCoreRating({ footballStrength, valueStrength });
      return {
        ...value,
        rankScore,
        footballStrength,
        valueStrength,
        rating,
        ratingBand: ratingBand(rating),
      };
    })(),
  };
}

export function selectCorePicks(picks) {
  const evaluated = (Array.isArray(picks) ? picks : []).map((pick) => ({
    pick,
    assessment: evaluatePick(pick),
  }));

  const core = evaluated
    .filter(({ assessment }) => assessment.grade === 'core')
    .map(({ pick, assessment }) => ({ ...pick, value: assessment.value, assessment }))
    .sort((a, b) => b.value.rankScore - a.value.rankScore);

  const watchlist = evaluated
    .filter(({ assessment }) => assessment.grade === 'watchlist')
    .map(({ pick, assessment }) => ({
      ...pick,
      value: assessment.value,
      assessment,
      footballScore: assessment.footballScore,
    }))
    .sort((a, b) => b.footballScore - a.footballScore)
    .slice(0, VALUE_RULES.maxWatchlistPicks);

  const skip = evaluated
    .filter(({ assessment }) => assessment.grade === 'skip')
    .map(({ pick, assessment }) => ({ ...pick, assessment, valueReasons: assessment.reasons }));

  const belowCut = [];

  return {
    core,
    watchlist,
    skip,
    rejected: skip,
    belowCut,
    evaluatedCount: evaluated.length,
  };
}

export function formatPercent(value, digits = 1) {
  return `${(value * 100).toFixed(digits)}%`;
}
