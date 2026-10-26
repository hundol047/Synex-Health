# External Pose validation

EXTERNAL VALIDATION DATA REQUIRED. No real participant samples are included. Synthetic regression fixtures remain in frontend/tests/pose-fixtures and are never included by this CLI.

Obtain informed consent and independent reviewer labels before collection. Extract MediaPipe landmarks locally; delete source video according to the institution's approved retention policy. Never commit video, images, names, student IDs or identifying device serials. Anonymous subject tokens must not be reversible from this repository. Landmark sequences can remain sensitive: use approved access controls and withdrawal/deletion procedures.

Place only reviewed `<sample_id>.landmarks.json` in the exercise folder. Required metadata: sample_id, exercise, camera_angle, device (model only), lighting, fps, subject_id_anonymized, ground_truth_phase (label convention), ground_truth_rep_count, ground_truth_hold_seconds (required for hold exercises), known_form_issue (list), label_source, reviewer (reviewer token), consent_status=`approved`, data_origin=`external_human`, category=`normal|imperfect|problem`, aspect_ratio (height/width).

Each frame requires increasing time_ms, person_count, landmarks (33 normalized x/y/z/visibility records; empty when untracked), expected_detected boolean, phase, expected_warnings and expected_corrections arrays using the current rule text. Labels must be independent of analyzer outputs. Multiple-person frames must have person_count > 1 and expected_detected=false. Current pipeline evaluates the analyzer, not camera/model image inference. Report this limitation with results.

Target per exercise: 20 normal, 20 imperfect, 10 problem. Review coverage of incomplete motion, occlusion, low visibility, wrong camera angle, partial body and multiple people. Count targets alone are not proof of coverage or accuracy. Split participants between threshold tuning and held-out evaluation; never tune on the reported test split.

Run `cd frontend && npm run pose:evaluate -- ../validation/pose /tmp/pose-report.json`. Empty data emits NO EXTERNAL VALIDATION DATA, with no metrics. Invalid/unconsented samples fail. Undefined metric denominators are null, never zero. Metrics distinguish frame detection rate/recall, FP/FN rates, rep MAE, phase accuracy, tracking loss and exact-label warning/correction precision and recall, hold duration MAE and participant/device/angle/lighting counts. Version and dataset checksum accompany every report. Plank rep MAE is not hold-time validation; use the existing evaluator for independently labelled hold duration.

The evaluator enumerates all 74 current COACHING_CATALOG keys, not only the 12 specialized analyzers. Non-counting/hold exercises report null repetition MAE rather than treating an unsupported zero count as perfect accuracy. This remains an evaluation of reviewed landmark sequences, not end-to-end camera accuracy.

For release evidence, store the consented sessions in a protected JSON array file so its SHA-256 can be checked directly. The release gate recomputes its metrics. A separate reviewed `video_pipeline` evidence entry must cover actual video → model landmarks → feedback on the exact APK; landmark-only evaluation cannot fulfill this check.
