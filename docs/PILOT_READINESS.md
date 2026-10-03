# Pilot readiness

## Ready

Code verification is reported separately from real external validation. Existing consent isolation, encrypted offline storage, synthetic Pose regression and contract-injected InBody adapter are retained.

## Partial

IMPLEMENTED / NOT DEVICE VERIFIED: external landmark evaluation, versioned thresholds/results; confidence labels; Android/iOS evidence format and diagnostics; High/Balanced/Low Power; strict reference import/provenance; institution-only mapping and sync state; school search and operational flags; focused workout, real-time rest deadline, encrypted resume and per-set feedback; pilot startup guard and evidence readiness page.

The evaluator runs landmark heuristics, not video/model accuracy. Native notification/vibration, temperature, rendering FPS and OS process eviction have not been physically tested. Planned server sync and authenticated vendor webhooks require a real provider contract; no guessed endpoint is enabled.

## External

EXTERNAL SETUP REQUIRED: production OIDC school claims, hosted PostgreSQL, real privacy/terms/support URLs, verified school mappings, signed InBody API contract/credentials/adapter or an independently reviewed manual intake workflow. Import licensed reviewed cohorts only; keep REFERENCE_COMPARISON_ENABLED=false until available. Collect physical Android and iOS/TestFlight evidence against BUILD_COMMIT. Production billing is separate from sandbox purchase validation.

## Blockers

PILOT_MODE=true invokes production startup checks (OIDC, PostgreSQL, legal URLs, no demo seed/billing). Diagnostics additionally require school mapping, successful configured provider sync or verified manual workflow, approved reference or disabled comparison, and full Android/iOS physical evidence. No external data, device PASS or production purchase was fabricated.

Validate the provider contract in institutional staging; map Synex user ↔ school user ID ↔ external subject through an administrator; verify school membership/consent; sync manually; confirm stable scoped IDs deduplicate; simulate failure and verify records survive. Server scheduling and webhook delivery must respect official provider retry/limit rules. Client polling is not used.

## Local verification evidence

- Backend: 155 tests passed (isolated test data, 7 existing dependency warnings).
- Frontend: 193 tests passed; npm ci, pose:setup, production web build and cap sync passed.
- Pose evaluation: NO EXTERNAL VALIDATION DATA; no accuracy figures generated.
- PostgreSQL: schema migration, optimistic concurrency, 20 independent writes, rollback and actual backup/drop/restore checksum passed in a disposable local database.
- Local Android assembleDebug: blocked by missing Android SDK. GitHub Actions supplies SDK 36; CI results are reported on the pull request.
- Physical Android/iOS and production billing: NOT TESTED. Browser and simulator evidence cannot substitute for physical tests.
