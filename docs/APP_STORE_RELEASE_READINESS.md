# Release readiness — evidence, not submission approval

This is a repository release-hardening candidate. **Not yet a submitted or validated App Store archive.** PASS applies only to the named evidence; EXTERNAL is not a pass. Final results are recorded after verification below.

| Gate | State | Evidence / remaining action |
|---|---|---|
| Existing core functions retained | PASS | Regression tests retained; manual records, comparison, routines, history |
| Personalized sportswear avatar | PASS (implementation) | Same measurement morph, shared joint transforms, covered-body triangles omitted, shirt/pants or shorts/shoes |
| Full movement quality across every angle | FAIL pending real movement review | Authored approximate motions; a qualified review and physical-device sweep remain necessary |
| Eight pose configurations | PASS (implementation only) | Independent angle/phase settings, confidence handling, repetition/hold timing; not clinical accuracy validation |
| Worker performance | PASS (fallback lifecycle), EXTERNAL (performance) | Worker initialization can fail on WebViews; local main-thread fallback throttles frames. Device benchmarks required |
| Production authentication/configuration | PASS (guards) | Demo blocked; OIDC required, reviewer credentials separately hashed; token/session logout; HTTPS and production DB guards |
| Privacy policy/terms | PASS (templates/code), EXTERNAL (operator) | Generated pages; operator, contact, retention and public URLs must be supplied |
| Account deletion | PASS (code) | Server removal, tombstone, session revoke, client token/storage/SDK/notification cleanup |
| Apple privacy manifest | PASS (app resource), EXTERNAL (archive report) | App data categories supplied; RevenueCat transitive native SDK report still required |
| HealthKit | PASS (configuration), EXTERNAL (device) | Read-only steps/workouts/weight; no clinical records; no server upload |
| iOS icon/launch/permissions | PASS (assets/config) | Original icon, static splash, purpose strings, parameterized scheme |
| iOS Release compile | EXTERNAL | macOS/Xcode not available here |
| iOS Archive/Validate/Upload/TestFlight | EXTERNAL | Actual Apple Team, registered ID, signing/provisioning and devices required |
| Android native compile | EXTERNAL | Local Gradle download/network/toolchain limitation; sync is not compile |
| Store metadata/review/age/export drafts | PASS (drafts), EXTERNAL (final entries) | See accompanying docs; operator finalizes actual questionnaire and contacts |
| IAP | EXTERNAL | Free launch supported; Plus requires real products/RevenueCat and sandbox tests |
| InBody / school center | EXTERNAL | Contract, actual institution adapter, OIDC registration; never fake connected |
| Remote push | NOT APPLICABLE to first release | Release build rejects activation; local reminders work independently |
| PostgreSQL deployment | EXTERNAL | Adapter and disposable integration script exist; live migration/concurrency/restore not verified |
| Actual production build | EXTERNAL | Real HTTPS URLs, legal metadata and registered Bundle ID missing; release validator intentionally fails |
| CI run | PENDING | Workflow added; remote run outcome must be recorded after push |

No code or document claims external configuration alone proves movement accuracy, clinical validity, device performance or App Review acceptance. Remaining code-level quality findings must be resolved or features restricted before submission. App source uses lazy routes; the large human mesh chunk still warrants device profiling.

## Verification recorded before push

- Backend: `pytest backend/tests -q` — **70 passed**.
- Frontend: `npm test -- --run` — **29 passed**.
- `npm run build` and `npx cap sync` — **PASS** for web assets and both platform synchronization; not native compilation.
- Browser: male/female/unspecified body views, slice/comparison, synchronized cameras, exercise playback, six responsive widths, touch rotation, fake-camera start/stop — **PASS**, no captured page exceptions.
- Worker-only throughput is **not verified**. A later isolated benchmark could not launch the headless browser (SIGSEGV); no device performance claim follows from the successful camera lifecycle check.
- Secret scan: no configured secret patterns in tracked files; 428 historical text blobs scanned with no matches. This is not a security certification.
- Release configuration gate intentionally **BLOCKED** without real service URLs, legal operator, registered Bundle ID, production authentication and database configuration.
- Native Android build blocked by Gradle download/network and local Java toolchain; iOS archive requires macOS/Xcode.
