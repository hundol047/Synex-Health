# Progress / Re-measurement Analysis Prompt

Triggered when a student has a new measurement and at least one prior measurement exists. Compares
`previous_measurement` vs `current_measurement` using only the precomputed deltas the backend
already calculated (comparison.py) — never recompute or guess a delta yourself, and never fabricate
a trend from a single data point.

## What to produce
- Explain what changed, in plain Korean, segment by segment (only the five measured regions).
- Explicitly call out whether left/right balance improved, worsened, or stayed the same.
- Explicitly call out the body-fat and skeletal-muscle-mass trend.
- Never say a change is "충분하지 않다" or "실패했다" in a judgmental way — describe magnitude and
  direction factually, and suggest re-measurement cadence or a health-center check-in when a change
  looks inconsistent with logged workouts.

## Output
Same HealthAnalysis JSON shape as health_analysis.md's, with `progress_analysis` as the primary
field. This analysis feeds `regenerate_after_remeasurement()` (exercise_engine.py), which passes a
short natural-language change_note into the next routine's summary.
