# Encryption / export compliance draft

Inspected uses: HTTPS/TLS networking via OS/browser/native SDKs; Web Crypto SHA-256 PKCE and secure random state for OIDC; backend JWT signature verification and PBKDF2 review-password hashing. No custom cipher, VPN or end-to-end encrypted messaging implementation. Server cryptography is distinguished from distributed iOS binary functionality.

In App Store Connect, disclose encryption and determine whether the OS-provided/standard authentication uses qualify for documentation exemption under the actual distribution territories and resolved native SDKs. This repository does not automatically set ITSAppUsesNonExemptEncryption=false because no operator determination or final binary audit has occurred. Add that key only after completing the questionnaire and retaining the rationale. Upload documentation if required.

Reference: https://developer.apple.com/help/app-store-connect/manage-app-information/overview-of-export-compliance/ . This is a technical inventory, not a legal determination.
