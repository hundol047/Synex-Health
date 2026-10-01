# Production readiness — upgrade candidate

| Area | Status | Evidence / blocker |
|---|---|---|
| Inline no-click exercise preview | IMPLEMENTED / NOT DEVICE VERIFIED | Shared existing 44-motion SVG, 12 FPS, offscreen/background pause, reduced motion; automated preview test |
| Personalized body morph | IMPLEMENTED / NOT DEVICE VERIFIED | Safe regional, waist, shoulder and height changes; not reconstruction |
| Twelve pose analyzers | IMPLEMENTED / NOT DEVICE VERIFIED | Common outputs and confidence tests; no clinical/device accuracy validation |
| Adaptive history / RPE / pain | VERIFIED | Backend own-account history and numeric pain tests |
| Reference/evidence provenance | VERIFIED | Production demo exclusion and registered evidence tests; real ranges external |
| PostgreSQL migration | IMPLEMENTED / NOT DEVICE VERIFIED | Explicit CLI and CI real-PG job; production deployment/restore unverified |
| Subscription states | VERIFIED (mocked server) | Actual store products and sandbox cycle external |
| Runtime diagnostics | IMPLEMENTED / NOT DEVICE VERIFIED | Allowlisted status only; availability distinct from granted permission |
| Session offline queue | VERIFIED (unit) | Durable encrypted restart persistence NOT IMPLEMENTED |
| Android/iOS release binaries | EXTERNAL SETUP REQUIRED | Signing, SDK toolchains, physical devices and store accounts |
| Actual production web configuration | EXTERNAL SETUP REQUIRED | Real URLs, identity provider, legal operator, bundle ID absent; release gate intentionally blocks |
| CI | Pending remote run | Record final run outcome after push |

This candidate is not production-ready solely because tests pass. Store submission, institution connection, medical validity, every-angle motion review, on-device performance, backup recovery and fully durable offline sync are not claimed. See the focused documents for specific boundaries.


Status definitions: VERIFIED means a named automated/browser check passed; IMPLEMENTED / NOT DEVICE VERIFIED means code exists without physical-device evidence; EXTERNAL SETUP REQUIRED needs operator systems; NOT IMPLEMENTED means no working feature is claimed.

## Local verification — 2026-10-01

- `python -m pytest -q`: **76 passed**.
- `npm test -- --run`: **35 passed**; existing tests retained.
- `npm run pose:setup`: verified local pose model installed.
- `npm run build`: **PASS**, lazy 3D bundle size remains a physical-device profiling risk.
- `npx cap sync`: **PASS** for Android and iOS assets.
- Repeated migration CLI: schema version 3 applied twice without failure on SQLite.
- Browser: no-click animation, reduced-motion pause, 24 route/viewport checks (320/375/390/430/768/1280), offline queue and server reconciliation passed. Browser font configuration was repaired before final visual inspection; no final page exceptions.
- Android Gradle command attempted; distribution download failed with network unreachable. Local Java 17 is also below the native toolchain requirement. No APK/AAB success is claimed.
- Xcode unavailable; no iOS archive or physical-device test.
- Release-specific build remains blocked by missing actual production configuration; ordinary optimized web build success is not production deployment approval.
