import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluatePick, selectCorePicks, MODEL_VERSION } from './value-model.js';

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
};

test('uses model v1.3', () => assert.equal(MODEL_VERSION, '1.3'));

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

test('requires explicit full football confirmation for Core, not Watchlist', () => {
  const result = evaluatePick({ ...validPick, modelAgreement: undefined, floorsPassed: undefined });
  assert.equal(result.grade, 'watchlist');
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
  assert.ok(['A+', 'A', 'B+', 'B', 'C'].includes(result.core[0].value.ratingBand));
});

test('maps numeric ratings into bands', () => {
  assert.equal(ratingBand(90), 'A+');
  assert.equal(ratingBand(80), 'A');
  assert.equal(ratingBand(70), 'B+');
  assert.equal(ratingBand(60), 'B');
  assert.equal(ratingBand(40), 'C');
});
