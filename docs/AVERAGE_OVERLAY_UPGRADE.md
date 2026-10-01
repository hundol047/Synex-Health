# Muscle Average Overlay — verification record

Base: `9d1c649` (2026-10-01). Review branch: `codex/muscle-average-overlay`.

This report uses VERIFIED only for named automated/browser evidence. It does not certify body reconstruction, physical devices, clinical validity, or production readiness.

## Implemented

**IMPLEMENTED / NOT DEVICE VERIFIED** — Average Compare, My Body, Previous Compare, Left/Right, Muscle/Fat, and separate Range View. Existing slice/layer controls, previous comparison, SVG exercise previews and 12 pose analyzers remain available.

Comparison values come from one coherent cohort (same dataset, source, publication, population, sample size, sex, bounds, version and effective date). The selected cohort is saved per account. A changed selection marks prior routine explanations for review. Units are kg and differences are always selected measurement minus comparison. No segment sum substitutes for a skeletal-muscle total.

## 3D Overlay Verification

**VERIFIED (unit tests)** — independent deformation buffers, equal vertical/pose coordinates, bounded finite coordinates, interpolation endpoints, missing/zero-denominator handling, kg/% calculations, shared viewer props, layer visibility and selected regions.

**VERIFIED (Chromium desktop and 390px browser tests)** — two actual WebGL surfaces in one viewer, opacity changes, ghost wireframe, pointer selection of the right arm, rotation/zoom/reset, preserved Range View, distinct regional vertex depths for the 7.1kg / 7.8kg fixture, and missing-reference fallback. Saved screenshots were visually inspected.

**IMPLEMENTED / NOT DEVICE VERIFIED** — physical touch/pinch/double-tap behavior and device performance. Browser viewport emulation is not a physical Android/iOS test.

Both surfaces use one authored base mesh, pose, height scale and camera. Deltoid/upper-arm/forearm, glute/thigh/calf, chest/back/abdomen envelopes are artistic deformation zones driven by the five measured regions. They do not imply individual-muscle measurements. A bounded monotonic log transfer maps mass to visual thickness; mesh volume is not calibrated tissue volume. Missing regions are invisible on the reference surface. Interpolation requires all five paired regions.

**NOT IMPLEMENTED** — a separate silhouette-only outline renderer. Ghost wireframe is available and is the lower-cost default.

## Reference Data Status

**VERIFIED (backend tests)** — cohort matching, direction and percentage math, no fabricated averages, missing demographics, coherent grouping, duplicate-region rejection, zero reference denominator, explicit-only totals, production demo exclusion, metadata validation, owned reference selection, and consistent progress/body-map responses.

**EXTERNAL DATA REQUIRED** — real cohort datasets with licensed source/publication, sample size, sex, age/height/BMI/weight bounds where supported, version and effective date. Existing demo bands remain visibly labeled and are never eligible in production. Their missing publication/sample size remains “미등록”; no sample count is invented.

Reference fields extend the existing JSON payload; no schema migration is required for those fields. Existing `/api/admin/reference-ranges` registers rows. All rows for one cohort must have identical metadata and unique regions. `skeletal_muscle_mean` and `body_fat_mean` are explicit optional totals. Conflicting repeated totals are withheld. `PUT /api/body-map/reference-group` selects an eligible group or `null` for automatic matching.

## Routine UX

**VERIFIED (unit tests)** — inline SVG preview, visible instructions and reasons, relevant reference explanations without increasing sets solely because of a mean difference, one-exercise workout flow, actual repetitions/RPE/pain persistence contract, and pain-stop summary.

**IMPLEMENTED / NOT DEVICE VERIFIED** — related saved-routine links from selected body regions, optional voice/vibration (default off), set completion and foreground rest countdown, daily recorded totals. No background push permission is requested. Existing list logging remains available. Offline entries are explicitly pending; closing the app can lose the existing session-only queue.

## Pose AI

**VERIFIED (synthetic tests)** — stable-start and bottom-dwell hysteresis, eccentric/bottom/concentric/completion states, tracking-loss reset, and suppression of low-confidence feedback. Twelve analyzers remain registered. Exercise-specific return directions support presses/raises/curls as well as squats.

**IMPLEMENTED / NOT DEVICE VERIFIED** — setup distance/direction instructions and separate ROM, repetition time, left/right difference, confidence displays. These are observations, not “good/bad” scores or validated accuracy estimates. Camera-angle/occlusion errors remain possible.

## Mobile

**IMPLEMENTED / NOT DEVICE VERIFIED** — responsive comparison controls/table, touch OrbitControls, double-tap reset, and capped overlay DPR. Android/iOS asset synchronization is distinct from native compilation, device testing or store submission.

## Performance

**IMPLEMENTED / NOT DEVICE VERIFIED** — demand rendering, hidden-document pause, memoized deformation, shared CPU topology, independent GPU index ownership to avoid layer-disposal corruption, geometry cleanup, no contact-shadow pass for overlays, and DPR capped at 1.25. Production diagnostic UI excludes GPU fingerprint fields. Development diagnostics report renderer, layer count, vertices and demand-frame samples; these samples are not a device FPS benchmark.

CPU benchmark: `node frontend/scripts/benchmark-overlay.mjs` measures two deformation buffers after warmup, reporting median/p95, vertex count and position-buffer bytes. It does not measure browser/GPU/device FPS.

**NOT IMPLEMENTED** — automatic low-FPS device classification and physical low-end Android benchmarking. Default ghost wireframe and manual layer toggles provide the economical viewing path. The existing large human-mesh/Three bundle remains a performance risk.

## Tests

- Backend: **93 passed** on the full local run; an additional changed-reference/routine-review regression passed in the focused suite. Final CI includes all **94 tests**.
- Frontend: **41 passed** in the full local run. Includes the existing regression suite and new overlay/workout tests.
- Pose model installation, ordinary optimized `npm run build`, and `npx cap sync`: passed locally.
- Browser: local Chromium could not start because this execution environment rejects required sockets (`Operation not permitted`). Remote Chromium tests **3 passed**, including WebGL interaction, desktop/390px, fixture volume direction, reference-unavailable rendering, inline routine previews, persisted workout feedback, next-exercise progression and pain-stop summary. Screenshots were downloaded and inspected.
- GitHub Actions backend, frontend, PostgreSQL and browser jobs all passed on [run 36873476783](https://github.com/hundol047/Synex-Health/actions/runs/36873476783). Final follow-up adds mobile tooltip spacing, fat/interpolation checks and the changed-reference regression; its check results are visible on PR #1.
- Release-specific `build:release` requires real deployment URLs, operator metadata, OIDC and bundle identifiers. Ordinary bundle success does not satisfy those external release gates.

## External Requirements

**EXTERNAL DATA REQUIRED** — real reference populations and production integration/configuration. Physical Android/iOS devices and qualified movement review are required before device/clinical claims. Existing school/device/RevenueCat/SSO integrations retain their documented external requirements.

## Remaining Risks

**IMPLEMENTED / NOT DEVICE VERIFIED** — visual interpolation is illustrative, not a prediction. Segmental lean mass includes more than muscle; skin-shaped envelopes do not locate anatomical muscle tissue. Large shape differences are bounded and must be read from numerical kg/% values. No physical-device crash-free or calibrated motion-accuracy claim is made.
