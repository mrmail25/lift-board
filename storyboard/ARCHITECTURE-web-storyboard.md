# Ape-Chit rebuild of Lift Board: architecture (one page)

The storyboard at `storyboard/` is a mock (fixed data, no real logic). This page describes the **rebuild** it previews, and notes where the storyboard already works that way.

## Layout: one bundle, no build step
```
index.html          viewport no-zoom, loads tokens.css, app.css, then the scripts in order below (plain <script>, no bundler)
tokens.css          design tokens (colour, type, space, radii, motion); the only place colours and the logo path live
logic/              pure functions, no DOM. Each sets one global (window.LB.loads, …) so node tests can call it
  loads.js prs.js warmup.js deload.js review.js volume.js   ported UNCHANGED from the current app; diff-tested (below)
  rank.js           ONE ranker: line-for-line port of Coach's tools/rank.py (+ the swap.py / patterns.py parts it calls).
                    BUILT in the storyboard (storyboard/logic/rank.js). Reads every weight, goal label/short/label_note, reason
                    string, favorite boost/margin (0.10), day-theme weight (contexts.*.weights.theme: tray/empty 0.08, swap/preset 0)
                    and volume_bands from rules.json/targets.json/patterns.json/splits.json. Spec order: hard filters (excluded,
                    gym equipment, same day, swap/slot eligibility) -> score -> tie-break -> 1-2 reasons. Swap, tray, empty
                    workout and preset slots all call rank(); the "why" line is r.reasons joined, shown under each row.
                    Parity: `node storyboard/test/rank.diff.js` = 0 mismatches on all 58 ranking-reference.json cases, neutral
                    swap == swap.py swaps() for all 239 exercises, neutral preset == patterns.py slot_recommendations() (72).
                    Python semantics ported exactly (round() ties-to-even on the binary value, stable tuple sorts, dict order).
  swaptags.js       port of tools/swaptags.py diff_tags (swap-sheet lines, priority order, max swap_tags.compare.max_lines)
components/         sheet.js (THE bottom sheet: grab handle, swipe-down close, snap-back), keypad.js (0-9 . ⌫, edits in place,
                    no reflow), swipe.js (swipe-left delete), calendar.js, plates.js (bar picker), musclemap.js (MIT SVG paths)
screens/            train, workout, log, build, progress, settings, learn (index, muscle, fundamental, exercise), style
data/               loaders only: exercises.json, rules.json, targets.json, education/** are read, never written
```
Router: hash routes (`#train`, `#workout`, `#learn-biceps`, `#learn-ex-<id>` …), one delegated click handler, one render per route.

## Design tokens (`tokens.css`)
Black, white and one accent, **Ember #E8430C** (pressed/small text #C2380A, tint #FDECE6). Functional colours: delete red #E5242B,
over-volume amber #F0A830 / red #D93B30 (from targets.json gradient colours). System font stack, type 34/22/17/15/13/11,
spacing 4–32, radii 8/12/16/22, ease cubic-bezier(.32,.72,0,1), 120/240/380 ms. Logo: `--logo-icon`, `--logo-lockup` only
(assets/logo/*-v3, copied from ape-chit-logo/out/).

## Shared rules keys (single source of truth)
- **`rules.json volume_bands`** (CoS, 2026-10-21): amber when weekly sets > max, red when > max × `red_factor` (1.25 today).
  The **volume panel and the body map share this one key** through one function (`vStat` in the storyboard, `logic/volume.js`
  in the rebuild). No factor is hardcoded; if the key is missing nothing turns red. Test `volumeFactorChangeFlipsPanel` rewrites
  the factor to 1.5/1.1 and checks both surfaces follow.
- `rules.json swap_tags` — swap-sheet wording ("Typical differences, not guarantees.").
- Display bands for ratings (Coach, a model): main ≥ 0.75, helper 0.4–<0.75, minor 0.25–<0.4, not counted < 0.25.

## Suggestions UI (ranking-spec §8b, approved by CoS)
- Tray: segmented **Suggested** (default, `rank('tray', candidates)`) / **Library** (exercises.json order). Search and filter chips are
  hard filters in both modes and stay on `equipment` labels. Each suggestion has a 1–2 reason line directly under it, never a popup.
- Settings goals: multi-select up to `goal_combine.max_goals` (3) with Coach's labels and `label_note` footnotes from rules.json;
  `goal_conflicts` show as a flag with Coach's message and evidence badge.
- Gym profile `equipment: {token: bool}` over **rules.json `equipment_items`** (36 tokens, labels, groups, `implies`, `legacy`):
  Settings > Gyms > Home gym shows one checkbox per token, grouped, with Coach's labels; the full map is saved on the first edit.
  "Start from: **Home template** / **Commercial template**" (`example_profiles`) only pre-ticks boxes; the user ticks what the gym
  actually has, and the templates' example loads (e.g. their dumbbell sets) are never copied into the user's gym.
  rank.js `needsStatus` = rank.py `needs_status`: with no map, or an exercise without `equipment_needs`, the old `equipment` status
  applies (neutral parity); otherwise every need must be met, `a|b` = either, a token is met if ticked, implied by a ticked broader
  token (adjustable_bench -> flat_bench, ghd -> hyperextension_bench) or, if unset, by the loads fields via `legacy`; unknown tokens
  keep the exercise with note `equipment_unknown`. Unavailable = hard filter in every context. Chips and labels keep using `equipment`.
  Exercise pages show Coach's "Needs:" line (`equipment_needs.text`). Template check: Home leaves 60 of 239 exercises, Commercial 220.
- Data freeze: the storyboard reads its own copies in `storyboard/data/` first. `sync-education.sh` copies Education only;
  `sync-ranking-data.sh` copies rules/exercises/targets/patterns/splits/ranking-reference **once per Coach "done" post**, then rerun the diffs.

## Education (Learn) — data-driven, no per-page code
- Book icon in the Train/Build/Progress headers (no 5th tab). Entries: tap the muscle map, the (i) on an exercise, exercise links.
- `education/index.json` drives the index: `status:"final"` pages render, `"planned"` show "Coming soon". All 23 pages (19 muscles,
  4 fundamentals) are final. Every map path resolves to a page; heads (`region_ids`) are drawn either as their own path or via the
  group path (`g:chest`, `g:triceps`, `g:calves`, as in the live map). The two back `ABDUCTOR_*` paths have no region in the live map
  either and are drawn as non-interactive outline.
- Citations resolve in `references.json`, then `references-exercises.json`; badges Supported / Mechanics / Model; DOI links.
- **Exercise pages** (`#learn-ex-<id>`, Coach's exercise-pages-spec.md): `education/exercises/index.json` lists authored pages; a
  `final` entry loads `exercises/<path>`, otherwise the **fallback is `exercises/auto/<id>.json`**, shown with its
  "Auto-generated from the exercise library" banner. Live ratings come from exercises.json; alternatives link to their own pages.
  All 56 preset exercises have authored pages (index all final; test `allPresetExercisesOpenAuthoredPage`); the other exercises use
  auto pages. **Storyboard: ships Coach's static auto/*.json files as-is (no runtime generation).** **Rebuild: ports `tools/gen_exercise_autopages.py auto_page()`
  (with exercise_pages.py, swaptags.py, swap.py) to `logic/exercise-pages.js` and generates auto pages at runtime from
  exercises.json; Coach's auto/*.json become test fixtures only — a test generates all of them and deep-compares (0 mismatches),
  and the auto files are no longer shipped.** Authored pages always win.

## State and storage
localStorage, existing keys kept so nobody loses data: `liftboard.logs`, `.routines`, `.mysplits`, `.logSettings`, `.logActive`,
`.logTimer`, `.custom`, `.exNotes`, `.bodyweights`, `.deload`, `.staged`, … New: favourites (ordered), goals, bias muscles
(storyboard mock keys `apechit.sb.favs|goals|bias`). One `storage.js` owns reads/writes, **export/import** (single JSON file with a
schema version) and **migration** on load: `LOG_SCHEMA=2` logs and the legacy `liftboard.v1` blob are upgraded in place, once,
with a backup key written first.

## Tests
- `tests/run-all.sh` keeps running; the parity diffs (`*diff.js`, e1rm, logger, swapc …) call the logic globals instead of the old
  page, so ported modules must match the current app byte-for-byte on the fuzz boards. `mutate.sh` mutants must still be caught.
- New reference diffs: `rank.js` vs ranking-reference.json + swap.py/patterns.py neutral (done, 0 mismatches), `swaptags.js` vs tools/swaptags.py,
  (rebuild) exercise-pages.js vs the auto/ fixtures (deep-compare all, 0 mismatches).
- UI tests are rewritten against the new screens (Playwright WebKit, iPhone 13), like `storyboard/test/sb.test.js`.
- Coach's validators stay the gate for data: `tools/check_education.py`, `tools/check_exercise_pages.py` must print PASS.

## Clean-up
Delete the ~67 versioned / `pre-*` / `bak-*` / `*.vNN.*` files in the app root (and the old vNN test files); git history in
lift-board-site keeps them. sw.js cache list shrinks to the bundle.

## Markup round 1 (2026-10-22)
- Tabs: Build, Train, Log, Progress (Build is leftmost; the default route is still #train).
- Glyphs are shape-coded: ★ primary, ▲ accessory, ● isolation (`GLY` in sb.js; chits, legend, tray, sheets, Learn).
- Build summary: a bigger body map (`#bmap`) with a Week/Day toggle (`#mapseg`). A day-strip or day-header tap switches it to that day (ink scale `--day-1..4`). A muscle tap opens `#learn-<muscle>`. On Progress a muscle tap shows its card (`#pmus`) and has no Learn link.
- Analysis sheet: see phase 2 below.
- Tray filters: three wrapping chip rows (Muscle, Pattern, Equipment) plus Reset, and no horizontal scroll. Pattern = `exercises[].movement_pattern`, with labels and order from `rules.movement_patterns`. Every exercise carries it (exercises.json v12); the temporary mapping is gone.
- Session clock is derived from `CLK.start`. Every real Start begins at 0:00. Cold-loaded #workout routes are a demo at 32:14.
- Notes per exercise: Always (localStorage `apechit.sb.exNotes`) and This session (memory). Plate sizes toggle into `apechit.sb.gym`. The target comes from the lb field.
- Swipe left on a set deletes only that set (Undo). An exercise is deleted from its ⋯ menu or a header swipe. A mid-workout swap defaults to "This workout only", with an "Also update routine" toggle.
- Session length is read only from `rules.session_length`.

## Phase 2 (2026-10-22): Coach round 1 items 4, 5, 6, 12
Data sync: `sync-ranking-data.sh` also copies templates.json, templates-reference.json, movement-patterns-reference.json, analysis-reference.json and progress-reference.json (rules v10, exercises v12). The storyboard never writes data/.
New logic (UMD, no DOM, node-testable):
```
logic/analysis.js   window.ANALYSIS  port of tools/analysis.py + the analytic sources of tools/suggest.py: suggest(), sheet() (types and
                    order from rules.suggestions.analysis_sheet), apply_ops/invert (ops: sets, swap, add, remove), metrics(), catalogue()
logic/templates.js  window.TEMPLATES port of tools/templates.py: ruleFor, eligible, fill(template, picks, sets)
logic/progress.js   window.PROGRESS  port of tools/progress.py (+ the prs/deload/whiteboard pieces it uses): progress(dt, history, routine, now, level)
```
Parity (node, all 0 mismatches): test/analysis.diff.js, movement.diff.js, templates.diff.js, progress.diff.js, plus rank, progcheck, swaptags, whiteboard.
- Analysis (item 4): the headers and metric rows come from `rules.analysis_metrics`: 7 categories, 43 metrics, each with label, description and evidence tag, and Proposed marked. Each category's rule-status chips map a rule to the category of the metric whose `defined_in` names `rules.#<id>`. Rule chips are grouped by `rules[].category` (every rule has one, so there is no "More checks"). Suggestions come from `ANALYSIS.sheet`; the top 3 by severity are shown, then "Show all N", and each card shows one sentence with the rest behind "Why?". Apply replaces the board with fix.days and Undo restores the pre-Apply snapshot.
- Clean/Detail (item 5): a toggle (`#bdseg`, localStorage `apechit.sb.boardDetail`) adds a `.cf` line under each chit name showing the top 3 muscle fractions from exercises.json `muscles` (e.g. "Chest 1 · FD .5 · Tri .5"). The labels are exercises.json `muscle_short_labels` (`.muscles`, `.heads`): a head id with no label uses its muscle's label, and any other id shows its full name. The chit sheet always shows every non-zero fraction as a bar (`.csfr`). In landscape and on iPad the toggle sits in the legend row.
- Templates (item 6): New offers Blank board, Template (slots), Prebuilt routine (splits.json) and From your library.
  - A slot template loads open slots per day (`day.slots`, separate from tiles, so stats and checks ignore them). They render as dashed `.slotc` chits showing the label and set range.
  - Tapping a slot opens the tray filtered to `templates-reference.json` `slots[id].eligible`, with the default exercise first and tagged. Picking an exercise fills the slot at the template's default sets.
  - "Fill with defaults" fills every open slot. For all 26 templates this reproduces the linked splits.json preset exactly.
  - The chooser lists the template's `volume_exceptions` as amber, meaning within 2 sets under the level minimum (`progcheck col 'A'`).
- Progress (item 12): this screen uses logged workouts only.
  - Its inputs are the progress-reference.json history and routine (a synthetic sample log), with Always notes merged from localStorage. Results go through `PROGRESS.progress`.
  - The map shows last week's credited sets against the target band.
  - Each muscle row shows its trend. The muscle card shows credited last week, planned, this week, adherence, a 4-week spark, the main lift's e1RM trend (10-rep cap) and the latest 3 notes, with Always notes first.
  - Refinement cards cover stall, missed_sets, under_delivered and skipped_day. Apply and Undo edit the log's routine; stall rep-range advice is display only. The guard line comes from `rules.progress.guards`.

## After round 1 (CoS fixes, Coach data update)
- Data loading: every file comes from the storyboard's own `data/` (synced by sync-ranking-data.sh and sync-education.sh). There is no `../data` fallback, so the live app's data folder is never needed. `getJ()` never throws: a 404 or a fetch aborted by navigation gives null and is not retried in another folder.
- Check count = `ANALYSIS.checksPass` (analysis_metrics checks_pass). Only rules whose `applies` holds are counted (level, plus requires baseline_saved / training_days>=2). Info flags never fail, and the two spinal-load flags count as one rule. The totals are 14/14 at intermediate and advanced and 15/15 at beginner, +1 with a baseline. While any template slot is open, the strip and the Analysis header say "Fill slots to check".
- Units: Settings › Units (localStorage `apechit.sb.unit`, default lb). Progress converts Coach's kg sample log for display only; progress.diff stays in kg.

## Round 2, Batch A (2026-10-22)
- **Tokens / dark mode** (`tokens.css`): new semantic tokens (`--on-ink`, `--surface-ink`, `--glyph-*`, `--fill-press`, `--row-*`, `--line-strong`, `--kp-*`, `--map-*`, `--heat-1..4`, `--warn-*`, `--ok-*`, `--slot-bg`, `--wb-inset`, `--vol-mix`, `--series-1..6`). One dark set, written twice with identical values: `html[data-theme=dark]` and `@media (prefers-color-scheme:dark){html:not([data-theme=light])}`. Settings › Appearance (System / Light / Dark) stores `apechit.sb.theme`; `index.html` applies it before first paint; `SBX.setTheme()` for tests. Hardcoded light colours in `sb.css` and the map SVG fills in `sb.js` now use tokens. Plate colours stay literal (they are the plates' real colours).
- **Ramp**: `--ramp-0..4` (one blue hue, light and dark versions) is the only scale for "sets per muscle" in Build Day mode, the days-per-muscle grid (`.fq i[data-r]`) and the Log maps. Levels: >0, ≥1.5, ≥3, ≥5 effective sets (`RAMPL` in board.js and sb.js). Range colours (`--vol-*`) are unchanged in meaning and have dark values.
- **Icons**: every `.gl` / `.cg` uses `--glyph-bg` (black) and `--glyph-fg` (white). Dark mode adds a faint `--glyph-ring`.
- **Build card**: `.bsegs` holds Week/Day and Clean/Detail, centred on one row (portrait) or stacked in the middle column (landscape and iPad). The map is 176 px tall in portrait. The duplicate `.bdseg2` in the legend is gone.
- **Units**: the fixture loads are lb. `cvt/uw/uP/uTxt` convert to kg and round to `logger.load_step.kg[equipment]`. Typed values remember their unit (`s.wu`). The plate calculator uses `gym_profile_default[unit]` plates, kg bars and a 2.5 kg step. GYM plates are stored per unit: `plates` (lb, read by ranking) and `plates_kg`. Finish strings are converted too.
- **Train reorder**: press and hold `.exgrip` for 280 ms. The blocks collapse to their headers; drag and release. The ⋯ menu has Move up / Move down. Order is saved in `WK.ex` and in `localStorage apechit.sb.wkOrder[rid:di]`, and `applyOrder()` applies it on the demo, on reload and on the next start of that routine day. The routine itself is not changed.
- **Log**: a single history in Coach's logger shape (`LOGH`: sessions/entries/sets). It is generated from the Oct fixture and saved to `apechit.sb.log.v1` after edits. `LOGS` is derived from it. PRs come from the new `logic/prs.js`, a port of `tools/prs.py detect_prs` plus `loads.py available_loads`, diffed by `test/prs.diff.js` against `data/prs-reference.json` and `data/prs-tie-reference.json` (10 cases, 136 badges).
  - Rows show a mini map (shared `<symbol>`s plus per-row `--mm-<muscle>` variables) and a notes preview.
  - `#log-d<day>` is the detail view: stats, notes, body map (ramp), and an e1RM overlay chart. Each exercise's best e1RM per session (Epley, reps ≤ `e1rm_max_reps` = 10, effective load as in `flatten`) is plotted as % of its best before this workout, and tapping a point shows the absolute value and unit. Exercise blocks carry PR badges per type, with the badge set marked.
  - The edit sheet covers date (Oct 1 to today, one workout per day), start, duration, notes, and sets and weights in the display unit. Save stores the history, recomputes PRs for all sessions, and re-renders (moving to the new day).
- **Tests**: 11 new checks in the round-2 block of `test/sb.test.js` (icons, ramp, dark tokens, theme switch, dark range colours, Build layout, kg, reorder, Log list, Log detail, Log edit). Shots: `26a…26y` in `test/shots.js`.

## v13 sync (r2fix, 2026-10-23)

- `sync-ranking-data.sh` run once: rules v10, exercises v13 (247), templates v2, analysis_metrics v2. `prs-reference.json` /
  `prs-tie-reference.json` kept. `data/ranking-reference.json` is the output of Coach's `tools/gen_ranking_reference.py` against
  v13 (the copy in `../data` was still the 239-exercise v12 file). Replace it with the next synced copy once Coach regenerates.
- `build-mock-ex.py` rebuilds `assets/mock-ex.js` (window.EXL, REGION_GROUP) from `data/exercises.json`. Rows now carry
  `untracked_target` as a 7th field.
- Ported from Coach's Python:
  - `rank.primaryMuscle` and `whiteboard.primaryRegion` fall back to `untracked_target.filter_muscle` when every rating is 0.
  - `progcheck`: severity for beginner_squat_and_deadlift and hinge_before_squat now comes from `rules[]`. missing_stretch is warn
    for `stretch_check` muscles.
  - `templates`: v2 rule (`types`, `variant` = rules.patterns group) and `presetFill`. `default_exercise` is now Coach's ranked
    pick, so the preset_exercise fill is the one that reproduces the preset.
  - `analysis`: `applicable` / `checksPass` over kind=check items (13 without a baseline, 14 with one). `catalogue` maps
    sections/items onto the current sheet. The Analysis restructure itself is batch B.
- All-zero muscle map (tibialis-raise): the untracked_target tag stands wherever the muscle info would go:
  - tray/workout subtitle (`exSub`);
  - chit Detail line (`fracLine`);
  - chit sheet "Muscles worked";
  - info sheet and learn "Muscles hit" (label + tag).
  The tray muscle filter and the learn link use `filter_muscle`. Chit colour comes from the region (legs).

## Round 2, Batch B (2026-10-23)

- **Sync**: `sync-ranking-data.sh` also copies `slot-defaults-reference.json`, `analysis-items-reference.json` and
  `exercise-details.json` (run once). The sync brought back Coach's stale 239-exercise `ranking-reference.json`, so the
  v13-regenerated copy was put back in `data/`, as in the v13 sync. Coach's copy still needs regenerating.
- **No Python in the tests**: `rank.diff.js` and `progcheck.diff.js` compare against frozen snapshots
  (`test/fixtures/*-py-snapshot.json`, frozen at 26fe33a, where the live Python diff was 0). `PY=1` runs Coach's tools live, but
  only with Coach's OK. Nothing else touches `../../tools`.
- **Item 3, Analysis** (Coach's `analysis-spec-r2.md`):
  - Ports from `tools/analysis.py`: `logic/analysis.js` `items`, `flagDetails`, `breakdowns`, `fatigueRating`, `pushPull` and
    `stretchFocused`. Float sums use `pySum` (Python 3.12+ compensated `sum`) and `pyF` (str of a float). `sheet()` entries
    carry `section` (type `section` or `section_by_source`). New diff: `test/analysisitems.diff.js` against
    `analysis-items-reference.json` (46 presets + 3 synthetic boards, items and flag details).
  - There is no top Suggestions block. The sections are the build_analysis sections in order. Each one shows its own
    suggestions (top 3 by severity, then "Show all N suggestions") and then its item rows.
  - Every row has a kind chip (Check / Measure / Info), its value, and an (i) that opens `SBX.explainSheet`. That sheet shows
    what / how / why, the evidence tag and a Learn button for `page#section`. The route is `#learn-f-<page>~<section>`, which
    opens that section. The fatigue rating's sheet adds the breakdown (tiers, by day, exercise, muscle, pattern, heavy spine,
    systemic tag, baseline).
  - Checks show Pass, Attention or n/a (with the reason). Each flag names its days and exercises (`flagDetails`); for
    pattern_gap it names the missing pattern.
  - Muscle rows (volume bars, frequency grid, stretch chips, flags) and pattern rows (movement pattern sets) open a
    contributor sheet. It lists each exercise with its day, sets and effective sets (the breakdown model). Each has Remove. Add
    suggested is the shared ranker's top pick, on the training day with the least of that muscle or pattern. Undo is in the
    sheet.
  - The 12 progress-tab items are in Progress ("Logged progress"), each with its kind chip and (i). Values come from
    `logic/progress.js` where it computes them; the others say "Not computed in the storyboard yet".
- **Item 4, tray and exercise popup**:
  - Both trays have a Sort row: Best match (the shared ranker, default), A–Z, Most stimulus for the filtered muscle (disabled
    until a muscle is picked), and Lowest fatigue. Library order became A–Z (`tray-lib` maps to it).
  - Tapping a tray row (or the workout tray's (i)) opens `SBX.exDetail`, loaded lazily from `exercise-details.json`. It shows:
    - the body map shaded by `body_map` intensity, and target ratings with credit share;
    - stretch, fatigue rating and tier, recovery cost per set, stimulus per fatigue, systemic tag, heavy spine, one side, time
      per set, rep range, pattern and push/pull side, equipment;
    - a Learn link.
  - Photos appear only when `show_photo` is true (143 exact name matches); approximate ones never do. `build-photos.py` copies
    the exact pairs from `../img/ex` into `assets/ex-photos/` (286 files, about 14 MB) with `LICENSE.txt`. Source:
    free-exercise-db by yuhonas, The Unlicense (public domain dedication). The upstream licence was checked on GitHub.
  - Template slot defaults are `TEMPLATES.chooseDefaults` (the ranked picks). New diff: `test/slotdefaults.diff.js` against
    `slot-defaults-reference.json` and templates.json `default_exercise`.
- **Item 7, Finish**: built from the workout's done sets (`WK`), appended to a copy of the log.
  - PRs come from `PRS.detect` on that copy.
  - "vs last time" compares the best working set per lift with the last session that had the lift. Volume is compared with
    the last session of the same name.
  - The body map is `sesMus`; the e1RM % overlay is `e1Chart`.
  - The streak is consecutive Monday-start weeks with a workout. There is also a count for this week against the routine's
    planned days.
  - Every line is a computed fact; there is no canned praise.
  - A cold-loaded `#finish` completes the demo workout at last time's targets. The date is the storyboard's "today" (Wed Oct
    21).
- **Tests**: batch B block in `test/sb.test.js` (`b3…`, `b4…`, `b7…`). The round-1 analysis and suggestion checks were rewritten
  for the inline sections. Shots: `28a…` (Analysis), `29a…` (tray and popup), `30a…` (Finish), light and dark.

## Batch C (CoS fixes, 2026-10-23)

- **Map role colours**: `tokens.css` adds `--hl-main`, `--hl-helper` and `--hl-minor` in the light set and both dark sets. The
  grey `--heat-*` tokens are gone. Grey on a map now means only unworked (`--map-empty`) or the volume map's under-range
  colour (`--vol-under`). Changes in `sb.js`:
  - `FILL` turns numeric values (ratings) into role colours: 0.75 and up main, 0.4 and up helper, else minor.
  - The exercise popup uses Coach's `body_map.levels` (primary → main, secondary → helper, minor → minor; trace isn't shaded).
  - The Finish map uses `sesRole`: each muscle's best level across today's done exercises (RD.EX ratings, same buckets). The
    bars still show effective sets.
  - The Learn index map uses main for "Guide ready" and minor for "Coming soon".
  - Light `--ramp-1` is now #ACC8F0 (it was #C9DCF5, close to grey).
- **Contributor sheets and fatigue breakdown**: names and tier labels wrap (`.cbsheet .cbr .t1` and `.fzt .t1` use
  `white-space: normal`).
- **Volume check display**: the rule is unchanged. `volume_in_reach` fails only on red (more than 2 sets under the minimum or
  more than 25% over the maximum); amber (close) passes. The display now follows Coach's per-muscle colour from
  `items()` `weekly_sets_per_muscle`:
  - When the check passes with amber muscles, the tag reads "✓ Passing · N close". Below it: "Passing, N close to target:
    muscle sets of min–max, …", then one row per muscle with Add suggested. That pick is the same as the contributor sheet's
    (`cbPick`). An Undo row stays until the board changes.
  - The section header adds "· N close to target".
  - In Weekly sets per muscle, amber rows get an amber bar and a "Close, under" or "Close, over" label, and are never green.
  - The plain green "✓ Pass" (`--vol-in-range-ink`) only shows when every muscle is in range.
- **Rank diff**: `data/ranking-reference.json` is Coach's v13 regeneration (byte-equal to `../data`). `rank.diff.js` tests that
  reference (67 cases, 247 exercises) and flags a stale copy. The swap and preset snapshot cross-check is opt-in with
  `NEUTRAL=1`.
- **Tests**: `allRoutesRender` and `learn-lats` wait for their content instead of a fixed delay. 10 new `c…` checks are in the
  Batch C block. Shots: `31a…31e`, plus the re-shot 28a, 28g, 28j, 29d, 29e and 30d.
- **No developer text in the UI**:
  - `sb.js` `devClean` runs on every rendered text node through a MutationObserver. Attributes, inputs and `[data-raw]` user
    notes are skipped. It drops a parenthetical that holds a file or key reference, drops a sentence naming a file or key path
    (when that would empty the text, it rewrites the reference as "Coach's … setting"), and turns snake_case keys into words.
  - Our own strings no longer name files.
  - Learn pages no longer print `app_key` and `features (…)` code references.
  - The Analysis footer no longer shows the analysis_metrics developer note.
  - Check: `noFileNamesInVisibleText` covers every route in light and dark, every Analysis and Progress explain sheet, and
    every Learn muscle, fundamental and authored exercise page.
- **Volume key**: one entry per status, worded like the rows. Entries: Under (grey), In range (green), "Close to target:"
  Close, under / Close, over (amber), Over max (red). Over max is more than `volume_bands.red_factor` over the maximum; Coach's
  colours make it R. The map key leaves out Close, under, because maps keep it grey. Rows carry `data-st`. Check:
  `cVolumeKeyMatchesRowStatuses`.
- **Popup levels**: the popup map and its rating labels both read Coach's `exercise-details.json` `body_map.levels`
  (primary / secondary / minor / trace) and `body_map.level_labels` (Main mover / Helper / Minor / Not counted). Helper is now 0.4
  to under 0.75, matching the library bands. Check: `cPopupShadingMatchesRatingLabelsAllExercises` (247 exercises).

## Round 3 (Mr Dude markup, 2026-10-23): data first, graphic first, consolidated

**New modules (loaded after `logic/analysis.js`; plain scripts, also `require`-able by the node diffs)**
- `logic/checkpriority.js` (`window.CHECKPRIORITY`) is an exact port of Coach's `check-priority-spec.md` v2. It computes score = severity × importance × fixability. Severity comes from the state bands. Importance is the check weight × the muscle weight (board-level issues use 1.0). Fixability uses the best fix's rule.
  - Issues are deduped by `<family>:<key>`, keeping the higher score.
  - Ordering is state first (`sort_order`): red, then amber, and only then −score, −distance, −muscle weight, id.
  - Only `card_states` (red, amber) reach the card. Info never does (`exclude_kinds`). There is no minimum score.
  - An issue with no passing fix gets `action: see_analysis` and `fix: null` (`no_fix_action`).
  - One flag switches the order: `CHECKPRIORITY.setStateFirst(false)` returns to the v1 score-first order with `min_score`. `CHECKPRIORITY.STATE_FIRST` reads it.
  - The interim `logic/priority.js` is deleted.
- `logic/muscledive.js` (`window.MUSCLEDIVE`) is the deep-dive payload from `muscle-deepdive-spec.md`. `muscle(dt,days,level,m)` returns sets, curve, frequency, stretch, one-side share, recovery cost, stimulus per fatigue, contributors and suggestions. Both the deep-dive sheet and the diff use this one function.
- `logic/freqnotes.js` (`window.FREQNOTES`): `notes(dt,days,level,templates)` fills Coach's `frequency-notes.json` templates in Coach's order.

**Synced from ../data (copies only; no Coach tool was run)**
- Files: `check-priority-weights.json` (v2), `check-priority-reference.json`, `check-priority-spec.md`, `muscle-deepdive-reference.json`, `muscle-deepdive-spec.md`, `frequency-notes.json`, `analysis-display.json` and `round3-charts-vs-checklist.md`.
- `data/rules.json` is ../data `rules.json` plus the `check_priority` key from the weights file, merged with indent 2. Nothing else differs, and the suite checks this (`r3SyncedFilesAreCopies`).
- `sync-ranking-data.sh` copies the same files and does the same merge.

**Display rules**
- `analysis-display.json` supplies every checklist label (`items[id].display_label`).
- `render_kind:false` means the words Check, Measure and Info never render. `kchip` returns an empty string.
- State is a mark only: a green tick for pass, amber for close, red for attention. Measures show values only. The ⓘ explainers stay, and so do the honesty tags (Proposed, Modeled, Thin evidence).

**Build tab**
- The map uses the cropped viewBox `190 50 644 1410` (`.mmap.crop`). It is 182px tall in portrait, against 150px uncropped before. The key moved to the right column (`#bmleg`).
- Week/Day and Clean/Detail toggles: thumbs stretch to their track (`.seg.xs button{height:auto;align-self:stretch}`). Equal insets within 1px in light and dark is checked by `r3ToggleThumbInTrackLightDark`.
- The Program check card (`#pcheck`) sits under the week view and shows `CHECKPRIORITY.top`.
  - Each row has a state dot, the muscle (linked) with its numbers, the fix preview, and either Apply (`pcapply`) or See analysis (`pcsee`).
  - See analysis opens the sheet at the item and expands its section.
  - Undo (`pcundo`) applies `fix.undo` when the board is unchanged. Otherwise it restores the snapshot.
  - The footer reads "See full analysis ›".
  - A board with no card issues shows "No pressing issues" (`.pcr.none`) and keeps the footer.

**Analysis sheet**
- A large two-view map sits at the top. Tapping a muscle opens its deep-dive.
- It has five boxed sections: volume, frequency, balance, recovery_fatigue and session.
  - Each section header (`.asech`) is sticky and shows a chevron and the section's pass count.
  - The open/closed state is stored in localStorage under `apechit.sb.anOpen`.
- Inside each section, the graphic comes first (`.agfx` with a light `.ash` subhead), then a compact checklist (`.ckr`).
- A suggestion sits right under the data row it fixes (`.sgr.inl`). The remaining suggestions are an end list: top 3, then "Show all N".
- Muscle names are `.mlk` links into the deep-dive. They carry an anchor, so a frequency note opens `#deepdive-<m>-frequency`.
- Volume: the stimulus curve card has its green band restored (`--vol-in-range`), and every muscle row has a green `.sband`. Weekly sets rows follow. The `volume_in_reach` row lists the close muscles.
- Frequency: the effective-frequency grid comes first, then Coach's notes.
- Balance: the stretch-share bars (25% threshold line), the one-side bar and the movement-pattern bars, then push/pull and pattern checks.
- Recovery & fatigue: recovery cost by day, stimulus per fatigue and the fatigue tier bar, then the checklist.
- Session: session-length bars, then the session checks.
- The deep-dive (`ddBody`) has sections `#deepdive-<m>-{sets,curve,frequency,stretch,fatigue,session,suggest}`, contributors with Remove, and suggestions with Apply/Undo.

**New routes**
- `build-deepdive` (calves)
- `build-deepdive-freq` (upper back, frequency anchor)
- `build-pcheck`
- `build-pcheck-none` (the first preset with no card issues)

**Diffs (all at 0)**
- `test/checkpriority.diff.js`: 46 presets, 47 issues, 16 empty, 29 Apply, 18 See analysis. All Apply/Undo and move (remove + add) round trips pass.
- `test/muscledive.diff.js`: 4 presets × 19 muscles at 1e-4.
- `test/freqnotes.diff.js`: 46 presets.

The suite runs all three (`r3*` checks).

**rules.json question.** Neither this run nor any earlier run of mine wrote to `/workspace/lift-board/data/rules.json`. Every write went to `storyboard/data/rules.json`:
- the batch B copy at 00:55 PT;
- today's merge of `check_priority`.

**Asks for Coach**
- For stretch issues on unchecked muscles, `analysis_item` is the literal `stretch_<muscle>` (for example `stretch_biceps`), which is not an analysis item id. The board maps it to `stretch_share`. Please either emit `stretch_share` or confirm that the mapping is right.
- Per-day fatigue tiers would allow stacked recovery bars.
- Should "Add suggested" stay as the fallback when an amber muscle has no Coach fix?

**Round 3 notes**
- In phone landscape the Program check card is hidden (`.pcheck{display:none}` inside the landscape media query), so the board keeps the full height. The card lives under the week view in portrait.
- Each per-muscle check mark in the stretch-share chart is an ⓘ button (`button.cbx[data-b=anx]`). Tapping it opens that stretch check's explainer, so every item keeps its explainer.
- The analysis sheet body has a no-op click listener. In WebKit, taps on the map's SVG paths only fire click when an ancestor below body has a listener.

**Round 3 quick fixes (CoS, 2026-10-23)**
- No kind or status chips anywhere. The "Proposed" status stays in `data-status`, and the explain sheet says it in words (`.xprop`). The evidence tags (Modeled, Thin) are kept as honesty labels.
- Stretch-share bars: when a muscle has its own stretch check, the bar colour follows that check. A pass is green with a ✓; anything else is amber with no ✓.
  - Muscles without a check are coloured by their share against the 25% line.
  - A pass under the line gets a plain note (`.ssn`) naming the stretch-focused exercises behind it.
- Boundary formatting: `bfmt(v,lo,hi)` and `bpct(x,floor)` format values shown next to a range.
  - Whole numbers stay whole. Otherwise one decimal, rounded away from the range when normal rounding would put the shown value inside it (7.95 of 8–20 shows 7.9; 24.7% against 25% shows 24.7%).
  - Used on the card, the suggestion heads and titles, the close-to-target list, the weekly-sets rows, the curve readout, the deep-dive sets row and the stretch bars.
  - Weekly sets are shown from `A.muscles[m].raw`, not Coach's rounded `target.sets`.
- Program check copy: `pcSentence(it)` builds one plain sentence per issue from the structured fields (family, source, target, flag tuple, rule thresholds in rules.json). `pcFixText(it)` builds the fix line from `fix.ops`:
  - Cut to N / Add N sets / Swap / Add / Remove / Move;
  - `fix.preview` only as a fallback.
  - No Coach display string is shown verbatim on the card.
- Evidence labels (Modeled / Thin evidence / Supported) are `span.evl[data-ev]`: small muted text beside the subhead (`.ash` in Analysis and the deep-dive; `.xpsh` next to the explain-sheet title), with no background, border or padding. The ⓘ sheet keeps the full what / how / why. Checked by `qfEvidenceLabelsQuietInlineNoChip`.

**Round 3 follow-up (Coach r3fu, 2026-10-23)**
- Synced (copies only): check-priority-weights.json, check-priority-reference.json, check-priority-spec.md, muscle-deepdive-reference.json, muscle-deepdive-spec.md, round3-charts-vs-checklist.md, analysis-display.json, frequency-notes.json, plus rules.json re-copied and `check_priority` re-merged from the weights file (now with the `analysis_item` block). rules.json = Coach's rules.json + `check_priority`, nothing else.
- Item ids: `checkpriority.js` sets `analysis_item` from the weights' `analysis_item` rule (missing_stretch → `stretch_<m>` for checked muscles, else `stretch_coverage`; `item_by_source` for stretch_share / session_hard_sets / session_length; otherwise the family item) and `analysis_item_muscle` (null for board-level issues). The card uses both as-is: every Apply row has a quiet "In analysis ›" link (`[data-b=pcin]`), see_analysis rows keep "See analysis". `analysisAt(item, m)` opens the item's section and highlights the muscle's row (`.anhl`). The old `stretch_<muscle>` → `stretch_share` fallback (`pcItem`) is gone. On upper-lower/intermediate/4, `stretch:triceps` now opens Stretch share with Triceps highlighted.
- Recovery tiers: `MUSCLEDIVE.recoveryTiers(dt, days)` ports `recovery_tiers` (tiers heavy_axial_compound ≥1.5, other_compound ≥1.1, lighter_compound ≥1.0, isolation; largest-remainder hundredths so each stack sums exactly to the day total = `recovery_cost.by_day`). Analysis › Recovery cost shows each day as a stacked bar (`.rtstk`) with a legend in Coach's labels. Colours: `--tier-1..4` (one violet scale, separate light and dark values); the week tier bar uses the same tokens by tier id.
- Tests: `muscledive.diff.js` also diffs recovery tiers (4 cases + 46 presets, exact). `test/r3fu.test.js` holds the r3fu logic and browser checks; sb.test.js calls it, and it runs alone for fast mode (15 diffs + touched routes + r3fu checks). Shots 41a–41c.

**Exercise videos (Coach's exercise-videos.json v2: 143 exact / 85 close variant / 19 none, 2026-10-23)**
- `data/exercise-videos.json` is a plain copy of Coach's file, fetched at runtime (`xvLoad`, `cache:no-store`), so Coach's in-place updates show up after a re-copy with no code change. No video id lives in the code.
- Learn page (`xvBlock`, below Swap / Add): "Technique video" subhead, a 16:9 thumbnail from `i.ytimg.com/vi/<id>/hqdefault.jpg` with a round play button and a duration badge (its `src` is set 250 ms after the page paints and only if that page is still open: in WebKit, thumbnail requests started during fast page changes delayed the next page's data by seconds), then our exercise name (never the video's title, so no third-party rehab / health claims appear; the thumbnail alt, the play button's aria-label and the iframe title also use our name), then channel · duration. Channel display names: `XV_CH` maps the oEmbed name `[P]rehab` to "The Prehab Guys" (data unchanged). Only a tap inserts the iframe (`xvPlay`, `https://www.youtube-nocookie.com/embed/<id>?autoplay=1&playsinline=1&rel=0[&start=]`). `close_variant` adds the muted inline label "Close variant" (`span.evl`, same as Modeled / Thin evidence) and, following exercise-videos.md, a "Similar movement: …" line from `note` (the part after the last "; ", so the RP clip boilerplate is dropped). `none`, a missing entry or a missing id renders no block. Foot line: third-party demo, not an endorsement or medical advice (exercise-videos.md).
- Exercise detail card: a quiet "▶ Watch" link (`.xwatch`) in the header only when a video exists; it goes to `#learn-ex-<id>~video`, which scrolls to the block.
- Tests: `test/videos.test.js` (exact / close variant / none, no video title rendered on any of the 228 video pages (text and aria-label / alt / title attributes; the Similar-movement line is Coach's note and is excluded), [P]rehab shown as The Prehab Guys, iframe title = our name, no iframe before the tap, nocookie src, Watch link present only with a video and lands on the block, no hardcoded ids); sb.test.js calls it. Shots 42a–42e.
- Learn page fix: `afterLearnEx` drops a stale render when a newer Learn page was opened while it loaded.

**Learn page fixes (2026-10-23)**
- Evidence badges: the Model badge used class `evb line`, and `.line` is the rest bar's progress line (`position:absolute; left:0; bottom:0`). So every Model badge was taken out of the text flow and pinned to the left edge, even inside closed sections and over the video footer. The variant is now `evb outl`, and `.evw, .evb` are `position:static`.
- 'Add to workout' stays on one line: on Learn pages the action row is `auto | 1fr`, the buttons are `nowrap`, and at 350 px and narrower the padding and font shrink a little.
- Test: `test/learnfix.test.js` (called by sb.test.js) runs at 390 and 320 px on bench press, rear delt fly and seated calf raise, with sections collapsed and expanded. It checks that badges are static, never painted while their section is closed, sit inside their section and never overlap the video block; that 'Add to workout' is one line, fits, and stays in view; and that the rest bar's line is still absolutely positioned. Shot 43a.
- Quiet evidence labels: the Learn `.evb` labels (Supported / Mechanics / Model) now share the Analysis `.evl` rule (`.evl,.evb{…}`). They are small muted `--text-3` text with no chip, background or border, and work in light and dark. Each one is a plain-text button (`data-evx`). Tapping it opens an "Evidence" sheet (`evSheet`) that lists all three levels with the existing explanations (`EVXT`) and highlights the one tapped. The muscle page's evidence key uses the same text. The `learnfix` checks `learnEvidenceLabelsMatchAnalysisHonestyLabel` (in both light and dark: font size, weight, family and colour match `.ansheet .evl`; background is transparent; border, padding and shadow are none) and `learnEvidenceLabelOpensExplanationSheet` cover this.

**Exercise tray search and 'Most stimulus' (2026-10-24)**
- Search: the Build tray (`board.js` `traySheet`, `#tqb`) now has a search field at the top, and the workout tray's existing `#tq` uses the same matcher. `SBX.qMatch` is live and case- and accent-insensitive (NFD fold). Every typed word must appear in the name, `short_name`, or any `aliases`/`alias` array. exercises.json has no alias field today, so `short_name` acts as the alias (for example "bb bench"). Search is a hard filter combined with the muscle, pattern and equipment chips. The field has a clear (×) button (the native WebKit cancel button is hidden), shows a quiet "No exercises match “…”" state with a "Clear search and filters" link, and stays pinned to the top of the sheet while the chips and results scroll under it. Reset clears the search too, and closing the Build tray clears it.
- 'Most stimulus' root cause: `sortHtml` rendered the chip `disabled` whenever no muscle filter was set (`k==='stim'&&!mus`), and `sortMode` coerced 'stim' back to 'sug' without a muscle. Both trays open with no muscle filter, so the chip was always greyed out and both click handlers ignored it (`if(md.disabled)return`). It is now always selectable. With a muscle filter it sorts as before (that muscle's ratio, then ratio ÷ fatigue, then name). Without one it sorts by total stimulus per set: the sum of the exercise's muscle ratios, which is the set credit Analysis gives across all muscles. The Build tray tag reads "N total per set". The b4BuildTraySortControl test, which asserted the old disabled state, now asserts it is enabled.
- Test: `test/tray.test.js` (called by sb.test.js) runs in light and dark. It checks that the search sits at the top and filters live, combines with filters, is case- and accent-insensitive, matches aliases, and has a working empty state and clear button in both trays, and that 'Most stimulus' is selectable with the order checked against exercises.json. Shots 44a and 44b.

## Custom exercises (piece C, 2026-10-24)

- `logic/customex.js` (UMD) ports Coach's `custom_exercise.py`: build, validate, id (`custom-<slug>-<6 base36>`), short name, register/unregister. Every number not entered in the form (fatigue, rep range, axial, gates and so on) comes from `data/custom-exercise-defaults.json` (cells by pattern × equipment, then the pattern, equipment and global fallbacks). Bands come from that file: Main mover 1.0, Helper 0.5, Minor 0.3. Labels come from exercise-details.json `level_labels`. The form never shows raw ratios.
- Registration (`register(dt,records)`) adds the record to the exercise table, PAT, `rules.patterns` (push/pull), the stretch lists when 'Hardest when stretched' is on, and a `rep_ranges.overrides` entry with an id. It never adds to the heavy squat/deadlift lists. Caches are reset afterwards.
- Fix generators in progcheck.js (swap, bestFor, split pattern) skip `custom:true`, so fixes never suggest a custom exercise.
- sb.js `cxLoad` runs inside loadRank, so every view, including Analysis, Program check, deep-dive and recovery, treats customs like library rows. Labels use the muted `.evl` style: Custom, plus Estimated on the detail card.
- Storage is localStorage: `apechit.sb.customEx` (records), `apechit.sb.customExPhoto.<id>` (JPEG data URL), `apechit.sb.customExGone` (tombstones, so deleted ids are never reused), and `apechit.sb.customExPlaced` (board placements, because the storyboard board is rebuilt on load). Export/import is API only (`SBX.cxExport/cxImport`) because the Back up / Restore rows are static mocks.
- Photo: the v29 resize (a35ee0b v14.js) scales to a long edge of 800 px on a white fill and saves as JPEG 0.82. If storage is full, the exercise is saved without the photo and a toast says so.
- UI: the tray has a '+ New exercise' row at the top, hidden in slot mode, and the empty-search state offers it prefilled with the search text. Saving drops the exercise onto the tray's day. The detail card (built from the record) has Edit and Delete; Delete asks for confirmation and removes the exercise from the board.
- Tests: `test/customex.test.js` has 13 logic checks and 12 browser checks. Shots: 44c and 44d (gate `newex`).
