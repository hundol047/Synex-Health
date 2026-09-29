# App Review notes — deployment-specific fields required

Synex Health is a wellness and fitness record app. It visualizes user-entered body composition, suggests rule-based routines and shows clothed exercise demonstrations. It does not diagnose or provide a clinical anatomical reconstruction. Pose estimation is on-device and not a precision angle measurement.

Reviewer login: use the visible **App Review · 심사 계정** form. Supply the real review username/password in App Store Connect's protected review credentials fields, not this repository. Server must explicitly enable APP_REVIEW_MODE and store a PBKDF2-SHA256 password hash (600,000 iterations), random salt and username. Login is rate limited. Review account has a fixed isolated identity and only authored synthetic measurements; never copy real users. It receives explicitly identified review access to premium demonstrations; this is not a store purchase or general production bypass.

Steps: complete onboarding → review login → Body → Comparison / 이전 비교 → Routine / generate → exercise motion → Profile / Pose Coach → Progress → Privacy. Two sample measurements are seeded only for the review identity. Camera and health permissions are optional. On-device pose needs camera access and adequate lighting. Device health can return no data without blocking core features.

Free launch: purchase unavailable, core records and routine/motion features available. Plus launch: explain real product IDs and sandbox purchase/restore instructions. Only enable after actual sandbox verification. No external purchase links are offered.

Account deletion is in Profile → Privacy. It removes server data, invalidates sessions, clears local state and signs out RevenueCat. Subscriptions must be cancelled separately through the store. Deleting the review account also tombstones it; reset the dedicated review environment through an operator-reviewed data lifecycle process before another reviewer session. Do not silently resurrect it.

External fields: reviewer contact name/phone/email, deployed API and support URLs, exact build, account credentials, any institution test instructions. No real institution integration is necessary for manual-entry review. Disable remote push and external provider features if unavailable.
