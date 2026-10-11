# Ratings change log, exercises.json v3 (Oct 11, 2026)

v2 is backed up as `exercises.v2.json`.

## RDL vs deadlift (flagged by Mr Dude)
The RDL already rated hamstrings higher than the deadlift (1.0 vs 0.7). It looked lighter because the deadlift lights up many more regions, and the RDL had no credit for its isolated upper-body work: the traps, upper back and lats hold the bar in place through the whole rep.
- **romanian-deadlift:** hamstrings 1.0 (no change). Glutes 0.8 → 0.7, because there's less glute work at lockout than in a conventional deadlift. Lower back 0.6 → 0.7. Added traps 0.3, upper back 0.25 and lats 0.25. Forearms 0.4 → 0.5. Quads stay at 0.
- **stiff-leg-dumbbell-deadlift:** glutes 0.7 → 0.6, lower back 0.5 → 0.6. Added adductors 0.3 and forearms 0.3.
- **deadlift:** quads 0.4 → 0.5, because the pull off the floor is knee extension. Lower back 1.0 → 0.9. Hamstrings stay at 0.7 and glutes at 0.8.
- The result is that the RDL is now at least as hamstring-heavy as the deadlift, with less quad and slightly less glute.

## Mid traps on rows and rear-delt work
Rows and rear-delt exercises had no trap credit, even though retracting the shoulder blades works the mid and lower traps.
- Traps 0.5 (mid/lower head 0.5, upper 0.2) on barbell-row, pendlay-row, chest-supported-row, seated-cable-row, t-bar-row and face-pull.
- Traps 0.4 on reverse-pec-deck and dumbbell-rear-delt-fly, and 0.3 on one-arm-dumbbell-row.

## Head consistency
- **skull-crusher:** the triceps heads were long 0.9 and short 0.9, against a group rating of 1.0. Now they're long 0.9 and short 1.0.
- **All exercises:** each muscle group's rating now equals the highest of its heads, and regions without a split mirror their group exactly.
- **Coverage:** every rated muscle and head maps to a body-map region. None are orphaned, and every group has a region.

## Exercise guides
- **New fields:** each exercise now has `description` (one sentence), `howTo` (3 to 4 steps), `tip` (one form cue), and an empty `youtube` field.
- **Wording:** guides are plain-language form cues only, with no medical claims.

## Presets
- All 46 presets regenerated with `tools/gen_splits_v2.py`. They still show zero warnings in the program check.
