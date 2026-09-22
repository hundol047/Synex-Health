# Digital Twin + Exercise Coach implementation

## Implemented

- Continuous MakeHuman CC0 human surface remains the base. Male/female/neutral profiles, bounded regional deformation from height, weight/BMI, skeletal muscle mass, fat percentage and five segment lean/fat masses. Missing values use explicit standard proportions. Left/right limbs respond independently. No body scan or clinical reconstruction claim.
- Body/Muscle/Fat surface views and an explicitly schematic joint-axis Skeleton overlay. Three clipping orientations and position sliders, reset, touch orbit/pinch, keyboard rotation/zoom, camera fit for narrow screens. Surface cuts contain no organ or tissue data.
- Server-entitled Before/After with selectable readings, shared camera position, complete numerical deltas and lean/fat color changes. Basic numeric comparison stays free.
- 44 catalog movements across 10 categories. Original SVG demos retained. Human surface retargeted using fixed bone lengths and smoothly blended skin weights; playback, pause, reset, speed, mirror, loop, scrub and camera controls. These are authored schematic demonstrations, not motion capture. Variations still need a qualified movement review before unsupervised coaching claims.
- MediaPipe on-device camera path, explicit consent, visibility checks, squat phase/hysteresis/rep counter and angle feedback; camera stops on navigation, background, denial/error or lost entitlement. Only squat is analyzed. Do not interpret thresholds as clinical norms. No video upload. The local detector currently runs up to 10fps on the main thread; a worker and real-device performance testing remain useful improvements.
- Goals persist and map to the existing recommendation strategies. 65+ users and low completion history receive conservative starting volume. Safety/equipment/time/limitations rules remain enforced. Every prescribed exercise is drawn from the catalog and carries a reason. No algorithm is claimed to be the universally optimal workout.
- Calendar distinguishes pain, completed, scheduled and missed days. Consecutive active-day/week/month streaks, current-week/month activity, total active days/exercises and user-entered actual minutes. Weekly percentage is labeled by its denominator. Progress adds BMI, data tables and deterministic change summaries.
- School SSO allowlist with issuer-namespaced subjects, per-school client/audience/redirect, deployment-controlled staff assignments, verified membership separate from selection. In production counselor access requires same-school verified membership AND consent. Admin health-record access is restricted; the admin dashboard exposes operational metadata.
- Account/health-data/individual record deletion, export, consent history and sharing revocation. Deleting one reading invalidates all derived analyses/routines because comparisons may retain older values; independently logged workouts remain with routine links cleared. A minimal deleted-ID tombstone blocks old credentials from recreating an account. Audit metadata stays append-only. Store subscription cancellation and external school-account deletion remain separate operations.
- Real HealthKit/Health Connect read-only plugin adapter (8 metric groups), availability and denial handling, no automatic upload. Android manifest removes unused/write permissions. iOS HealthKit entitlement and read-purpose text included. Native results are limited to 100 records per type per request, with the limit disclosed.
- Capacitor local reminders with explicit permission and cancellation. Push registration/APNs callback structure, disabled unless deployment opts in. No remote message dispatcher or APNs/FCM credentials are shipped.
- SQLAlchemy PostgreSQL transaction/connection adapter for health/billing, audit and session storage. SQLite stays the default. Additive migration version table, indexes and rollback behavior. PostgreSQL integration script is supplied; live PostgreSQL execution was not available in this environment.

## Setup

### Pose assets

```
cd frontend
npm ci
npm run pose:setup
npm run build
npx cap sync
```

`pose:setup` downloads Google's official Pose Lite model, checks SHA-256
`59929e1d1ee95287735ddd833b19cf4ac46d29bc7afddbbf6753c459690d574a`, and copies installed package WASM files. Large generated assets are ignored by git and packaged in the build. A missing model returns an unavailable message before camera activation. A checksum mismatch fails and requires a reviewed update. `VITE_POSE_MODEL_URL` may point to an operator-hosted compatible asset. Use HTTPS (localhost is allowed for development).

### Paid features

Billing defaults to disabled. Before/After, pose access, long-term summary and monthly reports check server RevenueCat entitlements. `BILLING_MODE=demo` only works with demo auth and never charges money. Apple/Google real products and RevenueCat production settings are still required. Basic local visuals and source code are not DRM; server authorization protects the paid API routes, not arbitrary user modifications to an open-source client.

### InBody contract

No guessed vendor endpoint is shipped. Set `INBODY_API_BASE_URL`, `INBODY_API_KEY`, optional `INBODY_TIMEOUT_SECONDS`, and `INBODY_CONTRACT_FACTORY=approved_module:factory`. The deployment-owned contract implements `request(external_subject)`, `readings(response)`, and `normalize(raw) -> (external_measurement_id, BodyCompositionCreateRequest fields)` against the actual signed vendor specification. Authorization mapping must be reviewed for that contract; the transport currently uses a bearer header. Never configure a mismatching API scheme.

The adapter enforces HTTPS, relative paths, no redirects, timeout, bounded retry/Retry-After for 429/5xx, validated all-or-nothing imports and stable IDs scoped by provider/user/external measurement. Admin maps a verified user through `/api/admin/users/{id}/inbody-mapping`; students cannot supply arbitrary external subjects. `/api/integrations/inbody` reports last success; `/sync` stores success/error status and regenerates an existing routine when a new latest measurement arrives. A real provider contract and account mappings are still external prerequisites.

### Institutions

`SCHOOL_OIDC_CONFIG` is a server-only JSON array:

```json
[{"school_id":"yonsei-mirae","issuer":"https://YOUR-ACTUAL-IDP","client_id":"YOUR-CLIENT","audience":"YOUR-AUDIENCE","redirect_url":"https://YOUR-APP/auth/callback","status":"connected","staff_subjects":{}}]
```

Use actual registered issuer/redirects, never these illustrative placeholders. Unverified token claims select only an allowlisted issuer; signature/audience/expiry validation still authenticates. `staff_subjects` explicitly maps verified IdP subjects to counselor/admin. A campus `role=admin` claim alone cannot grant global application administration. Issuers must be unique in this initial configuration format. A deployment migration is required when moving existing legacy single-issuer subject IDs to namespaced IDs. Public `/api/auth/schools` excludes staff mappings.

`SCHOOL_CENTER_FACTORIES` maps school IDs to deployment-owned `module:factory` adapters with a bounded `probe()` method. Admin can select not_connected/pending/error, and connected only after a successful adapter probe. No school is labeled an actual integration partner by default. Registration, school request list, counselor assignment, provider mapping APIs and operational dashboard are present. SSO secrets remain deployment settings, not browser-editable strings.

### PostgreSQL

Use `DATABASE_URL=postgresql+psycopg://...` with managed TLS configuration. Run `python scripts/migrate-health-db.py` once before starting production workers. Existing SQLite records are NOT automatically moved; back up and plan a controlled data migration. Audit and sessions use separate `health_audit` and `health_auth` schemas. Their SQLite defaults remain separate files in development.

On a disposable PostgreSQL database only:

```
SYNEX_TEST_DATABASE=true DATABASE_URL=postgresql+psycopg://... python scripts/verify-postgres.py
```

Do not claim PostgreSQL deployment readiness until this and concurrency/backups/recovery tests run against the intended service. Automatic schema creation requires DDL privileges; operational deployment should run migrations first.

## Native limits and external work

- Android now requires minSdk 26 for Health Connect; JDK 21 + Android SDK and signing are needed for a native build.
- iOS requires Xcode, a provisioned HealthKit capability and signing. Push additionally requires APNs entitlement/certificate configuration. Android push needs real google-services.json/FCM. Local reminders do not require a push server.
- Browser checks do not validate physical phone gestures, HealthKit/Health Connect permission sheets, store purchases or camera model accuracy. These remain release gates.
- The bundled health-data notice describes implemented processing; actual operator contact, retention/deletion policy, support URLs and final store/legal disclosures must be supplied before publication.
- Free health AI uses deterministic grounded text unless the existing LLM provider is configured. This is not a newly trained clinical AI or medical diagnosis service.

## Asset provenance

- Human mesh: existing MakeHuman CC0 data and license, unchanged. See BODY_3D.md.
- MediaPipe: https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker/web_js ; official model card https://storage.googleapis.com/mediapipe-assets/Model%20Card%20BlazePose%20GHUM%203D.pdf explicitly identifies Apache-2.0. License in docs/licenses/MediaPipe-Apache-2.0.txt. Model/WASM binaries are installed, not modified.
- @capgo/capacitor-health 8.11.3: https://github.com/Cap-go/capacitor-health ; MPL-2.0, full license in docs/licenses/Capgo-Health-MPL-2.0.txt. Package source remains unmodified and obtainable from that repository/npm release. No Capgo account or OTA service is used.

## Verification on 2026-09-22

- Backend: 65 tests passed, including ownership, subscription expiry, data deletion, school identity isolation, provider retries and atomic imports.
- Frontend: 26 tests passed, including original SVG playback, all catalog motion deformation, independent body morph inputs, missing deltas, squat counting/lost tracking and calendar statistics.
- Vite production build and Capacitor Android/iOS sync passed. Existing large mesh chunk and development dependency deprecation warnings remain.
- Chromium WebGL: body/slice/Before-After/exercise screens rendered; comparison camera positions matched; synthetic touch drag changed camera position. Body/goals/workout/connections/privacy/progress checked at 320, 375, 390, 430, 768 and 1280px without document overflow. No page exceptions reported.
- MediaPipe model loaded from the app server, graph inference started with Chromium's synthetic 640px camera, and stopping closed the graph and detached the stream. This is a plumbing test, NOT validation of pose accuracy or real phone performance. Fixed the discovered HEAD 405 by mounting pose assets as static files with the model MIME type.
- Android `assembleDebug` was attempted but Gradle distribution download failed with `Network is unreachable`; no APK/AAB was verified. No Xcode environment or iOS archive was available. PostgreSQL service execution also remains unverified.
- Real InBody/center/SSO credentials, store products, device health permissions, APNs/FCM dispatch, institutional reference ranges, signing and operator privacy details remain external release prerequisites. No simulated school integration or payment is presented as live.

## Main changed areas

`frontend/src/health/components/body3d/`, `components/exercise/`, the new goals/library/pose/privacy/connections/admin pages, `frontend/android/` and `frontend/ios/`, `backend/app/health/extensions.py`, provider adapters, school OIDC and persistence services. Automated regression tests live in `backend/tests/test_extensions.py` and `frontend/tests/DigitalTwin.test.js`.

Next production work: institution contract integration and verified population ranges, real-device movement review/performance tuning, native signing/store sandbox purchases, and PostgreSQL migration/concurrency/recovery validation.
