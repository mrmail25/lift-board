# Lift Board: Movement-Pattern Check and Slot Templates, Spec (v1)

Owner: Coach (data and logic). For: Builder (implementation), Chief of Staff (approval).
Files: `patterns.json` v1 (new), `exercises.json` v5 (new `patterns` field), `rules.json` v7 (rule `pattern_gap`, fix action `add_slot_exercise`, `pattern_gap_fix`, `suggestions.pattern_gap`).
Python reference: `tools/patterns.py`, integrated in `tools/check_program.py` (`slot_counts`, `pattern_flags`, `_gens('pattern_gap')`). Tests: `tools/test_patterns.py`. Diff file: `patterns-reference.json` (built by `tools/gen_patterns_reference.py`).
Tags as in logging-spec: **[M]** = modeling choice, **[C]** = coaching convention. Nothing here is measured; no slot list or minimum comes from a study.

## 1. Keys
`patterns.json`
- `slots[id]` = `{name, kind: compound|isolation, description, primary_muscles, group, required?, counts_toward?}`. `description` is the one-line teaching text for the slot tile. `group` (upper_push, upper_pull, lower, arms, core) is used to choose a day for a fix or an added template slot.
- `required` = slot ids whose absence is a **warn**: horizontal_push, horizontal_pull, vertical_pull, squat, hinge.
- `weekly_min_by_level[level][slot]` = minimum **exercises per week** (tiles, not sets; sets are already covered by `weekly_volume`). 0 = optional.
- `scoring` = weights for `slot_recommendations` (§4).
- `templates[split_id].levels[level][day_count]` = `[{day, label, slots:[{slot, sets, type}]}]`; `templates_added` logs every slot added on top of the preset.
- `count_unit`, `templates_note`: prose versions of the rules below.

`exercises.json` v5: every exercise has `patterns: [slot ids]`, main slot first (223 have 1, 14 have 2, 2 have 3). Ids unchanged.

## 2. Slots (24)
Compound: horizontal_push, vertical_push, horizontal_pull, vertical_pull, squat, hinge, lunge (opt, counts toward squat), power (opt).
Isolation: chest_fly, front_delts (opt), side_delts, rear_delts, lat_iso (opt), traps (opt), biceps, triceps, forearms (opt), quads_iso (opt), hamstring_curl, glute_iso (opt), hip_iso (opt), calves, abs, carry_core (opt; kind isolation so Pallof press counts).

## 3. Slot assignment rationale [M]
- Built from the existing fine patterns in `rules.json patterns` (one mapping table, `tools/_slotmap.py`): presses and incline presses → horizontal_push; overhead presses → vertical_push; rows → horizontal_pull; pulldowns and pull-ups → vertical_pull; squats, leg presses, hacks → squat; RDLs, deadlifts, swings, KB cleans/snatches → hinge; hip thrusts and back extensions → glute_iso; leg extension → quads_iso; plyometrics → power; hangs → forearms; rotation work → abs.
- Dips → [horizontal_push, triceps]: they're a chest/triceps press, closer to a decline press than to overhead work.
- Two slots: close-grip bench [horizontal_push, triceps], JM press [triceps, horizontal_push], chin-up [vertical_pull, biceps], upright row [side_delts, traps], Arnold press [vertical_push, front_delts], reverse curl [forearms, biceps], single-leg press and goblet squat [squat, quads_iso], KB windmill and Pallof press [abs, carry_core]. Landmine presses (angled) → [horizontal_push, vertical_push, front_delts].
- **Vertical push is a minimum but not required (info, never warn):** horizontal pressing already trains front delts heavily, and side delts come from raises. 12 presets have no overhead press; that's a valid choice, so the check only nudges.
- **An isolation exercise never counts for a compound slot** (none are currently mapped to one; the rule protects custom/future mappings). Lunges count for squat via `counts_toward`.

## 4. Recommendations (`slot_recommendations(slot, level, board=None, n=6)`) [M]
Candidates: non-custom exercises that can count for the slot. Beginners skip `scoring.advanced_only` and rare equipment (rings, suspension, medicine ball, stability ball); intermediate skips rare equipment unless it's a staple.
Score = 40·fit + 20·(swap.json score vs the slot's anchor)/100 + 10·(slot is the exercise's main slot) + 8·staple + 0.5·min(preset uses, 12) − fatigue_penalty[level]·fatigue (20/12/8), + 6 for machine/cable at beginner, + 3 if the board already uses that equipment, − 15 if already on the board. fit = ratings for the slot's primary_muscles weighted 0.6/0.25/0.15. Anchor = the slot's most-used preset exercise. Ties by id.
Reason (one line, from the score inputs): "Top-rated / Staple / Alternative {slot}", then "low fatigue" (≤0.8) or "high fatigue, use fewer sets" (≥1.4), "trains the stretched position" (in rules.stretch_biased for its main muscle), then "uses equipment already on your board" or the equipment name. Max 3 parts.

## 5. Check behavior (rule `pattern_gap`)
- Count: every tile counts 1 for each slot in its `patterns` (plus `counts_toward`); compound slots ignore isolation exercises. Empty board → no flags.
- `('warn','pattern_gap',slot,count,min)` when a required slot has 0. `('info',…)` when a slot is above 0 but below its min, or a non-required slot with min > 0 is at 0. Message: "No vertical pull this week. Add one vertical pull exercise (Close-Grip Pulldown, Lat Pulldown)." / info: "Side delts: 0 of 1 exercises this week for your level."
- Fix `add_slot_exercise`: try the top 6 `slot_recommendations(slot, level, board)` in order; days ordered by has-a-tile-in-the-same-group, then fewest sets, then day order; skip a day that already has the exercise; sets = 3 (compound) / 2 (isolation), retried at 2. Validated on a board copy with the standard `fix_validation` (no new non-info flag; resolves when the slot reaches its min; warn→info counts as resolving the warn). Preview "Add {name} ({sets} sets) on {day} for {slot}". Apply/Undo as for every other fix.
- Presets: 0 non-info warnings (no preset change was needed). Info gaps in presets: vertical_push 12, chest_fly 4 (advanced), rear_delts 3.

## 6. Templates
- Derived from the presets (one source of truth): same days, labels, order and sets; each tile becomes its exercise's main slot plus a `type` hint (primary/accessory/isolation).
- If a slot is below the level's min it's added (compound 3 sets, isolation 2) to the same-group day with the fewest sets, keeping the day under 75 min then 90 min (`session_length`) and under the level's `session_hard_sets` cap; else 2 sets are trimmed from the biggest slot on a day (isolation ≥4 sets, then compound ≥5) and the slot is added at 2; else a same-group slot above its own min is replaced. All 19 additions are in `templates_added`.
- `fill_template(template, level)`: each slot gets the best recommendation of the hinted type not already on that day, rotating through the top 3 across the week (A/B variety), and skipping a pick that adds a new session-level warn. Every filled template passes with 0 non-info flags.
- The Build page shows a slot tile with `name` + `description`; tapping it lists `slot_recommendations(slot, level, board)` (4–6, with reason); picking one replaces the slot with a tile of that exercise and the template's sets.

## Custom exercises

A custom exercise inherits the `patterns` of its base exercise. A custom exercise with no base counts toward no slot. The create flow may let the user pick slots; if they do, those override the inherited ones.

## Slot suggestion for new custom exercises

Compare the custom exercise muscle weights (19-muscle vector) with every library exercise using cosine similarity. Only consider library exercises of the same kind: primary/accessory against compound slots, isolation against isolation slots. Suggest the main slot (patterns[0]) of the best match, and list up to 2 more distinct slots from the next 5 matches if their similarity is at least 0.85. If no match reaches 0.6, suggest nothing. The suggestion is pre-selected; the user can change it or clear it.

### Direction (v2)

The movement pattern follows the direction of the pull or push, not the leading muscle. After muscle matching, if the main slot is horizontal or vertical pull or push, the name decides the direction using `custom_suggest.direction_keywords` (row means horizontal pull; pulldown, pull-up or chin means vertical pull; and so on). If the name gives no direction, the picker asks horizontal or vertical (`ask_direction`), with the muscle-based guess pre-selected. Extra slots from the opposite direction are dropped. All cut-offs live in `patterns.json` `custom_suggest`.

### Base exercise first (v2.1)

If the custom exercise has a base exercise with patterns, the suggestion is exactly the base patterns (main slot first, up to max_slots) and nothing is asked. Muscle similarity plus name direction is only the fallback when there is no base or the base has no patterns.

### Name overrides base direction (v2.2)

With a base exercise, the base patterns are used, except that a single clear direction keyword in the name swaps the main slot within its direction pair (e.g. base seated-cable-row named "Neutral Pulldown" gives vertical_pull). The name never changes the family (pull vs push vs legs), and nothing is asked.
