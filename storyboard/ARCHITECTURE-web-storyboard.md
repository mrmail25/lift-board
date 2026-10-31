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
- Short names (brandfix, 2026-10-24): `shortName` reads `short_name` from custom-exercise-defaults.json: 26 brands and their short forms, the abbreviations and `max_len`. A name that fits and is free is kept as typed. Otherwise the whole brand is dropped, matched as whole words in any case, with a space or hyphen between brand words. If the result is taken, the brand's short form goes in front ('HmS Iso Row'), then ' 2', ' 3'. Words are never cut silently: a period marks an abbreviation ('Concentrat. Curl'). Test: `cxShortNameBrandRule`.

## Custom exercise media, demo link and full edit (pieces 2–4, 2026-10-24)

- `logic/cxmedia.js` (UMD, global `CXMEDIA`) holds the pure parts, tested in node: `parseYouTube`, `parseTime`, `checkYouTube`, `defaultTrim`/`clampTrim` (max 10 s, min 0.5 s; the dragged handle wins and the other one is pushed) and `sizeWarn`. It also holds the IndexedDB store: database `apechit-sb-media`, store `media`, one row per exercise id `{photo, video, vtype, vsize, vdur, trim}`.
- Blobs in IndexedDB: the code tries the Blob first. If the browser refuses it (the WebKit test build does, and so can Safari private browsing), it stores the bytes as an ArrayBuffer (`vbuf`) and rebuilds the Blob on read.
- Migration: on load (`cxLoad` → `cxMediaLoad`), a photo still under `apechit.sb.customExPhoto.<id>` is written to IndexedDB, and the localStorage key is removed only after that write succeeds. If IndexedDB is unavailable, photos stay in localStorage and video isn't offered.
- **Photo:** "Take photo" (`accept=image/*`, `capture=environment`) and "Choose from library" (`accept=image/*`). Both use the v29 resize: 800 px long edge, JPEG 0.82.
- **Video:** "Record video" (`accept=video/*`, `capture=environment`) and "Choose video" (`accept=video/*`).
  - The trim UI is a preview plus a track with start/end handles. Handles can be dragged, or moved with the arrow keys (0.1 s, or 1 s with Shift); the band between them can be dragged too.
  - The default is the first ≤10 s, and the selected length is shown.
  - The **original file** is stored with `trim {start, end}`, and playback loops only that window. The video is muted, autoplays, plays inline and loops; `currentTime` is pulled back to `start` on each animation frame.
  - No re-encode: the WebKit test build has no MediaRecorder (Chromium does), and canvas capture is real-time and drops frames on phones.
  - An inline warning shows over 20 MB.
- **Demo video link:** youtube.com/watch, youtu.be and youtube.com/shorts (www./m./no scheme). The start time comes from the field, or from `t=` / `start=` / `#t=` in the link.
  - The check is `fetch` to `https://www.youtube.com/oembed?url=…&format=json`. YouTube's oEmbed sends `Access-Control-Allow-Origin` echoing the page origin, so it works from the browser without a proxy.
  - 200 + JSON = OK. 401/403 = embedding disabled. 400/404 = not found, private or removed. Each of these failures blocks Save with an inline message.
  - A network error = "couldn't check": the link is saved with `youtube_meta.checked=false` and re-checked on the next Edit.
  - Stored as `youtube` (canonical watch URL) + `youtube_meta {video_id, start_s, author, checked}`.
  - Rendered by the library renderer (`xvBlockV`): thumbnail, tap to play youtube-nocookie, our exercise name as the label.
- **Precedence:** your own looping clip first, then the YouTube demo. Both show when both exist, on the detail card and on the custom Learn page (`#learn-ex-<id>`, the target of the card's Watch link). The photo shows below them.
- **Edit:** every field, including media, trim and link.
  - The short name re-runs Coach's rule only when the name changed and the short name wasn't hand-edited (`short_name_edited`).
  - `#nxbase` (hidden, empty) and `based_on` (null) are reserved for "Start from a similar exercise".
- **Export/import:** `SBX.cxExport()` is now async, version 2. It includes `photo`, `video_trim`, the link fields, and `video` as a data URL up to 8 MB. Bigger videos get `video_omitted {bytes, reason}` plus a line in `notes`. `cxImport` restores all of it.
- **Tests:** `test/media.test.js` has 4 logic checks (node, oEmbed mocked) and 13 browser checks (oEmbed and thumbnails routed). It passes on WebKit and on Chromium (`ENGINE=chromium`). Shots 45a–45e use gate `media`.

## Start from a similar exercise (piece 1, 2026-10-24)
- **Source of truth:** Coach's `data/custom-exercise-defaults.json` `base` section (weights, normalization, hint vocab, near patterns, equipment families, threshold, counts, chip thresholds, derive rules) and `estimated_explainer` (3 variants), synced copy-only. The JS port in `logic/customex.js` mirrors `tools/custom_exercise.py` (`suggest_bases`, `from_base`, `explainer_for`): `nameTokens`, `smRatio` (difflib SequenceMatcher ratio), `rankBases`/`suggestBases` (tuple tie-break as a comparator), `bandOf`/`chips`, `validateBase`, `fromBase`, `baseForm`, `explainerFor`.
- **Parity:** `test/similar.test.js` checks `data/custom-exercise-base-reference.json` v2: 43/43 fixture drafts (top 3, the full ranked list with scores/components/bonus, and normalized tokens), self-match 492/492 (246 library exercises × name-only and name+pattern+equipment), and 9/9 derive cases field by field.
- **Rules:** suggestions need score ≥ 0.35 and name ≥ 0.20 unless the name is an exact match; 3 shown, "More suggestions" up to 5. Fallback order: an exact match is preselected (New only, while the chips are untouched) → suggestions → pattern × equipment defaults ("None of these" or no match); with no pattern/equipment yet the empty state asks for them. Band edits: kept = the exact base ratio, moved/added = the band ratio, removed = 0; trace ratios (< 0.25) are hidden from the chips but kept. An inherited second Main mover is allowed (and cycles Helper > Minor > off); a new one is rejected by `validateBase`.
- **UI (`newExSheet`, slot `#nxbase` under the name):** searchable picker (tray `qMatch`, ordered by `rankBases`), live suggestions from name + pattern + equipment (+ muscles while no base), "None of these". Picking applies `baseForm` (equipment, pattern, Main mover / Helper / Minor chips, one-side, stretch); the chips also appear in the base card and stay adjustable. Muted note "Estimated from <base>" (+ " · with your edits" when `explainerFor` returns `based_on_base_edited`), or "Estimated from typical <pattern> · <equipment> exercises"; ⓘ opens Coach's explainer text. Edit shows the base with Change / Clear (Clear keeps the chips and saves via the pattern defaults). Save uses `CX.fromBase` with a base, else `CX.build`; the record keeps `base_id`, `based_on` (= base or null) and `derived`. `cxDetail` shows the same note and a base-aware footer.
- **Shots:** `node test/shots.js <base> similar` → `shots/46a`–`46d`.

## Effort per set + Progress rebuild (piece A, 2026-10-24)
- **Field:** `set.rir`, an integer 0–4 (4 = "4+"), `null` when skipped. Coach's ruling (overrides logging-spec.md §3, being updated): store only RIR; RPE is a display/input toggle, RPE = 10 − RIR, chips 10 · 9 · 8 · 7 · ≤6 (≤6 stores 4), no half points; legacy values clamp on read (≥ 5 → 4, fractions round half up). `logic/effort.js` (`clampRir`, `fromRpe`, `toRpe`, `chips`, `label`).
- **Setting:** localStorage `apechit.sb.effortScale` = `rir` (default) | `rpe`; Settings › Workout › "Show effort as RPE". Switching never changes stored data.
- **Train:** ticking a set opens one compact chip row under it (0 1 2 3 4+, or RPE chips); tap a chip to set, tap again to clear, or just keep logging (stays null). Only one picker is open; a picked value then shows as a small "RIR 2" under Previous (tap to change). The tick never waits on it. Finish carries `rir`.
- **Log:** workout detail shows "RIR n" / "RPE n" per set (clamped); Edit keeps each set's `rir`. The storyboard's sample log now has RIR on most sessions (every 4th session left empty).
- **Progress order:** "Sample data · estimates" label → Wins (main lifts trending up; tap opens the lift) → Muscles (map with its own key: Not trained / Under / In range / Close, over / Over max, per-muscle rows with a calm ↗ ↘ → trend, the muscle card) → Needs attention (stall, missed sets, skipped day; text suggestions, no Apply, because the sample routine is not his board) → Effort (average RIR or RPE, sets near failure, sets with effort logged; last 4 weeks) → one muted "Planned vs done" footnote. Empty sections are hidden. Removed: Under-delivered cards, the Logged progress list, the sample Routine, Apply/Undo, the APE head slot, formula/threshold copy.
- **Colours:** `--vol-under` is a slate blue (light #9FB3C8, dark #5D7189) so Under no longer matches unworked grey (`--map-empty`). Trend pills are muted text (no red Down).
- **Switches:** `tg()` renders a `<button>` (iOS WebKit sends no click for a tap on a plain span).
- **Deferred to piece B:** chart plan line rework, one shared ~12-week sample log (Progress and Log still use separate sample logs), progress-rules.json / updated progress-spec.md, e1RM on ≤ 12 reps (currently the rules' value), Wins/Effort content from the new rules.
- **Tests:** `test/rir.test.js` (3 logic + 11 WebKit). Shots `node test/shots.js <base> progress-a` → 47a–47e.

## Progress piece B (2026-10-24)
- **Data sync:** `sync-ranking-data.sh` also copies Coach's `progress-rules.json`, `sample-log.json` and `progress-reference.json` into `storyboard/data/` (copy only; Coach's `data/` is never edited).
- **One shared sample log:** Log, Finish and Progress all read `data/sample-log.json` (`RD.SLOG`); the old generated log (`genLog`) is gone. Sets join to sessions through `entryId` → entry → `sessionId` (sets no longer carry `sessionId`). The Log calendar still shows October only, and per-lift charts in Log use an October view while the "previous best" comes from the whole log. localStorage key bumped to `apechit.sb.log.v2` (the v1 key is removed on load). The storyboard's "today" is Sat Oct 24 2026 (Progress `as_of`).
- **Parity:** `logic/progress.js` exports `PROGRESS.report(data, history, asOf, routine, level, goal)`, a port of Coach's `report()`, with its deload check, lift trends, stall states, fix choice, wins, muscles and footnote. The round-1 path is removed. `test/progress2.diff.js` compares it field by field (with float tolerance) against `progress-reference.json`: the sample report plus every edge case (6/6 cases, 54 expected blocks, 0 mismatches).
- **Estimated 1RM:** working sets with 12 reps or fewer (`prs.e1rmSet(..., maxReps)`). The screen always says "estimated 1RM" and never names the formula (`e1Word()` rewrites Coach's "e1RM" text keys). Log PR badges still use the rules.json 10-rep cap from PR detection.
- **Progress screen, in order:** label "Sample data · estimates" + "Strength and performance, not measured muscle growth" → Wins (top 5, "+N more" expands the full list, a "vs 3 months ago" line for main lifts) → Muscles (one row per muscle: muted ↗ ↘ → arrow, main lift + latest gain, Stalled flag at muscle level only; no body map) → tap a muscle (`#progress-m-<muscle>`) → its lifts → tap a lift (`#progress-l-<id>`) → an 8–12 week chart of the best estimated 1RM per week, with PR weeks in accent, the numbers on the points and a deload-week gap, and no plan line. Bodyweight and timed lifts show reps or hold time, never an estimated 1RM. → Needs attention (one fix per item) → Effort (average RIR/RPE by muscle, last 4 weeks) → one muted "Planned vs done" footnote. When nothing is logged yet, the screen shows the "No workouts logged yet" card with a link to Train.
- **Apply / Undo:** shown only when the fix has `apply_edits_board` and ops. `BOARD.progApply(ops)` edits his real Build board (with history) and returns a snapshot; Undo restores it only if the board is unchanged since, otherwise it points to Build. The card keeps showing the applied fix while Undo is offered. Rep-range and deload fixes are text only.
- **Which board:** Progress reads the live Build board. If the board is empty when Progress loads, it fills it with the PHUL preset (the sample routine), so the sample fixes line up. An existing board is never replaced.
- **Train:** reads the same deload rule (`report().deload`) on the real log and shows a card only when a deload is suggested; the sample is at 0 of 3, not suggested (`#tdeload` data attributes).
- **Tests:** `test/progress.test.js` (3 logic + 6 parity + 10 WebKit), hooked into `sb.test.js` after rir. Shots: `node test/shots.js <base> progress-b` → 48a–48g (light) and 48b-dark, 48d-dark. Removed shots: 25q–25u and 28n (old Progress screens).

## Progress dashboard (piece C, 2026-10-24)
- **Source of every number:** Coach's `report()['dashboard']` (tools/progress.py `dashboard()`, spec data/progress-spec.md §13), ported into `logic/progress.js` `report().dashboard` with exact parity (test/progress2.diff.js: the full report plus every `expected.*` block, `expected.dashboard` included, for sample + 6 edge cases, `dashboard_3_months` among them). The same sync (progress3) re-ported: dropping = the last 2 sessions both more than 1% below the best of the 3 before them; bodyweight stalls compare only sessions at the same added load; `load_index` when any session in the 91-day window has no set of 12 reps or fewer; "vs 3 months ago" wins from the dashboard change; one deload rule (rules.json `deload_signals.performance.source` → `perfSignal`, used by Train and Progress). Log PR badges use rules.json v10 (`e1rm_max_reps` 12) = data/prs-reference.json rules_version 10, the same cap the charts use. Display strings say "estimated 1RM" at the source.
- **Layout:** small muted label + the honesty line → KPI strip (4 tiles, one row at 390 and 320 px: `kpis.prs_30d.count` · `kpis.strength_change.display` (median of the unique main lifts, e1rm / load_index only, min 3) · `kpis.muscle_counts` progressing / flat / stalled_or_dropping, plus "N too early" for `insufficient` · `kpis.avg_rir` (progress4: mean logged RIR over done working sets, 28 days, deload left out, min 6 sets, else "Not enough RIR logged"; RPE mode shows 10 − v; when under half the sets have RIR, its note "Based on the n of total sets with RIR logged" sits small and muted under the strip); tapping a tile scrolls to its section) → "By muscle" body map coloured by each muscle's `band` through Coach's colour roles (up_strong → `--tr-up2` progress-strong, up → `--tr-up` progress, flat → `--tr-flat` neutral slate, down → `--tr-down` attention amber, insufficient → `--tr-muted`, not trained → `--map-empty`), with a dashed amber outline on stalled muscles (`stalled`); tapping a muscle opens its sheet → one muscle table (muscle · 12-week sparkline from `sparkline`, deload-only weeks ticked · main lift (+ the change `reason` when insufficient) · `change.pct_display` · `avg_rir`; sorts Problems first / A–Z / Change) → Wins chips with "+N more" → Needs attention (unchanged; Apply/Undo only where `apply_edits_board`) → the Planned vs done footnote.
- **Detail sheet:** one bottom sheet (`openPSheet(muscle, lift)`): muscle → its lifts (main lift first) → a lift's chart, with back. Routes `#progress-m-<muscle>` / `#progress-l-<lift>`.
- **Chart:** dots = `dashboard.lifts[id].dots` (`{date, session_id, value, display, pr, best, days_ago}`; progress5 dropped `deload`); 4w = days_ago < 28, 12w < 84, All. Title by the dashboard metric: e1rm "Estimated 1-rep max (lb|kg)", load_index "Load-reps index", best_reps "Best reps", hold_s "Best hold (s)"; labelled y-axis; the accent marker is `dot.best` (progress4: above every earlier dot of the lift over all history; first and deload dots false; legend "New best"), `dot.pr` stays for chips and the tooltip's "· PR"; deload sessions hollow; tooltip "Oct 5 · PR / 115 × 9 → est. 150" (reps: "12 reps", holds: "60 s hold"); muted line "Estimated from your best set each session." (other metrics: their own line, never an estimated 1RM). A "vs 3 months ago" row shows the dashboard change (early → late) or its reason.
- **Adapter `logic/progress-view.js` (`window.PVIEW`):** maps the dashboard to the view; the only storyboard-derived value (no dashboard field) is `dotSet()`: the set behind a dot, for the tooltip's "load × reps". The avg-RIR tile now reads Coach's `kpis.avg_rir`.
- **iOS WebKit:** a tap only clicks an SVG shape that has its own handler, so map paths and chart dots get a no-op `onclick` (`tapable()`).
- **Tests:** `test/progress.test.js` (dashboard sample = Coach's numbers, adapter maps only the dashboard, parity 7 cases, WebKit: KPI fit + scroll, map bands + stall marker + tap, table rows + sorts, row → sheet → chart, chips, chart title/axis/dots/range, dot tooltip, bodyweight Best reps / timed Best hold, dark contrast). Shots: `node test/shots.js <base> progress-c` → 49a–49c (light and dark) and 49d.

## Progress round 2 (prog2, 2026-10-25): deload sessions out, sparkline tap, Main lift picker
- **Data (copied, never edited at the source):** progress-rules.json (md5 94fdeb06), progress-reference.json (e9251f41), progress-spec.md (a257cdea, §14), prs-reference.json (a73ac9bb, `deload_case`), logging-spec.md (aee23b26, §7), rules.json (Coach 26618a78 + our `check_priority` block, as before; `logger.prs.exclude` now lists deload sessions; rules_version 10).
- **Deload rule, one switch:** a session is a deload only when `session.deload === true` (missing / false / null / "yes" / anything else = normal; no detection from volume or intensity). `PROGRESS.isDeloadSession(s)` (= tools/progress.py `_is_deload`) is the one function; `PRS.isDeload(s)` (= tools/prs.py `is_deload`) is the same rule for the Log tab, and a test pins them equal. `progress-view.js` uses `PROGRESS.isDeloadSession` (via `require` in node, `window.PROGRESS` in the browser) to mark deload-only weeks, so both the report and the view go through it.
- **Progress (progress5 port):** deload sessions are dropped once, at the source, in `exposures2()`, so no series, dot (no marker), sparkline, the 91-day trend map, either trend window, stall / dropping / minimum-data count, KPI, change %, vs 3 months or PR (wins, `prs_30d`, `best`, `pr`) sees them. Dots are `{date, session_id, value, display, pr, best, days_ago}`; sparklines / weekly_best have no `deload_week`; a deload-only week is a plain `null` (weekly_best lists only weeks with a value). `data.deload_sessions_excluded`; session and week counts leave deloads out. Credited sets for the sets_up / sets_down fixes skip any week with a deload session (next earlier week, up to 8 back) and never count deload sets. Unchanged: avg RIR, planned vs done (a deload still counts as done), the deload signal and its points (deload.py reads the raw history). In the view, a sparkline bridges a deload-only null week (one polyline, no tick); a week with no training at all stays a gap.
- **Sample (as of 2026-10-24):** KPI +15% (13 lifts), muscles 18 / 0 / 1 / 0, 301 dots (was 329), 200 best, 239 pr, 103 PRs in 30 days, 43 completed sessions with 4 deload sessions excluded (Sep 14–18).
- **Main lift overrides:** `report(dt, h, asOf, routine, level, goal, {main_lift_overrides: {muscle: exercise}})`, `resolveOverrides()` = tools/progress.py `resolve_overrides`: `settings.mainLiftPins` first, the argument on top (argument wins), aliases resolved. Unknown muscle / unknown exercise / ratio below `muscle.overrides.min_ratio` (0.25) → ignored, listed in `overrides_ignored` `{muscle, exercise, source, reason, ratio}` with the rules' reason text, and a valid stored pin for that muscle still applies. A pick with no session in the last 91 days → that muscle is `insufficient` with reason "main lift not trained recently", an all-null sparkline, no fallback. `main_lift.pinned` and `main_lift.override_source`; the KPI median dedupes after overrides. `report().main_lift_overrides` / `overrides_ignored` and the same two keys on `dashboard` are always present.
- **Picker (sheet, muscle detail):** "Main lift" radio group (Automatic + only lifts that credit the muscle ≥ 0.25 with data; a pick with no recent data shows as "No sessions in the last 3 months"; an ignored pick gets a note), "Reset to automatic". It saves into the log itself, `history.settings.mainLiftPins` (localStorage `apechit.sb.log.v2`, inside the `apechit.sb.*` prefix): the pins path Coach's report reads, so the table's main-lift column (accent dot on a pick), sparkline, change %, chart default and the KPI median all follow. `SBX.mlGet / mlSet` for tests.
- **Sparkline tap:** each table sparkline is an HTML tap target (`.pspk[data-pspk]`, svg `pointer-events:none` for iOS) that opens the full chart of that muscle's main lift in one tap; the chart's lift chips (`.plsw`, main first, "Main" tag) reach the muscle's other lifts.
- **Log tab PR badges (progress6, CoS approved Oct 25):** `PRS.detect` skips deload sessions before comparing: no badge, not history later sets must beat; a lift's first non-deload session is its baseline. Parity `prs-reference.json deload_case`: badges in dl2, dl4 (160 × 11 set-volume PR vs 230 × 5 only) and dl5 (`deload: "yes"` = normal), none in dl3; the same history with the flag removed reproduces `if_deload_counted`. The sample's 501 badges are unchanged (its deload sets never beat anything).
- **Tests:** progress2.diff.js parity sample + 8 edge cases (incl. `deload_week_excluded`, `main_lift_overrides` with the argument from the case key) 0 diffs; prs.diff.js 12 cases 0; progress.test.js adds deload exclusion, overrides semantics (stored + argument), PR deload badges, WebKit: no deload markers / bridged sparklines, sparkline touch tap → chart + chips, picker everywhere + reload + reset, no-data and ignored picks; sb.test.js adds the browser PR-deload check. Shots (light): `node test/shots.js <base> prog2` → 50a–50c.

## Progress round 3 (prog3, 2026-10-25): headline strip, % change chart, table rows, progress7 main-lift choice
- **Data (copied, never edited at the source):** progress-rules.json (md5 1f98cb1e), progress-reference.json (58bf1fcf; sample + 10 edge cases, new `weekly_streak`, `shared_lift_rows`), progress-spec.md (2974d8bd, §15).
- **Port (`logic/progress.js`, = tools/progress.py progress7):** `chooseMainLifts()` (= `choose_main_lifts`): candidates = lifts crediting the muscle ≥ 0.25 with a non-deload session in the 42-day window; override / pin > **specific** (ratio ≥ 0.75 and the lift's top muscle, ties allowed; all muscles first) > **unshared** (rated ≥ 0.5, else ≥ 0.25, not another muscle's main lift) > **shared**; ties: sessions, ratio, credited sets, type, id. `main_lift.selection` on report and dashboard muscles. `progress7()` adds to `report().dashboard`: `headline` {`strength_score` (100 × geometric mean of late/early change values over unique e1RM-scale main lifts, ≥ 3, half-up; arrow = mean 42-day pct_per_week vs the trend thresholds, ≥ 2 lifts), `prs_this_month` (rolling 30 days, unique main lifts, one per lift, ≥ 1% on the e1RM scale / ≥ 1 rep or second; `new_best_sessions` detail), `streak` (Monday weeks with non-deload sessions ≥ routine training days, no routine 2; deload week with a session holds, empty week breaks, current week never breaks; best over the whole log), `muscle_mix` (up / holding / down from the band, insufficient, not_trained, `stalled_marker`)}, `overlay` (per unique main lift: (dot / change.early − 1) × 100 over the 91-day window, `unit_flag`, no baseline → points [] + reason) and `table_rows` (one per unique main lift; a shared lift = one row "Deadlift — traps, forearms, lower back", avg RIR = mean of its muscles + `avg_rir_by_muscle`). `dashboard.muscles` stays per muscle for the body map.
- **Sample (as of 2026-10-24):** Strength Index 114 ↗ (15 lifts), 16 PRs this month (50 new-best sessions), streak 7 / best 7 (target 4), mix 18 / 1 / 0 with side delts stalled, 17 table rows, KPI +15% across 15 lifts (glutes → Bulgarian Split Squat, adductors → Front Squat; Deadlift shared by traps, forearms, lower back).
- **Adapter (`logic/progress-view.js`):** `rows`, `headline`, `overlay` mapped 1:1. Display-only choices: highlighted lines = top 3 by change on the estimated-1RM scale + the lowest when below 0 (`overlay.hi`); reps / seconds lines (`unit_flag` reps / seconds) start hidden (`overlay.hidden_default`) because they move much faster in % and would flatten the shared axis; a row's bucket = the worst of its muscles' buckets (sort only). *(Superseded by fb1 + order1 below: no highlight / muted / hidden-by-default lines any more.)*
- **UI:** KPI strip (`.pkpi`): Strength Index + arrow (→ % chart) · PRs this month, main lifts (→ wins) · streak `7 wk`, best · up / holding / down dots + "N stalled"; the model label sits under the strip. Avg RIR left the strip: the table's RIR column plus "all sets: 1.7" and the partial-logging note in the table foot. % change chart (`[data-psec=ovl]`, `.povl`): one SVG, shared % axis with a dashed 0% line, lines from `overlay.points` (deload sessions have no point, so lines join across), highlighted lines in `--ov1..4` (light / dark tokens in sb.css, distinct non-grey hues) and the rest `--ov-mute`, reps / seconds dashed; legend chips (`.povk[data-ovk]`, aria-pressed) show / hide a line; a transparent wide-stroke hit layer (`.ovhit[data-ovl]`, `tapable()` for iOS) opens that lift's full chart in the sheet; 4w / 12w / All (`[data-ovr]`); "Median +15% · 15 lifts" in its header; lifts without a baseline are listed with their reason. Table: rows from `table_rows` (`data-pm` = first muscle, `data-pms`, `data-lift`), shared rows list their muscles and each muscle's RIR; a sparkline tap opens the row's lift. No five-status bands or levels.
- **Tests:** progress2.diff.js parity sample + 10 edge cases, full report + every expected block incl. `dashboard.headline / overlay / table_rows` and each muscle's `selection`: 0 diffs. progress.test.js adds headline / overlay / rows sample numbers, streak edge rules, and WebKit: KPI strip values, % chart (highlight / muted colours, hidden reps+seconds, legend touch taps show / hide, a touch tap on a line between two points opens its chart, 4w / 12w / All), overlay skips deloads and joins, 17 rows with the shared Deadlift row, dark contrast for the new text; sb.test.js (`progressOneRowPerMainLift`, section order) and rir.test.js (section order) follow the new layout. Shots: `node test/shots.js <base> prog3` → 51a/51b KPI strip light/dark, 51c/51d % change chart light/dark, 51e table rows.

## Evolution ladder (ladder + evolution1, 2026-10-25)
- **Data (copied from lift-board/data, md5 prefixes as given by CoS):** evolution-rules.json 99d2946e, evolution-reference.json 688126c5, evolution-spec.md 709cdf47, sample-log.json 0dc94019 (bodyweight now 240 -> 242.2 lb; sets unchanged), progress-reference.json dbf0047e (only sample.sha256 differs). The reference's own rules_sha256 / sample.sha256 match the copies. Coach's tools/evolution.py and build_evolution.py were read, never run. The UI shell first shipped on placeholder thresholds; every placeholder is now gone (a test asserts it).
- **Port (`logic/ladder.js`, `window.LADDER`):** `report(dt, history, asOf)` = evolution.py `report()` field for field (rank / awarded_out / next / progress {overall, pct, slots + targets} / substitution / lifts / ladder / newly_revealed / bodyweight_current / badges {plates, lean_prime} / lean / labels). Rules from `dt.EVO` (browser: `RD.EVO`, fetched with the other optional data) or data/ in node. Thresholds read from `tables.<men|women>.<lift>.ranks` (never recomputed). Values: best-ever Epley e1RM ÷ bodyweight of the set's day (≤ 12 reps, deload sessions and e1rm-excluded tags out, logged load > 0); bodyweight = latest entry on/before the set's LA date, else `settings.profile.bodyweight`, else unrated (no backfill, unlike prs). Pull-ups / dips: strict reps; weighted sets r_eq = floor(30·((0.95·BW + added)(1 + r/30)/(0.95·BW) − 1) + 1e-9); assisted (negative load) ignored. Rank = highest index met by ≥ 3 of 5 slots (floor knuckle_dragger.1); at most one stand-in (row for pull-ups, dips for bench) only when the core lift was never trained; never demote via `history.evolution.awarded`. Progress per slot clamp((v − T_rank)/(T_next − T_rank)), overall = 3rd-highest, pct floored. Targets ceil to 5 lb / 2.5 kg. Plate badges by settings.unit. Lean: opt-in only, never affects rank, WHtR ≤ 0.46 / 0.45, BF% ≤ 15 / 23 (dexa, calipers, bia), age allowance 40–49 / 50+, best reading in 90 days, stale greyed, needs Prime+, hidden for under-18s and by `settings.bodyComp.hidden`. EPS 1e-9, LA local dates.
- **Names:** `rankName(i, R, hidden, labels)` is the one formatter: Coach's tier `label_template` ('{stage}', 'Chief {stage}', 'Alpha {stage}'), '???' for hidden stages, optional overrides (`labels.ranks[stage_id]`, `labels.stages`).
- **Parity:** `node test/evolution.diff.js` compacts our report like build_evolution.py `expected()` and diffs REF.sample.expected + all 22 REF.edge_cases (the reference has 22, not 25) and also the full `report` blocks: 23/23 expected, 23/23 full, 0 diffs. Sample: Chief Silverback (silverback.2), 40% to Alpha Silverback, men's table (labelled). Progress parity re-run on the new reference: 11/11.
- **Settings / log fields (all optional, all in backup / restore):** `settings.profile {sex, birthDate, height{value,unit}, bodyweight{value,unit}}`, `settings.bodyComp {optIn, hidden}`, `history.bodyComp[] {date, waist{value,unit}, bfPct, bfMethod}`, `history.evolution.awarded {stage, tier}`. Storyboard-only: `settings.ladder.hidden` (hide the whole ladder; Coach's spec names no key). `logExport()` / `logImport()` (SBX) carry the whole log; the Back up / Restore rows still wait for the native app.
- **Never demote in the UI:** after the card or the ladder screen shows a rank, `ladPersist()` writes `awarded_out` when it is higher than the stored one (never lowers). The finish screen does not persist (the session is not in the log until saved).
- **UI (`sb.js`):** Progress card right after the KPI strip (march strip of revealed stages + one dim '???' teaser, rank, bar, "40% to Alpha Silverback", next-lift line, men's-table label when sex is unset; tap -> `#ladder`). `#ladder`: strip, rank hero (+ "New stage unlocked: Kong" when revealed, held note), bar, hint, notes (substitution / weighted / bodyweight / table), Core lifts (value, next-rank target, stage chip, plate badges), Other lifts (rated stand-ins), promotion note, Lean Prime row (muted "Physique not tracked" + Set up when off; nothing when hidden / under 18), "There is more past Prime" teaser, model + source notes, settings link. Settings "Evolution ladder": show switch, sex, birth date, height, profile bodyweight; "Physique (optional)" (only for 18+ or age unknown): Hide physique, Track physique (opt-in), status label, add / delete readings. Finish: small "Rank up" row in the hero only when the shown rank went up (log vs log + this workout); `#finish-rankup` demo turns the shoulder-press slot into overhead press at Coach's next-rank target.
- **Next-lift hint (storyboard choice, Coach gives targets only):** among slots below the next rank, the one with the smallest relative gap to its threshold, shown as "+N lb <lift> (estimated 1RM T lb)" or "+N strict <lift> reps (T total)". Sample: "+30 lb deadlift (estimated 1RM 445 lb)".
- **Imagery:** see "fb1" below: `apeFig(k)` now draws the CC0 figures in `assets/ladder/` (the inline SVG placeholders are gone); Ember for reached / current, slate ahead, dim teaser; dark-safe.
- **Copy:** Coach's labels verbatim; our strings are scanned for health / fitness / "ideal" / "lose" words.
- **Tests:** `test/ladder.test.js` (in core after progress): hashes, 23 parity cases, sample, names, overrides, no placeholders, never demote, rank-up rule, hint, copy scan; WebKit iPhone 13 taps for card -> screen, teaser, chips / plates, Lean note, awarded saved, rank-up only when up, profile settings, sex change held, opt-in + reading -> pass, under 18, hide physique, backup / restore, hide-all, dark. Shots `ladder` gate 52a–l (light / dark).
- **Plate medals (plates redo, Mr Dude via CoS):** rules unchanged (Coach's `plate_badges` via `LADDER.plateBadges`: real logged working sets, deloads out, OHP 2, lb / kg lists, hidden fifth). No unearned plate is drawn anywhere; the ladder screen's Plates section is gone. Progress: `medalRack()` right under the title, hidden until the first award; one medal per `plate_badges` lift (<= 4): ribbon in the lift's colour with 1-4 stars = plates earned, steel disc, gold disc + gold stars once the hidden fifth is earned. Tap -> `medalSheet(lift)`: each earned plate (label, load, date), the fifth marked gold. Finish: `showPlateMoment()` (from `afterFinish`) puts a full-screen `.pmom` over `#app` per lift with a new plate (headline 'Three plates · Bench press · 315 lb', lower new plates as 'Also …' lines, gold 'There was one more plate. Now you know.' for the fifth); the medal drops in with a burst; Continue -> next lift's moment, then the normal finish card (no plate content in the card). `prefers-reduced-motion: reduce` -> only a fade. Shown once per finish build (`FIN.momDone`), removed on route change. Tests: `test/plates.test.js` (rack hidden at 0, <= 4 medals, stars, gold only for the fifth, sheet rows vs `LADDER.report`, headline, Continue -> finish card, reduced-motion fade, no Plates section, kg). Shots `medals` gate 59a–r.

## Progress + ladder feedback (fb1, Mr Dude) and Coach's order1 rules (2026-10-25)
- **Data (copied from lift-board/data; md5 prefixes match CoS):** progress-rules.json 13184442, progress-reference.json 8b2c09b7 (16 edge cases, 6 new order1 cases), progress-spec.md 2f8580d8 (§16), evolution-rules.json ddba95df, evolution-reference.json e098c113 (only `rules_sha256` changed), evolution-spec.md 870df782. Coach's tools were read with Read only (tools/progress.py `priority_muscles` / `muscle_order` / `chart_default` / `order1`); none were run.
- **order1 port (`logic/progress.js`):** `priorityMuscles`, `muscleOrder`, `overlayRow`, `chartDefault`, `order1`, run last on the dashboard. `report(dt, history, asOf, routine, level, goal, opts, prefs)`; the 8th argument (or `opts.prefs`) is the ranking prefs object. Only `prefs.bias_muscles` is read (cleaned like rank `_bias`: valid muscle or region ids, dedupe, first `ranking.bias.max` = 3, region → parent via `exl.regionGroup`); `prefs.goals` is not used. Output: `dashboard.muscle_order`, `muscle_order_meta {priority, ignored, cap}`, `table_rows` re-sorted with `priority: bool` (a shared row's muscles and label follow the order), and `chart_default {lifts, more, skipped, cap, extra_series}`. With no prefs nothing moves (progress7 order).
- **Parity:** `test/progress2.diff.js` passes `prefs` where a case has it and compacts `muscle_order` ([muscle, priority]), `muscle_order_meta`, `chart_default` (lifts [lift, source, slot, stand_in, muscles], more, skipped, extra_series [lift, status, baseline, last_pct, n_points]) and `table_rows[].priority` the way Coach's expected blocks do: sample + 16 cases, full report + every expected block, 0 diffs. Evolution parity: sample + 22 cases, 0 diffs.
- **Storyboard wiring (`sb.js`):** `progressData()` passes the same `prefs()` object the Build ranking uses (so the storyboard's focus muscles, default side delts + lats, `localStorage apechit.sb.bias`, drive the order); the cache key includes `bias_muscles`.
- **% change chart:** default lines = `chart_default.lifts` (priority muscles' main lifts, then the ladder core lifts bench / squat / deadlift / OHP / pull-ups or their stand-ins, eligible = 91-day status ok, cap 6). Lines are drawn from `overlay.lifts` + `chart_default.extra_series`. Every default line has its own colour `--ov1..6` (Okabe-Ito based; light #0072B2 #D55E00 #007A5E #B8509A #A87200 #3A93C9, dark #6CB8F0 #FF8A4C #3DD6A8 #E89AC9 #F2C14E #A9DCFA; all >= 3:1 on the card, none grey) AND its own end-marker shape (`data-mk` 0-5: circle, square, triangle, diamond, down-triangle, x), so lines stay apart in grayscale. Reps / seconds lines (pull-ups) are drawn dashed `5 3`, not hidden. `+ N more` (`chart_default.more`) opens a second legend row, off by default; a line switched on there takes the next colour index (past 6 the colour repeats, dashed `7 3`). One-line caption from the sources: "Your priority muscles + core lifts (side delts, lats)" / "Core lifts" / "Your priority muscles". Line tap → that lift's chart.
- **Muscle tap:** tapping a muscle row (anywhere, not just the sparkline), a map muscle, a win or a chart line opens the main lift's full chart straight away: the muscle's progress header (`.pshmh`: name + stall tag, change %, trend, avg RIR, reason) stays on top, then the lift name (`.plname`), the muscle's other lifts as chips (`.plsw [data-sl]`), the chart, and the Main lift picker (`.pmlpick`) at the bottom. The intermediate muscle-lift list and its back button are gone (`musclePane` remains only as the no-data fallback).
- **Muscle table order:** default segment "Default" = Coach's `table_rows` order (priority muscles in the user's order, even untrained, then trained, then the rest, fixed exercises.json order); priority rows carry `data-prio` and an accent dot in the row gutter. Problems / A–Z / Change sorts still re-sort the same rows.
- **Ladder hidden label:** `settings.ladder.hidden` is now in Coach's spec (display only, `display.ladder_hidden`); while it is on, Settings shows `labels.ladder_hidden_note`: "Ladder hidden. Your rank is still tracked and is never lowered."
- **Ladder art:** `assets/ladder/stage-1..5.svg` (Knuckle-Dragger, Primate, Neanderthal, Silverback, Prime) are split from Openclipart #348815 "Evolution Steps" by j4p4n (CC0 1.0), with fills flattened to `currentColor`, a shared width and a shared baseline. `apeFig(k)` renders `<i class="afig"><i class="afm" style="--afsrc:url(...)">` with the SVG as a CSS mask over `currentColor`, so the existing Ember / slate / tease colours and dark mode apply unchanged. Kong / Apex (once revealed) reuse Prime with a soft glow; the hidden-stage teaser is a dimmed Prime with a '?' beside the head. Sources, licences, changes and the rejected candidates (CC BY-SA Commons files, OpenMoji BY-SA, the 3-figure CC0 set, the runner-up CC0 #12755) are in `assets/ladder/LICENSES.md`; the comparison sheet is `shots/qc-ladder-art.png`.
- **Tests:** progress.test.js (order1 logic + view, row tap → chart with header, chart default / colours / markers / `+ more` / toggle / caption / line tap, palette light + dark, table order + sorts), ladder.test.js (new hashes, art files / licence / mask wiring / colours, Coach's hidden label), rir.test.js and sb.test.js updated for the row → chart flow; sb.test.js compares the browser report with Coach's no-prefs reference by clearing the focus muscles first. Shots: `fb1` gate 53a-f (light) + the ladder gate 52a-l (light + dark).
- **Ladder strip labels (CoS fix):** at 375 / 390 px the equal 46 px-basis columns (~55 px) were narrower than "Neanderthal" (~58 px), so it ran into "Silverback". `.lfig` is now `flex:1 1 auto; min-width:min-content` (each column sized to its label, never below it, spare width shared), `.lstrip` gap 5 → 8 px, labels −0.1 px letter-spacing; sizes unchanged (10 / 10.5 px), art unchanged; Knuckle-Dragger still wraps only at its hyphen. Narrower than ~300 px the strip scrolls sideways (existing `overflow-x:auto`) rather than breaking words. Test `ladderStripLabelsNoOverlap` (ladder.test.js): both strips (Progress card + ladder screen) × 375 / 390 × light / dark, ≥ 3 px between neighbouring labels, no mid-word wraps, nothing outside the strip (min gap now 8 px at 375 and 390, was −2.1 px).
- **Muscle chips keep the status arrow:** the old per-muscle list showed each lift's calm status arrow (`LST[L.status]`); fb1's chips dropped it, which hid e.g. Leg Press "dropping". Each `.plsc` chip now ends with the same `arrow()` (inherits chip colour at 70 % opacity, no tint). The lift pane's "Trend, last 6 weeks" row is unchanged (`trend.status`, can differ from the overall status). rir.test.js `progressCalmTrendNoRedPills` asserts it via the chip.


## Ladder art round 2 (art2, CoS / Mr Dude, 2026-10-25)

- **Stages (`assets/ladder/`, all CC0, sources in `LICENSES.md`):** stage-1 Knuckle-Dragger unchanged (Openclipart #348815 fig 1); the old Primate (fig 2) is gone; stage-2 Primate = old stage-3 (fig 3); stage-3 Neanderthal = old stage-4 (fig 4); stage-4 Silverback = new hand-authored upright gorilla, front view (crest, brow, no neck, long arms with knuckle fists, short bowed legs); stage-5 Prime = "fitness" by btoteva (Openclipart #20991, front double biceps) filled to a silhouette with its human head replaced by our hand-drawn gorilla profile head (brow ridge, jutting muzzle). New files are one traced `currentColor` path each; all five share height 414.44 and the baseline, so the mask's `contain` keeps one scale (new viewBox widths 253 / 270, under the 0.67 aspect of every figure box). Kong / Apex still reuse Prime with the glow. `SBX.apeFig` is exposed for tests; each figure carries `data-afsrc="stage-n"`.
- **Hidden tier = lock, no '???':** the dim Prime + '?' teaser figure and its '???' label are gone from the card strip, the ladder strip and the teaser card. `lockFig()` draws a padlock (same path as `assets/ladder/lock.svg`, inline SVG so it never races a mask load; WebKit occasionally skipped painting a `mask:url()` lock that overflows the card) inside a box that is exactly the lock's left half, placed with `right:calc((100% - 100vw)/2)` (hosts are centred) so its right edge is the screen edge: the lock reads as cut in half by the edge and nothing overflows the page (no sideways scroll). Fill = gradient `--lock-a` -> `--lock-b`, darker toward the edge (light #BCC4CE -> #6E7885, dark #6A7684 -> #2A3038). The `ladder-teaser` route now scrolls to the lock. Coach's `hidden.label` is still used by logic for hidden next-rank / per-lift names (Coach's rule, untouched); it is not shown on these surfaces in the sample.
- **Dark mode fix:** `--lad-slate` / `--lad-tease` (and the new lock tokens) only followed `html[data-theme=dark]`; they now also follow `prefers-color-scheme: dark`, like the other tokens.
- **Tests (ladder.test.js):** `ladderArt2FiveStagesMap` (5 files, aria-labels, provenance comments, apeFig k 0..6 -> stage-1..5), `ladderArtOpenLicenceFigures` (files incl. lock.svg, CC0, #348815 / #20991 / lock in LICENSES), `ladderNoQuestionMarks` (card, ladder screen, teaser), `ladderLockHalfOffScreen` (card strip, ladder strip, teaser × 375 / 390 / 430 × light / dark: right edge == screen edge, box = half the drawn lock, overflow hidden, no horizontal scroll, gradient darker toward the edge, dark != light), `ladderStripLabelsNoOverlap` now 5 labels. Shots: `art2` gate 54a-n; QC sheet `shots/qc-ladder-art2.png` (not for publish).

- **swap3 percentile ladder (Coach's Strength Level port):** data synced evolution-rules.json 64ceb28f, evolution-reference.json 739e0db3 (50 edge cases), evolution-spec.md 8268384e; proposals/swap3/sources.md not shipped (spec: gap table "Not shown in the app"). `logic/ladder.js` adds the curve math from tools/evolution_sl.py (`SL.tiersAt / atPct / entries / raw / shown / position / pctFromPos`, `slBars` cached), Python half-even `rnd`, `overallRankPos`, `posProgress`, `pctEntry`, `percentile` (band `top` at position >= 18), mig3 migration (`migrationPartsSl`, `migrationFloorSl` 3-of-5 / all-5, `hiddenStarts` 15/18, `MIG_SUBS`). Lift values are est. 1RM in the display unit + multiple of bodyweight; targets are "Next rank: est. 1RM X lb". UI: `ladPct()` percentile line ("Stronger than about N% of lifters your size") on the Progress card and ladder hero; footer `labels.bars` + "The percentile line is an estimate." `#finish-rankup` demo also turns lat-pulldown into pull-ups at the target reps when still short of 3-of-5. Parity: sample + 50 cases, expected + full, 0 diffs. A fresh 225 bench at 180 lb is Prime; migrated v1 Prime lands at Silverback by design. Shots `swap3` gate 60a–h; `medals` 59e/f (real-history 4-medal log) and 59o/p (bench plates Oct 2025 – Oct 2026) are built in test/shots.js.

- **Silverback figure (sbA, Oct 30, 2026):** `assets/ladder/stage-4.svg` is a faithful potrace vectorization of `ref/silverback-A.jpg`, supplied and chosen by Mr Dude (2x upscale, threshold, light de-fringe only; arm gaps, fists, face and toes as drawn), 414 tall in a 251.54-wide viewBox, `currentColor`; same file everywhere Silverback is drawn. Strip sizing unchanged (widths capped at the column, so the wider figure fits at 360). Shots `sbA` gate 63a–c.

- **Strip round (Oct 30, 2026, Mr Dude):** march strip (ladder screen + Progress card) has no lock any more (the element is no longer rendered; hidden stages are simply not drawn; the 'There is more past ...' teaser card keeps its lock). Figures bigger (card 48x70, current 58x84; screen 58x84, current 68x100; widths capped at the column with min(...,100%)), column gap 8 -> 3 px, 8 px right padding after the last figure. stage-4.svg arm rebuilt (deltoid cap, triceps / biceps mass, heavier forearm and hand; the negative-space gap follows the new outline). Shots `strip` gate 62a–c.

- **Kong / Apex figures (kongapex, Oct 30, 2026):** `assets/ladder/stage-6.svg` (Kong, from `ref/candidates/kong-H.jpg` since kongH, replacing kong-A: front-facing chest-drum; fist outlines kept as cuts, thickened ~2 px; eye / teeth cut-outs kept) and `stage-7.svg` (Apex, from `apex-C.jpg`; arm-waist gaps kept as holes) are faithful potrace vectorizations, generated for and chosen by Mr Dude; `APE_FIG` keys kong -> stage-6, apex -> stage-7, without the old glow, and the 1.08 hidden-stage scale is gone. Still hidden until reached. With 6-7 revealed columns the strip gives the current column 1.4fr and drops labels to 9px with soft hyphens (Nean-der-thal, Silver-back) so nothing overlaps down to 360 px; 5 columns unchanged. Shots `kongapex` gate 64a–d.
- **Strip height ramp (kongH, Oct 30, 2026, Mr Dude):** non-current strip figures rise strictly stage by stage, linear from 70% (first visible stage) to 100% (last) of the strip's max figure height (`--hmax`: 70px card, 84px screen); the current stage keeps its own enlarged box. stage-1/2/3/5 viewBoxes were tightened to the drawn extents (all art now tight), so box height = drawn height; `APE_FIG[stage].a` holds each width/height ratio. One shared factor, min(--hmax, column width / --q) with --q the widest r*a, uses container units on `.lstrip` to keep every figure inside its column at 6-7 columns without breaking the ramp. Shots 65c (ladder, all stages) / 65d (Progress card).
- **Strip height ramp 2 (ramp2, Oct 30, 2026, Mr Dude, 'March of Progress'):** replaces the linear 70-100% ramp. Heights are fixed fractions of the strip max (`--hmax` 70px card / 84px screen) keyed by stage id in `LAD_RAMP`: Knuckle-Dragger .45, Primate .60, Neanderthal .75, Prime .88, Silverback .93, Kong .97, Apex 1.0; the current stage is `LAD_CUR` = 1.15x its ramp height. Height first: one shared size min(--hmax, column width / --q), with --q the worst neighbouring-pair (and edge) width ratio, so wide art may overflow its column into a narrow neighbour's spare space (up to ~4 px at 7 columns, never touching) instead of shrinking the row. Shots 66a-c.
- **Ramp 3 (ramp3, Oct 30, 2026, Mr Dude):** Kong made visibly bigger than Silverback: `LAD_RAMP` Prime .86, Silverback .89, Kong .96, Apex 1.0 (others unchanged). Ladder screen at 390 with all stages: Silverback 63.7 px, Kong 68.7 px. Shots 67a-b.
- **Nerd pill + ape head (nerdape, Oct 30, 2026, Mr Dude):** the header Learn button (`bookBtn`, Train/Build/Progress) is now a compact text pill "Nerd Sh*t" (`.ibtn.npill`, 36px visual, 44px tap target, aria-label "Learn: Nerd Sh*t"). Every body map (`map()`) wears a hand-drawn gorilla head (`MHEAD`, `.mhead`: crest, brow shelf, muzzle on the front; crest and rounded skull on the back) in `--map-base`/`--map-line`, drawn after the outline and before the muscle paths, `pointer-events:none`, no `data-mu`, never shaded. The unused `opt.ape` placeholder slot was removed. Shots 68a-d.
- **Ape-Chit head (apechit, Oct 30, 2026, Mr Dude):** the body-map gorilla head (`MHEAD`, `.mhead`) is redrawn in the Ape-Chit logo style (`assets/logo/icon-black-v3.svg` / `lockup-v3.svg`): one flat, faceted, straight-edged solid silhouette (fixed grey, `color-mix(--map-line, --ink 26%)`) split into planes by constant-width negative-space gaps in `--map-base`. Front: heavy brow ridge with the eyes fully shadowed (none drawn), muzzle planes, a rascally half-smile (closed on one side, open with teeth on the other). Back: the crest and the skull facets of the same head. Still decorative only (after the outline, before the muscle paths, `pointer-events:none`, no `data-mu`). Shots 69a-b.
- **Logo-cut ape head (apechit2, Oct 30, 2026, Mr Dude; replaces apechit):** `.mhead` is now cut from the Ape-Chit logo vector itself (`assets/logo/icon-white-v3.svg`; no v2 svg exists, and v3's head is v2's). `MHD_S` is the logo's main silhouette subpath clipped to the head (faceted back-of-skull closing cut plus a small crest bump, since the logo head runs into the back); `MHD_H` are the logo's own ear/brow/muzzle/mouth highlight subpaths; plus one solid brow-shadow facet over the eye. It faces right in profile like the logo, widened 1.3x so the skull reads low and wide. Greys: silhouette `--map-line`, highlights `--map-base`, darker edges. Back view = the same silhouette mirrored, no face. The body outline is clipped above y 250 (`#mhclip-<side>`) so the human head never shows. Still decorative and behind the muscles. Shots 70a-b.
- **Front-facing ape head (apechit3, Oct 30, 2026, Mr Dude's pick; replaces apechit2):** `.mhead` is a fresh hand-drawn, symmetric, front-facing gorilla head in the Ape-Chit logo style (straight-edged facets; head `--map-line`, highlight planes `--map-base`, edges and shadow a darker grey `MHD_E`). It has a wide skull with a crest peak, a heavy brow with a solid shadow over the eyes split by the nose bridge, a broad flat nose with flared nostrils, a big muzzle plane, and a lopsided half-smile: closed on one side, open on the other with chunky upper and lower teeth on a dark mouth. About the trap span wide (x 396-628, y 62-290); the traps overlap the jaw. Back: the same outline with the crest seam, skull facets and nape lines. The body outline stays clipped above y 250. Decorative and behind the muscles. Shots 71a-b.
- **g1 stencil head (g1head, Oct 31, 2026, Mr Dude; replaces apechit3):** `.mhead` is a faithful potracer trace of `ref/apehead-g1.jpg`, a black stencil ape head with a fang smirk. `MHD_SIL` is the silhouette, `MHD_F` the black fill with the white cuts as evenodd holes, and `MHD_B` the back view (the same outline, with only the crest and ear cuts). Recoloured: black becomes a grey one shade darker than the body (`color-mix(--map-line, --ink 30%)`), and the cuts become `--map-base`. Front-facing, sized by height (y 56-320, about 188 units wide), body outline still clipped above y 250. Decorative, behind the muscles. Shots 73a-b.
- **g1b (Oct 31, 2026, Mr Dude):** the g1 head is now true logo black (`#000`) with white cuts. Both are traced as their own shapes over a solid silhouette, so there is no seam. It's about 12% smaller (y 88-320, ~165 units wide). A sloped gorilla neck (`MHD_NECK`: body-grey fill from each shoulder at (345|679, 314) up to the head's widest point at y ~228, with only the slope edges stroked) removes the neck/head step, front and back. The upper-trap muscle paths are lifted toward the slope at load (`mhWarp`: front strongly, back lightly; same ids/regions, so hit areas and volume fills are unchanged). Body outline still clipped above y 250. Shots 74a-b.
