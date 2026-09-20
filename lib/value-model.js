export const MODEL_VERSION = '1.0';

export const MATCH_TEAM_FORM = Object.freeze({
  resultValues: Object.freeze({ W: 1, D: 1 / 3, L: 0 }),
  recencyWeights: Object.freeze([0.30, 0.25, 0.20, 0.15, 0.10]),
  overallWeight: 0.40,
  venueWeight: 0.60,
});

export function parseProbability(value) {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    const parsed = Number(trimmed.replace('%', ''));
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

function normaliseResult(result) {
  const value = String(result || '').trim().toUpperCase();
  return Object.prototype.hasOwnProperty.call(MATCH_TEAM_FORM.resultValues, value) ? value : null;
}

export function calculateWeightedFive(results) {
  if (!Array.isArray(results) || results.length !== 5) return null;
  const normalised = results.map(normaliseResult);
  if (normalised.some((result) => result === null)) return null;

  const score = normalised.reduce((total, result, index) => {
    return total + MATCH_TEAM_FORM.resultValues[result] * MATCH_TEAM_FORM.recencyWeights[index];
  }, 0);

  return Math.round(score * 1000) / 10;
}

export function calculateWeightedMetric(values) {
  if (!Array.isArray(values) || values.length !== 5) return null;
  const parsed = values.map(Number);
  if (parsed.some((value) => !Number.isFinite(value))) return null;

  const weighted = parsed.reduce(
    (total, value, index) => total + value * MATCH_TEAM_FORM.recencyWeights[index],
    0
  );
  return Math.round(weighted * 100) / 100;
}

export function calculateRecentTrend(results) {
  if (!Array.isArray(results) || results.length !== 5) return null;
  const normalised = results.map(normaliseResult);
  if (normalised.some((result) => result === null)) return null;

  const values = normalised.map((result) => MATCH_TEAM_FORM.resultValues[result] * 100);
  const recentTwo = (values[0] + values[1]) / 2;
  const olderThree = (values[2] + values[3] + values[4]) / 3;
  return Math.round((recentTwo - olderThree) * 10) / 10;
}

export function calculateMatchTeamForm({
  overallResults,
  venueResults,
  goalsScored,
  goalsConceded,
  xG,
  xGA,
  opponentStrength,
} = {}) {
  const overall = calculateWeightedFive(overallResults);
  const venue = calculateWeightedFive(venueResults);
  if (overall === null || venue === null) return null;

  const score =
    overall * MATCH_TEAM_FORM.overallWeight +
    venue * MATCH_TEAM_FORM.venueWeight;

  return {
    overall,
    venue,
    score: Math.round(score * 10) / 10,
    goalsScored: calculateWeightedMetric(goalsScored),
    goalsConceded: calculateWeightedMetric(goalsConceded),
    xG: calculateWeightedMetric(xG),
    xGA: calculateWeightedMetric(xGA),
    opponentStrength: calculateWeightedMetric(opponentStrength),
    recentTrend: calculateRecentTrend(overallResults),
    overallWeight: MATCH_TEAM_FORM.overallWeight,
    venueWeight: MATCH_TEAM_FORM.venueWeight,
    recencyWeights: [...MATCH_TEAM_FORM.recencyWeights],
  };
}

export function calculateH2H(results) {
  if (!Array.isArray(results) || results.length !== 5) return null;
  const score = calculateWeightedFive(results);
  if (score === null) return null;
  const normalised = results.map(normaliseResult);
  return {
    score,
    wins: normalised.filter((result) => result === 'W').length,
    draws: normalised.filter((result) => result === 'D').length,
    losses: normalised.filter((result) => result === 'L').length,
    results: normalised,
    recencyWeights: [...MATCH_TEAM_FORM.recencyWeights],
  };
}

export function calculateMatchTeamFormGap(homeForm, awayForm) {
  if (!homeForm || !awayForm) return null;
  return Math.round((homeForm.score - awayForm.score) * 10) / 10;
}

function evidenceScore(pick) {
  const evidence = pick?.footballEvidence || {};
  const values = Object.values(evidence).filter((v) => typeof v === 'string');
  const support = values.filter((v) => ['pass','support','positive'].includes(v)).length;
  const oppose = values.filter((v) => ['fail','oppose','negative'].includes(v)).length;
  return support - oppose;
}

export function evaluatePick(pick) {
  const probability = parseProbability(pick?.probability);
  const heat = parseHeat(pick?.heat);
  const odds = Number(pick?.odds);
  const eScore = evidenceScore(pick);
  const matchTeamForm = calculateMatchTeamForm(pick?.matchTeamForm);
  const h2h = calculateH2H(pick?.h2hResults);

  let expectedValue = null;
  if (probability !== null && Number.isFinite(odds) && odds > 1) {
    expectedValue = probability * odds - 1;
  }

  const probabilityPoints = probability === null ? 0 : probability * 70;
  const heatPoints = heat === null ? 0 : Math.min(Math.max(heat, 0), 8) / 8 * 15;
  const evidencePoints = Math.max(-15, Math.min(15, eScore * 3));
  const valuePoints = expectedValue === null ? 0 : Math.max(-15, Math.min(15, expectedValue * 100));
  const fallbackScore = Math.max(0, Math.min(100, probabilityPoints + heatPoints + evidencePoints + valuePoints));

  return {
    grade: 'ranked',
    qualifies: true,
    score: matchTeamForm?.score ?? Math.round(fallbackScore * 10) / 10,
    matchTeamForm,
    h2h,
    probability,
    heat,
    expectedValue,
    reasons: [],
  };
}

export function selectCorePicks(picks) {
  const ranked = (Array.isArray(picks) ? picks : [])
    .map((pick) => ({ ...pick, assessment: evaluatePick(pick) }))
    .sort((a, b) => b.assessment.score - a.assessment.score);

  return {
    core: ranked,
    watchlist: [],
    skip: [],
    rejected: [],
    belowCut: [],
    evaluatedCount: ranked.length,
  };
}

export function formatPercent(value, digits = 1) {
  return Number.isFinite(value) ? `${(value * 100).toFixed(digits)}%` : '—';
}
