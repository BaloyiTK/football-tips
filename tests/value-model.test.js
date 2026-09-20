import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluatePick, selectCorePicks, MODEL_VERSION } from '../lib/value-model.js';

test('uses reset model v1.0', () => {
  assert.equal(MODEL_VERSION, '1.0');
});

test('does not reject non-1X markets', () => {
  const result = evaluatePick({ fixture:'A vs B', market:'Over 2.5', probability:'62%', odds:1.90 });
  assert.equal(result.grade, 'ranked');
  assert.equal(result.qualifies, true);
});

test('does not reject low probability automatically', () => {
  const result = evaluatePick({ fixture:'A vs B', market:'Home Win', probability:'48%', odds:2.30 });
  assert.equal(result.grade, 'ranked');
  assert.equal(result.qualifies, true);
});

test('ranks all supplied selections', () => {
  const result = selectCorePicks([
    { fixture:'A vs B', probability:'70%', odds:1.60 },
    { fixture:'C vs D', probability:'55%', odds:2.00 }
  ]);
  assert.equal(result.core.length, 2);
  assert.equal(result.watchlist.length, 0);
  assert.equal(result.skip.length, 0);
});
