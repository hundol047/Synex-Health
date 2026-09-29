# iOS release procedure

## Toolchain and environment
Apple requires Xcode 26+ and iOS 26 SDK+ for uploads since 2026-04-28: https://developer.apple.com/news/upcoming-requirements/ . Use a current stable supported Xcode on macOS. Deployment target is iOS 15, matching inspected Capacitor/Capgo/RevenueCat wrapper minimums; this is distinct from the build SDK requirement. Resolve transitive packages before confirming compatibility.

1. Copy frontend/.env.release.example into frontend/.env.production.local and fill actual deployment values. VITE_RELEASE_BUILD=true; VITE_API_BASE is the API origin without `/api`; VITE_APP_SCHEME equals registered IOS_BUNDLE_ID. Never put server secrets in VITE variables. Set legal operator/contact/retention and public legal/support URLs.
2. Backend uses .env.release.example with APP_ENV=production, AUTH_MODE=oidc, PostgreSQL, explicit CORS including capacitor://localhost and the app web origin. Free launch: LAUNCH_MODE=free and BILLING_MODE=disabled. Deploy with trusted reverse-proxy TLS, bounded body limit and a shared rate limiter; disable uvicorn access logs (`--no-access-log`) to avoid query logging.
3. From repository root:

```sh
cd frontend
npm ci
npm run pose:setup
npm test
npm run native:configure
npm run build:release
npx cap sync
open ios/App/App.xcodeproj
```

The repository uses Swift Package Manager and an Xcode project, not a CocoaPods workspace. Pose assets must be installed **before** build/sync. Native configure writes the supplied registered bundle ID and optional APP_VERSION/APP_BUILD; inspect its diff. Align Android applicationId when choosing a separate Android ID.

4. Select App target → Signing & Capabilities → actual developer Team, automatic or operator-controlled provisioning. Confirm registered bundle identifier, version/build and HealthKit read capability. No clinical records entitlement. Remote push is release-disabled until APNs/FCM token lifecycle is implemented and verified.
5. Confirm icon, static launch image, camera and health usage strings, app PrivacyInfo.xcprivacy, transitive SDK manifests and App Privacy responses. Operator determines encryption declarations.
6. Resolve Swift packages and perform unsigned compile validation:

```sh
xcodebuild -resolvePackageDependencies -project ios/App/App.xcodeproj -scheme App
xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Release -destination 'generic/platform=iOS' CODE_SIGNING_ALLOWED=NO build
```

7. Select Any iOS Device / Release, Product → Archive. Or use `xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Release -destination 'generic/platform=iOS' -archivePath build/SynexHealth.xcarchive archive` with real signing configured.
8. Organizer → Validate App. Generate Privacy Report and compare it with docs/APP_STORE_PRIVACY.md; fix actual SDK discrepancies. Upload to App Store Connect only after validation.
9. Create the App Store Connect app for the same bundle ID, complete operator/legal/support/review fields and metadata. Free mode does not need fabricated products. Plus needs real products and sandbox purchase/restore testing.
10. TestFlight internal test → physical-device checklist below → external beta review if needed → final screenshots and age/privacy/export answers → App Review submission. Submission/upload is a separate action; no upload has been performed from this Linux environment.

## Physical iPhone checklist — all remain unverified until executed

Record device/iOS/build/tester/date/result for each: fresh install; seven-step onboarding; login/cancel/expiry/relogin/logout; reviewer access; deletion and blocked auto-recreation; male/female/neutral avatars; sportswear front/back/side/45° throughout all 44 motions; touch rotation/pinch; full-body framing; Before/After sync; clipping; camera allowed/denied; all eight pose modes with real movement and low confidence; camera cleanup after navigation/background/stop; HealthKit denied/partial/no data; local notification permission/cancel; airplane mode/errors/retry; background/resume; purchase/restore/cancel/expiry/refund/account switch; deletion while subscribed; large text/VoiceOver/contrast; landscape/tablet; low-memory re-entry. Light theme is supported; dark theme is not claimed.

## Android

JDK 21, Android SDK 36, minSdk 26, targetSdk 36. Run `npx cap sync android`, then `cd android && ./gradlew assembleDebug` (Windows: gradlew.bat). Supply signing only through secure local/CI secrets for a release bundle. Verify Health Connect, camera, permissions, local notifications and 3D on physical Android.

## PostgreSQL operations

Use a dedicated database and separate health_auth/health_audit schemas. Before workers, run `python scripts/migrate-health-db.py` once in a maintenance deployment. Run `SYNEX_TEST_DATABASE=true DATABASE_URL=... python scripts/verify-postgres.py` only against a disposable database. Additive initialization does not transfer SQLite data. Back up with `pg_dump --format=custom --file=backup.dump "$PGURL"`; restore with `pg_restore --dbname="$RESTORE_PGURL" --no-owner backup.dump` to an isolated target, validate record counts and access isolation before promotion. Encrypt backup storage and enforce operator-defined retention. Keep DB URLs in environment variables, not shell history or logs. Rollback a failed migration transaction; production data rollback uses a tested backup and the matching app version. Live migration/concurrent-write/recovery verification is still a release gate.

OIDC access/refresh tokens remain in memory, not persistent browser storage. If the IdP supports registered offline_access, enable VITE_OIDC_REFRESH=true; a refresh token can renew a 401 response once. Otherwise expiry returns to login. App restarts require login. Logout revokes the current server session/bearer token for this service and clears local refresh credentials; campus-wide IdP logout is separate.
