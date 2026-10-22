# Learn: exercise pages (exercise pages v1)

Lift Board Coach. Content is data only; the Builder owns rendering. Source of truth: `lift-board/data/education/exercises/`; tools write only there, and the Builder copies it to the storyboard and deploys. Validator: `tools/check_exercise_pages.py` (must print PASS). Muscle pages and their files (`../index.json`, `../education-spec.md`, `tools/check_education.py`) are separate and are not touched by this work.

## 1. Files
```
education/
  references-exercises.json          extra citations for exercise pages (same schema as references.json, no shared keys)
  exercises/
    exercise-pages-spec.md           this file
    index.json                       authored-page plan: every exercise used in the preset splits, ranked by use
    <exercise-id>.json               authored page (index status final)
    auto/<exercise-id>.json          auto page for every exercise (fallback reference, also when authored)
```
Tools: `tools/exercise_pages.py` (shared: bands, goal vocabulary), `tools/build_exercise_pages.py` (authored content + index; bench and curl specs inline, the other 54 in `tools/excontent/*.py` expanded by `tools/exercise_dsl.py`), `tools/gen_exercise_autopages.py` (auto pages), `tools/check_exercise_pages.py` (validator).

Citation keys resolve in `references.json` first, then `references-exercises.json`. Both use the same fields and the same Crossref + abstract check before an entry is added. Never invent a DOI.

## 2. Page (`schema: lift-board.education.exercise/1`)
| key | content |
|---|---|
| `schema, id, kind:"exercise", exercise_id, title, status:"final", updated` | `id` = `exercise_id` = an exercises.json id; `title` = its `name` |
| `source`, `source_label` | `"authored"` (label null) or `"auto"` (label `"Auto-generated from the exercise library"`; show it on the page) |
| `summary` | 1-2 sentences |
| `type`, `equipment`, `swap` | copied from exercises.json (the validator checks they match) |
| `equipment_needs` | `{items, text}`: `items` = exercises.json `equipment_needs` (v8; every token is in rules.json `equipment_items`), `text` = one display line from the item labels ("Needs: preacher bench or curl pad; EZ curl bar or dumbbells." / "No equipment needed."), built by `exercise_pages.needs_block()`. Shown above `setup` on authored and auto pages. The validator checks both and every token. |
| `muscles[]` | `{muscle_id, rating, band, regions?, why, evidence, citations?, region_notes?}`. `rating` = exercises.json `muscles[muscle_id]`, exact. `regions` = `{region_id: heads[region_id]}` for groups with more than one map region. `band` from the rating: `main` >= 0.75, `helper` 0.4 to < 0.75, `minor` 0.25 to < 0.4, `not_counted` < 0.25 (bands are a model). Every muscle rated > 0 must be listed; muscles rated 0 may be listed as `not_counted` when they do notable stabilising work. `why` explains the rating (joint actions, moment arms, range). `region_notes[] {region_id, rating, text, evidence, citations?}` |
| `setup[]` | `{text, evidence, from_library?}` |
| `form_cues[]` | `{cue, why, evidence, citations?, from_library?}`. `from_library: true` means the cue is copied verbatim from exercises.json `howto.cues` or `tip` (checked). |
| `bias_tweaks[]` | `{kind: grip|angle|range|tempo|stance, change, target_muscle_ids[], effect, swap_tags[], example_exercise_ids[], evidence, citations?, caveat}`. `swap_tags` = rules.json swap_tags ids, so the wording matches the swap sheet. |
| `mistakes[]` | `{text, fix, evidence, from_library?}`; `from_library` = verbatim `howto.mistake` |
| `misconceptions[]` | `{myth, reality, evidence, citations?}` |
| `lower_risk[]` | `{topic: warmup|load_jump|rir|rom|safeties|setup, text, evidence, citations?, app_key?, note?}`. Technique and load management only: the warm-up ramp (rules.json `logger.warmup_ramp`), load jumps (`logger.load_jump`, `logger.load_step`), RIR (`logger.target_rir_by_type`), range control, safeties and spotters, and "pick a variation you can train comfortably". No medical, diagnostic, injury-prevention or rehab claims. |
| `alternatives[]` | `{goal, goal_label, exercise_id, why, differences[], evidence, citations?}`; see section 3 |
| `app_values` | `{"file.json:dot.path": value}` for every app number the text quotes, same syntax as muscle pages (`exercises.json:@<id>.muscles.<group>`). The validator fails if the data changes. |
| `notes[]` | honest limits |

Authored pages must have at least 1 item in each of `setup`, `form_cues`, `bias_tweaks`, `mistakes`, `misconceptions`, `lower_risk` and 3 `alternatives`; at least one form cue and the library mistake come from exercises.json `howto`. Auto pages may leave `bias_tweaks` and `misconceptions` empty.

## 3. Alternatives and goals
`differences` is exactly what the swap sheet shows: `tools/swaptags.py diff_tags(current, alternative)` (at most 3 lines, priority order). The validator recomputes it. For goals defined by a swap tag, the defining line must be among the shown differences, so a "Less fatigue" alternative always reads "Less systemic fatigue" on the sheet.

| goal | label | test (alternative vs current) |
|---|---|---|
| `more_stretch` | More stretch | `stretch_emphasis` higher |
| `less_fatigue` | Less fatigue | `systemic_fatigue` lower |
| `more_stable` | More stable | `stability` higher |
| `easier_to_learn` | Easier to learn | `skill_demand` lower |
| `heavier_loading` | Heavier loading | `loading_potential` higher |
| `more_isolation` | Better isolation | `muscle_isolation` higher |
| `less_spinal_load` | Less spinal load | loses `spinal_load` |
| `constant_tension` | Steadier tension | gains `constant_tension` |
| `one_side` | One side at a time | gains `unilateral` |
| `less_grip` | Less grip demand | loses `grip_demand` |
| `peak_contraction` | Peak-contraction focus | gains `peak_contraction_focus` |
| `home_dumbbells` | Home gym: dumbbells | equipment `dumbbell` |
| `home_bodyweight` | Home gym: no equipment / bar only | equipment `bodyweight` |
| `bias:<region_id>` | More <region name> | `heads[region]` higher (region names from education/index.json) |

The same exercise may serve two goals; a (goal, exercise) pair appears once. When `differences` is empty (e.g. incline vs flat barbell), `why` must give the reason from the ratings.

## 4. Evidence
Same three levels and rules as education-spec.md section 5: `supported` needs >= 1 citation with a DOI (a training study or meta-analysis that measured the outcome named, which may be strength); `biomechanics` covers anatomy, mechanics and EMG (EMG is never `supported`); `modeled` covers coach consensus and app numbers (ratings, bands, warm-up percentages, jump caps). Citations may be attached to non-supported items as context. Every claim item carries `evidence`.

## 5. Auto pages
For every exercise in exercises.json (239 today), including those with a final authored page, `auto/<id>.json` is generated by `tools/gen_exercise_autopages.py auto_page()` and labelled `source: "auto"`, `source_label: "Auto-generated from the exercise library"`:
- `muscles`: every group rated > 0, with rating, band, regions; `why` states the rating and what it adds per set (modeled).
- `setup`: exercises.json `howTo` steps (else `howto.setup`); `form_cues`: `howto.cues` plus `tip` (deduplicated); `mistakes`: `howto.mistake`.
- `lower_risk`: from rules.json by exercise type (warm-up rule, jump cap, rep range and target RIR), range control, safeties for barbell and Smith lifts, "pick a variation you can train comfortably".
- `alternatives`: walk `swaptags.swap_list(id, n=12)` in swap-sheet order and give each candidate the first unused goal (order: more_stretch, less_fatigue, more_stable, less_spinal_load, more_isolation, constant_tension, easier_to_learn, heavier_loading, one_side, less_grip, peak_contraction, home_dumbbells, home_bodyweight) that it passes with its defining line shown; at most 4. Evidence = that tag's swap_tags evidence (equipment goals: biomechanics).
- `bias_tweaks`, `misconceptions`, `app_values`: empty.
Generation is deterministic; the validator regenerates every auto page and compares. Rerun `python3 tools/gen_exercise_autopages.py --write` after any change to exercises.json or rules.json swap_tags (it also removes auto pages for exercises no longer in the library). The app may instead build auto pages at runtime by porting `auto_page()`; the files are the reference.

## 6. index.json and plan
`pages[]`: `{id, exercise_id, title, path, status: final|planned, source: "authored", rank, wave, presets_using, preset_tiles, preset_sets}`. One entry for every distinct exercise in the preset splits (splits.json: every split x level x day count = 46 presets), ranked by presets using it, then tiles, then total sets. A page file exists only when its status is `final`. Wave 1 = rank 1-40 (the ~40 most used), wave 2 = the rest. Count today: 46 presets, 56 distinct exercises; 56 final, 0 planned. The renderer shows the authored page when it is final, otherwise the auto page.

## 7. Builder notes
- Render `muscles` with the live rating from exercises.json and the band label (Main mover / Helper / Minor / Not counted). Show `region_notes` under the muscle.
- Evidence badges and footnotes as on muscle pages; look citation keys up in references.json, then references-exercises.json.
- Alternatives: show `goal_label`, the exercise name (link to its card), `differences` as the swap-sheet tag lines, and `why`. Show the swap sheet's "Typical differences, not guarantees." note.
- `bias_tweaks.swap_tags`: show rules.json labels, not ids.
- Auto pages: show `source_label` as a banner.
