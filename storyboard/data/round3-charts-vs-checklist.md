# Balance and Recovery: charts vs checklist (round 3, 2026-10-23)

Recommendation for the Analysis redesign. Charts show a value per muscle / day / pattern against a line; checklist rows show a pass / attention state with named exercises and days. Never render the kind words (check / measure / info); see data/analysis-display.json. All values are models.

## Show as one chart

| Chart | Type | X axis | Y axis | Series | Threshold lines | Data fields |
|---|---|---|---|---|---|---|
| Sets per muscle vs band | horizontal bars, one row per muscle (sorted by body region) | effective weekly sets | muscles | bar = sets.effective; shaded band [level_min, max] | level_min, max; faint red_under_below / red_over_above | muscle-deepdive `sets.*` (or analysis items weekly_sets_per_muscle) |
| Stretch share per muscle | horizontal bars | share 0-1 | muscles with a stretch list | bar = stretch.share; a dot marks checked muscles | 0.25 (stretch_share_flag_below); checked muscles also show pass / attention from the per-muscle check | analysis items stretch_share.per_muscle + stretch_<m> status; deep-dive `stretch.*` |
| Recovery cost per day | vertical bars | training days | fatigue points | stacked by fatigue tier (heavy axial / other compound / lighter compound / isolation) | dashed line at the saved baseline / days when a baseline exists | fatigue_rating.components.by_day + tiers; recovery_cost.by_day |
| Stimulus curve (deep-dive, per muscle) | line | weekly effective sets 0-30 | stimulus 0-1 | S(x) = 1 - exp(-x/k); dot at curve.x_after_session_discount | ideal_band as a shaded vertical band | deep-dive `curve.*` |
| Sets per movement pattern | horizontal bars | sets | tray patterns | bar = movement_pattern_sets | none (no target) | movement_pattern_sets |

## Keep as checklist rows

| Row | Why not a chart |
|---|---|
| Pulling and pressing in balance | one ratio; show the value inline (pull : push) |
| Covers the key movement patterns | a list of missing slots |
| Same-pattern work spread out | rare; names a day and its exercises |
| Includes stretch-focused work for <muscle> (5 rows) | pass / attention with the exercises to swap; the chart above shows the share |
| Heavy spine sets within the level caps | names days and lifts |
| Recovery cost near your normal week | needs a baseline; one percentage |
| Lower-back fatigue between days | an info note with thin evidence |
| Sessions are well sized, Sessions under 90 minutes | per-day limits with named exercises; minutes can sit inline |

## Keep as a single number or small table

- One-side share, Stimulus per fatigue, Fatigue rating value: one number each with an expandable per-muscle / per-pattern table (analysis.breakdowns). They have no target, so a chart adds little.

## Data feeding the charts

- Week view: tools/analysis.py items(days, level, baseline) (fixture data/analysis-items-reference.json).
- Muscle rows and deep-dive: tools/muscle_deepdive.py (fixture data/muscle-deepdive-reference.json).
