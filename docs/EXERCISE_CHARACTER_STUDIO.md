# Exercise character studio

Profile links to `/health/character`. The page edits a local cosmetic preference with a live exercise scene. Saving applies the same preferences to exercise demonstrations. Unsaved changes are guarded. Storage errors show a recoverable message; invalid saved data falls back to validated defaults. Measurements, calorie inputs and body-composition comparisons are not written by this editor.

Implemented: male/female base surfaces, four face-outline presets, arbitrary hair/skin/top/bottom colors, bounded chest/hip/waist/shoulder surface adjustments, original textured materials and a Three.js toon material variant. The preview can play squat, wall push-up and shoulder-roll demonstrations. Main exercise scenes retain red muscle guidance. The editor hides that overlay to make clothing colors visible.

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

## Facial surface and visible eye color (2026-10-30)

The earlier flat skin surface still looked like a mannequin in actual app
captures. The character now uses bundled MakeHuman CC0 facial texture detail
aligned to the existing hm08 UV topology. The deterministic generation script
checks the exact shipped triangle indices before producing UVs; geometry,
health measurements and joint trajectories are unchanged. The source files,
fixed revisions, hashes and licensing are documented in
`frontend/src/health/components/character/assets/README.md`.

The cropped atlases are approximately 650 KiB together. A cheek-reference color
normalizes their color detail to the user's selected skin tone; the original
asset name does not classify or infer the user's ethnicity. Alpha encodes
quantized, estimated microrelief and is never used as transparency. This is an
approximation derived from diffuse imagery, not measured displacement or a
clinical facial reconstruction. Loader-cached textures are shared across
viewers and are deliberately excluded from per-viewer disposal.

Eyes now have a larger clipped iris, lower corneal glare, a small key-light
reflection that stays behind the closed lid, thin upper lashes and a slightly
relaxed lid position. Seven named eye colors plus the custom picker persist in
the existing character preference. Face zoom has a quick palette next to the
preview so changing colors does not require leaving the face view. The portrait
camera's zoom was previously clamped by the full-body OrbitControls minimum
distance; face mode now has its own near/far limits.

A new natural-wave hairstyle uses swept, thin ribbon sections, softened
anisotropic highlights and narrower rear volume. New characters use that style;
existing saved styles remain valid. Fine eyebrow strokes replace the regular
hook-like rows. Phase-driven blink and hair motion still pause with the demo.

An initial maximum-volume female wave-hair regression found about 10 mm of
wall-sit overlap. Rear volume was reduced while retaining front/crown volume;
the unchanged wall-clearance assertion then passed for both bodies and both
side-part/wave styles. Focused geometry, texture ownership, color preference,
UV, eye, cache and hair checks: 23 passed. Final personal web build passed.

The character is still an illustrative real-time game-style human, not a scan
of the user or a match to the generated reference photograph. Facial animation,
clothing simulation and scanned full-body skin detail remain limited. No
photorealism percentage, real-phone GPU/thermal result or new APK publication
is implied by browser captures.

Browser review confirmed 169 pixels changing from brown toward blue in the
actual iris region at a 485×440 portrait viewport, not merely a saved color hex.
It also exposed two issues: the skin-reload test asserted controls while the
route was still loading, and the first library preview paused on a stale
zero-size IntersectionObserver event after a texture-related Suspense hide.
The reload test now awaits the existing renderer-ready signal. Playback rebinds
its observer when the DOM ref returns and refreshes zero-size observations when
layout has already returned, while retaining pause on genuine viewport exit.
A regression distinguishes those cases. Sixteen affected playback/head/contact
checks passed after the correction. Blink review also prompted flattened closed
lid edges and a darker lid surface instead of two intersecting open-lid arcs.

Final browser run: all four scenarios passed (eye-color pixels/persistence,
head/style rendering, complexion persistence, and three consecutive guide opens
with autoplay). Switching body variants initially revealed a second texture
suspension which hid the entire route. Both small face atlases now load together,
and a local Suspense boundary confines loading to the viewer. The eye scenario
also asserts that the character settings heading remains visible after a switch.

Visual inspection of the closed-eye capture found white corner slivers even
though shader checks passed. The lid now covers the globe's elliptical outline
in both styles, with a slightly raised compressed crease/lash line. A geometric
regression checks coverage at the corners. Eighteen focused checks and the
personal production build passed after that final correction. Browser checks
use Chromium software WebGL, not a physical phone or APK validation.


## Female reference-directed refinement

The user specified a commercial-game female character image as the minimum
visual target. That target has **not** been demonstrated by the present model.
The implemented improvements are a female preview preset, a refined nose/jaw
outline, restrained lip tint, clearer lash roots, and three authored textured
short hairstyles. Existing skin and health data remain unchanged by the preset.
Choosing a female body from the default wave hairstyle selects the new side-swept short
style; explicitly selected other hairstyles remain available. The generic facial
mesh, procedural eye/closed-lid surfaces, limited expressions and fitted garments
still differ substantially from a professionally authored game character.

The side-swept short style, layered and classic bobs use bundled CC0 MakeHuman graphical data; source
revision, licensing explanation and reproducible conversion are in the assets
README and `scripts/build-character-hair.py`. Fitting follows the selected head;
helper vertices omitted from the body mesh are reconstructed against nearby
retained head vertices. Original texture opacity preserves hair strands, while
grayscale detail preserves cosmetic hair-color controls. Rear bulk is compressed
only beyond the back of the scalp to preserve support-wall clearance. These
hair cards replace the procedural locks only for the three selected styles.

The initial fitting regression exposed rear overlap for both body profiles at
maximum hair volume; the same positive-clearance assertions pass after the
rear-volume correction. Wall push-ups, wall sits and wall hinges were sampled
at five phases for both profiles and five styles, with no relaxed tolerances.
Seven affected contact/texture/material checks and the personal build passed
after the final correction. This is not certification of arbitrary collisions
or parity with the user's visual reference; no new APK is implied.

The female default preset was subsequently changed to the authored side-swept
short style so the eyes remain visible; the two bob styles remain selectable.
All 24 final geometry, proportion, hair-motion and support checks passed. The
head-detail checks now report each body/style pair separately and check the
shared catalog head rotations once. The previous single combined case exceeded
30 seconds after adding styles; no geometric assertion or clearance tolerance
was removed. The personal build also passed. The prior browser run passed all
three eye/persistence, female styling/exercise and repeated-autoplay scenarios.

The final side-swept preset passed its mobile DPR-2 browser flow (persistence,
hair switching, blink and wall-push application). Visual review then raised the
front fringe above the eyebrow line; a per-profile regression now checks that
front hair vertices do not cover the eye region. All 19 affected head/support
checks and the final personal build passed. Screenshot helpers center the canvas
before capture so the fixed navigation does not obscure a portrait.

A local fringe lift produced an angular fold in the low-density hair cards on
close-up review. It was replaced with uniform vertical shortening about the
crown, preserving the authored curves and avoiding a flattened cut line. Eye
clearance and support assertions still pass (19 checks). Hair normals now use
the original connected mesh before UV-seam duplication, so texture islands do
not introduce hard lighting seams. All 18 head/style checks and the personal
build passed after that correction. The reference's facial/expressive quality
is still not met; the captures are implementation evidence, not a likeness score.


## Adult portrait structure and eye visibility (2026-10-30)

The refined female preset now applies a bundled CC0 head-only graphic target,
with independently normalized source heights and preserved body/support topology.
It selects a face-framing medium hairstyle; previous saved hairstyles remain
valid. The new hair retains scalp roots and bends shortened ends inward rather
than compressing the whole wig. Source hashes and conversion commands are in
the asset README. This does not reproduce a named person's face.

The eye now has a curved white surface and finely tessellated iris/pupil with
circular UVs. Two actual oblique-view defects were found during screenshot
review: a coarse iris fan intersected the convex white surface, and socket
probes hit the back of the eye cavity instead of the outer eyelid. Dense curved
surfaces and outer-lid probes fix those defects. Geometric ray checks cover iris
visibility from the front and near-side oblique views for both body profiles.
The pupil stays dark rather than reflecting the whole environment as white.
Realistic blinking deforms the existing textured eyelid skin; the toon style
retains its separate cover. Eyebrows follow the actual face surface, with lower,
shorter tapered strands. Portrait-only lighting reduces washed-out detail.

Validation: 39 focused checks across eight files passed; after the final eyebrow
adjustment all 22 head/detail checks passed again. These include bounded head
morphs, unchanged support/body vertices, eye visibility, blink locality, saved
character normalization, finite catalog head rotations and wall clearance. The
personal production build passed (existing bundle-size/directive warnings).

The current generic face, low-density hair cards, expression range and garment
construction still do not meet the user's commercial-game reference. Browser
captures are implementation evidence, not professional asset-quality approval
or physical-phone performance measurements. No new APK was published here.


The mobile DPR-2 browser flow passed in isolation (2.7 minutes): preset, retained
skin setting, save/reload, hair changes, blink and wall-push application, without
shader/page errors or horizontal overflow. Its first run overlapped CPU-heavy
unit workers and exceeded the 30-second initial-render wait; no assertion or
timeout was relaxed for the successful isolated run.

A subsequent screenshot comparison exposed an atlas initialization defect:
`useTexture` eagerly uploaded inactive face/hair textures before their color
space was configured. Changing only the selected texture's `colorSpace` later
could retain its old GPU format. Every bundled atlas is now initialized as sRGB
and marked for upload when that configuration changes. The browser regression
compares actual forehead RGB means before and after saving/reloading the female
preset, using identical view/pose/lighting and a five-channel-level tolerance.

The final color-regression/mobile flow passed after that correction. The sampled
forehead RGB means were identical before and after reload (maximum channel
difference 0.0/255). Final captures include the restored front view, blink,
alternative hair and wall push-up. The personal build passed again. These
checks do not establish reference-quality likeness or physical-device readiness.

## New portrait assets and softer surface construction (2026-10-31)

The previous rendering remained visibly below the user's realistic character
reference. This revision replaces the medium hairstyle source and the female
face atlas, rather than presenting a generated concept image as app output.

- The medium style keeps its saved `sleek` identifier but uses Elvaerwyn's
  Short Daisy Hair, with its authored linear normal map. The CC-BY source,
  modifications and attribution link are recorded in the assets README and
  exposed under 캐릭터 에셋 출처. Existing chosen colors/settings remain valid.
- All four textured styles receive one Loop subdivision step on connected
  topology while preserving UV islands. Head-dependent positions are recomputed;
  only immutable topology is cached. Normal/tangent data follow the same surface.
  Medium front layers expand smoothly around the eyes; scalp coverage is limited
  to avoid a straight dark band across the forehead. The same wall-clearance
  constraints still apply after fitting.
- The female face atlas now uses OnlyTheGhosts' CC0 natural skin source. Its
  head crop, reference color and source hash are reproducible with the existing
  atlas tool. Refined-female diffuse contrast reduces baked dark eye/cheek
  markings while retaining the separate microrelief channel. Normal textures
  stay linear; color atlases remain sRGB across body/style switches and reloads.
- Seventeen separate official graphic targets refine nose, lips, jaw and eye
  bags. The previous generic nose pinch is disabled for the sculpted female
  profile to avoid double application. Early visual review rejected an overly
  pinched nose and reduced the combined feature weights.

Thirty-seven focused checks passed across seven files, including head-only
changes, eye visibility, shared texture ownership, UV-seam continuity, head
refitting, and support-wall clearance. An additional eye-area fringe assertion
passed with all 22 head/detail cases. The personal production build passed.

These are still generic articulated assets. The work does not establish visual
parity with the named commercial-game characters, a celebrity likeness score,
or physical-phone performance. No new APK is implied by this source update.

The final mobile DPR-2 browser flow passed in 2.9 minutes, including front and
oblique captures, saved preset restoration, skin-color pixel comparison,
closed-eye rendering, hairstyle switching and wall-push application. Sampled
forehead RGB means were identical before and after reload (maximum difference
0.0/255). No page/shader errors or horizontal overflow were reported. Visual
captures were reviewed; the remaining generic facial styling is not presented
as parity with the reference.

## Scalp parting and facial comfort correction (2026-10-31)

The medium hairstyle's central triangular opening exposed skin because the old
cap selected whole head triangles. A fitted root surface now samples the outer
scalp, follows a curved hairline, and feathers its edge. A one-micrometer ray
origin offset avoids the duplicated sagittal seam; otherwise even an outermost
intersection could put the center of the cap inside the head. Fine root fibers
bridge the authored locks. An intermediate broad cap hid the hole but painted
the forehead; that version was rejected during screenshot review. Regression
checks require both opaque root coverage and a preserved visible forehead.

The female refined head now uses two CC0 closed-mouth expression targets at low
weight, with source revision and hashes recorded in the asset. The prior
corner-only lift is removed for that head. Small local adjustments reduce the
hollow under-eye area and protruding lower lip; portrait fill lighting and lip
tint are softer. This is a cosmetic expression, not face tracking.

Both irises share a small deterministic gaze offset tied to the existing motion
phase. Pausing that phase freezes the gaze. Iris and pupil geometry remain
clipped to the lids through a blink. Lid edges and lashes follow the curved
eye surface instead of a flat plane; the sclera has subtle warmer, darker edges
to reduce the pasted-on white outline. No new texture requests were added.

Thirty-nine focused checks across eight files and the personal production build
passed. These include scalp/forehead ray intersections for both body presets,
head-only sculpt bounds, skin/texture ownership, hair contacts, bounded gaze,
and iris clipping through a blink. The visual result remains a generic 3D
character, below the supplied commercial reference's realism. These checks do
not establish photorealism, celebrity likeness, or physical-phone performance.

The final two DPR-2 browser flows passed in isolation (5.2 minutes total):
visible iris color changes and persistence, female preset restoration, pixel
checks for scalp coverage and uncovered forehead, unchanged skin color after
reload, front/oblique/blink views, alternate hair and wall-push application.
They reported no page/shader errors; the mobile flow reported no horizontal
overflow. The final captures were visually reviewed. This source update does
not include a new APK distribution.
