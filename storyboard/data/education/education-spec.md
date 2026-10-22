# Education section (education v1.1)

Lift Board Coach. Content is data only; the Builder owns rendering. Validator: `tools/check_education.py` (run it after every edit; it must print PASS). Source of truth: `lift-board/data/education/`; tools write only there, and the Builder copies it to the storyboard and deploys.

## 1. Files
```
education/
  index.json                         page list (every muscle group + fundamentals), status final|planned
  references.json                    shared citations, keyed (same keys/DOIs as rules.json swap_tags where shared)
  education-spec.md                  this file
  muscles/<muscle-group-id>.json     one page per muscle group in exercises.json `muscles`
  fundamentals/<id>.json             one page per fundamentals topic
```
A page file exists only when its index status is `final`. Planned pages have an index entry and no file. As of 2026-10-21 all 19 muscle pages and 4 fundamentals pages are final.

## 2. index.json
`pages[]`: `{id, kind: "muscle"|"fundamental", title, path, status: "final"|"planned"}`. Muscle entries also carry `region_ids` (the map regions of that group, in exercises.json `regions` order) and `region_names` (same names the map uses: heat.js RNAME, else capitalised id). Muscle page ids are exactly the 19 group ids in exercises.json `muscles`; together their `region_ids` cover all 24 map regions once. Titles follow the app's labels (`cap(lab(id))`, e.g. "Front delts").

**One page per muscle group; regions are heads.** A group with several map regions (chest, traps, triceps, quads, calves) keeps one page; each map region is described by one or more heads whose `tracked_region` names it. Every region of a page must be the `tracked_region` of at least one head (validator check). Weekly targets stay at group level.

## 3. Muscle page (`schema: lift-board.education.muscle/1`)
| key | content |
|---|---|
| `id, kind, title, status, updated, region_ids, summary` | identity; `region_ids` must match the index |
| `what_it_is` | `{overview, heads[]}`; head = `{id, name, origin, insertion, fiber_direction, crosses_joints[], tracked_region?, evidence}`. Head ids are page-local (anatomical heads or regions, e.g. `lats_iliac_costal`); `tracked_region` names the map region that shows it. Joints: shoulder, elbow, radioulnar, wrist, scapulothoracic, spine, hip, knee, ankle, ribcage. Plain words first, anatomical term in brackets. |
| `what_it_does[]` | `{head_ids[], joint, action, detail, evidence, citations?}` |
| `relationships` | `synergists[]`, `antagonists[]` = `{name, muscle_id?, role, evidence}` (`muscle_id` = the app group that holds that muscle); `stabilizer_roles[] {text, evidence}`; `indirect[] {exercise_id, rating, role, note?}` with `indirect_note` and `indirect_evidence` |
| `bias[]` | `{target: head id or "all", goal, how: {joint_angle, stretch_position, grip, stance}, swap_tags[], example_exercise_ids[], evidence, citations[], caveat}` |
| `best_exercises[]` | 4-8 `{exercise_id, why (one line), evidence, citations?}`; each must rate >= 0.5 for the page's muscle. Use 5-8 where the library allows; calves has only 4 dedicated exercises, so 4 is the floor (do not pad with jumps). |
| `mistakes[] {text, evidence}`, `coach_cues[] {cue, why, evidence}` | |
| `app_values` | `{"file.json:dot.path": value}` for every app number the text quotes (`exercises.json:@<id>.muscles.<group>` for an exercise). The validator fails if the data changes, so the text never drifts silently. Render live numbers from the data files, not from prose. |
| `notes[]` | honest limits |

**Indirect roles** (display bands over the real ratings in exercises.json `muscles`; the anchors are 1.0 main mover, 0.5 helper, 0.25 stabilizer/minor):
`main` 0.75-1.0, `helper` 0.4-<0.75, `minor` 0.25-<0.4, `not_counted` <0.25 (below `targets.json counting.min_rating_to_count`, so it adds 0). Quote the exact rating, never a rounded band value.
**These bands are modeled.** They are a display convention chosen by Lift Board Coach, not a measured threshold and not part of the app's counting; only the 0.25 cut-off comes from targets.json. `indirect_evidence` is therefore always `modeled`. Render the band label next to the exact rating, never instead of it. The `indirect` list is examples; the app can list every crediting exercise live from exercises.json.

## 4. Fundamentals page (`schema: lift-board.education.fundamental/1`)
`{id, kind, title, status, updated, summary, app_link: {features[], explains}, sections[], app_values, notes[]}`.
Section = `{id, heading, body[] (short paragraphs), points[]}`; point = `{text, evidence, citations?, swap_tags?, app_key?}` where `app_key` names the data key the point explains.

Data keys: `file.json:dot.path`; `exercises.json:@<exercise-id>.path`; inside a list, `#<id>` picks the element with that `id` (e.g. `rules.json:rules.#weekly_volume.message`).

**Strict numbers** (`strict_numbers: true`, required on `set-crediting-targets`). The summary, headings and body contain no digits; every number lives in a point and is covered by a quote in that point's `quotes[]`:
- `{key, text, scale?}`: the numbers in `text` equal the live value's numbers in file order (times `scale`, e.g. 100 for a percent); for a string value, `text` must appear verbatim in it (formulas such as `min - 2 <= total < min`).
- `{expr, text, round?}`: the single number in `text` equals the expression, computed from `{file.json:path}` values with + - * / ( ) and ln, log, exp, round, min, max, abs.
- `{text, example: true}`: a worked-example input (e.g. "4 sets"), not a data value. Results derived from it must use `expr`.
The validator fails on a quote that does not match the files, a quote whose text is not in the point, or any number in the point text outside every quote.

**exercise-selection** must explain all 35 swap tags (swap_tags v3, 2026-10-22; validator check), using the rules.json labels.

## 5. Evidence rules
Same three levels as rules.json `swap_tags.evidence_levels`. Every claim item (head, action, relationship, bias, best exercise, mistake, cue, point) carries one.
- **supported**: a training study or meta-analysis measured growth (or the outcome named). Needs >= 1 citation key from references.json with a DOI.
- **biomechanics**: follows from anatomy and mechanics (attachments, which joints a muscle crosses, where the load sits, equipment). Textbook anatomy is biomechanics. EMG findings are at most biomechanics, never supported growth claims, and may be cited as context.
- **modeled**: coach consensus or an app model (ratings, cut-offs, curve, bands, cues). Width vs thickness, upper vs lower lat, short-head bias, peak contraction stay modeled unless a growth study appears.
- An app rule built on a study is modeled (the threshold is ours); cite the study as context.
- When an app message disagrees with newer evidence (the low_frequency note), the page explains the evidence honestly and leaves the data unchanged; the conflict is raised with Chief of Staff.

Citations: add to references.json only after checking the DOI on Crossref (authors, year, journal, volume, pages) and the finding against the abstract. Record that in `verified`. Never invent a DOI. Reuse rules.json swap_tags keys (`sato2021`, `wolf2023`, ...) with the same DOI.

## 6. Authoring rules
- Exercise ids only from data/exercises.json; region and group ids only from its `regions`/`regionGroup`/`muscles`.
- Bias wording reuses the swap_tags ids and labels (e.g. "Biceps long-head stretch", "Lat width focus", "More stretch emphasis") so the Education page and the swap sheet say the same thing.
- Plain, coach-like English; short sentences; no hype. Say "tends to", "coaches reason" where it is modeled.
- No medical, injury-prevention or rehab claims. "Pick variations you can train comfortably" is the limit; no wording about pain, protection or safety of joints.
- Mainstream evidence only; say when studies are short, small or in untrained people.
- Do not edit exercises.json, rules.json or targets.json from here. If a page needs a data change, raise it with Chief of Staff.

## 7. Builder notes
- Render evidence as a small badge (supported / mechanics / model) with citations as tappable footnotes from references.json (`url` is the DOI link).
- Show `swap_tags` as the tag labels from rules.json, not the ids.
- `best_exercises` and `indirect` ids should link to the exercise card. Missing ids are a validator failure, not a render case.
