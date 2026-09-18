# Football Tips model v1.2

Version 1.2 makes value a hard publication gate. A selection is a candidate until the shared value model promotes it to Core. The website and scheduled email use the same gate.

## Core requirements

- Model probability: at least 65%
- No-vig edge: at least 4 percentage points
- Expected value: at least 5%
- Heat: at least 2
- Contradictions: no more than 1
- Form/xG and the goal model agree
- All selection floors pass
- Complete decimal market odds are present
- Maximum 6 Core picks, ranked by probability, edge, EV and Heat

High probability without value is rejected. Value without adequate model confidence is also rejected.

## Daily fixture scope

The daily discovery stage must load every association in
[`config/league-scope.json`](../config/league-scope.json) each day. The scope
contains all 200 associations supplied for the project and has no famous-league
or top-100 cutoff.

For each association, the scanner should request every senior domestic league
supported by the fixture provider. Provider gaps must be recorded as
unavailable; they must never be filled with invented fixtures or statistics.
Expanding discovery does not lower the publication standard: every candidate
still has to pass the complete v1.2 value gate before it can become a Core pick.

## Candidate data

```json
{
  "fixture": "Home vs Away",
  "market": "Home or Draw — 1X",
  "probability": "72%",
  "odds": 1.55,
  "marketOdds": {
    "home": 2.1,
    "draw": 3.4,
    "away": 3.8
  },
  "coveredOutcomes": ["home", "draw"],
  "oddsCapturedAt": "2026-09-18T06:00:00+02:00",
  "heat": "5/8",
  "contradictions": 0,
  "modelAgreement": true,
  "floorsPassed": true
}
```

`marketOdds` must contain every mutually exclusive outcome from the same bookmaker snapshot. The model removes the overround by normalising the implied probabilities. `coveredOutcomes` identifies the outcomes that win the selection. This supports ordinary two-way/three-way markets and double chance derived from 1X2 prices.

Push markets such as Draw No Bet should remain Secondary until win, push and loss probabilities are modelled explicitly.

## Calculations

```text
fair odds = 1 / model probability
no-vig market probability = covered normalised implied probabilities
edge = model probability - no-vig market probability
EV = model probability × selection odds - 1
```
