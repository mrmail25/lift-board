# Lift Board: Workout Logging Page, Design Spec (v0.3)

Owner: Coach (logic). For: Chief of Staff (approval), Builder (implementation). **Status: v1 APPROVED by Mr Dude (via Chief of Staff, Oct 12, 2026) with the v0.3 changes below. Builder builds from this version.** Previous version: `logging-spec.v0.2.md`.

### Changelog v0.3 (from v0.2)
1. **Start any session** (§1): default **Continue** = next session in split order after the last completed one (wraps around); pick any day; skip sessions, recorded as `status:'skipped'` and counted in adherence (§8, §13).
2. **Apply-to-board / Update-split moved into v1** (§1, §8, §14): summary diff of structural edits with three choices (Update loaded split / Apply to this board only / Don't apply) + Undo. Recovery baseline never touched.
3. **One source of truth** (new §0.1): logger imports the board's modules and data; nothing duplicated or hardcoded. Sessions store exercise ids + `schema` version; id alias map and archived-exercise handling (§13). Cross-page consistency tests and the heat.js `gradient.week.opacity` fix (§16).
4. **Hard set = RIR ≤ 3** (`settings.hardRIR` default 3, user-adjustable). No RIR logged still counts; the flag is quiet. RIR entry optional, default empty (§3, §5, §13).
5. **Later backlog** adds look-and-feel polish and motivational features (§14).
Tags: **[E]** = evidence-based (with a citation), **[C]** = convention (what established loggers do, or common coaching practice), **[M]** = modeling choice (our own rule, can be tuned).

## 0. Principles
- Logging a set should take one tap when the user did what the app prefilled. [C]
- The logger reuses the board's model: the same `exercises.json` ratings, the same fractional counting (rating ≥ 0.25), the same `targets.json` bands and level factor, and the `swap.json` scoring. Done work and planned work feed the same body map. [M]
- Every number the app computes is labeled as an estimate, and deload and recovery output is a model-based suggestion, not medical advice. [M]

## 0.1 One source of truth (architecture requirement)
- The logger **imports the same modules and data files as the board**; it never copies or re-implements them: `exercises.json` (ratings, ids, type, equipment), `targets.json` (bands, min/max, `levelMinFactor` and its rounding, `curve.k_by_muscle`, gradient palette/stops/opacity), `rules.json`, `swap.json`, the `heat.js` palette and band logic, and the board's counting function (fractional, rating ≥ 0.25). [M]
- Nothing is duplicated or hardcoded in logger code: no colours, thresholds, factors, rest values or muscle lists. A future change to any data file (e.g. body-map colours) must appear on both pages with no logger edit.
- Exercises are referenced by **exercise id** everywhere (sessions, entries, PRs); names are display only (plus a name snapshot for archive, §13).

## 1. Starting a session from the board
- **Any session can be started, not just today's.** The bottom bar's primary action is **Continue: <day label>**, which starts the next session after the last completed one in split order, wrapping from the last to the first. With no completed session yet, Continue = the first day in split order. [M]
- **Split order** = the day order (Mon to Sun columns) of the loaded split, or of the current board if no split is loaded, **excluding days with no tiles**. "Last completed" = the most recent session with `status:'completed'` or `'skipped'` whose `dayIdx` is in the current split order (a skip advances Continue). If the last session's day no longer exists in the order, Continue falls back to the next non-empty day after its `dayIdx`. [M]
- **Pick any day:** a chooser (and a long press on any column header) offers **Start this day** for any non-empty day. [M]
- **Skip:** the chooser offers **Skip <day>**, which records a session `{status:'skipped', dayIdx, date, splitId?}` with no entries, and advances Continue. Picking a day further ahead than Continue offers "Skip the N sessions in between?" (default No). Skipped sessions are shown in history and count in adherence as skipped (§8), never as silent misses. Undo is available right after a skip. [M]
- Each tile becomes an **exercise card** in board order. The card shows the name, type icon (star, plus or circle), muscle tags, planned working sets, and the rep range (§6; type default, per-tile override). [M]
- The session is a snapshot. Editing the board mid-session doesn't change the running session, and editing the session doesn't change the board unless the user chooses to write it back in the summary (§8 **Write back to routine**). [M]
- An unfinished session survives reloads. On reopen the app asks **Resume** or **Discard** (discarding needs a confirm). [C]

## 2. Set rows
Columns: `#/type | Previous | Load | Reps | RIR | ✓`.
- **Previous** shows last time's set for the same exercise in the same set position (e.g. "80 × 9 @2"). Hevy shows a PREVIOUS column the same way, matched by set position, and blank when there's no history; tapping it copies the values ([Hevy](https://www.hevyapp.com/features/track-exercises/)). Strong also shows previous weights and reps. [C]
- **Prefill:** load and reps start from Previous. If the progression cue (§6) suggests a change, the suggested load is prefilled and shown in accent colour with a "↑ suggested" chip, and one tap on the chip reverts to last time's value. With no history, the fields are empty and focus goes to Load. [M]
- Load and reps are steppers (−/+ by the equipment increment, §6) with tap-to-type. Bodyweight exercises log reps plus optional added or assisted load. [C]
- Units: **lb by default**, with a kg toggle in settings (Decision 6). Loads are stored in the logged unit and converted for display only. [M]

## 3. Effort: RIR by default, RPE as an option
- RIR is the per-set effort input, a **0, 1, 2, 3, 4+** chip row. **It is optional and low-friction:** the chips are collapsed behind a small "RIR" tap on the set row (or a single compact row), **default empty, not prefilled**, and **never required to check a set**. Mr Dude trains to failure and usually won't log RIR. [M] The RIR-based RPE scale was validated in Zourdos et al. 2016. [E]
- Settings toggle for **RPE** (`settings.effort = 'rir' | 'rpe'`), display and input only: RPE = 10 − RIR, chips **10, 9, 8, 7, ≤6**, where ≤6 stores RIR 4. **No half points.** Only RIR is stored, so switching display mode never changes data. [E]/[M]
- **Store (fixed, Chief of Staff Oct 24, 2026):** `set.rir` is an integer **0 to 4** (4 means 4+), `null` when skipped. On read, legacy values clamp: rir 5 (old 5+) becomes 4, fractional values round to the nearest integer (half up), negatives become 0. See `progress-spec.md` §1. [M]
- Effort is optional. A working set with no effort value counts as a hard set (benefit of the doubt for working sets). It keeps an "effort not logged" flag in the data and analytics, but the flag is **quiet**: no prompts, banners, badges or nags (Decision 2). [M]

## 4. One-tap completion and the auto rest timer
- Tapping ✓ marks the set done with the prefilled values and starts the rest timer. A long press on ✓ opens the full edit. [C] Strong starts its rest timer automatically on set completion (default 2:00) and allows separate warm-up and working durations per exercise ([Strong help](https://help.strongapp.io/article/231-rest-timer)). Hevy starts a per-exercise timer on completion, with ±15 s buttons ([Hevy](https://www.hevyapp.com/features/workout-rest-timer/)).
- **Default rest by type:** primary 3:00, accessory 2:00, isolation 1:30, warm-up 1:00. Editable per exercise, and the edit is remembered. ±15 s buttons and Skip. [C]/[M]
  - The planner's session-length estimate (`rules.json` v5 `session_length.rest_min_by_type`) uses the same per-type rest: primary 3.0, accessory 2.0, isolation 1.5 min (plus 10 min warm-up and 0.75 min work per set), so logger and planner agree. (Decision 1)
- Timer: a sticky bottom pill showing the countdown, with a vibration and sound at 0 where the platform allows it. iOS web can't vibrate, so it shows a visual flash plus an optional sound and a local notification when the PWA has permission. See §13 (timer docks above the home indicator, timestamps survive locking). [C]

## 5. Warm-up vs working sets, and hard sets
- Each set has a type: **W** (warm-up) or working, set by tapping the set number. Optional **D** (drop) and **F** (failure) tags count as working. [C] Strong and Hevy both tag warm-ups. Strong excludes warm-ups from metrics, and Hevy lets the user choose.
- An optional warm-up helper for primary lifts suggests 2 to 3 ramp sets (e.g. 40% × 8, 60% × 5, 80% × 2 of the first working load). These are rounded to the increment and editable. [C]/[M]
- **Hard set = a completed working set with RIR ≤ `settings.hardRIR`** (default **3**, user-adjustable in settings), or with no RIR logged. Warm-ups never count. [E] Hypertrophy increases as sets get closer to failure, and sets with many reps in reserve contribute less (Robinson et al. 2024; Refalo et al. 2023). The specific ≤ 3 cutoff is **[M]**, a modeling choice: neither paper defines a threshold (Decision 3).

## 6. Progression cues
- **Rep range:** default per type (primary 6–10, accessory 8–12, isolation 10–15); each tile can override it (Decision 5). Target RIR is 1 to 3 (isolation 0 to 2). [C]/[M]
- **Double progression:** if every working set last time hit the top of the range at or below the target RIR, suggest load + one increment and reps reset to the bottom of the range. Otherwise keep the load and aim for +1 rep on at least one set. If any set missed the bottom of the range, keep the load (a second miss triggers a "consider −5%" cue). [C] RP's app raises load by a few percent and adds reps instead when the next weight jump is too large ([RP help](https://help.rpstrength.com/hc/en-us/articles/32600173777815-Hypertrophy-App-Progressions)). Boostcamp raises the load when targets are hit ([Boostcamp](https://www.boostcamp.app/workout-tracker)). The exact rule here is [M].
- **Increments by `equipment`:** barbell, trap bar, smith machine and landmine +5 lb (2.5 kg); dumbbell and kettlebell +2.5 lb per hand (1 kg), or the next available dumbbell; machine, plate-loaded, cable +5 lb (2.5 kg), or the next pin; bodyweight, rings, suspension, band, balls: add reps, then load or a harder variation. User-editable per exercise. When the jump is more than about 5% of the load, prefer reps (RP-style). [C]/[M]
- **Beat last time:** a per-exercise indicator (▲ / = / ▼) comparing this session's best working set with last time's best on e1RM (§8), then volume-load as the tiebreaker. A small "beat 80 × 9" target is shown under the card title. [M]

## 7. PRs
- **Rep PR at load:** more reps than ever at a given load or heavier. **e1RM PR:** a new best e1RM (sets ≤ 12 reps only). Warm-ups are excluded, and so are sets in deload sessions (`session.deload === true`): no badge, and not history later sets must beat (rules.json `logger.prs.exclude`, Chief of Staff, Oct 25, 2026). A small badge appears on the set and a list shows in the summary. [C] Boostcamp tracks max reps at a weight and an e1RM curve, and Strong tracks records and 1RM. Optional later: load PR and session volume PR.

## 8. History and analytics
- **Per-exercise history:** tap the card title. Shows sessions with sets, notes and PR badges, plus an e1RM chart and a best-sets table. [C]
- **e1RM = load × (1 + reps/30)** (Epley), using only working sets with ≤ 12 reps (raised from 10 by Chief of Staff, Oct 24, 2026). RIR-adjusted variant (optional, [M]): reps + RIR in place of reps. Always labelled "estimated 1RM". [C] Citation note: Epley's formula comes from a 1985 coaching publication (Boyd Epley, *Poundage Chart*, Lincoln, NE), not a peer-reviewed paper. We couldn't find a DOI or PubMed record for it, so it's tagged [C], not [E]. Accuracy drops as reps go up, which is why it's capped at 12 [M].
- **Weekly hard sets done vs planned per muscle:** done = Σ over hard sets of the muscle rating (rating ≥ 0.25, otherwise 0), the same `counting` rule as the board. Planned = the board's effective sets. Both use the same `targets.json` min (× levelMinFactor, same rounding) and max, and the same `curve.k_by_muscle`. The body map gets a **Planned / Done** toggle. Done uses the same `heat.js` palette and bands, imported, not copied (§0.1). Archived exercises (§13) are excluded from counts, with a notice. [M] (it reuses the existing model)
- **Volume-load** (Σ load × reps of working sets) per exercise and muscle, and a **load trend** (top working load per session). [C]
- **Adherence:** % of planned working sets completed, per week and per muscle. Swapped-in exercises count toward the planned slot they replaced. Sessions are reported as **completed / skipped / not started**; skipped sessions (§1) and skipped exercises (§10) are counted as skipped, shown separately, never folded silently into misses. [M]
- **Session summary:** duration, hard sets, PRs, beat-last-time count, adherence, notes, and the **Write back to routine** diff.
- **Write back to routine (v1):** if the session had structural edits, the summary shows a diff: swaps, added exercises, removed/skipped exercises, and working-set count changes. Loads, reps and RIR are **not** part of the diff. Three choices: **Update loaded split '<name>'** (shown only when a split is loaded; uses the v23 Update-split mechanism), **Apply to this board only** (uses the v18 preview/Apply/Undo mechanism; the board then shows the v23 amber "changed" dot), **Don't apply** (default). Both apply actions offer **Undo**. A one-off skip can be unticked per row before applying. The **recovery baseline ("normal week" snapshot) is never touched**. [M]

## 9. Recovery and deload signals (model-based suggestions, not medical advice)
- **One deload rule (progress2, Oct 24, 2026):** the deload suggestion is the single rule in `progress-spec.md` §8: the `rules.json logger.deload_signals` points model with its performance signal replaced by the Progress tab's lift statuses (≥ 2 lifts dropping within 14 days; "dropping" = 2 consecutive declines). Train, Log and Progress all use it; the bullets below describe its signals, and the far-from-failure RIR note on the Progress tab is a display note, not a signal.
- **Not in v1.** Deload signals stay off until about 4 weeks of logs exist to calibrate them (Decision 4). The design below is for that later release.
Each signal is shown as an info card using the existing suggestion style (preview / Apply / Undo). Wording: "This is a training-model suggestion, not medical advice."
- **Performance drop:** the e1RM (or reps at the same load) of the best set falls on 2 or more consecutive exposures for **at least 2 different lifts** within 14 days. [M]
- **RIR drift:** at the same load and reps, average logged RIR drops by ≥ 1.5 compared with the previous 2 exposures, on ≥ 2 lifts. [M]
- **Missed reps:** ≥ 25% of working sets fall below the range minimum in a week. [M]
- **Optional readiness:** soreness and sleep on a 1 to 5 scale, collected in the pre-session sheet and off by default. Sleep under 6 h ties into the existing `recovery.modifiers.sleep_under_6h`. [M] RP's app adjusts set numbers from pump, soreness and workload feedback ([RP help](https://help.rpstrength.com/hc/en-us/articles/32600173777815-Hypertrophy-App-Progressions)); we only suggest changes and never change the board on our own.
- **Deload suggestion** fires when 2 or more signals are active, or after 6+ weeks of logged training without a lighter week [M]. Default: **1 week at about 50% of working sets** (rounded down, minimum 1 set per tile), same exercises, loads unchanged or up to −10%, RIR 3 to 4. Applied as a temporary week overlay with Undo, so the saved split isn't changed. [E]/[C] A Delphi consensus defined deloads as periods of reduced training demand, usually about a week, mostly by cutting volume (Bell et al. 2023). In a survey, practitioners reported deloads of about 1 week every 4 to 8 weeks, mainly by reducing volume and intensity of effort (Rogerson et al. 2024). One RCT found a 1-week deload didn't improve hypertrophy and slightly reduced some strength outcomes compared with continuous training (Coleman et al. 2024). So deloads are offered as a fatigue-management **option**, not presented as a growth booster. The 50% figure is [C]/[M].

## 10. Mid-session swap and add
- **Swap** on a card opens the candidate list from `swap.py`/`swap.json` scoring (same pattern, cosine, type, equipment, family). Same order as the board's swap, and custom exercises are allowed as a manual choice. Logged sets stay with the original exercise, and remaining planned sets move to the new one. Previous and prefill come from the new exercise's own history. [M] Boostcamp offers mid-workout exercise alternatives ([features](https://www.boostcamp.app/features)). [C]
- **Add exercise** goes through the tray search with a "fills today's gap" sort: muscles where done + remaining planned is below the weekly min, ranked with the same scoring. [M]
- **Skip exercise** marks the planned sets as skipped, which counts against adherence. Reorder by drag handle. [C]

## 11. Notes
Notes per set (long press ✓), per exercise (sticky: "seat 4, pin 7" carries over to the next session as a pinned line), and per session (in the summary). Plain text. [C] Hevy and Strong support workout and exercise notes.

## 12. Layout and interaction (one-handed iPhone)
- Bottom-anchored controls: the rest timer pill, the **Finish** button, and the current set's stepper all sit in the bottom third. The header only holds the session name and elapsed time. [C]
- Tap targets ≥ 44 × 44 pt (Apple HIG). ✓ is ≥ 56 pt. The active set row is enlarged and other cards collapse to one line (an accordion). [C]
- Auto-advance: after ✓, focus moves to the next set, and after the last set to the next card. [C]
- Uses the existing magnet-board look (tiles become cards), with high contrast for gym lighting. [M]

## 13. Layout, storage and data model (Builder)

**Layout (one-handed iPhone)**
- Top bar: session name, elapsed time, Finish. Everything tapped during a set sits in the bottom half.
- Each exercise is a card: name, type icon, rep range, ⋯ menu (Swap, Skip, Note). Set rows 52 pt tall: set number or W, previous, load, reps, RIR, checkmark. Checkmark is a 56 pt target on the right.
- Load/reps open a custom bottom keypad with ± step buttons for the equipment's load increment and Next. RIR is optional chips 0, 1, 2, 3, 4+ (RPE mode: 10, 9, 8, 7, ≤6), collapsed by default, empty by default, never required for the checkmark.
- After a check, rest timer docks above the home indicator with −15s, +15s, Skip; shows as a lock-screen notification where iOS allows.
- Swipe left on a set row to delete. '+ Set' below last set; '+ Exercise' at the end.
- Start sheet: Continue (primary), day chooser, Skip.
- Summary: write-back diff with three choices and Undo (§8).
- Progression cues under each card title, e.g. 'Beat 185×8', with 🏆 on a PR.

**Storage and offline**
- Service worker caches the app shell; works in airplane mode.
- Logs in IndexedDB database `liftboard`, written on every checkmark and field blur. Current session mirrored to localStorage; on reopen, offer to resume.
- Rest timer stores start/end timestamps, so it survives backgrounding/locking.
- Backup/Restore: one JSON file with board, splits, all logs, and a `schema` version. Restore validates, migrates older schemas, and asks before replacing.

**Data model (v1)**
```
session  {id, schema:1, status:'active'|'completed'|'skipped', date, startedAt?, endedAt?, splitId?, dayIdx,
          label, unit:'lb'|'kg', notes, snapshot:{exercises[]}, writeBack?:'split'|'board'|'none'}
entry    {id, sessionId, order, exerciseId, nameSnapshot, swappedFrom?, added?, repRange:[lo,hi], restSec, notes, skipped}
set      {id, entryId, idx, kind:'warmup'|'working', load, reps, rir|null, done, doneAt}
pr       {exerciseId, kind:'e1rm'|'repsAtLoad'|'load', value, setId, at}
settings {unit:'lb', hardRIR:3, restByType:{primary:180, accessory:120, isolation:90, warmup:60}, effort:'rir'|'rpe', mainLiftPins:{}}
```
- `set.rir` = integer 0–4 (4 = 4+) or `null` when not logged; RPE is never stored (§3). Legacy values clamp on read (5 → 4, fractions round). Sets carry no `sessionId`; join through `entryId`.
- `set.reps` holds **seconds** for timed / static-hold exercises (rep range unit seconds) and **meters** for carries (unit meters).
- `settings.effort` (default `'rir'`) is the RPE display toggle; `settings.mainLiftPins` = `{muscle: exerciseId}` pins a muscle's main lift on the Progress tab. A lighter (deload) week's sessions carry `session.deload = true`. The current writer (storyboard Train tab) and `data/sample-log.json` use `schema: 2`.
- Loads stored in the logged unit, converted for display only.
- e1RM, hard sets, done-vs-planned are computed from sets, never stored.
- 'Previous' = same exercise and set position in the most recent completed session.
- Hard set = completed working set with RIR <= hardRIR (default 3); no RIR still counts, flagged 'effort not logged' (quiet, no nags).
- Skipped session = `status:'skipped'`, `date`, `dayIdx`, no entries; counted as skipped in adherence and advances Continue.
- `restByType` defaults are read from `rules.json` `session_length.rest_min_by_type` (×60), not hardcoded; the stored value is the user's override only.
- Indexes: set.entryId, entry.exerciseId, session.date, session.status.

**Schema version and id migration**
- Every session (and the Backup file) carries `schema`. On load, older schemas run through ordered migration functions up to the current one.
- **Renamed ids:** `data/id-aliases.json` = `{ "old_id": "new_id" }`, applied on load (chains resolved) to entries, PRs and history. Editing an id in `exercises.json` requires adding its alias in the same change.
- **Deleted ids** (not in `exercises.json` after aliasing): the entry keeps `nameSnapshot` and shows as "archived exercise"; history and PRs stay visible, but it is **excluded from muscle counts**, with a notice on the body map/analytics ("N sets from archived exercises not counted").

## 14. Scope
**v1 (minimal):** start any session (Continue in split order, pick any day, skip with record); exercise cards; set rows with Previous + prefill; load/reps/RIR (RPE display toggle); one-tap ✓ + auto rest timer with type defaults; W vs working; hard-set rule; double-progression cue + increments; beat-last-time; rep and e1RM PRs; mid-session swap/add/skip using swap scoring; notes (set/exercise/session); session summary with write-back diff (Update loaded split / Apply to this board only / Don't apply, with Undo); per-exercise history list + e1RM chart; weekly done-vs-planned feeding the body map; adherence (incl. skipped); hard-set rule with adjustable `hardRIR`; shared modules/data with the board (§0.1); exercise ids + schema version + id alias migration; IndexedDB + Backup/Restore; one-handed layout; cross-page consistency tests and the heat.js opacity fix (§16).
**Later:** warm-up helper; D/F set tags and supersets; volume-load and load trend charts; recovery/deload signals and the deload overlay; readiness (soreness/sleep); plate calculator; RIR-adjusted e1RM; notifications and Live-Activity-style timer; import from Strong/Hevy CSV (queued separately); **look-and-feel polish**; **motivational features** (congratulations on finishing, PR celebrations, progress photos, haptics).

## 15. Decisions (Chief of Staff)
1. **Rest is set per exercise type:** primary 3:00, accessory 2:00, isolation 1:30, warm-up 1:00. The planner's session-length rule uses the same values (`rules.json` v5). (§4)
2. **A working set with no effort logged counts as a hard set**, with a quiet "effort not logged" flag (no nags). (§3)
3. **Hard set = RIR ≤ 3**, `settings.hardRIR` default 3, user-adjustable in v1. RIR entry optional, default empty. (§3, §5)
4. **Deload signals wait** until about 4 weeks of logs exist. (§9, Later)
5. **Each exercise type has a default rep range** (primary 6–10, accessory 8–12, isolation 10–15), and each tile can override it. Stored per entry as `repRange`. (§6, §13)
6. **Pounds by default**, with a kilograms toggle. (§2, §13)
7. **Start any session**: Continue = next in split order (wraps); any day; skips recorded and counted as skipped. (§1, §8) *(v0.3)*
8. **Write-back moves into v1**: Update loaded split / Apply to this board only / Don't apply, with Undo; recovery baseline untouched. (§8) *(v0.3)*
9. **One source of truth**: logger imports the board's modules and data; ids + schema version + alias migration; cross-page tests. (§0.1, §13, §16) *(v0.3)*
10. **Later backlog** adds look-and-feel polish and motivational features. (§14) *(v0.3)*
11. **Effort store and e1RM cap (Oct 24, 2026):** RIR stored as integer 0–4 (4 = 4+) or null; RPE toggle is display/input only (10, 9, 8, 7, ≤6; no half points); legacy values clamp on read; e1RM on sets ≤ 12 reps; one deload rule (`progress-spec.md` §8). (§3, §8, §9, §13)

## 16. Tests and the heat.js fix (v1 release gate)
- Extend `tests/run-all.sh` with **cross-page consistency checks**: for the same data, board and logger produce **identical body-map pixels** (reuse `tests/pixel.js`) and **identical per-muscle counts**, for the logger's Planned view vs the board, and Done view vs a fixture log whose sets equal the plan.
- Static check: logger source contains no hex colours, band thresholds, level factors or rest values (grep), and imports the shared modules.
- Migration tests: alias rename, alias chain, deleted id → archived and excluded from counts with notice; old-schema Backup restores.
- Continue/skip tests: wrap-around, empty days excluded, skip advances Continue, adherence counts skipped.
- Write-back tests: diff contents (no loads/reps), Update split / board only / don't apply, Undo, recovery baseline unchanged.
- **heat.js fix:** read `gradient.week.opacity` from `targets.json` instead of the hardcoded 0.8; `mutate.sh` must show a changed opacity flows to both pages.
- Full suite before release, plus screenshots.

## References (verified via PubMed)
- Zourdos MC, Klemp A, Dolan C, et al. Novel resistance training-specific rating of perceived exertion scale measuring repetitions in reserve. *J Strength Cond Res.* 2016. doi:10.1519/JSC.0000000000001049. PMID 26049792.
- Robinson ZP, et al. Exploring the dose-response relationship between estimated resistance training proximity to failure, strength gain, and muscle hypertrophy: a series of meta-regressions. *Sports Med.* 2024. doi:10.1007/s40279-024-02069-2. PMID 38970765.
- Refalo MC, et al. Influence of resistance training proximity-to-failure on skeletal muscle hypertrophy: a systematic review with meta-analysis. *Sports Med.* 2023. doi:10.1007/s40279-022-01784-y. PMID 36334240.
- Bell L, et al. Integrating deloading into strength and physique sports training programmes: an international Delphi consensus approach. *Sports Med Open.* 2023. doi:10.1186/s40798-023-00633-0. PMID 37730925.
- Rogerson D, Nolan D, Androulakis Korakakis P, et al. Deloading practices in strength and physique sports: a cross-sectional survey. *Sports Med Open.* 2024. doi:10.1186/s40798-024-00691-y. PMID 38499934.
- Coleman M, Burke R, Augustin F, et al. Gaining more from doing less? The effects of a one-week deload period during supervised resistance training on muscular adaptations. *PeerJ.* 2024. doi:10.7717/peerj.16777. PMID 38274324.
- Epley B. *Poundage Chart* / *Boyd Epley Workout*. Lincoln, NE; 1985. A coaching publication with no DOI or PubMed record, tagged [C].
App features cited only from the vendors' own pages linked inline (Hevy, Strong help center, RP help center, Boostcamp), checked Oct 12, 2026.
