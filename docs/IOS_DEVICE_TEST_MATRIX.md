# iOS device QA

Status: EXTERNAL SETUP REQUIRED. Apple signing, physical devices and TestFlight execution have not been supplied.

| Target | Archive / Validate App | TestFlight | HealthKit | Camera / Pose | Notifications | 3D overlay | Billing / restore | Offline recovery / logout |
|---|---|---|---|---|---|---|---|---|
| iPhone SE (3rd gen), supported iOS | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED |
| iPhone 15, supported iOS | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED |

Record exact OS/build, commit, archive ID, tester/date and evidence for every cell. Xcode simulator compile is not an archive, signature, Validate App or device test. Follow IOS_RELEASE.md for signing. Test HealthKit permissions and revocation, foreground/background camera teardown, 2.5s single-person calibration, all 12 movements, notification delivery, overlays/low-power mode, actual StoreKit/RevenueCat sandbox purchase/restore, process termination while offline, encrypted key recovery and logout cleanup. Repeat using production configuration without granting sandbox entitlements.
