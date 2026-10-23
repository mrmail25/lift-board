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
