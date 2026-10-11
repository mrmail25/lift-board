# Lift Board analytics spec (proposal, not built yet)

Everything below is a **model for comparing plans**, not a measurement of anyone's muscle growth. The app should say so on screen.

## (a) Diminishing-returns curve, per muscle
- **Curve:** a saturating exponential, \(S(x) = 1 - e^{-x/k}\), where \(x\) is weekly effective sets for that muscle. The output is relative stimulus from 0 to 1, with no units.
- **Why this shape:** dose-response meta-analyses (Schoenfeld et al. 2017; Pelland et al. 2024) find that more weekly sets give more growth, but each extra set adds less. The data can't tell a log curve from a saturating one, so I'd pick the simple one that levels off, and I wouldn't claim any precision.
- **k by level:** beginner 6, intermediate 8, advanced 10. With k = 8, 10 sets gives 71% of the modeled maximum and 20 sets gives 92%.
- **Session discount:** sets past 10 effective in one session count at 50%. That ties the curve to the junk-volume rule.
- **Display:** the curve, a dot at the board's current point, and the marginal gain of the next set, \(S(x+1) - S(x)\), shown as "next set ≈ +3% of max". Shade the target band on the curve.

## (b) Recovery cost
- **Per set:** each exercise gets a fatigue factor. Heavy axial compounds (squat, deadlift, RDL, front squat) are 1.5. Other compounds and machine compounds are 1.2. Isolation exercises are 0.8.
- **Session and week:** session cost is the sum of sets times fatigue factor, and week cost is the sum of the sessions. Show both relative to the user's own saved baseline week (100%), not as absolute numbers, because absolute numbers would be invented precision.
- **Optional modifiers, all off by default:**
  - **Training age:** already covered by the level setting, so no separate modifier.
  - **Sleep:** under 6 hours on average raises cost by 15%, with a note that sleep affects recovery.
  - **Age:** 40 to 49 raises cost by 5%, and 50 or older by 10%. These are deliberately small because the evidence is mixed, and they never block or change a plan.
  - **Wording:** "Rough estimate. Adjust to how you actually recover." No medical claims.

## (c) Other analytics I'd add
1. **Frequency per muscle:** the number of days each muscle gets at least 2 effective sets, shown as a small dot row for Mon to Sun.
2. **Stretch-biased share:** the % of each muscle's effective sets that come from stretch-biased exercises, using the `rules.json` list. Flag anything under 25% as a suggestion.
3. **Stimulus per fatigue by exercise:** a muscle's rating divided by the exercise's fatigue factor, used to suggest a swap with a lower cost for the same muscle. For example, a hack squat instead of a back squat for quads.
4. **Session length estimate:** about 10 minutes of warm-up, plus each set at roughly 45 seconds of work. Add 2.5 minutes of rest for a compound set and 1.5 minutes for an isolation set. Shown on each day header as "~65 min".

I'd skip a separate compound/isolation balance chart. The program check and stimulus per fatigue already cover it.

**Data needed if approved:** `fatigue` on each exercise in `exercises.json`, and a `curve` block (k by level and the session discount) in `targets.json`. I'd add both after approval.
