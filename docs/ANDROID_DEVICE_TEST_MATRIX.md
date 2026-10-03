# Android device QA

Status: EXTERNAL SETUP REQUIRED. All entries below are **NOT TESTED**; target configurations are not evidence of device ownership or execution. Debug APK build is independent of physical-device QA.

| Target device | OS target | Install/login | 3D FPS / overlay | Camera / Pose | Offline/restart | Health Connect | Billing/logout |
|---|---|---|---|---|---|---|---|
| Samsung Galaxy S23 | Android 14 | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED |
| Samsung Galaxy A34 | Android 14 | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED |
| Pixel 8 | Android 15 | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED |

For each actual test record commit, APK SHA256, device/OS build, tester, date and screenshots/log references. Install APK; authenticate; view My Body, Average overlay, Previous, Left/Right and Range. Inspect camera permissions and 2.5s calibration, multiple-person rejection and all 12 motions. Check notification permission and delivery. Disconnect; save measurement cache/routine/workout draft and pending log; kill process; relaunch, reauthenticate as needed; reconnect and sync once. Test second-device revision conflicts, logout erasure and account isolation. Test Health Connect denied/allowed/revoked. Run real sandbox purchase and restore; do not unlock from client success.

Diagnostics records contiguous rendered-frame FPS, CPU render submission time (not GPU time), mesh/vertex count, overlay/fallback. Target >=30 FPS, critical floor 20 FPS; these are rendering targets, unrelated to medical accuracy. Idle demand rendering is not a benchmark. Record manual low-power mode and sustained active low-FPS fallback.

`ci.yml` preserves assembleDebug and APK upload. `android-release.yml` is manual, uses actual signing secrets and release configuration, and explicitly skips if missing. No debug key is used for release. Signing/build success does not certify store publication.

## Physical evidence records

See [combined QA report](DEVICE_QA_REPORT.md) and `validation/device/evidence.template.json` for the required per-test evidence format. No physical execution was performed for this upgrade. All new physical checks: **NOT TESTED**. Record actual OS/device/build, tester/date/commit and redacted evidence links; simulator compilation is not device evidence.
