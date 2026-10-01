# Pose analysis

IMPLEMENTED / NOT DEVICE VERIFIED: 12 analyzers (squat, lunge, push-up, plank, shoulder press, curl, lateral raise, bent row, hip hinge, bridge, front raise, side lunge), using independently configured state machines through ExercisePoseAnalyzer. Results include detection, confidence, phase, repetitions/hold, observed ROM, between-repetition tempo, left/right angular difference, visible joints, warnings/corrections and state. Unknown frames suppress corrections and interrupt hold timing.

VERIFIED: every analyzer rejects lost/low-confidence tracking; catalog deformation tests remain. Joint-angle thresholds are product heuristics, not validated form scoring. Camera perspective and occlusion can invalidate angles; no diagnosis or measured strength claim. Specific technique checks are limited to visible geometry and cautiously worded cues. Not all proposed biomechanical measurements are implemented.

Worker inference falls back to throttled main-thread inference. Video frame callbacks are used when available. Physical-device latency, sustained thermal performance and all-exercise accuracy require a labeled validation set. Raw video is never uploaded. Pose session persistence exists as a schema foundation; automatic pose-to-workout scoring is NOT IMPLEMENTED.


Status definitions: VERIFIED means a named automated/browser check passed; IMPLEMENTED / NOT DEVICE VERIFIED means code exists without physical-device evidence; EXTERNAL SETUP REQUIRED needs operator systems; NOT IMPLEMENTED means no working feature is claimed.
