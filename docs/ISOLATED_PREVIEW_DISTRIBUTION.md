# Isolated personal preview distribution

The existing public personal APK's ephemeral signing key is unavailable. Do not ask users to uninstall it. The new preview uses `com.synex.health.personal.preview`, shown as **Synex Health 검증판**, and installs alongside `com.synex.health.personal`. It has its own encrypted storage. Existing records remain in the original app until the user exports an encrypted backup and explicitly imports it. The home screen links to the new non-destructive backup inspection flow. Restore replaces the destination's records, not a merge.

This is an experimental, local-only preview. It does not satisfy real-person video accuracy or physical-device release acceptance. The production evidence gate remains unchanged.

Manually dispatch `android-personal.yml` with `isolated_preview=true`. This builds an isolated candidate and runs the browser shards and the native encrypted-profile update test. The candidate is NOT the download artifact. Before distribution, use `scripts/sign-isolated-preview.py` to apply the retained private preview key and verify:

- Isolated package and distinct app name.
- Local-only, non-release marker and bundled model checksum.
- Cryptographic APK signature against `release/personal-preview-signer.json`.
- Identical application payload before/after signing.

The key and password are retained with restrictive permissions outside Git, in the owner's cloud workspace signing directory. Never upload them as Actions artifacts or to the public download branch. The public certificate fingerprint alone is committed. Future updates must use the same retained key; missing key material must block distribution, not generate a replacement. The owner must archive it in a durable protected credential vault: workspace persistence alone is not a permanent backup. GitHub Actions secrets administration remains unavailable to the current integration (HTTP 403).

The existing personal workflow's CI-only artifacts remain non-distributable. This isolated preview path is an explicit separate-install migration, not a way to bypass the original app's signature or overwrite its data. No original records are read automatically.
