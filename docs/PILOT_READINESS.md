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

- Backend: 157 tests passed (isolated test data, 7 existing dependency warnings).
- Frontend: 194 tests passed; npm ci, pose:setup, production web build and cap sync passed.
- Pose evaluation: NO EXTERNAL VALIDATION DATA; no accuracy figures generated.
- PostgreSQL: schema migration, optimistic concurrency, 20 independent writes, rollback and actual backup/drop/restore checksum passed in a disposable local database.
- Local Android assembleDebug: blocked by missing Android SDK. GitHub Actions supplies SDK 36; CI results are reported on the pull request.
- Physical Android/iOS and production billing: NOT TESTED. Browser and simulator evidence cannot substitute for physical tests.

First full CI evidence: [Verify run 37134258523](https://github.com/hundol047/Synex-Health/actions/runs/37134258523) passed all seven jobs (backend, frontend, browser, PostgreSQL restore, container release, Android debug, iOS simulator). [Dependency audit 37134258511](https://github.com/hundol047/Synex-Health/actions/runs/37134258511) passed. This proves automated builds/tests only. Check the latest head checks on [PR #6](https://github.com/hundol047/Synex-Health/pull/6) for the final sync-policy follow-ups.

The final provider check preserves long Retry-After delays across requests rather than retrying early. The school-mapping gate accepts verified institutional membership for the reviewed manual workflow; an InBody external subject is required only for InBody sync. Login sync makes one conditional request after real student authentication, at most once per six-hour successful-sync interval; manual/server requests share the server cooldown. Webhook activation remains blocked pending the official vendor contract.

Final review separates school SSO configuration from health-center provider connectivity and scopes provider sync state to each school. Workout rest now continues between exercises as well as between sets, with a regression test for the last-set transition.

## Pre-merge evidence guard review

InBody external subjects are unique across all schools for the configured provider. Administrator mapping writes are serialized in a database transaction (including PostgreSQL), normalize surrounding whitespace, and invalidate the old sync state atomically. School IDs alone do not establish verified membership; revoked memberships cannot supply successful-sync evidence to the gate.

Configuration alone does not verify deployed authentication, database access or operator/legal readiness. Set `PILOT_ACCEPTANCE_EVIDENCE` to an operator-reviewed JSON file outside git with a `tests` array. Each record requires `test` (Authentication, Database, Privacy, Terms or Support), `date` (ISO date), `tester`, `commit_sha` matching `BUILD_COMMIT`, an HTTPS `evidence_url` to redacted institutional evidence, and `result: PASS`. Test actual OIDC login and PostgreSQL read/write; have the operator approve the published legal pages and contact process. Missing or contradictory evidence blocks readiness. These records are attestations, not automated certification.

Physical QA similarly rejects contradictory results for the same tested build. Resolve a failure with a reviewed replacement evidence set retaining the original in the institutional audit archive; adding another PASS must not conceal an outstanding FAIL. A manual workflow must name a school with current verified membership. Historical connected flags alone never count as current provider mapping evidence.
