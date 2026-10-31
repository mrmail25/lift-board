# Ladder figures: sources and licences

Every file here is public domain (CC0 1.0): Openclipart uploads (all CC0) or our own hand-authored drawings, which we dedicate to CC0.
Nothing here is under a share-alike, non-commercial or unclear licence. All figures are flat `currentColor` shapes; the app colours them
(Ember when reached / current, slate when locked, dark-mode tokens) by drawing each file as a CSS mask.

| File | Stage | Source | Author | Licence | Changes made |
|---|---|---|---|---|---|
| stage-1.svg | Knuckle-Dragger | "Evolution Steps", Openclipart #348815, https://openclipart.org/detail/348815/evolution-steps (figure 1 of 5) | j4p4n (uploaded Jul 11, 2024) | CC0 1.0 Universal, https://creativecommons.org/publicdomain/zero/1.0/ | Split from the set, orange gradients flattened to `currentColor`, shared baseline / width, numbers rounded. |
| stage-2.svg | Primate | same set, Openclipart #348815 (figure **3** of 5; was our stage-3 Neanderthal before art round 2) | j4p4n | CC0 1.0 | As stage-1; moved down one stage. The set's figure 2 (our old Primate) is no longer used. |
| stage-3.svg | Neanderthal | same set, Openclipart #348815 (figure **4** of 5; was our stage-4 Silverback before art round 2) | j4p4n | CC0 1.0 | As stage-1; moved down one stage. |
| stage-4.svg | Silverback | Vectorized from storyboard/ref/silverback-A.jpg, supplied and chosen by Mr Dude (Oct 30, 2026): a faithful trace, not redrawn (2x upscale, threshold, light de-fringe blur and re-threshold, one tiny eye-highlight speck filled, potrace via potracer); arm gaps, fists, face profile and toes kept as in the image. 414 tall, viewBox sized to the figure's width, currentColor fill. | Mr Dude | Supplied and chosen by Mr Dude for Ape Chit | Replaces the earlier traces of ref/silverback-ref.jpg and the hand-drawn Silverback D (below). |
| stage-5.svg | Prime (also drawn for Kong / Apex once revealed) | Body: "fitness" (front double-biceps bodybuilder), Openclipart #20991, https://openclipart.org/detail/20991 . Head: original drawing, gorilla head in profile (crest, heavy brow ridge, jutting muzzle) | Body: btoteva (uploaded Jan 5, 2009); head: hand-authored for Ape Chit | CC0 1.0 (body: Openclipart CC0; head: our dedication) | Line-art body filled to a solid silhouette, its human head removed and replaced by our gorilla head, then traced to one `currentColor` path; viewBox 0 0 270.37 414.44, 410 units tall. |
| stage-6.svg | Kong (hidden until reached) | Vectorized from storyboard/ref/candidates/kong-H.jpg, a generated image from Mr Dude's pick (Oct 30, 2026; replaces kong-A): front-facing roaring gorilla drumming its chest, elbows out. Faithful potrace trace (2x upscale, threshold, light de-fringe blur and re-threshold), the thin white fist outlines kept as negative-space cuts and thickened ~2 px so they read at strip size, eye and teeth cut-outs kept, tiny specks filled. 414 tall, viewBox sized to the figure, currentColor fill, no glow. | Mr Dude (generated for Ape Chit) | Generated image from Mr Dude's pick; no licence concern | Kong used to reuse stage-5 (Prime) with a glow, then kong-A. |
| stage-7.svg | Apex (hidden until reached) | Vectorized from storyboard/ref/candidates/apex-C.jpg, a generated image made for and chosen by Mr Dude (Oct 30, 2026): faithful potrace trace (2x upscale, threshold, light de-fringe), face / teeth detail and tiny specks filled solid, the arm-waist gaps kept as holes and the leg gap as drawn. 414 tall, viewBox sized to the figure, currentColor fill. | Mr Dude (generated for Ape Chit) | Generated for and chosen by Mr Dude; no licence concern | Apex used to reuse stage-5 (Prime) with a glow. |
| lock.svg | Hidden tier (replaces the '???' figure) | Original drawing: padlock with keyhole | Hand-authored for Ape Chit | CC0 1.0 (our dedication) | The app draws the same path inline (`LOCK_D` in sb.js) with a grey gradient that darkens toward the screen edge. |

- Openclipart licence statement: every upload is released under CC0 1.0 (https://openclipart.org/share, "All Clipart are Released into the Public Domain"). Attribution is not required; it is given here as a courtesy.
- Downloads: #348815 on Oct 25, 2026 from https://openclipart.org/download/348815 (original md5 prefix ca028539); #20991 on Oct 25, 2026 from https://openclipart.org/download/20991.
- Art round 2 (Oct 25, 2026): old stage-2 (set figure 2) removed; old stage-3 -> stage-2, old stage-4 -> stage-3; new stage-4 and stage-5 as above; '???' figure replaced by lock.svg.

## Silverback redo candidates (Oct 2026; sheet: shots/qc-silverback-candidates.png)

| Candidate | Source | Licence | Result |
|---|---|---|---|
| A: walking Bigfoot, side profile | "Group of Five Bigfoot Silhouette", Openclipart #328178, https://openclipart.org/detail/328178 (j4p4n), figure 1 | CC0 1.0 | Not shipped: walks well, but faceted, with no sagittal crest or hump; reads as Bigfoot, not a silverback. |
| B: hand-drawn silverback, heavy forward lean | Original (C's body sheared forward, arm hanging) | CC0 1.0 (our dedication) | Not shipped, and dropped from the sheet: more stooped than the stage-3 Neanderthal, which breaks the march. |
| C: hand-drawn silverback, upright, mid-stride | Original | CC0 1.0 (our dedication) | Not shipped: right anatomy and posture, but too lean for the stage just below Prime (Mr Dude wants it huge and muscular). |
| D: hand-drawn silverback, massive (C's head, stance and legs; huge hump and back, heavy chest, thick muscled arms) | Original | CC0 1.0 (our dedication) | Shipped as stage-4.svg until sbref (Oct 30, 2026), now replaced by the traced reference. |
| (reference only) "Gorilla", side view on knuckles | Openclipart #321352 | CC0 1.0 | Used only as an anatomy reference for the head and hump; no geometry copied. |

## Art round 2 candidates reviewed but not shipped (all CC0, Openclipart)

| Candidate | Source | Why not shipped |
|---|---|---|
| "Animal Silhouettes 3", gorilla figure | https://openclipart.org/detail/228134 | Standing but hunched and shapeless as a solid silhouette; does not read as a gorilla at strip size. |
| "Gorilla" (side view, on knuckles) | https://openclipart.org/detail/321352 | Instantly a silverback, but on four legs (brief asks for upright). |
| "Monster Gorilla Silhouette" (head) | https://openclipart.org/detail/321812 | Front-view head whose features are cut-outs; filled solid it read as a pointed hood. |
| "Apeman" | https://openclipart.org/detail/224720 | Engraving; fills to a shapeless blob. |
| "Bodybuilder flexing back muscles silhouette" | https://openclipart.org/detail/307735 | Clean, but slimmer and a back pose; #20991 reads more muscular. |
| "Bodybuilder silhouette modified" | https://openclipart.org/detail/309038 | Torso only, no legs. |

## Round 1 candidates reviewed but not shipped

| Candidate | Source | Licence | Why not shipped |
|---|---|---|---|
| "evolution steps" (5 figures, brown) | Openclipart #12755, https://openclipart.org/detail/12755 (Anonymous, 2008; file metadata names "marcelo") | CC0 / public domain | Clean and usable (runner-up, shown on shots/qc-ladder-art.png); blockier shapes and a less clear first figure than #348815. |
| "Minimalist Evolution.svg" (3 stick figures) | https://commons.wikimedia.org/wiki/File:Minimalist_Evolution.svg (Outstandy, 2015) | CC0 1.0 | Only 3 figures; we need 5. |
| "Human evolution.svg" | https://commons.wikimedia.org/wiki/File:Human_evolution.svg (Tkgd2007) | CC BY-SA 3.0 / GFDL | Share-alike: not on the allowed list. |
| "Human evolution scheme.svg" | https://commons.wikimedia.org/wiki/File:Human_evolution_scheme.svg (M. Garde, after J.-M. Benitos) | CC BY-SA 3.0 / GFDL | Share-alike. |
| "Human evolution question.svg" | https://commons.wikimedia.org/wiki/File:Human_evolution_question.svg (Tkgd2007) | CC BY-SA | Share-alike. |
| OpenMoji gorilla / orangutan emoji | https://openmoji.org | CC BY-SA 4.0 | Share-alike, and no ape-to-human set. |
