export const MODEL_VERSION = '1.0';

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

  let expectedValue = null;
  if (probability !== null && Number.isFinite(odds) && odds > 1) {
    expectedValue = probability * odds - 1;
  }

  const probabilityPoints = probability === null ? 0 : probability * 70;
  const heatPoints = heat === null ? 0 : Math.min(Math.max(heat, 0), 8) / 8 * 15;
  const evidencePoints = Math.max(-15, Math.min(15, eScore * 3));
  const valuePoints = expectedValue === null ? 0 : Math.max(-15, Math.min(15, expectedValue * 100));
  const score = Math.max(0, Math.min(100, probabilityPoints + heatPoints + evidencePoints + valuePoints));

  return {
    grade: 'ranked',
    qualifies: true,
    score: Math.round(score * 10) / 10,
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
