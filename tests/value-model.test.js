import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluatePick, selectCorePicks, MODEL_VERSION, ratingBand, validateFootballEvidence } from '../lib/value-model.js';

const validPick = {
  fixture: 'Home vs Away',
  probability: '72%',
  odds: 1.55,
  marketOdds: { selection: 1.55, opposite: 2.5 },
  selectionOutcome: 'selection',
  heat: '5/8',
  contradictions: 0,
  modelAgreement: true,
  floorsPassed: true,
  footballEvidence: {
    recentForm: 'pass',
    homeAway: 'pass',
    goalsOrXg: 'pass',
    poissonDc: 'pass',
    independentModels: { checked: 3, supporting: 3, opposing: 0 },
    majorDisagreement: false,
  },
};

test('uses model v1.4', () => assert.equal(MODEL_VERSION, '1.4'));

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
  const result = evaluatePick({ ...validPick, odds: 1.3, marketOdds: { selection: 1.3, opposite: 3.8 } });
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
