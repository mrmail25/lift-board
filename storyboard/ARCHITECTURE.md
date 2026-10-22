# Lift Board rebuild: architecture (Expo, React Native + TypeScript, iOS and Android)

This is one page. The web storyboard (`storyboard/`) previews the screens, and its old web plan is kept in `ARCHITECTURE-web-storyboard.md`.
The live web app (v29.x) stays as it is until the import below has moved Mr Dude's data across.

## Layers (each one depends only on the layers above it)
```
logic/        pure TypeScript, no React, no I/O. Ported from the current JS, one file per module:
              rank.ts (+ swap, preset), swaptags.ts, volumeBands.ts, prs.ts, e1rm.ts, loads.ts, warmup.ts, deload.ts, review.ts
data/         read side: Coach's JSON (exercises, rules, targets, patterns, splits, education/**), bundled read-only
              write side: repositories over SQLite (sessions, entries, sets, prs, routines, settings, bodyweights, notes)
store/        ONE Zustand store (slices: session, log, routines, prefs). Actions call logic/ and then data/; screens never touch SQL
ui/           design system: tokens.ts + shared components Sheet, Keypad, Swipe, Calendar, Plates, MuscleMap, Chip, Row
app/          thin screens (Expo Router files): layout and wiring only, no rules, no maths
```
- **logic/** is ported 1:1, with types added and behaviour unchanged. The existing parity diffs come across as Jest tests:
  `rank` vs `ranking-reference.json` (67 cases), neutral swap vs `swap.py` for all 239 exercises, preset vs `patterns.py`
  (72 slots), and the PR, e1RM, loads and deload references from Coach's `gen_*_reference.py`. `progcheck` (Build analysis, fixes) vs `check_program.py` (92 boards). A port counts as done only at 0 mismatches.
- **Coach's data** ships in the app bundle as frozen JSON, copied from `lift-board/data` (the only source) by a sync script.
  The app never writes to it. A data update is a new app build (or an EAS Update), never an edit on the device.
- **Store: Zustand.** One small store with no boilerplate, selectors so the active-set row re-renders alone while typing,
  and it's easy to test outside React. Redux is heavier than this app needs, and Context re-renders too much on the workout screen.
- **Design system.** `ui/tokens.ts` is generated from `tokens.css`, which stays the single source: Ember **#E8430C**
  (press #C2380A, tint #FDECE6), ink and paper, danger #E5242B, volume amber/red, type 34/22/17/15/13/11, the 4-pt space grid,
  radii 8/12/16/22 and the sheet ease. Components read tokens only. Writing a hex value inside a screen fails lint.
  Sheet: one bottom sheet that closes on swipe-down. Keypad: digits plus backspace, edits in place with no reflow.
  Swipe: swipe left to delete. Also Calendar, Plates (bar picker) and MuscleMap (SVG).
  Build board: chit long-press, drag and multi-select on react-native-gesture-handler + reanimated (UI-thread drag, haptic on lift).
- **Navigation.** Expo Router with tabs **Train · Log · Build · Progress**. Settings (gear) and Learn (book) sit in the header and open as stacks.
  The workout, keypad and swap screens are sheets or modals over the tabs.

## Shared rules keys stay data-driven
`volume_bands` (amber > max, red > max × red_factor; one function feeds both the volume panel and the body map), `swap_tags`
(chip wording, priority, max_lines, plus a proposed `compare.empty_line`), `ranking` (weights, goal labels, reasons,
favorite margin, day-theme) and `equipment_items` (tokens, templates; unticked equipment is a hard filter).
No threshold, label or weight is a literal in TypeScript. Tests rewrite a key (for example red_factor 1.5) and check that the UI follows it.

## On-device storage: SQLite (expo-sqlite)
- One database file, `liftboard.db`. Tables: sessions, entries, sets, prs, routines, settings (key/JSON), bodyweights, notes, meta.
- **Versioned migrations:** `data/migrations/001_init.sql`, `002_…` run in order inside one transaction and are tracked with
  `PRAGMA user_version`. They're forward-only: never edit a shipped migration, add a new one.
- Tests: each migration runs on a fresh database and on a copy of the previous schema with data in it. The test checks
  that the schema matches `schema.snapshot.sql` and that no rows were lost.

## One-time import from the web app
- The web app's Backup export is one JSON file (`logBackup()`, schema 2): sessions, entries, sets, prs,
  routines, settings, bodyweights, deloads, readiness, exNotes, decimalFix. He shares the file to the app (Files or AirDrop).
- `data/import/webBackup.ts` validates the file, runs the web `migrate()` step (ported), and writes everything in one transaction.
- **Idempotent:** rows keep their web ids, and the file's hash is saved in `meta`. Importing the same file again changes nothing.
- **Parity check after import:** counts of sessions, entries and sets must match the file. PRs are recomputed with `logic/prs`
  and must equal the PRs in the file, and total volume per week must match. Any difference stops the import and shows a diff list; the database rolls back.

## Testing
- **Every change:** Jest (jest-expo) runs logic/ unit tests, the parity diffs above, store actions, migrations
  (against node SQLite) and the import fixtures (a real exported backup, anonymised). The target is a full run in under a minute.
- **Before a release only:** device E2E with **Maestro**. Its flows are short YAML, it drives a real iOS or Android build
  with no app instrumentation, and it handles taps, swipes and the keypad well. Detox needs native test setup
  and has more flake for the size of this app. Flows: log a set with the keypad (no jump, auto-fill only fills later
  empty sets), discard, delete, swap, finish, and import.

## Getting it on his phone
1. **Expo Go:** scan a QR code from `npx expo start` for same-day previews (only works while no custom native modules are used).
2. **Development build (EAS):** `eas build --profile development` gives an installable app with expo-sqlite, haptics and the file picker.
   It still live-reloads from the dev server.
3. **TestFlight:** `eas build --profile preview` then `eas submit`, for his day-to-day app. On Android, use the Play Console internal
   testing track with the same profile.
Releases: run Jest (must be green), then the Maestro flows on both platforms, then the build. Data-only changes can go out as an EAS Update.

## Not in scope yet
No app code has been written. Accounts, cloud sync and Apple Health/Google Fit wait for a separate decision.
