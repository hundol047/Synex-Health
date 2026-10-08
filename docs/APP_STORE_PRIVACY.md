# App Privacy — source-based draft (2026-10-08)

Submit only after confirming the deployed configuration and the Xcode Archive Privacy Report. Reference: https://developer.apple.com/app-store/app-privacy-details/ . “Collected” below means transmitted off device and retained by the service. Local-only HealthKit and camera processing are distinguished from manually entered server records.

| App Store category | Collected | Linked | Tracking | Purpose / evidence |
|---|---|---|---|---|
| Health | Yes | Yes | No | User-entered body measurements, limitations and analysis; health router/store |
| Fitness | Yes | Yes | No | Exercise routines, goals and workout history; health store |
| User ID | Yes | Yes | No | OIDC subject, namespaced campus identity, subscription customer ID |
| Name | Yes when entered | Yes | No | HealthUser.name profile |
| Email | Yes when entered | Yes | No | HealthUser.email profile; campus access token contents depend on IdP |
| Other User Content | Yes | Yes | No | Workout memo, goals, school selection, counselor notes and consent history |
| Purchases | Plus launch only | Yes | No | RevenueCat transaction/subscription state; Apple/Google process billing |
| Photos/videos | No automatic service collection | No | No | Local pose frames; optional user-started video recording, playback and explicit device save/system share; no automatic upload |
| HealthKit-derived steps/workouts/weight | No off-device collection | Local display | No | deviceHealth.js; explicit selection, read only, no upload path |
| Usage data | No analytics SDK configured | — | No | Security audit retains account/action metadata; disclose any additional host access logs separately |
| Diagnostics | No remote monitoring by default | — | No | Only allowlisted diagnostic events; no external adapter connected |
| Payment card data / precise location / contacts | No | — | No | No collection code |

All transmitted categories serve **App Functionality**; no advertising, tracking, broker sale or marketing profiling. Health data is not sent to RevenueCat. If a host collects IP addresses, crash reports or analytics, reassess the label before submission. Production currently prohibits external LLM mode until a separate consent release exists.

## Optional exercise video recording

The current personal Android camera screen supports filming 42 bodyweight exercises; live pose analysis/correction is limited to seven. Recording starts only when the user taps its control and captures camera video without microphone audio, skeleton overlays or spoken guidance for up to 60 seconds. The clip stays in memory for playback until the user explicitly saves or shares it. Backgrounding, leaving the screen or changing exercises stops camera tracks/analysis and discards an active recording and unexported clip.

On Android 10+, explicit save exports a plain video file to `Downloads/Synex Health`; earlier Android uses the system share sheet. Exported videos and native share-cache files are not encrypted by the app's AES-GCM health database. Completed exports remain outside that database and must be managed separately. The app does not automatically upload videos; a receiving app may retain or transmit a file the user chooses to share. Physical Android save/share behavior is not yet verified, and iOS native video export is not implemented. Confirm the shipped platform configuration and user-directed sharing disclosures before submitting store labels.

## Native SDK inventory and manifest audit

- Capacitor iOS 8.5.2: bundled Capacitor/Cordova PrivacyInfo.xcprivacy inspected. Both declare no tracking; current Capacitor core declares no required-reason API categories. App/browser/notification plugin Swift and Capgo Health Swift inspected for UserDefaults, uptime, file timestamp and disk-capacity use; no matches requiring an app reason were found in those paths.
- Capgo Health 8.11.3: HealthKit read-only integration; no clinical records entitlement. Only steps, workouts, weight requested by this release.
- RevenueCat Capacitor 13.6.0 resolves purchases-hybrid-common 19.0.0 via SPM. The hybrid package pins purchases-ios-spm 5.89.0. Its source manifest declares UserDefaults reason CA92.1, purchase history for app functionality, and no tracking (https://github.com/RevenueCat/purchases-ios/blob/5.89.0/Sources/PrivacyInfo.xcprivacy). The app associates purchases with its account ID, so the app-level label remains linked. Actual resolved archive manifests and signatures still require macOS validation.
- MediaPipe 1.0.1 executes locally in WebView; no remote model request after assets are installed.
- App manifest is included in Xcode resources; collected-data declarations cover app functionality. Purchase declaration conservatively covers Plus; remove it for a strictly Free archive only after confirming the SDK remains unconfigured and sends no data.

**EXTERNAL:** Generate and inspect the actual archive report; confirm transitive SDK manifests/signatures and required API reasons for the resolved versions. Do not invent reason codes to make validation pass. Source reference: https://developer.apple.com/support/third-party-SDK-requirements/ .
