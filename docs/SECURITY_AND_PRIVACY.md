# Security and privacy upgrade

IMPLEMENTED: existing OIDC ownership/role guards, production demo refusal, bounded requests, same-origin controls and least-privilege health access. Account deletion removes measurements, routines/history, workouts, pose sessions, profile, preferences, billing mapping, consent and session tokens. Audit identity is replaced with a random deletion label and detail stripped; minimal account tombstone remains to reject old tokens. External school identity and store subscription cancellation remain external actions.

Health values and pose frames are not emitted in diagnostics/logs. No raw photos are stored. Browser offline health cache and workout queue are memory-only, scoped to the active app session, cleared on logout/account changes/deletion; failed writes remain pending until retry. App termination discards them and the UI states this. A durable encrypted offline store and conflict-version resolution are NOT IMPLEMENTED.

VERIFIED: existing ownership/consent/deletion tests plus adaptive-history purge and cache/queue tests. Native token unregistration, store logout and background camera shutdown still require device testing. Operator retention schedule, hosting logs, backups and incident process must be documented before deployment. Review APP_STORE_PRIVACY.md and actual archive manifest reports after final dependencies.


Status definitions: VERIFIED means a named automated/browser check passed; IMPLEMENTED / NOT DEVICE VERIFIED means code exists without physical-device evidence; EXTERNAL SETUP REQUIRED needs operator systems; NOT IMPLEMENTED means no working feature is claimed.
