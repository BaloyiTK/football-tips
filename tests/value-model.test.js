import test from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluatePick,
  selectCorePicks,
  MODEL_VERSION,
  calculateWeightedFive,
  calculateMatchTeamForm,
  calculateMatchTeamFormGap,
  calculateWeightedMetric,
  calculateRecentTrend,
} from '../lib/value-model.js';

test('uses reset model v1.0', () => {
  assert.equal(MODEL_VERSION, '1.0');
});

test('WWWWW scores 100 percent', () => {
  assert.equal(calculateWeightedFive(['W','W','W','W','W']), 100);
});

test('recency weighting distinguishes identical WDL counts', () => {
  assert.equal(calculateWeightedFive(['W','W','D','L','L']), 61.7);
  assert.equal(calculateWeightedFive(['L','L','D','W','W']), 31.7);
});

test('calculates Manchester City test Match Team Form at 91 percent', () => {
  const form = calculateMatchTeamForm({
    overallResults: ['W','W','W','W','W'],
    venueResults: ['W','W','W','L','W'],
  });
  assert.equal(form.overall, 100);
  assert.equal(form.venue, 85);
  assert.equal(form.score, 91);
});

test('calculates Sunderland test Match Team Form at 47 percent', () => {
  const form = calculateMatchTeamForm({
    overallResults: ['W','L','W','D','W'],
    venueResults: ['D','L','W','D','L'],
  });
  assert.equal(form.overall, 65);
  assert.equal(form.venue, 35);
  assert.equal(form.score, 47);
});

test('calculates Manchester City form gap over Sunderland at 44 points', () => {
  const home = calculateMatchTeamForm({
    overallResults: ['W','W','W','W','W'],
    venueResults: ['W','W','W','L','W'],
  });
  const away = calculateMatchTeamForm({
    overallResults: ['W','L','W','D','W'],
    venueResults: ['D','L','W','D','L'],
  });
  assert.equal(calculateMatchTeamFormGap(home, away), 44);
});

test('requires exactly five valid results for the pillar', () => {
  assert.equal(calculateWeightedFive(['W','W','W']), null);
  assert.equal(calculateWeightedFive(['W','W','W','W','X']), null);
});

test('does not reject non-1X markets', () => {
  const result = evaluatePick({ fixture:'A vs B', market:'Over 2.5', probability:'62%', odds:1.90 });
  assert.equal(result.grade, 'ranked');
  assert.equal(result.qualifies, true);
});

test('uses Match Team Form as current ranking score when supplied', () => {
  const result = evaluatePick({
    fixture:'A vs B',
    matchTeamForm:{
      overallResults:['W','W','W','W','W'],
      venueResults:['W','W','W','L','W'],
    },
  });
  assert.equal(result.score, 91);
  assert.equal(result.matchTeamForm.score, 91);
});

test('ranks all supplied selections', () => {
  const result = selectCorePicks([
    { fixture:'A vs B', matchTeamForm:{overallResults:['W','W','W','W','W'],venueResults:['W','W','W','L','W']} },
    { fixture:'C vs D', matchTeamForm:{overallResults:['W','D','L','W','D'],venueResults:['D','L','W','D','L']} }
  ]);
  assert.equal(result.core.length, 2);
  assert.equal(result.core[0].fixture, 'A vs B');
  assert.equal(result.watchlist.length, 0);
  assert.equal(result.skip.length, 0);
});


test('calculates weighted goals and xG using the same recency weights', () => {
  assert.equal(calculateWeightedMetric([3,2,1,2,0]), 1.75);
  assert.equal(calculateWeightedMetric([2.1,1.8,1.4,1.2,0.9]), 1.63);
});

test('calculates positive and negative recent trend', () => {
  assert.equal(calculateRecentTrend(['W','W','D','L','L']), 88.9);
  assert.equal(calculateRecentTrend(['L','L','D','W','W']), -88.9);
});

test('Match Team Form exposes goals, defence, xG, xGA, opponent strength and trend', () => {
  const form = calculateMatchTeamForm({
    overallResults:['W','W','D','L','W'],
    venueResults:['W','W','W','D','W'],
    goalsScored:[3,2,2,1,4],
    goalsConceded:[0,1,1,2,0],
    xG:[2.4,1.9,1.8,1.2,2.1],
    xGA:[0.7,0.9,1.1,1.6,0.8],
    opponentStrength:[82,75,68,90,64],
  });
  assert.equal(form.goalsScored, 2.3);
  assert.equal(form.goalsConceded, 0.75);
  assert.equal(form.xG, 1.93);
  assert.equal(form.xGA, 0.99);
  assert.equal(form.opponentStrength, 77.25);
  assert.equal(form.recentTrend, 44.4);
});
