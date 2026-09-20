# Football Tips v1.0 — Three-Pillar xG Model

The model has exactly three predictive pillars and one final prediction path.

## Pillar 1 — Team Form & Performance
Last 5 overall plus last 5 venue-specific results. W=100%, D=33.3%, L=0%. Recency weights are 30/25/20/15/10, newest first. Home and away Match Team Form = 40% overall + 60% venue.

## Pillar 2 — Head-to-Head
Last 5 direct meetings with the same W/D/L and recency scoring. A three-year exponential age decay reduces the influence of old meetings.

## Pillar 3 — Attack vs Defence
Compare home attack with away defence and away attack with home defence. When both are available:
- attacking production = 40% goals scored + 60% xG
- defensive exposure = 40% goals conceded + 60% xGA
- base home xG = sqrt(home attacking production × away defensive exposure)
- base away xG = sqrt(away attacking production × home defensive exposure)

## How the three pillars combine
The old 40/20/40 winner-rating method is retired.

Pillar 3 creates base model xG. Pillars 1 and 2 make controlled symmetric adjustments to that base:
- P1 form adjustment = (home form − away form) / 100 × 15%, capped at ±15%.
- P2 H2H adjustment = (home H2H − away H2H) / 100 × 7.5%, capped at ±7.5%.
- Combined P1+P2 adjustment is capped at ±20%.
- Home final xG = home base xG × (1 + combined adjustment).
- Away final xG = away base xG × (1 − combined adjustment).

This makes current form potentially twice as influential as H2H while keeping attack/defence as the goal-production foundation.

## Final prediction
Final xG is passed to the Poisson score grid. Poisson produces Home/Draw/Away probabilities and likely scorelines. The outcome with the highest probability is the official directional prediction.

The model therefore has one coherent path:

P1 Form + P2 H2H -> controlled adjustment of P3 base xG -> final xG -> Poisson -> prediction.

The three-pillar rating is no longer used to declare a winner.

## Backtesting
Historical tests reconstruct only information available before kickoff, using the requested 06:00 SAST snapshot. Final results are used only for grading. Formulas are frozen before viewing backtest performance.
