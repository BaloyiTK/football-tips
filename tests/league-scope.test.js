import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const scope = JSON.parse(
  readFileSync(new URL('../config/league-scope.json', import.meta.url), 'utf8')
);

test('daily fixture scope contains every supplied association exactly once', () => {
  assert.equal(scope.associationCount, 200);
  assert.equal(scope.associations.length, scope.associationCount);
  assert.equal(new Set(scope.associations).size, scope.associationCount);
});

test('daily fixture scope is not limited to famous or top-ranked leagues', () => {
  assert.equal(scope.scanPolicy.associationMode, 'all-listed');
  assert.equal(scope.scanPolicy.topAssociationLimit, null);

  for (const association of [
    'South Africa',
    'Kazakhstan',
    'Eswatini',
    'Namibia',
    'United States Virgin Islands',
  ]) {
    assert.ok(scope.associations.includes(association));
  }
});

test('broad discovery keeps the value gate unchanged', () => {
  assert.equal(scope.scanPolicy.selectionGate, 'value-model-v1.2');
  assert.deepEqual(scope.scanPolicy.competitionTypes, ['domestic-league']);
});
