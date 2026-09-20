import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluatePick, selectCorePicks, MODEL_VERSION, ratingBand, validateFootballEvidence, isOneXPick } from '../lib/value-model.js';

const validPick = {
  fixture: 'Home vs Away',
  probability: '72%',
  odds: 1.55,
  market: 'Home or Draw (1X)',
  marketOdds: { '1': 3.0, 'X': 3.6, '2': 2.1 },
  coveredOutcomes: ['1', 'X'],
  heat: '5/8',
  contradictions: 0,
  modelAgreement: true,
  floorsPassed: true,
  footballEvidence: {
    recentForm: 'pass',
    homeAway: 'pass',
    goalsOrXg: 'pass',
    poissonDc: 'pass',
    h2h: 'neutral',
    opponentStrength: 'pass',
    motivation: 'neutral',
    teamNews: 'neutral',
    scheduleFatigue: 'neutral',
    awayScoringThreat: 'pass',
    awayScoreProbability: 0.30,
    independentModels: { checked: 3, supporting: 3, opposing: 0 },
    majorDisagreement: false,
  },
};

test('uses model v1.8', () => assert.equal(MODEL_VERSION, '1.8'));

test('qualifies a fully verified value pick as Core', () => {
  const result = evaluatePick(validPick);
  assert.equal(result.grade, 'core');
  assert.equal(result.qualifies, true);
  assert.ok(result.value.edge > 0.1);
});

test('keeps a football-strong pick on Watchlist when price data is missing', () => {
  const result = evaluatePick({ ...validPick, odds: undefined, marketOdds: undefined });
  assert.equal(result.grade, 'watchlist');
  assert.equal(result.priceStatus, 'pending');
});

test('keeps a strong pick on Watchlist when price is too short', () => {
  const result = evaluatePick({
    ...validPick,
    odds: 1.3,
    marketOdds: { '1': 1.75, 'X': 3.8, '2': 5.0 },
    coveredOutcomes: ['1', 'X'],
  });
  assert.equal(result.grade, 'watchlist');
  assert.equal(result.priceStatus, 'verified-no-core-value');
});

test('skips weak football evidence even if a price exists', () => {
  const result = evaluatePick({ ...validPick, probability: '56%' });
  assert.equal(result.grade, 'skip');
});

test('keeps 60-64% football picks on Watchlist', () => {
  const result = evaluatePick({ ...validPick, probability: '63%' });
  assert.equal(result.grade, 'watchlist');
});

test('requires explicit structured football confirmation for Core', () => {
  const result = evaluatePick({ ...validPick, footballEvidence: undefined });
  assert.equal(result.grade, 'watchlist');
  assert.match(result.reasons.join(' '), /Structured football evidence/);
});

test('keeps a priced pick on Watchlist when a major football signal disagrees', () => {
  const result = evaluatePick({
    ...validPick,
    footballEvidence: {
      ...validPick.footballEvidence,
      recentForm: 'fail',
      independentModels: { checked: 5, supporting: 3, opposing: 2 },
      majorDisagreement: true,
    },
  });
  assert.equal(result.grade, 'watchlist');
  assert.equal(result.qualifies, false);
});

test('requires at least two independent models and 67% support for Core', () => {
  const result = evaluatePick({
    ...validPick,
    footballEvidence: {
      ...validPick.footballEvidence,
      independentModels: { checked: 2, supporting: 1, opposing: 1 },
    },
  });
  assert.equal(result.grade, 'watchlist');
});

test('validates complete supporting football evidence', () => {
  const validation = validateFootballEvidence(validPick);
  assert.equal(validation.readyForCore, true);
  assert.equal(validation.supportRate, 1);
});

test('ranks every qualifying Core without truncating the board', () => {
  const picks = Array.from({ length: 8 }, (_, index) => ({
    ...validPick,
    fixture: `Fixture ${index + 1}`,
    probability: `${72 + index}%`,
  }));
  const result = selectCorePicks(picks);
  assert.equal(result.core.length, 8);
  assert.equal(result.core[0].fixture, 'Fixture 8');
  assert.ok(Number.isFinite(result.core[0].value.rating));
  assert.ok(['ELITE', 'STRONG', 'SOLID', 'QUALIFIED'].includes(result.core[0].value.ratingBand));
  assert.ok(Number.isFinite(result.core[0].value.footballStrength));
  assert.ok(Number.isFinite(result.core[0].value.valueStrength));
});

test('maps numeric ratings into descriptive Core bands', () => {
  assert.equal(ratingBand(90), 'ELITE');
  assert.equal(ratingBand(80), 'STRONG');
  assert.equal(ratingBand(70), 'SOLID');
  assert.equal(ratingBand(60), 'QUALIFIED');
});


test('accepts only home-or-draw 1X selections', () => {
  assert.equal(isOneXPick(validPick), true);
  assert.equal(evaluatePick({ ...validPick, market: 'Away or Draw (X2)', coveredOutcomes: ['X','2'] }).grade, 'skip');
  assert.equal(evaluatePick({ ...validPick, market: 'Over 1.5', coveredOutcomes: undefined }).grade, 'skip');
  assert.equal(evaluatePick({ ...validPick, market: 'Home Win', coveredOutcomes: ['1'] }).grade, 'skip');
});


test('requires H2H and opponent-strength evidence for Core', () => {
  const result = evaluatePick({
    ...validPick,
    footballEvidence: {
      ...validPick.footballEvidence,
      h2h: undefined,
      opponentStrength: undefined,
    },
  });
  assert.equal(result.grade, 'watchlist');
  assert.match(result.reasons.join(' '), /h2h|opponentStrength/i);
});

test('blocks 1X when H2H directly opposes the home side', () => {
  const result = evaluatePick({
    ...validPick,
    footballEvidence: { ...validPick.footballEvidence, h2h: 'oppose' },
  });
  assert.equal(result.grade, 'watchlist');
});

test('blocks 1X when the away side is an overwhelming no-vig market favourite', () => {
  const result = evaluatePick({
    ...validPick,
    odds: 2.1,
    marketOdds: { '1': 8.0, 'X': 5.0, '2': 1.25 },
    coveredOutcomes: ['1', 'X'],
  });
  assert.equal(result.grade, 'skip');
  assert.match(result.reasons.join(' '), /overwhelming market favourite/i);
});


test('requires motivation, team news and schedule evidence for Core', () => {
  const result = evaluatePick({
    ...validPick,
    footballEvidence: {
      ...validPick.footballEvidence,
      motivation: undefined,
      teamNews: undefined,
      scheduleFatigue: undefined,
    },
  });
  assert.equal(result.grade, 'watchlist');
  assert.match(result.reasons.join(' '), /motivation|teamNews|scheduleFatigue/i);
});

test('blocks Core when team news materially opposes the 1X case', () => {
  const result = evaluatePick({
    ...validPick,
    footballEvidence: { ...validPick.footballEvidence, teamNews: 'oppose' },
  });
  assert.equal(result.grade, 'watchlist');
});


test('blocks Core when away scoring probability is above 35%', () => {
  const result = evaluatePick({
    ...validPick,
    footballEvidence: {
      ...validPick.footballEvidence,
      awayScoringThreat: 'fail',
      awayScoreProbability: 0.42,
    },
  });
  assert.notEqual(result.grade, 'core');
  assert.match(result.reasons.join(' '), /Away scoring probability is too high|awayScoringThreat/i);
});

test('requires away scoring threat evidence for Core', () => {
  const result = evaluatePick({
    ...validPick,
    footballEvidence: {
      ...validPick.footballEvidence,
      awayScoringThreat: undefined,
      awayScoreProbability: undefined,
    },
  });
  assert.equal(result.grade, 'watchlist');
});
