# Device QA report

Status: EXTERNAL SETUP REQUIRED

| Platform | Physical device | Build | Camera/Pose | Health | Offline | Billing | Notifications | 3D |
|---|---|---|---|---|---|---|---|---|
| Android | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED |
| iOS / TestFlight | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED |

Use `validation/device/evidence.template.json`. Store consented, redacted evidence in approved institutional storage and link it; never put health screenshots or identifying logs in git. Evidence needs date, tester, device, OS, app_version, build_number, commit_sha, physical_device, result, notes and screenshot/log URL. Every unexecuted test stays NOT TESTED. Emulator/simulator builds and sandbox purchases are explicitly distinct from physical testing and production billing.

Test IDs: camera, pose, offline, notifications, billing, health, my_body, average_overlay, previous_compare, interpolation, wireframe, section_view. Repeat all six 3D modes in High, Balanced and Low Power on a lower-spec physical device, rotating continuously for >=30 seconds. Record FPS and thermal/battery conditions. Target >=30 FPS, warning <25 FPS; <20 FPS sustained for 3 seconds activates Low Power. Demand-render idle time is excluded and is not a benchmark. Verify native background/foreground, process kill/restart, permission denial/revocation, airplane mode, encryption failure, logout/account switch, billing sandbox cancellation and real HealthKit/Health Connect permission boundaries.

Configure DEVICE_QA_EVIDENCE to an approved evidence JSON outside git and BUILD_COMMIT to the tested commit. Readiness accepts only physical PASS evidence for all test IDs on that exact commit; this is an evidence gate, not automated proof that evidence is truthful.
