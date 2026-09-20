# v1.9 06:00 SAST 30-Day Backtest Protocol

## Objective
Prove or disprove Football Tips v1.9 using only information that existed by 06:00 SAST on each historical match day.

## Window
- Evaluation timezone: Africa/Johannesburg
- Snapshot time: 06:00 SAST = 04:00 UTC
- Rolling test window: previous 30 calendar days
- No post-06:00 information may be used in feature construction.

## Required historical inputs per fixture
1. Fixture and kickoff known by 06:00 SAST
2. Same-bookmaker 1X2 odds snapshot at or immediately before 06:00 SAST
3. 1X price at or immediately before 06:00 SAST when available
4. Trustworthy opening 1X price for line-movement comparison
5. Pre-06:00 recent results and home/away splits
6. Pre-06:00 xG/xGA or goals-for/goals-against fallback
7. H2H data available before the snapshot
8. League away-team scoring baseline available before the snapshot
9. Opposition-quality adjusted form
10. Goalkeeper quality evidence available before the snapshot
11. Set-piece attack/defence evidence available before the snapshot
12. Motivation, injuries/suspensions and expected rotation known by 06:00
13. Rest/travel/congestion known by 06:00
14. Referee assignment, weather/pitch information only if already known by 06:00
15. Final match result used only for settlement after the selection is frozen

## v1.9 gates
- Market: 1X only
- Model 1X probability >= 65% for Core
- Away scoring probability <= 35%
- Away scoring probability at least 10 percentage points below league away-score baseline
- H2H not opposing
- Opponent strength passes
- Motivation, team news and schedule/fatigue not opposing
- Goalkeeper and set-piece risk checked
- Sample blend target when data permits: 45% last 5-6, 35% last 10-12, 20% longer-term/season
- Opposition-strength adjustment applied
- At least 2 independent model checks, >=67% support
- Heat >= 2
- <=1 contradiction
- Away no-vig win probability < 60%
- Opening-to-06:00 1X shortening <= 10%
- No more than 1 opposing soft contextual flag
- Price/value after football gates: no-vig edge >= 4pp and EV >= 5%

## Leakage controls
- Never use closing odds in place of 06:00 odds.
- Never use injuries, lineups, weather, referee information or news published after 06:00.
- Never use season statistics that include the match being tested or later matches.
- Never tune thresholds during the same 30-day evaluation and then report the tuned result as out-of-sample performance.
- Missing required hard evidence means Watchlist / not Core; do not infer or backfill it from later sources.

## Output metrics
Report:
- total fixtures discovered at 06:00
- fixtures with sufficient evidence
- Core qualifiers
- Watchlist
- Skip
- Core wins/losses
- Core hit rate
- 95% Wilson interval
- mean predicted 1X probability and calibration gap
- average decimal odds
- flat-stake ROI
- total return at 1 unit per Core
- maximum losing streak
- performance by league
- performance by probability band
- performance by Heat
- performance by away-score-probability band
- performance by league-baseline advantage
- performance with/without each soft-risk flag
- closing-line value only as a diagnostic, never as an input to the 06:00 decision

## Evidence standard
A result is only a true v1.9 06:00 backtest if every Core selection can be audited back to timestamped pre-06:00 inputs. If exact 06:00 historical prices are unavailable, publish the run as a partial football-gate replay, not as a full v1.9 proof.
