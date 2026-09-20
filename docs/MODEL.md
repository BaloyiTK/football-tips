# Football Tips model v1.4

Version 1.4 makes the football-evidence gate explicit and auditable before price/value can promote a selection to Core.

## Daily order

1. Scan every accessible senior men's domestic league and fixture in the configured global scope.
2. Build football evidence before looking for value: recent form, home/away profile, goals or xG, Poisson/Dixon-Coles, Heat, floors, contradictions, relevant H2H and reliable team news.
3. Cross-check the proposed market against independent models.
4. Only after the football gate is ready, validate the bookmaker price, no-vig edge and EV.
5. Publish every qualifying Core and rate it; keep incomplete or conflicted football cases on Watchlist.

## Structured football gate

Every Core candidate must include:

```json
{
  "footballEvidence": {
    "recentForm": "pass",
    "homeAway": "pass",
    "goalsOrXg": "pass",
    "poissonDc": "pass",
    "independentModels": {
      "checked": 3,
      "supporting": 3,
      "opposing": 0
    },
    "majorDisagreement": false
  }
}
```

Core requires all four primary football signals to support the selection, at least 2 independent model checks, at least 67% independent-model support, and no major disagreement. Missing or conflicting evidence keeps a selection on Watchlist; price never overrides a failed football gate.

H2H is supporting evidence, not a standalone Core requirement.

## Core requirements

- Model probability: at least 65%
- Heat: at least 2
- Contradictions: no more than 1
- All selection floors pass
- Structured football evidence gate passes
- Complete same-bookmaker mutually exclusive market odds are present
- No-vig edge: at least 4 percentage points
- Expected value: at least 5%
- No maximum number of Core picks; every qualifier is retained and ranked

## Scores shown on the site

- Football Strength /100: 70% model probability, 10% Heat, 15% independent-model agreement, 5% evidence completeness, minus contradiction penalties.
- Value Strength /100: 60% edge score and 40% expected-value score.
- Overall /100: 70% Football Strength and 30% Value Strength.
- Rating labels: ELITE (85+), STRONG (75+), SOLID (68+), QUALIFIED (<68, but still must pass all Core gates).

The Overall rating ranks already-qualified Core picks. It is not a substitute for the Core gates.

## Price calculations

```text
fair odds = 1 / model probability
no-vig market probability = covered normalised implied probabilities
edge = model probability - no-vig market probability
EV = model probability × selection odds - 1
```

`marketOdds` must contain all mutually exclusive outcomes from the same bookmaker snapshot. `coveredOutcomes` identifies the outcomes that win the selection.
