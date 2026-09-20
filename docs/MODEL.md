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
