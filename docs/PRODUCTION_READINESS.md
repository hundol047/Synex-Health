# Production readiness — 2026-10-03 hardening

Existing features and tests are retained. VERIFIED below means the named automated check actually ran; it is not medical validation, security certification, store approval or physical-device validation.

| Area | Status | Evidence / remaining boundary |
|---|---|---|
| 3D comparison | IMPLEMENTED / NOT DEVICE VERIFIED | All five modes, numeric kg/% differences, opacity/wireframe/interpolation retained. Bounded regional deformation, finite inputs, exact illustrative-model notice. No individual muscle mass inferred. |
| Body shape providers | IMPLEMENTED / NOT DEVICE VERIFIED | Disabled/local/remote kept; no invented output. Actual adapter confidence/source/generated_at/photo_retained metadata; multiview interface; separate upload consent. Actual model external. |
| Twelve Pose analyzers | IMPLEMENTED / NOT DEVICE VERIFIED | Exercise-specific metrics/rules, HIGH/MEDIUM/LOW/LOST, required-landmark suppression, 2.5s calibration, two-person detection, camera guidance, ROM/tempo/balance/tracking. 48 synthetic fixtures plus temporal/hold tests. Real labelled video-derived data unavailable; actual accuracy NOT VERIFIED. |
| Android debug | EXTERNAL SETUP REQUIRED | Local assembleDebug attempted; Android SDK absent and local Java 17 below project toolchain. Existing Java21/SDK36 CI and APK artifact retained. Device matrix is NOT TESTED. |
| Android release | EXTERNAL SETUP REQUIRED | Manual signed AAB workflow explicitly skips missing signing/configuration. No fake signing or local AAB claim. |
| iOS | EXTERNAL SETUP REQUIRED | cap sync succeeds; Xcode/archive/Validate App/TestFlight and devices unavailable. Simulator CI retained; device matrix NOT TESTED. |
| Renderer diagnostics | IMPLEMENTED / NOT DEVICE VERIFIED | Contiguous rendered-frame FPS, CPU render submission time, meshes/vertices, overlay/fallback. Idle frames excluded. Low-power DPR/shadows/wireframe/no-interpolation; 3s slow-frame fallback. GPU timing and device benchmark external. |
| Offline persistence | IMPLEMENTED / NOT DEVICE VERIFIED | AES-GCM IndexedDB outbox/drafts + seven-day account-scoped measurement/routine/catalog snapshots; native secure-storage key adapter. Module restart/rebind/sync unit tests pass. OS plugin mocked; physical process-kill recovery external. Native legacy browser-key records are re-encrypted atomically before activation; concurrent changes abort migration. |
| Workout sync | VERIFIED | Client ID/time/revision/SHA256 metadata, PENDING/SYNCING/SYNCED/CONFLICT/FAILED transitions, atomic revision comparison and changed-payload replay rejection. SYNCED entries removed after acknowledgement. No silent overwrite. |
| RevenueCat | IMPLEMENTED / NOT DEVICE VERIFIED | Server refetch authority, store product/config guards, sandbox environment persisted and blocked in production even with allow flag; authenticated/idempotent webhooks. Lifecycle/refund/grace/duplicate/out-of-order and restore tests mocked. Actual store sandbox/production external. |
| PostgreSQL | VERIFIED | Local disposable PostgreSQL: repeated migration/checksum, 20 competing writes (one winner), 20 distinct writes, rollback, pg_dump/drop/pg_restore and 20-row content-checksum match. Production off-site encrypted recovery is external. |
| Audit | VERIFIED | Automated export and billing tests; login/export/delete/provider sync/subscription/counselor/reference events avoid raw health values. |
| Dependency audit | VERIFIED | Backend audit after PyJWT/cryptography/multipart patch: zero findings. npm audit: five moderate development-tool findings, no high/critical. Not a penetration test. |
| GitHub CI | EXTERNAL SETUP REQUIRED | Outcome must be read from the pushed commit's Actions run; never inferred from local tests. |

## Verification commands and results

- Backend: `python -m pytest -q` — 140 passed after dependency security patches.
- Frontend: `npm test -- --run` — 189 passed.
- `npm run pose:setup` — verified official model installed.
- `npm run build` and `npx cap sync` — passed; large avatar bundle warning remains.
- Local PostgreSQL verification and restore scripts — passed against isolated temporary data only.
- Local Android debug — failed because Android SDK is not installed, not counted as success.
- Browser: all 12 integration tests passed; Chrome154 with synthetic camera. Exact remote CI status is recorded in HARDENING_REPORT.md.

## External requirements and remaining risks

Supply consented independently reviewed real pose landmark sequences and target devices; actual Apple/Google developer accounts, products, RevenueCat keys/webhook configuration and sandbox cycles; production identity/API/legal settings; PostgreSQL backup keys, retention, RPO/RTO and off-site restore owner. Native secure storage and FPS still need actual devices. IndexedDB encryption does not protect against malicious same-origin JavaScript; OS storage protection does not make a compromised device safe. No 100% accuracy/completion claim.

See ANDROID_DEVICE_TEST_MATRIX.md, IOS_DEVICE_TEST_MATRIX.md, DATABASE_BACKUP_RESTORE.md and frontend/tests/pose-fixtures/README.md.
