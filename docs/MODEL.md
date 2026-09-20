# Football Tips model v1.9

Version 1.9 keeps the 1X-only policy and normalizes the low-away-scoring case for league style, sample size, opposition quality, goalkeeper/set-piece risk and market movement.

## Market policy

The only market the model may evaluate, rank, publish, or promote to Core is **1X — home team or draw**.

X2, Match Result, Draw No Bet, Over/Under, BTTS, Asian handicaps and all other markets are rejected before probability, Heat or value evaluation.

## Daily order

1. Scan every accessible senior men's domestic league and fixture in the configured global scope.
2. Build football evidence before looking for value: recent form, home/away profile, goals or xG, Poisson/Dixon-Coles, Heat, floors, contradictions, relevant H2H and reliable team news.
3. Cross-check the proposed **1X** market against independent models.
4. Only after the football gate is ready, validate the bookmaker price, no-vig edge and EV.
5. Publish every qualifying Core and rate it; keep incomplete or conflicted football cases on Watchlist.

## Structured football gate

Every Core candidate must include recent form, home/away strength, goals/xG, Poisson/Dixon-Coles, H2H, opponent strength and independent-model evidence:

```json
{
  "footballEvidence": {
    "recentForm": "pass",
    "homeAway": "pass",
    "goalsOrXg": "pass",
    "poissonDc": "pass",
    "h2h": "neutral",
    "opponentStrength": "pass",
    "motivation": "neutral",
    "teamNews": "neutral",
    "scheduleFatigue": "neutral",
    "awayScoringThreat": "pass",
    "awayScoreProbability": 0.30,
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


## v1.9 1X danger rules

- H2H must be explicitly checked. "support" or "neutral" may pass; "oppose" blocks Core.
- Opponent strength must explicitly pass. A materially stronger away side blocks Core.
- When a complete 1X2 market exists, the model calculates the away team's no-vig win probability.
- If the away team's no-vig win probability is **60% or higher**, 1X is rejected before value scoring. Price cannot rescue it.
- Missing H2H or opponent-strength evidence keeps a candidate on Watchlist rather than silently assuming support.


## v1.9 context gates

Every serious 1X candidate must explicitly record:

- **Motivation** — title race, relegation battle, rotation priorities, cup focus, or dead-rubber context.
- **Team news** — key injuries, suspensions, goalkeeper/centre-back/striker absences, and expected rotation.
- **Schedule/Fatigue** — rest days, European/cup congestion, travel burden and short turnaround.

Each field may be `support`, `neutral`, or `oppose`. Missing evidence keeps the pick on Watchlist. `oppose` blocks Core.


## v1.9 low away-scoring-threat gate

Core 1X is intended for matches where the visitor has little attacking threat.

- Estimate the away team's probability of scoring at least once.
- Core requires **away score probability <= 35%**.
- Equivalently, estimated home clean-sheet probability must be **>= 65%**.
- Record `awayScoringThreat: "pass"` only when the quantitative scoring-risk check supports it.
- If the away scoring probability is missing, the candidate remains Watchlist.
- If the away scoring probability is above 35%, Core is blocked.
- This is a filtering rule only; BTTS No is **not** an allowed betting market. The published market remains 1X only.


## v1.9 context-normalized 1X rules

### Hard structural inputs
A Core candidate must explicitly pass:

- **League baseline** — compare the away team's estimated scoring probability with the league's normal away scoring rate.
- **Sample blend** — use a weighted form window rather than only the last five: approximately 45% last 5–6, 35% last 10–12, 20% longer-term/season baseline when data permits.
- **Opposition adjustment** — discount clean sheets and scoring droughts achieved against unusually weak opposition.
- **Goalkeeper quality** — evaluate save quality/xG prevented or the best available keeper-strength evidence.
- **Set-piece risk** — account for away threat from corners, free kicks and penalties plus the home side's set-piece vulnerability.
- **Market move** — compare current 1X price with opening price when a trustworthy opening line is available.

### League-normalized away scoring gate
The away team's estimated probability of scoring must:
1. remain **<= 35%**, and
2. sit at least **10 percentage points below the league's normal away-score baseline**.

Thus 35% is an absolute ceiling, not a universal claim that every league behaves the same way.

### Price movement
If a trustworthy opening 1X price exists and the current price has shortened by **more than 10%**, reject Core because much of the apparent edge may already have been absorbed by the market. Missing opening-line evidence keeps the marketMove field unverified rather than inventing movement.

### Soft contextual risks
Record these separately:
- gameScriptRisk
- refereeDisciplineRisk
- weatherPitchRisk
- homeFalseFavouriteRisk

One opposing soft flag may be tolerated as a contradiction. More than one blocks the pick before value scoring.


## v1.9 context-normalized 1X
Core now requires league-baseline normalization, blended recent/medium/long samples, opposition-strength adjustment, goalkeeper quality, set-piece risk and market-move review.

Away scoring must be <=35% AND at least 10 percentage points below the league away-score baseline.

Sample blend target when data permits:
- 45% last 5-6
- 35% last 10-12
- 20% season/rolling long-term baseline

Opening-line rule: if a trustworthy opening 1X price exists and current 1X has shortened by more than 10%, Core is rejected.

Soft contextual flags: game script, referee/discipline, weather/pitch and home false-favourite risk. One opposing soft flag may be tolerated; more than one blocks Core.
