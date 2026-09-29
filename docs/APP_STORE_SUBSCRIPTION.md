# Synex Plus subscription setup

Free Launch: LAUNCH_MODE=free, BILLING_MODE=disabled, VITE_LAUNCH_MODE=free. No fake prices or checkout; Free records, basic 3D, numeric comparison, routines, motion and logs remain usable.

Plus Launch requires real products, RevenueCat credentials, IAP_SANDBOX_VERIFIED=true after actual verification, and matching server/frontend launch modes. Entitlement defaults to `plus`. Server REVENUECAT_PRODUCTS is the authoritative allowlist. Suggested IDs (not created products): `<registered.bundle>.plus.monthly`, optional `<registered.bundle>.plus.yearly`; one subscription group “Synex Plus”. Display name “Synex Plus”; description “3D before/after, pose assistance and progress reports”. Configure monthly/annual durations in App Store Connect; localized prices must come from StoreKit, never source constants.

RevenueCat: map both products to entitlement plus and a current offering with MONTHLY/ANNUAL packages. iOS public SDK key is VITE_REVENUECAT_IOS_KEY; server secret/webhook secrets never belong in VITE variables. Backend verifies customer ID and purchase expiry with RevenueCat. Refund and expiry remove server access. Billing retry does not create indefinite access. Cancellation leaves entitlement only until verified expiration. Offline verification can fail closed; do not promise offline premium access.

Purchase/restore buttons call the native SDK then server sync. Account changes use logIn; logout/deletion calls logOut and clears local identity. Do not transfer entitlements between unrelated accounts without reviewing RevenueCat transfer settings. Test two accounts, cancelled purchase, restore, refund, billing retry, expiry, airplane mode, server timeout and app resume.

Privacy and Terms links appear on the paywall; Apple Standard EULA is the initial license link. Separate EULA requires operator review and matching App Store Connect configuration. Review screenshots and subscription localization must be uploaded for each submitted product. Real sandbox execution remains EXTERNAL.
