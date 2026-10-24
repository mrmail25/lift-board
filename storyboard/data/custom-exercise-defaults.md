# Custom exercise defaults (2026-10-24)

Data: data/custom-exercise-defaults.json. Code: tools/custom_exercise.py (build, validate, make_id, short_name, register), tools/build_custom_defaults.py, test tools/test_custom_exercise.py. **Modelled defaults from the library, not evidence**: each value is the lower median (or most common value) of the library exercises in the same movement_pattern x equipment cell. Every key, enum and unit is the one exercises.json uses.

## Form

- Movement patterns: `horizontal_push` (Horizontal push), `vertical_push` (Vertical push), `horizontal_pull` (Horizontal pull), `vertical_pull` (Vertical pull), `squat` (Squat), `hinge` (Hinge), `lunge` (Lunge / single-leg), `isolation` (Isolation), `core` (Core & carry), `other` (Power & other)
- Equipment: `machine`, `bodyweight`, `dumbbell`, `cable`, `barbell`, `smith machine`, `kettlebell`, `plate-loaded machine`, `rings`, `suspension`, `landmine`, `band`, `medicine ball`, `stability ball`, `trap bar`
- Muscles: `chest` Chest, `front_delts` Front delts, `side_delts` Side delts, `rear_delts` Rear delts, `lats` Lats, `upper_back` Upper back, `traps` Traps, `biceps` Biceps, `triceps` Triceps, `forearms` Forearms, `abs` Abs, `quads` Quads, `hamstrings` Hamstrings, `glutes` Glutes, `calves` Calves, `adductors` Adductors (inner thigh), `lower_back` Lower back, `obliques` Obliques, `abductors` Abductors (outer hip)
- Toggles: unilateral (default from the cell), stretch_focused (default from pattern x main muscle).

## Band ratios

| Band | Label | Range | Ratio | Library median | Most common |
|---|---|---|---|---|---|
| main | Main mover | 0.75 to 1.0 | 1.0 | 1.0 (n 264) | 1 (195), 0.8 (48), 0.9 (18) |
| helper | Helper | 0.4 to < 0.75 | 0.5 | 0.5 (n 346) | 0.5 (128), 0.4 (91), 0.6 (74) |
| minor | Minor | 0.25 to < 0.4 | 0.3 | 0.3 (n 152) | 0.3 (108), 0.25 (34), 0.35 (10) |

Each ratio is the median (and most common value) of library ratings inside its band: main 1.0, helper 0.5, minor 0.3. Minor uses 0.3, not 0.25: 0.3 is the library median for minor, and 0.25 sits exactly on the counting threshold (min_rating_to_count). data/custom-rules.json v1 (the copy-a-template flow) uses minor 0.25; the band form uses 0.3.

## Id and validation

- `custom-<slug>-<6 base36>` (regex `^custom-[a-z0-9]+(-[a-z0-9]+)*-[a-z0-9]{6}$`). library ids never start with "custom-" (tested); redraw the 6 random characters until the id is unused among custom exercises; never reuse an id after delete (history keys on it).
- Errors: name required, 1-60 chars, unique among custom exercises (case-insensitive); equipment in form.equipment; movement_pattern in form.movement_patterns; muscles: known ids, each listed once, band in main / helper / minor; exactly one Main mover.
- Warnings: name equals a library exercise name; more than 6 muscles (library median 3 counted muscles).
- Short name: 1) name if it fits (<= 16) and is free: kept as typed (a brand stays whole). 2) Otherwise equipment brands (BRANDS) are dropped as a whole unit, then the name is shortened: drop a parenthetical, library abbreviations (whole words) in order, drop leading words keeping the last two (the movement noun, e.g. 'Chest Press'), then leading hyphen parts, then the first word shortened with a period ('Concentrat. Curl'), then the last word alone, then a hard cut for one over-long word. 3) If that collides with a library or custom short name and the name had a brand, use the brand abbreviation as a pinned prefix ('HmS Iso Row') and shorten the rest to fit. 4) Still taken: ' 2', ' 3', ... (dropping leading words before cutting). A brand fragment can never show: brands are removed or replaced whole before any word is dropped or cut.

### Brands in short names

Equipment brands are one unit, matched whole-word and case-insensitive (a space or hyphen between brand words matches either). When the name must be shortened, the whole brand is dropped; only if the result collides with a library or custom short name is the brand abbreviation used as a pinned prefix. A brand is never split, so a fragment like "Strength Iso Row" cannot appear. A name that already fits (<= 16) is kept as typed, brand included.

| Brand | Abbreviation (collisions only) |
|---|---|
| Hammer Strength | HmS |
| Life Fitness | LF |
| Arsenal Strength | ArsS |
| Rep Fitness | RepF |
| Titan Fitness | TitanF |
| Star Trac | StarT |
| Pure Strength | PureS |
| Body-Solid | BSolid |
| Prime | Prime |
| Nautilus | Naut |
| Cybex | Cybex |
| Matrix | Matrix |
| Technogym | TGym |
| Precor | Precor |
| Rogue | Rogue |
| Panatta | Panatta |
| Gym80 | Gym80 |
| Atlantis | Atl |
| Freemotion | FM |
| Hoist | Hoist |
| Keiser | Keiser |
| Eleiko | Eleiko |
| Watson | Watson |
| Newtech | Newtech |
| Booty Builder | BootyB |
| Glute Builder | GluteB |

| Name | Short name |
|---|---|
| Hammer Strength Iso Row | Iso Row |
| Hammer Strength Iso-Lateral Chest Press | HmS Chest Press |
| Life Fitness Leg Press | LF Leg Press |
| Prime Plate-Loaded Row | Plate-Loaded Row |
| Nautilus Pullover | Pullover |
| Cybex Arm Curl | Cybex Arm Curl |
| Arsenal Strength Hip Thrust | ArsS Hip Thrust |
| Body Solid Lat Pulldown | BSolid Pulldown |
| Nautilus Leg Extension | Naut Extension |
| Hammer-Strength Seated Calf Raise | Calf Raise |

## Fields of a custom record

| Field | From | Rule |
|---|---|---|
| `id` | custom-<slug>-<6 base36> | make_id: slug = name lowercased, ASCII, non-alphanumerics -> "-", max 40; redraw on collision. Library ids never start with custom- (tested). Same format as data/custom-rules.json id_format. |
| `name` | form | trimmed, single spaces, 1-60 chars, unique among custom exercises (case-insensitive) |
| `short_name` | rule | short_name(): name if it fits (<= 16) and is free; else drop equipment brands as a whole (short_name.brands), drop a parenthetical, library abbreviations, drop leading words keeping the last two, then hyphen parts / a period-marked first word / the last word; on a collision use the brand abbreviation as a prefix; unique with " 2", " 3". Never a brand fragment. |
| `type` | cell | lower median of the cell on primary < accessory < isolation; isolation pattern -> isolation; compound pattern never isolation; core / other never primary |
| `equipment` | form | one of the exercises.json equipment values |
| `equipment_needs` | cell / equipment | most common list in the cell, else the equipment, else the rules.json equipment_items token |
| `muscles` | form | all 19 muscles; main 1.0, helper 0.5, minor 0.3, others 0. Stimulus per set: a set credits each muscle sets x rating (ratings >= 0.25 count) |
| `heads` | pattern | head = muscle rating x the pattern's median head/muscle ratio, scaled so the strongest head equals the muscle rating (group = max of heads, as data/custom-rules.json); single-head muscles copy the muscle |
| `description, howTo, tip, youtube, howto` | empty | "" / [] / {setup: "", cues: [], mistake: ""}; the user may add text |
| `fatigue` | cell | lower median of the cell (always a library value: 0.8, 1.0, 1.1, 1.2, 1.5); sets the recovery tier (heavy_axial_compound >= 1.5, other_compound >= 1.1, lighter_compound >= 1.0, isolation) |
| `patterns` | pattern x main muscle | most common slot list for that movement pattern and main muscle, else the pattern; checked so movement.py movement_pattern(e) == the chosen pattern |
| `movement_pattern` | form | one of rules.json movement_patterns.order |
| `swap.*` | cell | ordinals: lower median of the cell (stability from the equipment side); stretch_emphasis 3 when stretch_focused else <= 2; muscle_isolation: compound 1, isolation 2 (3 on stable equipment). flags: the cell majority among unilateral, constant_tension, grip_demand, spinal_load, static_hold, overhead_finish, peak_contraction_focus; the form toggle overrides unilateral; bias flags (upper_chest_bias, ...) are never defaulted |
| `categories` | cell / equipment | most common list (calisthenics for most bodyweight / rings cells); omitted when empty |
| `bodyweight_fraction, bodyweight_basis` | cell / equipment | only when most of the cell has a fraction: lower median, basis "modeling"; bodyweight_ref and bodyweight_assisted are never set |
| `untracked_target` | never | custom exercises always credit a tracked muscle |
| `custom, estimated` | constant | true / true (custom: excluded from library suggestion pools, as suggest.py / rank.py / patterns.py already do; estimated: the est. badge) |
| `pattern` | pattern x main muscle | legacy rules.json patterns key (push / pull ratio, redundant pattern, same-pattern swaps); swap.py already reads e.pattern; the Builder must also register the id in rules.patterns[pattern] |
| `stretch_biased_for` | toggle | when stretch_focused: the main muscle (if it has a rules.stretch_biased list) plus glutes when glutes are main or helper on a squat / lunge / hinge (the glute stretch rule); register the id in those lists (credit for the per-muscle stretch check) |
| `rep_range` | cell | {low, high, unit, not_to_failure}: the cell's most common whiteboard rep range (unit reps / seconds / meters); register as a per-id rep_ranges override |
| `defaults_source` | info | which cell / fallback each group came from (for the "estimated" tooltip and debugging) |

## Base exercise (pick a library base first, then adjust)

the user picks a base BEFORE choosing muscles (ratios are inherited from the base), so ranking works from the name, movement pattern and equipment, plus grip / angle hints; muscles are optional.

Fixture: data/custom-exercise-base-reference.json (43 drafts with the expected list and the top 3 marked, no-match drafts, library self-match, derive cases with expected records).

### Suggest

- Inputs: name (required); movement_pattern (optional (used once picked)); equipment (optional (used once picked)); main_muscle (optional: small bonus only); muscles (optional band chips: small muscle_similarity component only).
- Score: sum(weight x component) over the components that are available for the draft, divided by the sum of those weights; plus the main_muscle bonus; capped at 1; rounded to 4 decimals.
- Count: default 3, max 5. Threshold: a library exercise is suggested only if score >= 0.35 and name component >= 0.2 (or it is the exact name match). If none qualifies, nothing is suggested and the form falls back to the pattern x equipment defaults (no_base_fallback).
- Candidates: library exercises with muscle credit (246 of 247; without any: tibialis-raise); never custom exercises.

| Component | Weight | Rule |
|---|---|---|
| name | 0.55 | rare-token weighted Jaccard of normalized name tokens: sum of weights of shared tokens / sum of weights of all tokens in either name. Token weight = ln((N + 1) / (df + 0.5)), df = number of library names containing the token (N = library size), so rare words (jm, nordic, copenhagen) count more than common ones (press, curl, machine). A typo (similar spelling, see typo rule) shares at 0.8 of the library token weight. |
| hints | 0.1 | grip / angle / position hints (hint_vocab): +1 per draft hint the base shares, -0.5 per draft hint group the base contradicts (incline vs decline), -0.25 per hint group only the base has (it is more specific than the draft); divided by the number of draft hints (min 1), clamped to -1..1 |
| movement_pattern | 0.15 | 1 same movement_pattern; 0.5 a near pattern (pattern_near); else 0. Used only once the draft has a pattern. |
| equipment | 0.15 | 1 same equipment; 0.5 same equipment family (swap.py FAM: machine / free / bodyweight / cable); else 0. Used only once the draft has equipment. |
| muscle_similarity | 0.05 | cosine of the draft band ratios vs the base counted ratings (>= 0.25). Used only if the user has already entered muscles. |
| main_muscle | bonus +0.04 | bonus +0.04 when the user already picked a Main mover and it is the base's main mover; never a penalty |

Tie-break: exact normalized name match first (short-circuit: always rank 1) > score desc > name component desc > fewer hint conflicts > same equipment first > same movement_pattern first > fewer name tokens > name asc > id asc.

### Name normalization

- remove brand words (short_name.brands), ASCII-fold, lowercase, drop apostrophes, split on hyphens / slashes / brackets / punctuation, plural rule per word, join phrases, synonyms, drop stopwords, de-duplicate.
- Exact match: the normalized token SET equals a library name's token set (word order ignored: Machine Preacher Curl = Preacher Curl Machine); short-circuits to rank 1.
- Token weight: ln((N + 1) / (df + 0.5)), N = library size, df = library names containing the token; unknown tokens get the highest weight.
- Plurals: tokens ending in "ies" -> "y" (flies -> fly); "sses" / "shes" / "ches" / "xes" drop "es" (presses -> press); other tokens of 3+ letters ending in "s" (not "ss", "us") drop the "s" (curls -> curl, lunges -> lunge, ups -> up); PLURAL_KEEP words are left for the synonym table.
- Typos: an unshared draft token of 4+ letters matches an unshared library token when difflib ratio >= 0.8 (e.g. bulgarain ~ bulgarian); it shares at 0.8 x the library token weight.
- Stopwords: a, an, and, at, custom, exercise, for, in, my, new, of, on, or, style, the, to, using, variation, version, w, with.
- Phrases: low to high -> low high lowtohigh, high to low -> high low hightolow, farmer walk -> farmer carry, farmers carry -> farmer carry, smith machine -> smith, ez bar -> ezbar, e z bar -> ezbar, t bar -> tbar, trap bar -> trapbar, hex bar -> trapbar, iso lateral -> isolateral, one arm -> singlearm, 1 arm -> singlearm, single arm -> singlearm, one leg -> singleleg, 1 leg -> singleleg, single leg -> singleleg, two arm -> twoarm, 2 arm -> twoarm, side lying -> sidelying, stiff leg -> stiffleg, stiff legged -> stiffleg, straight arm -> straightarm, chest supported -> chestsupported, plate loaded -> plateloaded, pull down -> pulldown, push down -> pushdown, press down -> pushdown, pull up -> pullup, chin up -> chinup, push up -> pushup, push ups -> pushup, step up -> stepup, sit up -> situp, muscle up -> muscleup, get up -> getup, l sit -> lsit, skull crusher -> skullcrusher, hamstring curl -> leg curl, ham curl -> leg curl, narrow grip -> close grip, kick back -> kickback, pec dec -> pec deck, pec fly -> pec deck, over head -> overhead, glute ham -> gluteham.
- Synonyms: db -> dumbbell, dbs -> dumbbell, dumbell -> dumbbell, bb -> barbell, kb -> kettlebell, kbs -> kettlebell, ez -> ezbar, rdl -> romanian deadlift, sldl -> stiffleg deadlift, ohp -> overhead press, dl -> deadlift, bss -> bulgarian split squat, ghr -> gluteham raise, hspu -> handstand pushup, cgbp -> close grip bench press, sl -> singleleg, pullups -> pullup, chinups -> chinup, pushups -> pushup, pushdowns -> pushdown, pulldowns -> pulldown, skullcrushers -> skullcrusher, tri -> triceps, tricep -> triceps, bicep -> biceps, bi -> biceps, lats -> lat, ext -> extension, flye -> fly, flie -> fly, overhand -> pronated, underhand -> supinated, narrow -> close, iso -> isolateral, selectorised -> selectorized, hyper -> hyperextension, hypers -> hyperextension, raises -> raise, calves -> calf, abs -> ab.

### Grip / angle hints

| Group | Tokens (value) |
|---|---|
| bench_angle | incline, decline, flat |
| grip | neutral, pronated, supinated, hammer (neutral), reverse (pronated) |
| grip_width | wide, close |
| body_position | seated, standing, lying, kneeling, sidelying (lying), prone (lying) |
| laterality | singlearm (one_side), singleleg (one_side), unilateral (one_side), twoarm (both_sides), double (both_sides) |
| cable_height | high, low, lowtohigh (low_to_high), hightolow (high_to_low) |
| feature | preacher, isolateral, converging, chestsupported, deficit, spider, bayesian, concentration, plateloaded, selectorized, straightarm, stiffleg, sumo, pause, paused, tempo, feet, elbow, assisted, weighted |

Near patterns (0.5): horizontal_push / vertical_push; horizontal_pull / vertical_pull; squat / lunge. Equipment families (0.5): bodyweight: bodyweight, rings, suspension; cable: cable; free: barbell, dumbbell, kettlebell, trap bar, landmine; machine: machine, plate-loaded machine, smith machine.

Library self-match: 492 / 492 drafts (100.0%) return the exercise itself at rank 1 (each library name typed alone, and with its own movement pattern and equipment, must return itself at rank 1 as the exact match).

| Draft | Expected top 3 |
|---|---|
| Hammer Strength Iso Row | iso-lateral-row, iso-lateral-chest-press, iso-lateral-shoulder-press |
| Cable Y-Raise | cable-y-raise, cable-lateral-raise, cable-curl |
| Belt Squat | belt-squat, smith-squat, hack-squat |
| Kettlebell Swing | kettlebell-swing, kettlebell-clean, kettlebell-snatch |
| Machine Preacher Curl | machine-preacher-curl, preacher-curl, cable-preacher-curl |
| Nordic Curl | nordic-curl |
| Ring Dip | ring-dip, ring-push-up, weighted-dip |
| Copenhagen Plank | copenhagen-plank, side-plank |
| JM Press | jm-press |
| Landmine Lateral Lunge | walking-lunge, landmine-squat, dumbbell-reverse-lunge |
| Hammer Strength Iso-Lateral Row | iso-lateral-row, iso-lateral-chest-press, iso-lateral-shoulder-press |
| Life Fitness Leg Press | leg-press, single-leg-press, horizontal-leg-press |
| Hammer Strength Iso-Lateral Chest Press | iso-lateral-chest-press, iso-lateral-shoulder-press, iso-lateral-row |
| Hammer Strength High Row | high-row-machine, high-to-low-row-machine, high-cable-curl |
| Cybex Lat Pulldown | lat-pulldown, single-arm-lat-pulldown, arc-lat-pulldown |
| Nautilus Pullover | pullover-machine, dumbbell-pullover |
| Matrix Seated Leg Curl | seated-leg-curl, seated-machine-curl, seated-calf-raise |
| Panatta Hack Squat | hack-squat, reverse-hack-squat, pendulum-squat |
| Technogym Incline Chest Press | incline-machine-press, machine-chest-press, smith-incline-press |
| Prime Preacher Curl | preacher-curl, machine-preacher-curl, cable-preacher-curl |
| Booty Builder Hip Thrust | hip-thrust, hip-thrust-machine, smith-hip-thrust |
| DB incline press | incline-dumbbell-press, incline-dumbbell-curl, incline-dumbbell-fly |
| KB swing | kettlebell-swing |
| RDL | romanian-deadlift, dumbbell-rdl, landmine-rdl |
| DB RDL | dumbbell-rdl, romanian-deadlift, smith-rdl |
| OHP | overhead-press, smith-overhead-press |
| 1-arm DB row | one-arm-dumbbell-row, single-arm-cable-row, landmine-press-one-arm |
| Tricep pushdowns | triceps-pushdown |
| Lat pull-down wide grip | wide-grip-lat-pulldown, wide-grip-cable-row, neutral-grip-lat-pulldown |
| Neutral grip pulldown | neutral-grip-lat-pulldown, close-grip-pulldown, wide-grip-lat-pulldown |
| Decline bench | decline-bench-press, barbell-bench-press |
| Skullcrushers | skull-crusher |
| Bulgarain split squats | bulgarian-split-squat, smith-split-squat |
| Chinups | chin-up |
| Hammer curls | hammer-curl, cable-rope-hammer-curl, dumbbell-curl |
| Smith squat | smith-squat, smith-split-squat |
| Single arm cable row | single-arm-cable-row, one-arm-dumbbell-row, single-arm-lat-pulldown |
| Lying hamstring curl | lying-leg-curl, seated-leg-curl, kneeling-leg-curl |
| Farmer's walk | farmer-carry |
| Incline DB curls | incline-dumbbell-curl, incline-dumbbell-press, dumbbell-curl |
| Sled Push | no match -> fallback other|machine |
| Battle Ropes | no match -> fallback ask for movement pattern and equipment, then use that cell |
| Tire Flip | no match -> fallback hinge|bodyweight |

### No-base fallback order

1. **the typed name equals a library name after normalization**: that library exercise is pre-selected as the base (rank 1); the user can still pick another or none.
2. **otherwise, library exercises reaching the threshold (score >= 0.35 and name component >= 0.2)**: show the top 3 (up to 5 with "more"); picking one copies its ratings (derive rules).
3. **nothing reaches the threshold, or the user taps "None of these"**: no base: the user picks movement pattern, equipment and muscle bands; the other fields come from the defaults below.
3a. **pattern x equipment cell has >= 3 library exercises**: type, fatigue, rep range, swap scores, flags, equipment needs, stability, bodyweight, categories from the cell (lower medians / modes).
3b. **cell has < 3 library exercises**: movement fields (type, fatigue, rep range, swap scores except stability, flags) from all library exercises with that movement pattern.
3c. **cell has < 3 library exercises**: equipment fields (equipment needs, stability, bodyweight, categories) from all library exercises with that equipment if >= 3, else the structural equipment rule.
3d. **pattern unknown to the library (does not happen with the current pattern list)**: global lower medians.
3e. **always (no base)**: slot list and legacy pattern from the pattern x Main mover table, else the pattern table; heads from the pattern head shape, else the library head shape, else equal heads; stretch default from the pattern x Main mover share.

### ⓘ Estimated explainer

based_on_base when base_id is set and nothing was changed (all muscles kept, no pattern / equipment / Main mover change); based_on_base_edited when base_id is set and something changed; pattern_defaults when there is no base.

- **based_on_base**: These ratings are copied from {base}, a similar exercise in the library. Library ratings are modelled estimates set from mainstream training research and biomechanics. They were not measured on you or on your machine.
- **based_on_base_edited**: These ratings started from {base}, a similar library exercise whose ratings are modelled estimates set from mainstream training research and biomechanics. You changed some of the bands, and the model now follows your choices. None of it was measured on you.
- **pattern_defaults**: No library exercise matched closely, so these ratings are typical values for {pattern} exercises using {equipment} in the library. They are modelled estimates set from mainstream training research and biomechanics, not measurements of you. Change the bands if this exercise works differently, and the model will follow.

### Chips

| Band | Label | Ratio range | Shown | Counted |
|---|---|---|---|---|
| main | Main mover | 0.75 to <= 1.0 | yes | yes |
| helper | Helper | 0.4 to < 0.75 | yes | yes |
| minor | Minor | 0.25 to < 0.4 | yes | yes |
| - | not shown | 0.0 to < 0.25 | no | no |

Chips show the band of each counted muscle (>= 0.25). The record keeps the exact ratio: a kept 0.8 stays 0.8 and shows as Main mover. A base ratio under 0.25 has no chip and is not counted, but stays in the data; the user can promote it by adding the muscle at a band (it then counts as added, at the band value).

### Derive from the base

- kept: same band as the base -> the base's exact ratio (not snapped)
- moved: different band -> the band value (main 1.0, helper 0.5, minor 0.3)
- added: not counted in the base (0 or < 0.25) -> the band value
- removed: counted in the base, chip removed -> 0
- trace_kept: base ratio under 0.25 the user did not add -> kept as is, hidden

| Field | Carry-over and reset |
|---|---|
| muscles | kept band (the chip band equals the base's band) = the base's exact ratio, not snapped; moved to another band or added = the band value (1.0 / 0.5 / 0.3); removed = 0; a base ratio under 0.25 the user did not touch = kept as is (hidden chip, not counted) |
| heads | kept muscle: the base's heads exactly; moved / added: the base's head shape for that muscle scaled so its strongest head equals the new rating (pattern default shape if the base had none); removed: 0 |
| stretch_focused | carries over (on when the base is on a stretch list for one of its muscles or has stretch_emphasis 3): stretch_biased_for = the base's lists for muscles still counted. Resets to the pattern x main-muscle default when the Main mover changes. The toggle always wins. |
| unilateral | carries over from the base flag; never reset automatically; the toggle always wins |
| fatigue | carries over; resets to the cell default when movement_pattern or equipment changes |
| type | carries over; resets to the cell default when movement_pattern changes |
| rep_range | carries over (the base's whiteboard rep range, override included); resets to the cell default when movement_pattern changes |
| swap_scores | carry over; stability resets with an equipment change; muscle_isolation, systemic_fatigue, loading_potential, skill_demand and grip_width reset to the cell when movement_pattern or equipment changes; stretch_emphasis follows the stretch toggle (3 on, else min(base, 2)) |
| flags | generic flags (unilateral, constant_tension, grip_demand, spinal_load, static_hold, overhead_finish, peak_contraction_focus) carry over and reset to the cell with a movement_pattern or equipment change; unilateral follows its toggle; region bias flags (upper_chest_bias, ...) carry only while the Main mover and movement_pattern are unchanged |
| patterns, pattern (legacy) | carry over; reset to the pattern x main-muscle table when movement_pattern or the Main mover changes |
| equipment_needs, categories, bodyweight_fraction | carry over; reset to the cell's equipment side when equipment changes (bodyweight_fraction also when movement_pattern changes) |
| description, howTo, tip, howto, youtube | carry over as editable text |
| promote_trace | a base ratio under 0.25 is hidden (no chip) but kept in the data; the user can promote it by adding that muscle at any band, which then counts as added (band value) |

Validation: as the band form, except that a second Main mover kept from the base (38 library exercises have two) is allowed; the user cannot add another one.

## Lookup

- cells["<movement_pattern>|<equipment>"]: every one of the 10 x 15 combinations, already resolved. source.movement_fields = cell (>= 3 library exercises) | pattern | global; source.equipment_fields = cell | equipment | equipment_rule.
- slots_by_pattern_muscle["<movement_pattern>|<main muscle>"], else slots_by_pattern[movement_pattern]
- lower median (the lower middle value for an even count), so every default is a value the library actually uses

## Registering a custom exercise (Builder load step)

1. Add the record to the exercise table (EX) used by the planner, analysis, ranker, whiteboard, warm-up and logger.
2. rules.patterns[record.pattern].push(id) (legacy pattern map: push / pull ratio, redundant pattern, same-pattern swaps).
3. For m in record.stretch_biased_for: rules.stretch_biased[m].push(id) (per-muscle stretch check credit and stretch share).
4. rules.rep_ranges.overrides.push({id, exercises: [id], unit, range: {low, high}, not_to_failure}) from record.rep_range (whiteboard rep_range reports source override:<id>).
5. Never add custom ids to rules.heavy_squats / heavy_hinges or staples: heavy spine sets and fix staples stay library-only.
6. Pass customs to the ranker as state.custom (rank.py already supports it); suggestion pools skip custom: true.

## Per-exercise fields read by the tools (audit)

| Tool | Fields |
|---|---|
| check_program.py | muscles, type (rest minutes), patterns (pattern_gap slots), legacy PAT map (push / pull, redundant_pattern), HEAVY id lists (spine sets), stretch_biased id lists |
| analysis.py | muscles, fatigue, type, swap.flags (unilateral), swap.stretch_emphasis, swap.systemic_fatigue, movement_pattern via movement.py, stretch_biased id lists |
| suggest.py | muscles, fatigue, type, name, custom (excluded from candidates) |
| swap.py | muscles, equipment, fatigue, type, name, pattern / PAT, patterns, untracked_target, stretch lists |
| rank.py | muscles, heads, type, equipment, equipment_needs, patterns, swap ordinals + flags (spinal_load, systemic_fatigue), custom; state.custom pool |
| whiteboard.py | muscles (primary_region via rules.body_regions), swap.flags (unilateral -> per side), rep_ranges overrides by id, short_name |
| warmup.py / prs.py / exercise_dsl.py | equipment, bodyweight_fraction, bodyweight_assisted, type, muscles (prs.py already merges history.customExercises) |
| check_priority.py / muscle_deepdive.py | muscles, name, fatigue, type (through analysis / check_program); deep-dive ranked_adds skips custom |
| templates.py | movement_pattern, patterns, type, name (preset slots use library ids only) |
| exercise_detail.py | every field above plus heads, howto, tip (the Builder builds the custom detail popup from the record) |

## Limits

- Custom exercises never count as heavy spine sets (spinal_load check) or heavy squat / hinge for the beginner and hinge-before-squat notes: those lists are id-based and stay library-only. The swap flag spinal_load and fatigue 1.5 still feed the ranker and recovery cost.
- Stretch credit needs the stretch_focused toggle (it adds the id to rules.stretch_biased[main]); the default comes from the share of library exercises with that pattern and main muscle on the list.
- The stretch toggle credits the main mover. 7 library squats / lunges are on the glute stretch list but not the quads list; a custom clone of them with the toggle on would also get quads credit (test: 239 / 246 clones match the library lists exactly, the rest only add the main mover).
- exercise_detail.py builds the popup for library ids only; the Builder builds a custom popup from the record (body_map from muscles / heads, fatigue tier, rep range, est. badge).
- Templates and presets never use custom ids; fix staples stay library-only, so a fix never suggests a custom exercise.

## Round trip against the library

leave-one-out over the library (defaults recomputed without the exercise); the form uses the exercise's real bands (main = its top muscle, helper >= 0.4, minor >= 0.25), unilateral flag and stretch-list membership (n = 246).

- Muscle credit: mean absolute error 0.0107 per muscle; 0.2028 effective sets per set summed over muscles; total credit off by 8.2% on average (band snapping only).
- Heads: mean absolute error 0.017.
- Exact match: type 88.2%, fatigue 72.4% (mean abs error 0.0581), recovery tier 72.8%, movement_pattern 100.0%, main slot 97.2%, legacy pattern 87.8%, rep range 74.4%, equipment_needs 65.4%, bodyweight presence 91.5% (fraction error 0.1593), stretch default 79.7%.
- Swap ordinals: stretch_emphasis 90.7%, muscle_isolation 95.9%, stability 95.1%, systemic_fatigue 83.7%, loading_potential 80.9%, skill_demand 77.2%, grip_width 95.5%.
- Flags: unilateral 100.0%, constant_tension 98.8%, grip_demand 89.4%, spinal_load 93.5%, static_hold 96.7%, overhead_finish 98.0%, peak_contraction_focus 95.1%.
- Fatigue exact match by source: cell 85.5% (n 166), pattern 45.0% (n 80); no library exercise needs the global fallback.
- Largest credit errors: `deadlift` 1.05, `rack-pull` 0.8, `trx-y-t-raise` 0.7, `turkish-get-up` 0.7, `kettlebell-halo` 0.7.

## Cells

| Cell | n | Source (movement / equipment) | Type | Fatigue | Tier | Rep range | Flags |
|---|---|---|---|---|---|---|---|
| horizontal_push|machine | 5 | cell / cell | accessory | 1.0 | lighter_compound | 8-12 reps | - |
| horizontal_push|bodyweight | 5 | cell / cell | accessory | 1.0 | lighter_compound | 8-12 reps | - |
| horizontal_push|dumbbell | 2 | pattern / equipment | accessory | 1.0 | lighter_compound | 8-12 reps | - |
| horizontal_push|barbell | 5 | cell / cell | primary | 1.2 | other_compound | 6-10 reps | - |
| horizontal_push|smith machine | 4 | cell / cell | primary | 1.0 | lighter_compound | 6-10 reps | - |
| horizontal_push|plate-loaded machine | 2 | pattern / equipment | accessory | 1.0 | lighter_compound | 8-12 reps | - |
| horizontal_push|rings | 2 | pattern / equipment | accessory | 1.0 | lighter_compound | 8-12 reps | - |
| horizontal_push|suspension | 1 | pattern / equipment | accessory | 1.0 | lighter_compound | 8-12 reps | - |
| horizontal_push|landmine | 2 | pattern / equipment | accessory | 1.0 | lighter_compound | 8-12 reps | - |
| vertical_push|machine | 1 | pattern / equipment | accessory | 1.2 | other_compound | 8-12 reps | overhead_finish |
| vertical_push|bodyweight | 2 | pattern / equipment | accessory | 1.2 | other_compound | 8-12 reps | overhead_finish |
| vertical_push|dumbbell | 2 | pattern / equipment | accessory | 1.2 | other_compound | 8-12 reps | overhead_finish |
| vertical_push|barbell | 1 | pattern / equipment | accessory | 1.2 | other_compound | 8-12 reps | overhead_finish |
| vertical_push|smith machine | 2 | pattern / equipment | accessory | 1.2 | other_compound | 8-12 reps | overhead_finish |
| vertical_push|kettlebell | 2 | pattern / equipment | accessory | 1.2 | other_compound | 8-12 reps | overhead_finish |
| vertical_push|plate-loaded machine | 1 | pattern / equipment | accessory | 1.2 | other_compound | 8-12 reps | overhead_finish |
| vertical_push|landmine | 1 | pattern / equipment | accessory | 1.2 | other_compound | 8-12 reps | overhead_finish |
| horizontal_pull|machine | 2 | pattern / equipment | accessory | 1.0 | lighter_compound | 8-12 reps | - |
| horizontal_pull|bodyweight | 2 | pattern / equipment | accessory | 1.0 | lighter_compound | 8-12 reps | - |
| horizontal_pull|dumbbell | 2 | pattern / equipment | accessory | 1.0 | lighter_compound | 8-12 reps | - |
| horizontal_pull|cable | 3 | cell / cell | accessory | 1.0 | lighter_compound | 8-12 reps | constant_tension |
| horizontal_pull|barbell | 5 | cell / cell | primary | 1.2 | other_compound | 6-10 reps | grip_demand, spinal_load |
| horizontal_pull|smith machine | 1 | pattern / equipment | accessory | 1.0 | lighter_compound | 8-12 reps | - |
| horizontal_pull|kettlebell | 1 | pattern / equipment | accessory | 1.0 | lighter_compound | 8-12 reps | - |
| horizontal_pull|plate-loaded machine | 4 | cell / cell | accessory | 1.0 | lighter_compound | 8-12 reps | - |
| horizontal_pull|rings | 1 | pattern / equipment | accessory | 1.0 | lighter_compound | 8-12 reps | - |
| horizontal_pull|suspension | 1 | pattern / equipment | accessory | 1.0 | lighter_compound | 8-12 reps | - |
| horizontal_pull|landmine | 2 | pattern / equipment | accessory | 1.0 | lighter_compound | 8-12 reps | - |
| vertical_pull|machine | 2 | pattern / equipment | accessory | 1.2 | other_compound | 8-12 reps | - |
| vertical_pull|bodyweight | 3 | cell / cell | primary | 1.2 | other_compound | 6-10 reps | grip_demand |
| vertical_pull|cable | 5 | cell / cell | accessory | 1.2 | other_compound | 8-12 reps | constant_tension |
| vertical_pull|plate-loaded machine | 2 | pattern / equipment | accessory | 1.2 | other_compound | 8-12 reps | - |
| vertical_pull|rings | 1 | pattern / equipment | accessory | 1.2 | other_compound | 8-12 reps | - |
| squat|machine | 6 | cell / cell | primary | 1.0 | lighter_compound | 6-10 reps | - |
| squat|dumbbell | 1 | pattern / equipment | primary | 1.0 | lighter_compound | 6-10 reps | - |
| squat|barbell | 2 | pattern / equipment | primary | 1.0 | lighter_compound | 6-10 reps | - |
| squat|smith machine | 2 | pattern / equipment | primary | 1.0 | lighter_compound | 6-10 reps | - |
| squat|kettlebell | 1 | pattern / equipment | primary | 1.0 | lighter_compound | 6-10 reps | - |
| squat|plate-loaded machine | 3 | cell / cell | primary | 1.0 | lighter_compound | 6-10 reps | - |
| squat|landmine | 1 | pattern / equipment | primary | 1.0 | lighter_compound | 6-10 reps | - |
| hinge|dumbbell | 2 | pattern / equipment | accessory | 1.2 | other_compound | 6-10 reps | grip_demand, spinal_load |
| hinge|barbell | 4 | cell / cell | primary | 1.5 | heavy_axial_compound | 6-10 reps | grip_demand, spinal_load |
| hinge|smith machine | 1 | pattern / equipment | accessory | 1.2 | other_compound | 6-10 reps | grip_demand, spinal_load |
| hinge|kettlebell | 4 | cell / cell | accessory | 1.2 | other_compound | 5-10 reps | unilateral |
| hinge|landmine | 1 | pattern / equipment | accessory | 1.2 | other_compound | 6-10 reps | grip_demand, spinal_load |
| hinge|trap bar | 1 | pattern / equipment_rule | accessory | 1.2 | other_compound | 6-10 reps | grip_demand, spinal_load |
| lunge|bodyweight | 2 | pattern / equipment | accessory | 1.1 | other_compound | 8-12 reps | unilateral |
| lunge|dumbbell | 4 | cell / cell | accessory | 1.2 | other_compound | 8-12 reps | unilateral |
| lunge|smith machine | 1 | pattern / equipment | accessory | 1.1 | other_compound | 8-12 reps | unilateral |
| lunge|suspension | 1 | pattern / equipment | accessory | 1.1 | other_compound | 8-12 reps | unilateral |
| isolation|machine | 28 | cell / cell | isolation | 0.8 | isolation | 10-15 reps | - |
| isolation|bodyweight | 11 | cell / cell | isolation | 0.8 | isolation | 10-15 reps | - |
| isolation|dumbbell | 18 | cell / cell | isolation | 0.8 | isolation | 10-15 reps | - |
| isolation|cable | 20 | cell / cell | isolation | 0.8 | isolation | 10-15 reps | constant_tension |
| isolation|barbell | 8 | cell / cell | isolation | 0.8 | isolation | 10-15 reps | - |
| isolation|smith machine | 3 | cell / cell | isolation | 0.8 | isolation | 6-10 reps | - |
| isolation|rings | 4 | cell / cell | isolation | 0.8 | isolation | 10-15 reps | - |
| isolation|suspension | 4 | cell / cell | isolation | 0.8 | isolation | 10-15 reps | - |
| isolation|band | 2 | pattern / equipment_rule | isolation | 0.8 | isolation | 10-15 reps | - |
| core|machine | 2 | pattern / equipment | isolation | 0.8 | isolation | 10-20 reps | - |
| core|bodyweight | 9 | cell / cell | isolation | 0.8 | isolation | 10-20 reps | - |
| core|dumbbell | 2 | pattern / equipment | isolation | 0.8 | isolation | 10-20 reps | - |
| core|cable | 4 | cell / cell | isolation | 0.8 | isolation | 10-20 reps | constant_tension |
| core|barbell | 1 | pattern / equipment | isolation | 0.8 | isolation | 10-20 reps | - |
| core|kettlebell | 4 | cell / cell | accessory | 1.0 | lighter_compound | 5-10 reps | unilateral |
| core|rings | 1 | pattern / equipment | isolation | 0.8 | isolation | 10-20 reps | - |
| core|suspension | 2 | pattern / equipment | isolation | 0.8 | isolation | 10-20 reps | - |
| core|landmine | 1 | pattern / equipment | isolation | 0.8 | isolation | 10-20 reps | - |
| core|stability ball | 1 | pattern / equipment_rule | isolation | 0.8 | isolation | 10-20 reps | - |
| other|bodyweight | 6 | cell / cell | accessory | 1.0 | lighter_compound | 3-6 reps | - |
| other|medicine ball | 2 | pattern / equipment_rule | accessory | 1.0 | lighter_compound | 3-6 reps | - |

Cells with no library exercise (79) use the pattern and equipment fallbacks; see the JSON.
