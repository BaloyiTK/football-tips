# Football Tips v1.0 — Open Ranking Model

This is a full reset of the previous rules-based model.

## Core principle
There are no hard rejection rules.

The system scans the available football board, gathers as much reliable evidence as possible, and ranks opportunities from strongest to weakest.

## What is no longer mandatory
- No 1X-only restriction.
- No minimum probability floor.
- No minimum EV or edge threshold.
- No Heat minimum.
- No contradiction cap.
- No away-scoring ceiling.
- No league-baseline suppression requirement.
- No mandatory H2H, goalkeeper, set-piece, team-news or market-movement field.
- No automatic rejection because an evidence field is missing.
- No mandatory independent-model agreement threshold.

## What the model still considers
Where available, the model may use:
- recent form
- home/away form
- goals and xG
- Poisson or other probability models
- H2H
- opponent strength
- team news
- motivation
- fatigue/travel
- goalkeeper quality
- set-piece strength
- weather/pitch
- bookmaker prices
- opening/current market movement
- expected value

These are ranking inputs, not hard gates.

## Output
Every analyzed selection receives a ranking score. Missing data lowers confidence but does not automatically remove the match.

The daily workflow should:
1. scan the broad available board,
2. analyze serious opportunities,
3. rank them,
4. publish the ranked list,
5. update the website,
6. verify Vercel production is READY.


## Pillar 1 — Match Team Form

Match Team Form measures current result strength while giving more importance to the venue of the upcoming match.

### Result values
- Win = 100%
- Draw = 33.3%
- Loss = 0%

### Recency weights
The five matches must be supplied most-recent first:

1. most recent = 30%
2. second = 25%
3. third = 20%
4. fourth = 15%
5. fifth = 10%

Weighted five-match form:

`Weighted Form = Σ(Result Value × Recency Weight)`

### Home team
Use:
- last 5 overall
- last 5 home

`Home Match Team Form = 40% × Weighted Last-5 Overall + 60% × Weighted Last-5 Home`

### Away team
Use:
- last 5 overall
- last 5 away

`Away Match Team Form = 40% × Weighted Last-5 Overall + 60% × Weighted Last-5 Away`

### Match form gap

`Form Gap = Home Match Team Form - Away Match Team Form`

Positive values favor the home side's current/venue form; negative values favor the away side.

### Example: Manchester City vs Sunderland
Using the test sample:
- Manchester City overall: WWWWW = 100%
- Manchester City home: WWWLW = 85%
- Manchester City Match Team Form = 91%
- Sunderland overall: WLWDW = 65%
- Sunderland away: DLWDL = 35%
- Sunderland Match Team Form = 47%
- Form Gap = +44 percentage points to Manchester City

Match Team Form is a strength pillar, not by itself a final match prediction.


### Supporting Match Team Form metrics

The Match Team Form pillar now also records these last-five supporting metrics, most-recent first:

- **Goals Scored** — weighted average goals scored.
- **Goals Conceded** — weighted average goals allowed.
- **xG** — weighted average expected goals created.
- **xGA** — weighted average expected goals allowed.
- **Opponent Strength** — weighted average strength of the five opponents on a 0–100 scale when available.
- **Recent Trend** — momentum in results. It is calculated as the average result strength of the two most recent matches minus the average result strength of the older three matches.

All numeric five-match metrics use the same 30% / 25% / 20% / 15% / 10% recency weights.

These six fields are currently **supporting diagnostics**. They do not yet change the 40% overall + 60% venue Match Team Form score. We will test them before assigning final weights.


## Pillar 2 — Head-to-Head (H2H)

H2H measures how the selected team performed in the five most recent direct meetings with the opponent.

It uses the same result values and recency weights as Match Team Form:
- Win = 100%
- Draw = 33.3%
- Loss = 0%
- most recent to oldest = 30% / 25% / 20% / 15% / 10%

H2H Strength = sum of each H2H result value multiplied by its recency weight.

The five results are recorded from the perspective of the team being evaluated. The pillar also reports raw wins, draws and losses.

H2H remains a separate supporting pillar for now. It does not yet change Match Team Form or automatically determine the final pick. We will test it before assigning a final model weight.


## Agreed v1.0 Model Architecture

The football model is organized as a pipeline. Components that help create the football prediction are kept separate from the final price/value layer to avoid double-counting evidence.

### Pillar 1 — Team Form & Performance
- Last 5 overall results.
- Last 5 home results for the home team; last 5 away results for the away team.
- W = 100%, D = 33.3%, L = 0%.
- Recency weights, newest first: 30% / 25% / 20% / 15% / 10%.
- Match Team Form = 40% weighted overall + 60% weighted venue form.
- Supporting diagnostics: Goals Scored, Goals Conceded, xG, xGA, Opponent Strength and Recent Trend.
- Numeric last-five diagnostics use the same recency weights.
- Recent Trend compares the newest two results with the older three.
- Supporting diagnostics do not automatically change the Match Team Form score until their predictive weights are tested.

### Pillar 2 — Head-to-Head
- Use the five latest direct meetings, from the perspective of the team being evaluated.
- Base W/D/L scoring and match-order recency use the same values as Pillar 1.
- Add age/relevance adjustment so old meetings involving materially different squads/coaches carry less influence.
- Record raw W/D/L and H2H strength.
- H2H is supporting evidence and is not allowed to dominate current performance.

### Pillar 3 — Attack vs Defence
- Compare home attacking production with away defensive performance.
- Compare away attacking production with home defensive performance.
- Use goals, goals conceded, xG and xGA, with venue-specific data preferred when available.
- This pillar feeds expected-goal estimation rather than acting as a duplicate final vote.

### Pillar 4 — Match Expected Goals
- Produce lambda Home and lambda Away from the attack/defence matchup and relevant football adjustments.
- Prefer current, venue-relevant and opponent-adjusted evidence.
- Do not invent unavailable xG data; use transparent fallbacks and lower confidence when inputs are incomplete.

### Pillar 5 — Poisson & Match Probabilities
Use lambda Home and lambda Away to generate a score grid and probabilities for:
- Home / Draw / Away.
- Double Chance.
- BTTS.
- Over/Under goal markets.
- Team goal floors.
- Most likely correct scores.
Poisson is an output of the expected-goals layer, not an independent vote to be double-counted.

### Pillar 6 — Squad & Match Context
Where reliable data is available, account for:
- injuries and suspensions,
- expected lineup and player importance,
- goalkeeper availability/quality,
- rest and fixture congestion,
- travel,
- rotation,
- match importance/motivation,
- weather/pitch where material.
Missing context lowers confidence; it does not create a fabricated score.

### Pillar 7 — Scoring Reliability
Measure how consistently each team turns attacking performance into goals, including:
- scoring 1+, 2+ and 3+ rates,
- failed-to-score rate,
- xG consistency and finishing consistency where available.
Use this primarily to refine expected goals and team-total/goal-floor probabilities.

### Pillar 8 — Defensive Reliability
Measure:
- clean-sheet rate,
- conceded 1+, 2+ and 3+ rates,
- xGA consistency,
- recurring defensive breakdowns.
Use this primarily to refine expected goals and opponent scoring floors.

### Pillar 9 — Set Pieces
Where reliable data is available, compare:
- set-piece goals/xG created,
- corners/free-kick threat,
- opponent set-piece goals/xG conceded,
- relevant aerial or dead-ball matchup weaknesses.
Set pieces are a matchup adjustment, not a standalone duplicate prediction.

### Pillar 10 — Motivation / Rotation Risk
Assess match-specific circumstances such as:
- title, promotion or relegation pressure,
- qualification/elimination state,
- cup ties and second legs,
- fixture priority,
- likely rotation,
- schedule proximity.
Treat this as contextual evidence and show uncertainty rather than assuming motivation.

### Pillar 11 — Market Confirmation / Value Layer
Market information is applied after the football prediction. Track:
- opening odds,
- current odds,
- implied probability,
- bookmaker margin/no-vig probability where calculable,
- market movement,
- model fair odds,
- edge,
- expected value.
Odds do not determine the football prediction. They determine whether the model's prediction is attractively priced.

## Model flow

Team Form & Performance -> H2H/contextual matchup evidence -> Attack vs Defence -> Scoring/Defensive Reliability -> Set Pieces -> Squad/Match Context + Motivation/Rotation -> lambda Home/Away -> Poisson probabilities and goal floors -> Market Confirmation -> Value/EV -> ranked selection.

## General rules
- No hard rejection thresholds are introduced by these pillars.
- Missing data reduces confidence rather than automatically rejecting a fixture.
- Do not invent unavailable evidence.
- Avoid double-counting derived information: xG can feed lambda, and lambda feeds Poisson, so those outputs are not treated as three independent votes.
- Keep football probability separate from bookmaker price/value.
- Final component weights remain uncommitted until tested/backtested.
