# Gym coaching and automatic recovery

Implementation status: source implementation and automated tests; no physical-phone validation or new APK publication is claimed by this document.

## Coaching

The 74 catalog exercises (42 bodyweight, 32 equipment) are available in camera routes and the library. `coachingCatalog.js` defines each exercise's required visible joints, allowed views, setup, observed measurements, intended effort and limitations. Existing specialized analyzers remain; additional exercises use `CatalogPoseAnalyzer` with aspect-corrected 2D measurements. Hidden/out-of-frame joints, wrong views, wrong setup and discontinuous timestamps suppress corrections and reset partial repetitions. Only exercises with a configured, fully observed start–endpoint–return sequence count repetitions. Gait, scapular movement, rotation proxies and other observation-only exercises never pretend to count repetitions.

Feedback reports the actual observed angles/relative distances and the corresponding exercise cue. A sustained correction can temporarily interrupt spoken demo counts; routine observations do not repeatedly interrupt counts. Muscle effort text is instructional, not measured activation. Equipment load, bar path, spinal curvature, depth and tissue fatigue are not measured. These are product heuristics, not a validated form score. Synthetic rig projections verify contracts and invariants, not real-video accuracy.

Camera and recording remain explicit opt-ins, with no microphone or video upload. Switching exercises or leaving the app stops capture/analysis. Standalone timed sessions stop the camera before showing results. Embedded manual exercise previews do not start a second recovery session or display a duplicate exercise-skip button.

## Skip and calories

Each exercise can be skipped, including during rest or pause. Skipping advances past all remaining sets and rest, preserves paused status, and finishes the session when the last exercise is skipped. It does not create completed workout records. Previously entered manual data stays in the draft workflow. Resuming/restarting a completed tempo session resets skipped indexes and demonstration-time counters.

Results appear after guided/manual completion and standalone camera/library tempo completion. Users confirm actual active minutes; demonstration time is only a hint. Rest, preparation and pause are not added. Existing `actual_minutes` includes rest and therefore is never treated as active duration; only explicit performed seconds or timed sets can prefill active minutes. Skipped exercises start at zero and can be adjusted for a partially performed exercise.

Gross estimated kcal = MET × 3.5 × weight kg ÷ 200 × active minutes. Additional activity kcal uses MET−1. Activity-class estimates were checked against the official **2024 Adult Compendium** pages on 2026-10-19: [conditioning](https://pacompendium.com/conditioning-exercise/), [walking](https://pacompendium.com/walking/), [bicycling](https://pacompendium.com/bicycling/). Defaults: varied resistance 3.5 (02054), moderate calisthenics 3.8 (02022), mild stretching 2.3 (02101), 2.5 mph level walking 3.0 (17170), 3.5–3.9 mph brisk walking 4.8 (17200), 25–30 W stationary cycling 3.5 (01210), moderate elliptical 5.0 (02048). Strength-only choices include vigorous resistance 6.0 (02050), light calisthenics 2.8 (02024), high-intensity bodyweight resistance 6.5 (02057); vigorous elliptical is 9.0 (02049). Walking options explicitly show pace. Stretching does not offer an unrelated vigorous lifting MET. These remain activity-class approximations, not measured individual expenditure.

Skeletal muscle mass is displayed as body-composition context. It is deliberately not a fabricated kcal multiplier. Calculation-only edits do not automatically write workout history.

## Automatic stretching

Thirty distinct, locally rendered stretch/mobility motions are separate from the 74 training exercises. Left/right sides are not counted as separate exercises. Recommendation selects four or five unique movements using exercised and related muscle regions, favoring variety. All 74 exercise profiles have at least four relevant choices. No exercise performed means no automatic recovery; recorded pain stops automatic stretching.

At workout completion the recommendation starts automatically: 5 seconds to prepare, 3 seconds to enter, 20 seconds of gentle hold/movement, 3 seconds to release, then the opposite side for bilateral movements. A 5-second transition precedes each new stretch. Pause, continue, skip, stop, and replacement from the full 30-item list remain available. Backgrounding and timer stalls pause progression. An optional voice reads the stretch name, cue and final countdown. Recovery time never silently becomes exercise calories.

`stretchRig.js` preserves fixed bone lengths and supplies distinct poses, with floor-aware camera presentation. The CPU mesh audit inspected actual deformed garment geometry; it is not evidence of browser layout, mobile rendering speed or clinical technique accuracy. WebGL failure uses a joint diagram of the same motion. The guidance avoids promises that stretching measures fatigue or prevents soreness.

## Validation and release requirements

Tests cover catalog completeness, observed advice, occlusion/view/frame-gap suppression, repetition continuity, speech priority, skip/no-save behavior, calorie calculations, 30 distinct fixed-length rigs, automatic recovery transitions, pause/background and pain/all-skipped exclusion. Existing suite checks remain enabled.

Browser regression scenarios are in `frontend/e2e-local/gym-recovery.spec.js`; existing camera/library scenarios now assert 74-exercise coverage. Initial browser/network runs were blocked by an approval-service capacity failure; that service subsequently recovered. An initial sandbox Android attempt failed to initialize its local network interface (`Could not determine a usable wildcard IP`). Final run results are recorded in the release verification artifact rather than inferred from those failed attempts. The prepared local build helper is `/workspace/scratch/build_synex_recovery.py`, targeting version `1.10.recovery`, code `2026101901`; the helper alone is not a successful build artifact.

Before publishing: rerun fresh source-commit tests, build the personal/offline web bundle and APK, run real browser scenarios, check package/version/signature and asset identity, publish new immutable download files, then fetch the public APK and decode/check the QR. Do not reuse an old APK, QR or test report as evidence for this change. A real phone camera/TTS/installation test is additionally needed for device-level claims.
