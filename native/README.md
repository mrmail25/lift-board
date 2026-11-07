# ApeChit native foundation

This is the first production app. It is not a WebView of the storyboard, and it is not an App Store build.

The web storyboard (`storyboard/`) and the legacy Lift Board site (repo root) are unchanged and still deployable. This folder does not replace them.

## Layers

Each layer only depends on the ones above it. Screens never run SQL.

```
src/logic/     pure TypeScript. Dates, backup rules, Lift Board mapping, effort labels.
src/data/      SQLite migrations, repositories, expo-sqlite and node:sqlite drivers.
src/store/     one Zustand store. Actions call the repository.
src/ui/        tokens from storyboard/tokens.css, plus Row, Group, and buttons.
app/           Expo Router screens. Layout and wiring only.
```

Coach's exercise names ship as a generated read-only list (`src/data/exercises.slim.ts`, from `data/exercises.json`). The app never writes that file. Re-run `npm run sync-exercises` after a catalog change, then commit the output.

## What this slice does

- Train: real date, saved routines (empty at first), resume an in-progress workout, start an empty workout, start a saved day.
- Workout: add an exercise from the catalog, type load and reps, mark a set done, optional RIR (or RPE as a label only), rest countdown stored as an end timestamp, pause, finish, discard.
- Finish writes the session before you leave the screen. Reopening the app reads it back from SQLite.
- Log: the current month, empty when there is nothing, open a workout, delete it.
- Settings: appearance, units, RPE label, back up, restore.
- The log starts empty. No sample history is inserted.

Plan, Progress, Learn, the whiteboard, pricing, accounts, and servers are not in this build.

## Storage

Database file: `liftboard.db` (expo-sqlite on device, `node:sqlite` in tests).

Migrations live in `src/data/migrations/` and are copied into `src/data/migrationSql.ts` so the phone bundle does not read the filesystem. They are forward-only. `PRAGMA user_version` records the version. Each migration runs in its own transaction. A failure rolls that migration back.

`npm run embed-sql` refreshes the embedded copy. A test fails if the two copies drift.

Tables: routines, routine days, routine exercises, sessions, entries, sets, prs, settings, bodyweights, notes, custom exercises, media refs, media blobs, preserved, meta.

One workout can be `active`. Finish sets `completed` and stamps `ended_at`. Discard deletes the in-progress rows. There is no second hidden copy.

Writes that must succeed together use a transaction. A thrown error rolls back. `StorageError` codes are `quota`, `busy`, `constraint`, `corrupt`, `io`, and `migration`.

## Backup

Kind `apechit.backup`, version `1`.

Included: routines and their days and exercises, workouts, entries, sets, PRs, settings, body weights, exercise notes, custom exercise records (names and other metadata), media reference rows (kind, byte size, mime), and preserved import payloads.

Not included:

- photo and video bytes, including inline `data:` URLs that arrived inside a Lift Board file
- the bundled exercise catalog
- iCloud or any other cloud copy

Restore checks the kind and version before it writes. A corrupt file or a version other than 1 is rejected and the database is left as it was. A restore that fails mid-write rolls back. Restoring replaces what is on the phone, and only after you confirm. If you pass `replace: false` while the phone already has data, nothing is written.

The Settings footnote says this on purpose. It does not say the file is a complete copy of every photo.

## Lift Board import

The web Backup button writes `{app: 'lift-board', version: 2, days, labels, mySplits, customExercises, logs: logBackup()}`. A bare `logBackup()` object (`schema` 2, or schema 0/1 which is migrated the same way as `logger.js`) is accepted too. Any other version is rejected and nothing is written.

Mapping:

- `logs.sessions`, `entries`, `sets`, and `prs` keep their ids
- schema 0 `exercise` becomes `exerciseId`, and `weight` becomes `load`
- the calendar day is the `YYYY-MM-DD` prefix already stored on the timestamp, not a timezone shift
- fields this schema has no column for stay on `extras_json`
- the whole file, with data URLs removed, is stored in `preserved` bucket `liftboard.file`
- data URL bytes stay in `media_blobs` on this phone only
- `mySplits` become routines prefixed `mysplit:`
- published `logs.routines` keep their ids (highest version is the row, older versions stay in extras)
- the 7-day board becomes a routine named Imported week when it has exercises
- a split that is not 7 days is not turned into a routine, and it remains inside the preserved file

Import merges by id. It does not delete workouts that are not in the file. Importing the same file again does not duplicate rows. If the file has a different in-progress workout than the one already open, the import is refused and nothing is written.

## Identifier

`dev.placeholder.apechit` in `app.json` is a development placeholder. It is not registered with Apple or Google, and it is not a claim on the name ApeChit. Replace it before any store upload. This repo has no signing credentials and does not submit anything.

## Icon

Source, unchanged: `assets/icon-v8m-orange-exterior-native.png` (1149×1151, RGB, no alpha). Flat orange in the field is `#E8590C`.

Shipped icon: `assets/icon.png`, 1024×1024, RGB, no alpha.

The source is 2 pixels taller than it is wide. It was padded by 1 pixel on the left and 1 pixel on the right with `#E8590C` (1151×1151), then scaled uniformly to 1024. The drawing was not stretched, cropped, redrawn, or inverted.

## Design questions (not guessed)

- The approved tab bar is Plan, Train, Log, Progress. This build shows Train and Log only. Plan and Progress need a mockup before they appear, including any "not in this version" state.
- The storyboard Train screen always shows a library of routines. A brand-new phone has none. This build shows only saved routines plus Start an empty workout. An empty-library layout needs a mockup.
- Settings rows for gyms, bars, body weight, training level, and rest defaults are not in this slice. The rest bar uses the approved 3:00 primary default. There is no per-type editor.
- The exercise search is the approved tray, shown as its own page. The shared bottom sheet is not built yet.
- Log delete is a button on the workout. The storyboard's swipe-to-delete gesture is not in this slice.
- The weight and reps fields are the approved set row. The custom keypad sheet is not in this slice.
- iCloud backup is still undecided. Nothing is registered with CloudKit.

Modeled estimates are not shown in this slice. Volume on the finish screen is the sum of logged load and reps, and the screen says so. There is no Learn section and no medical wording.

## How to run

From this folder:

```
npm install
npm test
npm run typecheck
npx expo start
```

`npm test` uses Node's built-in SQLite. It does not boot a simulator. `npm run typecheck` is `tsc`. `npx expo export --platform ios` produces a JavaScript bundle only.

On a phone, Expo Go has to match Expo SDK 58, or you need a development build (`expo-sqlite` is a bundled Expo module). This environment has no Xcode, so it cannot compile or launch the iOS app. The next step on a Mac is `npx expo run:ios` (or an EAS build) after the placeholder bundle id is one you actually own.

Android uses the same project. It was not installed on a device here.

## Not done

Ranking, the plan board, progress, custom exercise editing, photos and video capture, keep-awake, notifications, and the keypad. No accounts, analytics, paywall, HealthKit, or extra permission prompts.
