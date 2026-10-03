# Production hardening report — 2026-10-03

## 3D Accuracy Improvements

IMPLEMENTED / NOT DEVICE VERIFIED. Retained My Body/Average/Previous/Left–Right/Range and numerical kg/% comparisons. Regional upper-arm/forearm, thigh/calf, chest/back/abdomen deformation remains illustrative; MIN_SCALE/MAX_SCALE/MAX_DELTA_PER_SEGMENT limit overlay width/depth. Invalid heights/interpolation and non-finite measurement deltas are guarded. Exact requested Korean notice is visible. No segment-to-individual-muscle allocation or fake reconstruction. Provider metadata/multiview input and upload/retention consent guards are tested. Render diagnostics, manual low power and sustained slow-frame fallback added; CPU submission timing is not GPU timing.

## Pose AI

IMPLEMENTED / NOT DEVICE VERIFIED. Twelve analyzer instances retained. All frames gate exercise-specific landmarks and confidence; LOW/LOST suppress corrections. Live camera analysis starts after 2.5 seconds of one centered, sufficiently framed body; detector requests two poses so a second person is detectable. UI displays ROM/tempo/balance/tracking independently. Temporal phases and repetition/hold output retained, with movement-specific squat/lunge/push-up phase labels.

| Exercise | Added/checkable signals |
|---|---|
| squat | knees/hips, torso lean, ankle visibility, stance, knee tracking and bilateral asymmetry |
| lunge | front/rear knee and hip angles, torso lean, stance, shallow-range candidate |
| push_up | elbows, body line, signed hip sag/pike, shoulder support |
| plank | body line, signed hip height, elbow support, visibility, gap-safe hold duration |
| shoulder_press | elbows, wrist/elbow offset, shoulder symmetry, overhead completion, torso compensation |
| curl | flexion, elbow drift, shoulder symmetry, torso compensation/sway, bilateral difference |
| lateral_raise | elevation, elbow bend, shoulder symmetry, torso compensation |
| bent_row | inclination, elbow path, shoulder-width retraction proxy, hip hinge, torso stability |
| hip_hinge | hips, knees, torso, hip displacement, squat-like classification |
| glute_bridge | hip extension, shoulder/hip/knee angle, bilateral hip height, knee support |
| front_raise | elevation, elbow bend, shoulder symmetry, torso compensation |
| side_lunge | lateral displacement, loaded knee, opposite extension, stance, torso balance |

48 fixture scenarios are explicitly synthetic, plus eleven full-cycle/tracking-loss tests and existing plank timing tests. This is **not** real-world accuracy evidence. Consented independently labelled real sequences remain EXTERNAL SETUP REQUIRED. Thresholds and shoulder retraction are screen-space heuristics, not medical findings. Camera-angle enforcement and full movement classification accuracy remain unvalidated.

## Android

VERIFIED for CI debug build only: GitHub Actions run 37131281596 built assembleDebug successfully in 2m39s and uploaded APK artifact 11276877280. Local `assembleDebug` failed because Android SDK is absent; Java17 also falls below the intended Java21 toolchain. Physical-device verification remains EXTERNAL SETUP REQUIRED. New manual release workflow runs only with real signing/config; missing configuration is explicitly skipped. Target device matrix contains NOT TESTED, never a fabricated PASS.

## iOS

VERIFIED for unsigned simulator compile only: macOS GitHub Actions run 37131281596 successfully executed xcodebuild for iphonesimulator with CODE_SIGNING_ALLOWED=NO. `npx cap sync` also succeeded. No local Xcode/archive/Validate App/TestFlight/signature or physical iPhone test. Signed release and device validation remain EXTERNAL SETUP REQUIRED.

## Offline

IMPLEMENTED / NOT DEVICE VERIFIED. AES-GCM account-isolated IndexedDB caches recent measurement/routine/catalog responses (seven-day restore TTL), drafts and pending workout logs. Native keys use the OS secure-storage plugin; legacy native records migrate atomically to the secure key. Tests exercise encryption/decryption, module restart/rebind, native-key mocked recovery/migration, conflicts and logout cleanup. Browser close/reopen/reconnect coverage is in the integration suite. Actual mobile process termination and OS key recovery still require devices.

Pending records carry client_id/created_at/revision/checksum and explicit sync states. Server compares revisions and canonical request checksums, rejecting changed-body mutation replay. Successful entries are removed after acknowledgement; conflicts require user resolution. Tokens/provider secrets/API keys are not cached by the response-path allowlist. IndexedDB key storage does not defeat same-origin XSS.

## Billing

IMPLEMENTED / NOT DEVICE VERIFIED. Actual SDK purchase/restore still requires native RevenueCat keys plus both store product IDs and entitlement configuration for offerings/purchase. Server refresh alone controls access. Sandbox provenance is saved and cannot grant production access even when REVENUECAT_ALLOW_SANDBOX=true. Webhook authorization, sequential duplicate-event deduplication and source-of-truth refresh for out-of-order events are tested. Concurrent refreshes use existing compare-and-swap and may return retryable 503. Real sandbox purchase/renewal/cancel/refund/restore is EXTERNAL SETUP REQUIRED.

## PostgreSQL

VERIFIED for isolated local automation only: migration version4/checksum/repeat; 20 same-record requests yield one winner; 20 independent records survive; injected rollback preserves records; pg_dump → DROP DATABASE → CREATE DATABASE → pg_restore restores 20 synthetic rows with identical content checksum. Pool sizing/overflow/timeout/recycle are configurable. CI restore job added. Encrypted off-site recovery, scheduling/retention and operational RPO/RTO remain EXTERNAL SETUP REQUIRED / OPERATOR DECISION REQUIRED.

## Tests

VERIFIED: 140 backend tests after patched dependencies; 189 frontend tests; pose model checksum/setup; web build; Capacitor Android/iOS sync; isolated PostgreSQL checks above. Existing tests preserved; migration version assertion follows the new version, webhook reordering test uses distinct event IDs with separate duplicate coverage, and 3D click test waits for the actual post-preset frame.

Backend dependency audit: zero findings after PyJWT 2.15.0, cryptography 50.0.0, python-multipart 0.0.31 updates. Frontend audit: five moderate development-tool dependency findings (Capacitor CLI/xcode/uuid and Vitest/mocker), no high/critical findings. Dependency audit workflow added; not security certification.

Browser and GitHub Actions final outcomes are recorded below after execution, not inferred from unit tests.

## External Requirements

EXTERNAL SETUP REQUIRED: actual Android/iOS hardware, signing keys/developer accounts and store products, RevenueCat public native keys/server key/webhook token, actual sandbox lifecycle, real independently reviewed pose landmark data, production identity/API/legal settings, backup encryption custody/off-site destination/RPO/RTO/retention owner.

## Remaining Risks

IMPLEMENTED / NOT DEVICE VERIFIED: Pose thresholds, 2D occlusion/angle sensitivity, native storage bridge, actual device FPS/thermal behavior and large avatar bundle. Real-data accuracy validation and production disaster-recovery evidence are not supplied. No 100% completion, clinical accuracy, actual payment or physical-device claim is made.

### Final local browser result

VERIFIED: all 12 Playwright scenarios passed (47.8s) on local Chrome154, including 3D overlays/selection/mobile, fake-camera permission/lifecycle, encrypted pending close/reopen/single sync, draft restore, and new low-power numeric preservation. Agent-browser also confirmed page content/no reported page errors. These are browser/synthetic-camera checks, not physical-device evidence.

### Final remote CI evidence

VERIFIED for implementation commit `375fb14c0afdb98eb8c95f70196a5c5156447d10`:

- [Verify Synex Health run 37131281596](https://github.com/hundol047/Synex-Health/actions/runs/37131281596): backend, frontend, browser (12 passed), postgres (including real restore), android-compile, ios-compile and container-release all succeeded.
- [Dependency audit run 37131281675](https://github.com/hundol047/Synex-Health/actions/runs/37131281675): succeeded; backend no findings, npm no high/critical findings (moderate findings documented above).
- [Android debug APK artifact 11276877280](https://github.com/hundol047/Synex-Health/actions/runs/37131281596/artifacts/11276877280): uploaded, 32,494,535-byte artifact archive. Requires GitHub access; this is debug, not a signed store release.
- [Review PR #5](https://github.com/hundol047/Synex-Health/pull/5) contains the tested implementation. Main was not changed: automatic approval review rejected direct main publication. A separate review branch was accepted. Main merge requires explicit user approval.

This evidence records the implementation commit, not a blanket claim about physical devices, real payments or subsequent report-only commit checks.
