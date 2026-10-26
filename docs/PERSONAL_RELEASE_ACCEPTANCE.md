# Personal Android release acceptance

## What is and is not verified

The automated tests exercise synthetic landmarks, fake camera streams and Android emulator behavior. They are not real-video accuracy, physical-device thermal validation, or clinical validation. The school-list APK 601b0eb was signed with an ephemeral CI debug key. Its private key cannot be recovered from the APK. Without that original key, an in-place update of that existing installation cannot be promised. Export an encrypted backup, verify the password and restore on a separate QA installation before considering a user-guided migration. Never clear or uninstall an existing user's app automatically.

## Persistent preview signing

A repository administrator must supply these GitHub Actions secrets (this environment's integration received HTTP 403 for Actions secrets):

- `PERSONAL_ANDROID_KEYSTORE_BASE64`
- `PERSONAL_ANDROID_KEYSTORE_PASSWORD`
- `PERSONAL_ANDROID_KEY_ALIAS`
- `PERSONAL_ANDROID_KEY_PASSWORD`

Set repository variable `PERSONAL_ANDROID_SIGNER_SHA256` to the lowercase certificate SHA-256. Keep the keystore backed up in the owner's protected credential store, not Git or a public build artifact. Do not rotate it for routine updates. The application ID must remain `com.synex.health.personal`. Version codes increase across builds.

Absent signing configuration, CI produces a clearly named **CI-ONLY-NOT-FOR-DISTRIBUTION** artifact and skips the download-ready job. Partial configuration fails rather than falling back to a random signing key. With configuration, Gradle uses the persistent key and the APK's cryptographically verified certificate must match the pin.

The CI update test uses two builds of the same source with increasing versions. It runs onboarding, saves an actual encrypted profile, replaces the APK using `adb install -r`, and checks profile decryption and unchanged native key entries. This proves that particular same-source package replacement; it does not prove migration from the previous public APK. Before distribution, run `scripts/verify-android-update.py` with the actual previous and candidate APKs on a dedicated QA device. Signature mismatch stops before installation. The harness intentionally never uninstalls or clears application data.

## Physical-device acceptance

Use at least two distinct physical Android models, including a lower-performance supported model. Record model, Android/WebView versions, tester, date, exact APK SHA-256, video/log evidence and expected versus observed behavior for:

1. Upgrade preserving profile, measurements, workout history and school affiliation.
2. Encrypted backup restore, wrong password and corrupted file; originals remain intact.
3. Camera permission denied then granted.
4. Background/lock/unlock: camera, recording and speech stop safely; explicit restart works.
5. Incoming phone call and return.
6. Recording/replay/export/share, including cancellation and target app absence.
7. Full storage or failed write: no false success; existing records remain readable.
8. Offline restart and record decryption.
9. Delete records and confirm they are absent after restart.
10. At least 15 minutes of camera use: record camera/pose frame rate, memory, battery, device temperature/thermal state and any crashes. Do not label an emulator thermal test as physical evidence.

## Real-video accuracy acceptance

Use consented, independently labelled participant videos with anonymized subject IDs. Each of the 74 exercises needs at least 20 normal, 20 imperfect and 10 problematic cases, at least 5 participants, 2 devices, 2 lighting conditions and 2 camera angles. Include occlusion, out-of-frame body parts and multiple people. Include variations in body size. Review force-use statements as instructions, not measured activation.

`node frontend/scripts/validate-external-pose.mjs /protected/dataset.json /protected/pose-report.json` accepts a JSON array of labelled sessions. See `validation/pose` and the evaluator schema. Each session now requires `lighting`. The evaluator records correction/warning recall as well as precision so suppressing all feedback cannot appear accurate. Samples without enough evidence produce null/unvalidated results.

Release engineering acceptance targets are detection recall >= .90, false-positive detection rate <= .05, correction precision >= .90, correction recall >= .80, phase accuracy >= .80, and supported repetition MAE <= 1. These are product acceptance targets, not validated medical thresholds. Until met on external data, remain an experimental preview.

## Evidence gate and exact artifact promotion

Boolean `PERSONAL_DEVICE_QA_VERIFIED` / `PERSONAL_POSE_QA_VERIFIED` flags no longer unlock a personal release. `PERSONAL_RELEASE_EVIDENCE` must point to a reviewed JSON manifest. Bind it to `VITE_BUILD_COMMIT` (full 40-char SHA), `SYNEX_APPLICATION_ID`, `SYNEX_VERSION_CODE`, and `PERSONAL_SIGNER_SHA256`.

Manifest schema 1 includes `reviewer`, `tested_at` (within 30 days), `build` (`commit`, `application_id`, `version_code`, `signer_sha256`, `apk: {file, sha256}`), `devices`, and `pose`. All evidence paths are relative to the manifest directory, checksummed and constrained to that directory (including symlinks).

Each device has `physical_device: true`, `model`, `os`, `tester`, `apk_sha256`, and `checks`. Required check keys are exported as `DEVICE_SCENARIOS` from `frontend/scripts/personal-release-evidence.mjs`. Each check has `status: passed`, `file`, `sha256`. The pose entry has `file`, `sha256`, `dataset: {file, sha256}`. The reviewed pose report includes `commit_sha`, `apk_sha256`, `data_origin: external_human`, `reviewed: true`, `reviewer`, evaluator/model versions and the evaluator's `per_exercise` results. The gate recomputes the attached labelled dataset; manually changing report numbers is rejected.

Prebuild acceptance checks evidence for the stated source/version. A new build is NOT automatically the reviewed APK. Review that exact candidate after building and promote it without rebuilding:

```
python scripts/verify-personal-distribution.py /protected/candidate.apk --build-tools "$ANDROID_HOME/build-tools/36.0.0"
```

This final check verifies the actual APK signature, package and version and compares its bytes with the reviewed candidate. A changed APK requires renewed evidence. Human truthfulness/independent review of submitted video and device reports remains necessary; no file validator can prove that an attested physical test actually occurred.
