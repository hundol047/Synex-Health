# Exercise character studio

Profile links to `/health/character`. The page edits a local cosmetic preference with a live exercise scene. Saving applies the same preferences to exercise demonstrations. Unsaved changes are guarded. Storage errors show a recoverable message; invalid saved data falls back to validated defaults. Measurements, calorie inputs and body-composition comparisons are not written by this editor.

Implemented: male/female base surfaces, three face-outline presets, arbitrary hair/skin/top/bottom colors, bounded chest/hip/waist/shoulder surface adjustments, original textured materials and a Three.js toon material variant. The preview can play squat, wall push-up and shoulder-roll demonstrations. Main exercise scenes retain red muscle guidance. The editor hides that overlay to make clothing colors visible.

This is a customization implementation, not the requested high-fidelity VTuber asset set. It does not include long hair geometry, sculpted anime faces, facial expressions/tracking, VRM import, multiple garment meshes, or unrestricted body proportions. Body support and equipment fit across every customized extreme have not been certified. Surface morphs preserve all vertex heights and rig joint definitions and use a bounded range; this is not a full collision solution. No commercial reference artwork or celebrity likeness is included.

Validation: focused tests cover normalization, malformed storage, persistence separated from health data, finite bounded morphs in both profiles, surface materials and exercise playback. A WebGL browser test covers selecting a female toon character, changing hair/face/chest, saving, reloading and seeing the saved style in the exercise library without shader errors. A personal build is generated separately; the existing downloadable APK is unchanged.


## Generated head and wardrobe update

New head details are original procedural geometry: a scalp shell fitted to the selected body, projected hair locks in short/side-part/bun styles, eyebrows and layered sclera/iris/pupil/catchlight meshes. They follow the same authored head quaternion as the body. Locks are merged to keep draw calls down. No external celebrity or game mesh was redistributed. Eye color and head close-up controls are available.

Wardrobe selection includes tee/tank/long sleeves and leggings/shorts/joggers. Rest-space fragment masks produce smooth sleeve and hem boundaries rather than triangle-shaped material edges. Joggers expand the existing garment surface locally; skin is not rendered as a second intersecting shell. This is fitted clothing, not a cloth simulation or a catalog of separate high-poly garments. Shader composition preserves red exercise-region guides on top of clothing.

Validation: 20 focused tests passed; the browser flow exercised outfit variants, face close-up in realistic and toon modes, persistence and exercise-library reuse without shader errors. Both face images and wardrobe screenshots were inspected. Initial floating locks and jagged hems were corrected. Commercial-game photorealism, long flowing hair and facial motion capture are not claimed; final APK publication remains separate.


## Close-up realism review

The eye surface now has deterministic radial iris fibers, a darker limbal ring, separate upper/lower eyelid edges and restrained corneal reflection. Natural eyebrows are darker than dyed scalp hair. Scalp locks use finer, denser geometry; the scalp itself avoids anisotropic shading without UVs, which had produced a black patch. Skin microrelief was reduced from a 2 mm amplitude to 0.15 mm, with regional facial roughness, a subtle lip crease and less excessive fill/rim illumination.

Front-view review exposed a substantive placement error: added eyes sat above the original model's eyelid openings. Their centers and brows were lowered into alignment, then reviewed on both base profiles. A landmark range regression guards against restoring the old position. Browser checks capture frontal and three-quarter portraits for both body types and all short hairstyle variants. The automated checks validate finite geometry, rendering and persistence, not perceptual likeness.

No numerical realism score is reported. There is no identified real subject, calibrated reference photography, 3D scan, comparison metric or rater study, so a claim of 99.99% similarity would be unsupported. Current limitations visible in close-up include stylized short hair, generic facial anatomy, simplified skin pigmentation and absent expressive facial animation. The result is still a rendered illustrative character rather than a verified photoreal digital human.

## Fine-detail and expression pass

Hair tubes now narrow toward their tips and have a mild root-to-tip shade variation. Eyebrows use individual tapered strokes merged into two geometries, replacing the heavy continuous arcs. Skin coloration includes restrained cheek warmth and small rest-space variation. The model remains an illustrative digital character, not a scanned human.

A short blink and very small iris movement are driven exclusively by the existing demonstration phase. There is no independent animation timer: pausing demonstration playback freezes the expression. A skin-colored upper-lid surface covers the iris during closure. The character preview now offers a pose scrubber, including frames that can be reviewed with fully closed eyelids. Blink continuity, geometry finiteness and hair-tip taper are covered by regression tests. The fixed desktop preview is constrained to viewport height so expanded controls remain reachable.

Validation of this pass: 13 focused tests passed; the final browser sequence passed for male/female frontal portraits, closed eyes, and three hair variants with no shader/page errors. The six software-WebGL captures took 2.1 minutes; the test budget was raised to four minutes after the previous two-minute aggregate limit expired. Interaction and error assertions remain intact. This is not a physical-phone performance measurement. Before/after portraits and the closed-eye frame were inspected manually. Perceptual realism remains unquantified; no 99.99% claim is made.

## Skin palette and complexion-aware detail

The initial Style panel and Face/Hair panel now expose ten named cosmetic skin swatches, a visible selected mark and the existing arbitrary color picker. Selection previews immediately; Save applies the preference to exercise scenes. The presets do not classify ethnicity or medical skin type.

Lip, cheek and eyelid colors are derived from the chosen skin in linear light. Dark complexions no longer blend towards a fixed pale lip/lid color. Small skin variation is proportional to the base color. The old painted brow shading was removed because it duplicated the generated hair eyebrows; restrained socket shading is aligned to the corrected eye position.

Validation: 11 focused tests passed. A mobile-sized Chromium WebGL flow passed for preset selection, reload persistence, light/female and dark/male portraits, custom color saving and horizontal overflow, with no page/shader errors. Both portraits were visually inspected. This remains a procedural illustrative character, not a scanned photoreal human. No APK was published in this pass.

## Hair volume and eye size controls

Face/Hair offers the three existing hairstyles (short, side part, bun), a new hair-volume slider, and a new eye-size slider. Body labels the existing chest morph explicitly as chest size. Size controls offer an individual reset. Both base bodies use the same controls; these are cosmetic and do not modify body-composition records.

New eyeSize/hairVolume preferences default to zero for existing saved characters and are clamped to [-1, 1]. Eye width ranges from 85% to 115% and height from 75% to 125%. The eye group, iris, lids and blink cover share the transform. A smooth local morph changes the underlying socket opening; unlike the earlier body-only morphs, this adjusts some facial vertex heights but leaves limbs, bone lengths and support points unchanged. Hair volume changes the scalp shell, projected strands and bun size within a limited range. Chest sizing retains the existing bounded fitted-clothing morph; unrestricted proportions and cloth physics are not implemented.

Validation for these controls: nine focused tests passed, covering saved-setting migration, bounded eye morphs on both bodies, limb/support preservation, all hairstyle volume geometries and existing head/garment checks. Mobile-sized Chromium passed the new-controls flow including persistence and large-eye blink without page/shader errors. Small-eye, large-eye and closed-eyelid screenshots were inspected. This is a browser validation, not a physical-device APK test; APK distribution remains separate.

## Exercise-synchronized hair

An athletic ponytail joins short, side-part and bun styles. Original tapered strands form the tail behind the neck, with a clothing-colored hair tie. A shared standard/toon vertex deformation keeps each strand root fixed and moves free ends with the current demonstration phase. Short hair has sub-millimetre sway, side-part tips have a small sway, and ponytail ends have a bounded lateral offset below 17 mm. Phase endpoints match. Pausing, scrubbing and reduced-motion behavior follow the existing exercise progress; there is no independent hair animation clock.

This is authored secondary movement, not a spring solver or physically simulated hair. The tail is deliberately short and kept behind the head/above shoulders, but arbitrary hairstyle/body/exercise collisions are not certified. Skin, eye size, hair volume, chest and wardrobe preferences continue to use the same saved character in exercise scenes. Full game-quality hair/cloth simulation and photorealism are not claimed.

Validation: nine focused geometry/settings tests passed. The mobile-sized WebGL flow passed in realistic and toon modes, saved the ponytail, loaded it in the exercise library, and confirmed pause/phase behavior without page/shader errors. Rear-view frames at phases 0.25 and 0.75 were inspected; they show opposite tail offsets. This does not establish full collision safety across all movements or physical-phone performance.

## Reuse of character setup and loading behavior

The exercise renderer keeps a bounded in-memory cache of four recent prepared body shapes, including fixed joint weights, palm/wall/heel fits and up to eight grip surfaces per shape. Motion, skin/hair/clothing color and hairstyle changes reuse the relevant CPU setup; measurements and geometric body/clothing changes select a different entry. No rendered GPU material is shared across disposed viewers. Head detail uses at most two CPU templates per prepared body, and each viewer receives independent geometry clones.

Scalp geometry now uploads only indexed scalp vertices instead of another complete body buffer. Face-surface searches prefilter head vertices and reuse repeated query coordinates. Rendering uses one bounding-box scan and its conservative enclosing sphere, without changing the body mesh or joint paths. Automatic preview progression waits for the first 3D render, so initialization does not consume the start of the movement. A preparation message is visible until ready.

A paired local construction benchmark (seven warm samples after the initial iteration) measured median old head creation 203.57 ms, new uncached creation 95.48 ms, and cached head cloning 1.06 ms. Repeated grip setup measured 97.43 ms versus 0.037 ms for cached retrieval. These are CPU construction measurements, not end-to-end mobile loading/FPS or a real-device speed guarantee. Wrist/ankle continuity across 104 exercises/stretches and body/wall/floor regression checks passed. Initial concurrent local surface tests exceeded their time budgets; rerunning those eight checks sequentially passed without changing assertions or geometry.

Browser validation passed for three consecutive guide openings, actual ready-state autoplay, pause/scrub/reopen and saved ponytail motion. The readiness assertion waits for completion of the whole first frame (20-second software-WebGL budget), rather than only the body mesh's early onAfterRender marker. A unit regression holds the renderer-ready callback back and confirms automatic phase remains zero until released. Focused cache/playback checks: 12 passed. Personal web build passed. This does not replace physical-device startup, GPU or thermal evaluation.

The WebGL/error fallback also acknowledges readiness and explains that the simpler guide is shown. This prevents the new loading gate from freezing fallback animation on devices without 3D support. A dedicated regression verifies readiness fires once while fallback frames continue updating.

## Fitted hair and garment refinement (2026-10-30)

Actual app captures, rather than generated character concept art, exposed hair
material covering portions of the ears and a jagged fringe. Character-enabled
body geometry now keeps the ears and forehead skin-colored. A separately fitted
scalp cap ends above the ears and supports continuous swept, tapered locks.
Surface samples intersect the neutral head triangles using a temporary MeshBVH;
this avoids nearest-vertex snapping and repeated full-triangle searches. The
existing bounded head-template cache and independent viewer clones are retained.
The BVH package was already a transitive dependency and is now pinned directly
at 0.8.3 (MIT); no external likeness, scan, or texture is downloaded at runtime.

The realistic iris now has an 8.8 mm diameter, clipped to the lid aperture with
circular UVs instead of a tiny exposed circle. Eyebrows use denser tapered hairs.
Garments have bounded torso ease, rest-space fabric folds, a collar/hem/sleeve
stitch treatment, and a darker waistband. Folds are authored procedural relief,
not a cloth simulation. Lighting has a neutral warm key and cool fill. New
characters default to brown eyes, a muted blue top and dark joggers; saved color,
clothing and body preferences are not overwritten.

No body-joint trajectories or health measurements changed. The new torso ease
is zero outside its bounded torso region. A regression checks the actual fitted
body and maximum-volume side-part hair against wall push-up, wall sit and wall
hinge support planes on both body profiles throughout the motion. Hair stays
within 50,000 detail vertices and the cap within 3,000. The eyelid/iris UV shape,
light and dark complexion ear colors, cache ownership, hair motion, floor/wall
support and cosmetic size controls are covered by focused tests.

This remains a procedural exercise character. It is not as photoreal as the
user's generated reference image: facial identity, scanned skin detail, garment
construction and facial expression remain limited. No similarity percentage or
physical-phone performance improvement is asserted. The older construction
benchmarks above describe the previous hair implementation, not this refinement.

Validation of this refinement: 30 focused unit/surface checks passed, including
all eight existing floor/wall checks and the added fitted-character wall check.
Production web build passed. Three Chromium WebGL flows passed (3.6 minutes):
 male/female portraits and hairstyle changes without shader errors; mobile
 eye/hair/chest preference persistence and blink frames; and three consecutive
 guide openings with ready-gated playback, pause and scrub. These checks were
 run on the cloud browser, not a physical Android device. Actual captures were
 inspected; no generated concept image is presented as app output.

Additional browser validation passed for outfit changes (tee/long/tank and all
pants types), toon/realistic switching and sharing saved appearance with an
exercise. A final attachment correction places the bun against a sampled scalp
point and aligns the ponytail band with its root. Seven affected geometry/cache
checks were rerun successfully, and the ponytail playback/pause/persistence
browser flow passed after that correction. The final personal web build passed.
