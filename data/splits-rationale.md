# Preset splits rationale (splits.json v2)

These rules apply to every preset. They're produced by `tools/gen_splits_v2.py` and verified by `tools/check_program.py`, which uses `rules.json`:

- **Session size.** 5 to 7 exercises per session. Only the 2-day Full Body plans for intermediate and advanced use 8, and they carry a written `reason`, because fitting a whole week into two sessions needs one more exercise.
- **Sets.** 2 to 4 sets per exercise, and no muscle gets more than about 10 effective sets in one session.
- **Weekly volume.** Each muscle stays inside its weekly target. The minimum is scaled by level with `targets.levelMinFactor`: beginners ×0.6, intermediate ×0.8, advanced ×1.0. Beginners grow on less volume, and a 10-set floor would just push them into junk volume. **The app's volume panel must apply this factor for the selected level, or beginner presets will show red.**
- **Movement patterns.** No more than 2 exercises of the same pattern in one session. For example, bench plus incline is fine, but bench, dumbbell bench and machine press together is not.
- **Stretch-biased work.** Every plan includes it for chest, biceps, triceps, hamstrings, quads, calves and lats. That means incline curls, overhead triceps extensions, RDLs or stiff-leg deadlifts, seated leg curls, deep squats or split squats, standing calf raises, and full-stretch pulldowns or pull-ups. Research on training at long muscle lengths consistently favors these.
- **Push and pull balance.** Pulling volume is between 0.75 and 2 times pushing volume.
- **Exercise order.** Compound lifts come before isolation work in every session.
- **Fatigue.** Beginners never do heavy squats and conventional deadlifts on the same day. No preset puts a heavy deadlift the day before squats, or trains the same muscle hard on back-to-back days.
- **Status.** All 46 presets have zero warnings. The only remaining flags are "info" ones for low frequency on splits that train each muscle once a week by design.

## Per split

- **Full Body (2/3/4 days).** Every session trains the whole body, so every muscle gets 2 or more hits a week from 3 days up. The A, B and C sessions rotate the movements: squat, hinge or hack squat, flat, incline or dip, vertical and horizontal pulls. Two days is a minimum-dose plan. It's fine for beginners or anyone short on time, but arms and calves only get about one real hit a week.
- **Upper/Lower (2/4 days).** On 4 days, each muscle gets 2 hits a week. Upper A and B swap flat and incline pressing and change the pull angles. Lower A is squat- and RDL-based, and Lower B uses a hack squat or leg press, hip thrust and lying leg curl, so the hamstrings get both the seated (stretch) and lying curl. There's no 2-day option for advanced, because one session per muscle per week can't reach their volume.
- **Push/Pull/Legs (3/6 days).** On 3 days, each muscle gets 1 hit a week. That works, but it's the weakest option for growth, so 6 days is preferred. The 6-day version uses different B sessions (machine press, chest-supported rows, hack squat and stiff-leg deadlift) so it isn't the same week twice.
- **Bro Split (5 days).** This one is called out. **Each major muscle is trained only once a week.** Sessions are capped so no muscle goes over about 10 sets in one sitting, which keeps the weekly total near the bottom of the target. It's good for enjoyment and focus, but it's less efficient than splits that hit each muscle twice. Calves and abs show up twice because they sit on the shoulder and chest days.
- **PPLU (4 days).** Push, Pull and Legs, then an Upper day that gives the upper body its second hit. Legs get 1 heavy day plus some indirect work, so quads, hamstrings and glutes get 1 hit a week, which is flagged as info.
- **PPLUL (5 days).** Every muscle gets 2 hits a week: upper muscles from Push/Pull and Upper, legs from Legs and Lower. This is the best balance of frequency and recovery among the 5-day options.
- **Arnold (3/6 days).** Chest and back together, shoulders and arms together, and legs. Pairing opposing muscles saves time. 6 days gives each muscle 2 hits, and the second legs day uses a different variant.
- **Torso/Limbs (2/4 days).** Torso covers chest, back and delts. Limbs covers legs and arms, with stretch-biased curls and overhead triceps work. The 4-day version rotates in Torso B and Limbs B, using leg press, hip thrust and hammer curls. There's no 2-day option for advanced.
- **PHUL (4 days).** Power days use the heavy basics at 2 to 4 sets. Hypertrophy days use stretch-biased variations (incline dumbbell press, chest-supported rows, seated leg curls, split squats). Intermediate and advanced lifters deadlift on Power Lower with squats, and beginners do RDLs there instead.
- **Upper/Lower/Full (3 days).** Upper A, Lower A, then a full-body B session, so every muscle gets 2 hits in 3 days.
