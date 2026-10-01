# Adaptive training

IMPLEMENTED: existing adult safety screening, equipment/time/experience constraints, body-composition and bilateral comparison remain. Workout logs add bounded RPE 1–10, pain 0–10, actual sets/repetitions, duration and notes. Any recent pain blocks automated regeneration pending professional review; high RPE reduces volume, and easy completed sessions can increase at most one set within the time budget. No unilateral overload is inferred from body composition alone.

Every generated routine stores a transactional history record containing old/new routine, reason, input snapshot and adherence to recorded sessions. GET /api/adaptive-history is own-account scoped and paginated (maximum 100). Routine page displays date, reason and adherence. History is removed with account/health-data deletion and invalidated on measurement deletion.

VERIFIED: history, ownership, numeric pain blocking, feedback bounds and prior adaptive tests. Long-term plateau diagnosis and automated pain-specific replacement are NOT IMPLEMENTED: a single body-composition change is insufficient evidence for either. A user explicitly regenerates after feedback; new measurements continue the existing auto-regeneration flow.


Status definitions: VERIFIED means a named automated/browser check passed; IMPLEMENTED / NOT DEVICE VERIFIED means code exists without physical-device evidence; EXTERNAL SETUP REQUIRED needs operator systems; NOT IMPLEMENTED means no working feature is claimed.
