# Mobile release

IMPLEMENTED / NOT DEVICE VERIFIED: existing Android/iOS Capacitor targets; Android applicationId/version environment values, R8 enabled and release signing required from secrets; iOS permissions, HealthKit, icon, manifest and URL scheme retained. Web build + Capacitor sync are asset validation, not native compilation.

Android environment: SYNEX_APPLICATION_ID, SYNEX_VERSION_CODE, SYNEX_VERSION_NAME, SYNEX_KEYSTORE_PATH, SYNEX_KEYSTORE_PASSWORD, SYNEX_KEY_ALIAS, SYNEX_KEY_PASSWORD. Keep keys outside the checkout. Commands: `cd frontend/android && ./gradlew assembleDebug`, then `./gradlew bundleRelease` with real signing secrets. Use Play Console Internal Testing, install the AAB-generated build, test camera/Health Connect/notifications/purchase/logout/restart and record model/OS/version.

Network cleartext is disabled in the manifest. Existing health permissions remain read-only. R8 behavior must be tested on release devices, including plugin calls. See IOS_RELEASE.md for actual Xcode archive/validate/TestFlight steps. Universal/App Links require owned HTTPS domain + Apple association/Android assetlinks files; custom callback schemes are implemented, verified universal links are NOT IMPLEMENTED until ownership files and signing fingerprints are supplied.

/health/diagnostics reports only allowlisted platform/API/auth/database/provider states. Checking availability never requests camera/health permissions. Model asset availability is not successful inference. No tokens, database URLs or health records are shown.


Status definitions: VERIFIED means a named automated/browser check passed; IMPLEMENTED / NOT DEVICE VERIFIED means code exists without physical-device evidence; EXTERNAL SETUP REQUIRED needs operator systems; NOT IMPLEMENTED means no working feature is claimed.
