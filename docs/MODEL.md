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
