# Football Tips v1.0 — Three-Pillar Model

The model is intentionally limited to exactly three predictive pillars.

## Pillar 1 — Team Form & Performance
- Last 5 overall and last 5 venue-specific results.
- W = 100%, D = 33.3%, L = 0%.
- Recency weights: 30% / 25% / 20% / 15% / 10%, newest first.
- Home team: 40% overall + 60% home.
- Away team: 40% overall + 60% away.
- Supporting diagnostics may include goals scored/conceded, xG/xGA, opponent strength and recent trend.

## Pillar 2 — Head-to-Head
- Last 5 direct meetings.
- W/D/L scoring and 30/25/20/15/10 recency weighting.
- Age/relevance decay reduces the influence of old meetings.
- H2H is supporting historical matchup evidence.

## Pillar 3 — Attack vs Defence
- Home attack is compared with away defence.
- Away attack is compared with home defence.
- Use goals/xG and goals conceded/xGA, preferring venue-relevant pre-match data.
- When goals and xG are both available, the engine blends 40% actual goals + 60% xG.

## Prediction rating
The working three-pillar rating is:
- Pillar 1 Team Form: 40%
- Pillar 2 H2H: 20%
- Pillar 3 Attack vs Defence: 40%

`Three-Pillar Rating = P1 × 0.40 + P2 × 0.20 + P3 × 0.40`

The higher-rated team is the directional winner selection. The rating itself is not a calibrated win probability.

## Scope
No Pillar 4–11 is part of this model. Expected-goals/Poisson, squad/context, scoring reliability, defensive reliability, set pieces, motivation/rotation and market confirmation are excluded from the predictive model unless explicitly reintroduced in a future version.

## Backtesting
Historical tests must reconstruct the information available before kickoff, using the 06:00 SAST daily snapshot where requested. Do not use final results as model inputs and do not alter formulas after seeing the results.
