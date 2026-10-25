# Exercise recording and feedback audit

Scope: all 74 current exercise catalog entries, bodyweight and equipment, on 2026-10-25.

## Findings and changes

- Every catalog motion resolves to an explicit coaching profile and recording screen. Unknown motions are not silently mapped to a different exercise.
- The main recording button previously started video-only capture unless analysis was separately enabled. It now prepares the pose detector before starting the recorder. Model failure produces a retryable error rather than an apparently analyzed recording.
- A separately labelled video-only action remains available and explicitly turns analysis off. Neither mode requests microphone access.
- Recorded reports now retain the selected exercise identity and the last observed joint values/reference guidance, in addition to observed duration, repetition support, numerical issue evidence and corrective actions. Reports collect only frames processed during that recording. No video frames or landmark arrays are added to report storage.
- Pose analysis uses detected landmarks from the camera feed, calibration/visibility checks, the selected exercise's analyzer and sustained fault filtering. Missing people or insufficient visible observations produce an insufficient-evidence result, not a generic positive score.
- Shared technique faults may correctly share corrective wording; the requirement is observation-dependent guidance, not artificially unique text. Muscle effort instructions remain technique guidance, not a measurement of actual muscle activation.
- The development server no longer starts an unbundled ES-module source as a classic worker; it uses the existing main-thread fallback directly. Production retains the bundled classic worker required by MediaPipe's loader.

## Verification

The 74-profile coverage test exercises projected joint poses, movement phases and perturbations. Each exercise must produce more than one observed feedback response and more than one recorded report, with at least one observed correction condition. Missing/occluded landmark tests reject confident correction. This synthetic coverage verifies code behavior, not real-person accuracy.

A recording UI regression runs each of the 74 profiles through the primary recording action, verifies model initialization, and checks that the finalized report identifies that exercise and declines judgment without usable observations. Separate tests cover model failure, explicit video-only capture, lifecycle cleanup and continuous routine changes. The frontend suite passed 542 tests before the development-worker adjustment; relevant browser tests exercise actual MediaRecorder encoding/replay/export and real model initialization on a generated video stream. A generated stream does not establish real-person pose accuracy.

External uploaded video-file analysis is not added by this change; this flow analyzes camera frames during in-app recording. Stored recordings are replayed, and their accompanying report reflects those captured observations.

Final browser validation: all four recording scenarios also passed against the built personal production bundle (including the production worker path), as well as the development server. Personal production build and whitespace checks passed.
