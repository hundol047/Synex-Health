# Verification

Source: 04a2a262f8097b6f9f09e31a425a664e92c06c53

- Frontend suite: 268 passed; final geometry/boundary checks also passed.
- Backend suite: 162 passed, plus 2 new measurement schema checks.
- Personal Playwright: 8 passed; final composition/framing checks passed.
- Existing regional-overlay Playwright: 2 passed.
- Production personal browser: real WebGL mannequin visible, no API or external requests, no page errors; controls work with browser networking disabled after load.
- Android Gradle: assembleDebug succeeded.
- APK ID: com.synex.health.personal.storagefix
- Version: 1.2.mannequin / 2026100802
- Label: Synex Health 수정판
- APK size: 33155085 bytes
- SHA-256: ad64622a43fb71789a6507d84a08754dad0a792b37900e12f067bd73f08281a9
- Signing certificate SHA-256: 35bc683c5c8e45464c100dad5cafa8d8c0af6806dd39370030020cc51a727d35 (same as existing storagefix/bodyweight update).
- All 196 built web files byte-match packaged APK assets.
- Local-only marker and connect-src self verified; camera permission and secure-storage plugin present.
- Bundled official pose model SHA-256: 59929e1d1ee95287735ddd833b19cf4ac46d29bc7afddbbf6753c459690d574a.
- QR independently decoded to the exact direct APK download URL.

No physical Android-device behavior or anatomical reconstruction accuracy is claimed. See docs/PERSONAL_MANNEQUIN.md for source verification depth and population/method limits.
