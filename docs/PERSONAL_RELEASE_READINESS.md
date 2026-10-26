# Personal release readiness — 2026-10-25

The screenshot-era personal UI and local encrypted namespace remain the baseline. No login server, paid subscription, or school API is required. Existing version-1 documents retain their namespace and encryption keys. Unknown document versions fail closed instead of resetting data.

## Implemented corrections

- Health-data deletion clears safety answers, limitations, birth date, height, gender, measurements, derived plans, goals and workout history. Only display name remains. Device reset clears settings and consent too.
- Workout dates must be real, nonfuture calendar dates; repetition counts must be integers. Under-14 birth dates are rejected, including imports; previously stored under-14 profiles cannot add health records.
- Password backups use PBKDF2-SHA256 (600,000 rounds), a random salt, and AES-256-GCM with a fresh nonce. Passwords are not saved. Wrong passwords, tampering and invalid imports cannot replace the existing document. Restore replaces records atomically, clears drafts, and requires regenerating derived plans. Only this version's encrypted backups are restorable; plain JSON exports remain for inspection, not import.
- Android file export uses the native local download/share writer; browser exports use downloads. iOS file export remains unsupported and reports an error.
- Personal privacy/terms match local camera processing and optional recording, explain exported-file retention, and provide hundol047@gmail.com. Intro obtains an unchecked age/health-storage agreement. Device reset withdraws it.
- Camera feedback explicitly identifies experimental accuracy and cannot measure actual muscle force. The mannequin explains MRI/cohort differences and is not a Korean/InBody diagnostic norm.
- Personal Android CI now runs on main, installs bundled pose assets before browser tests, and assigns separate monotonically increasing preview version codes. Its output is a debug preview, not a store release.

## Release command

`cd frontend && npm run android:personal:release` builds a signed AAB with local mode preserved. Required inputs: `SYNEX_APPLICATION_ID`, `SYNEX_VERSION_CODE` (higher than the existing installation), signing environment `SYNEX_KEYSTORE_PATH`, `SYNEX_KEYSTORE_PASSWORD`, `SYNEX_KEY_ALIAS`, `SYNEX_KEY_PASSWORD`. Preserve the existing application ID and signing certificate for upgrades. Never uninstall to fix an upgrade failure without a tested backup.

The old boolean QA flags no longer unlock a release. Supply the checksummed, build-bound manifest described in [PERSONAL_RELEASE_ACCEPTANCE.md](PERSONAL_RELEASE_ACCEPTANCE.md), then verify the exact reviewed APK before distribution. Server API and remote model URLs are forbidden in this personal release path.

## Remaining external acceptance — not completed by simulations

1. Physical Android device: install/upgrade retaining encrypted records, consent, camera permissions denied/revoked, background/resume, low storage, encrypted download/file picker restore, Keystore restart, video save/share and Korean speech. Include at least a low-memory phone and a current Android version. Native JSON export changed in this revision and needs device verification.
2. Consented human recordings for all 74 exercises: multiple body shapes, views, lighting and equipment occlusion, with independent qualified labels. Report per-exercise valid/invalid/rejected samples, repetition error and false corrections; document acceptance thresholds before evaluating. Synthetic landmark tests establish rule behavior only, not real-video accuracy.
3. Expert review of motion form and health recommendations. Review full-text methods and applicability before claiming normative average values; original abstract numbers were verified as recorded below.
4. Confirm legal operator identity and public policy/support URLs and store privacy declarations. The display name “Synex Health 운영팀” is not evidence of a registered business identity.
5. School connections need institution-specific authorized APIs/credentials and data agreements. School selection is explicitly not a live integration.
6. Signed APK/AAB upgrade validation needs the actual distribution signing key and package identity. This environment does not certify store submission or physical-device operation.

Do not mark these items complete solely because unit tests, browser tests or an emulator pass.

## Reference source verification

On 2026-10-25, Europe PMC's MED record for PMID 10904038 returned the original abstract: men vs women absolute skeletal muscle mass “33.0 vs. 21.0 kg”; sample 468, ages 18–88, whole-body MRI. Endpoint: https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=EXT_ID:10904038%20AND%20SRC:MED&resultType=core&format=json . This verifies the cited aggregate numbers, not full-text methods, BIA interchangeability, Korean population norms, or individual regional muscle masses. PubMed's HTML endpoint returned a browser challenge, so it was not treated as a readable source.

## Additional defects found while executing the checks

- Coalesce queued draft edits/timer ticks so an older snapshot does not delay the current save. Pause the guided workout and rest timer while submitting. Both 360px and 393px manual/guided pain-stop persistence cases pass with the original 5-second completion assertion after this correction.
- Cat-cow and bird-dog quadruped supports previously placed elbows at about 140 degrees. Fit torso inclination to actual arm length while preserving hip/knee heights and bone lengths; support elbows now exceed 160 degrees. Floor-contact, six-stature segment-length, cycle-continuity checks pass. Two motions were rendered again after this correction.
- Node's external-pose evaluator failed on JSON module import attributes and only listed 12 specialized analyzers. It now runs directly under the current Node runtime, enumerates 74 exercise contracts, and reports missing real data without accuracy numbers. Non-counting/hold exercises report null repetition MAE.

## Verification result

- Frontend: 460 tests passed in the full suite. After the last draft-queue change, the affected draft, guided workout, floor rig and all-motion continuity tests passed again (18 assertions).
- Backend: 212 tests passed; warnings concern short test-only JWT fixture keys.
- npm dependency audit: 0 vulnerabilities including development dependencies. Backend requirements pip-audit: 0 vulnerabilities.
- Personal production web asset build and Capacitor Android sync passed. This is not a signed APK/AAB build or native runtime test; no Android SDK/device or distribution signing key is available in this execution environment.
- Browser: the 35-case run initially passed 32, then all three failed cases were corrected/rechecked (one age-policy fixture and the two pain-save cases). The additional corrected-floor-motion case passed. Thus 36 unique scenarios have passing results across runs, not a claim of one uninterrupted green run.
- The all-74 render test captured 222 frames, with offline request checks. All 30 recovery motions rendered; five recommended stretches auto-started, skipping and calorie confirmation passed. Browser MediaRecorder saved/replayed a nonempty synthetic moving video; bundled MediaPipe rejected an empty scene without invented corrections. These do not establish human pose accuracy.
- Encrypted backup download/restore, wrong-password preservation, tamper rejection, invalid/duplicate restore rejection, consent/startup recovery and offline restart passed.
- External pose evaluator: `NO EXTERNAL VALIDATION DATA`, 74 missing exercise results, no invented numeric accuracy.

Local execution logs and the motion contact sheet are retained under `/workspace/output/personal-release-20261025/`. No new downloadable release APK was produced or certified by this work.
