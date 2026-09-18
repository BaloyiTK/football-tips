import test from 'node:test';
import assert from 'node:assert/strict';

import { evaluatePick, selectCorePicks } from '../lib/value-model.js';

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

test('qualifies a pick with sufficient probability, no-vig edge and EV', () => {
  const result = evaluatePick(validPick);

  assert.equal(result.qualifies, true);
  assert.ok(result.value.edge > 0.1);
  assert.ok(result.value.expectedValue > 0.11);
  assert.equal(result.value.fairOdds.toFixed(2), '1.39');
});

test('rejects a likely selection when the bookmaker price is too short', () => {
  const result = evaluatePick({
    ...validPick,
    odds: 1.3,
    marketOdds: { selection: 1.3, opposite: 3.8 },
  });

  assert.equal(result.qualifies, false);
  assert.ok(result.reasons.some((reason) => reason.includes('Expected value')));
});

test('rejects picks without a complete market snapshot', () => {
  const result = evaluatePick({
    ...validPick,
    marketOdds: undefined,
  });

  assert.equal(result.qualifies, false);
  assert.ok(result.reasons.some((reason) => reason.includes('Complete market odds')));
});

test('calculates double-chance market probability from no-vig 1X2 odds', () => {
  const result = evaluatePick({
    ...validPick,
    probability: '86%',
    odds: 1.23,
    marketOdds: { home: 1.8, draw: 3.8, away: 5 },
    coveredOutcomes: ['home', 'draw'],
    selectionOutcome: undefined,
  });

  assert.equal(result.qualifies, true);
  assert.ok(result.value.noVigMarketProbability > 0.8);
  assert.ok(result.value.expectedValue > 0.05);
});

test('requires football-model agreement and floors', () => {
  const result = evaluatePick({
    ...validPick,
    modelAgreement: false,
    floorsPassed: false,
  });

  assert.equal(result.qualifies, false);
  assert.ok(result.reasons.some((reason) => reason.includes('must agree')));
  assert.ok(result.reasons.some((reason) => reason.includes('floors')));
});

test('ranks qualified picks and publishes no more than six', () => {
  const picks = Array.from({ length: 8 }, (_, index) => ({
    ...validPick,
    fixture: `Fixture ${index + 1}`,
    probability: `${72 + index}%`,
  }));

  const result = selectCorePicks(picks);

  assert.equal(result.core.length, 6);
  assert.equal(result.core[0].fixture, 'Fixture 8');
});

