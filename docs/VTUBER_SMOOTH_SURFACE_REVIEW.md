# VTuber surface refinement — 2026-11-02

The character's visible surfaces now use one blended Loop subdivision step.
This rounds the polygon silhouettes of the hair, shoulders, hips and knees
instead of blurring the screenshot or changing the selected character style.

`TrainerAthlete` builds a separate render surface for the VTuber. The original
rig, support calibration, body customization and saved settings are unchanged.
The refined surface follows each posed frame, including expression and hair-sway
changes. Body and hair surfaces use stronger blending; the face uses a restrained
blend. Eyes, mouth details, hands, garment boundaries and non-manifold edges
retain their original vertex positions. Hair borders may round off without
changing the other open boundaries. UV seams share geometric stencils but keep
their independent texture coordinates.

All outfit material groups, bind-space fabric coordinates and red muscle-guide
weights are carried onto the new surface. Pose normals are interpolated and
normalized, rather than recomputed from the fourfold triangle count. The sparse
stencils are built once per model and flattened into typed arrays for frame
updates. Added geometry is disposed when a model is replaced or unmounted.

The crop outfit increases from 24,974 to 86,210 display vertices and from
36,522 to 146,088 triangles. It adds GPU work; this is not a claim of unchanged
phone frame rate. The exercise deformation still runs on the original mesh.

Validation:

- Personal production build passed.
- Seven targeted tests passed (four smoothing tests and three surface tests).
- All six outfits stay below 100,000 display vertices; atlas coordinates remain
  finite, and eye/mouth details remain anchored.
- The refined vertices stay within the original posed bounding box across the
  104 exercise/stretch motions at the midpoint. Wall-push phases 0, 0.25, 0.75
  and 1 are also exercised with every outfit and reduced body-slider settings.
- Physical UV seam copies stay coincident. Positive, normalized subdivision
  weights prevent overshoot; hand anchor positions and source geometry remain
  unchanged. Red muscle-guide weights remain attached during a squat.
- Final production-build browser test passed in 3.9 minutes: standing, squat
  and portrait at 0°, 45°, 90°, 135°, 180°, 225°, 270°, 315° and 360° (27
  captures). No JavaScript/shader errors, preview bounds remained visible and
  each full turn returned to a pixel-identical starting image.

Actual app captures are stored in `character-vtuber-smooth-captures/`. The prior
comparison set is in `character-vtuber-rotation-captures/`.

| View | Before | Refined |
| --- | --- | --- |
| Front | [Image](character-vtuber-rotation-captures/standing-000.png) | [Image](character-vtuber-smooth-captures/standing-000.png) |
| Side | [Image](character-vtuber-rotation-captures/standing-090.png) | [Image](character-vtuber-smooth-captures/standing-090.png) |
| Rear | [Image](character-vtuber-rotation-captures/standing-180.png) | [Image](character-vtuber-smooth-captures/standing-180.png) |
| Squat | [Image](character-vtuber-rotation-captures/squat-135.png) | [Image](character-vtuber-smooth-captures/squat-135.png) |
| Portrait | [Image](character-vtuber-rotation-captures/portrait-045.png) | [Image](character-vtuber-smooth-captures/portrait-045.png) |

This reduces polygonal contours. It does not replace the original authored
model with a photorealistic asset. Extreme body-slider settings still expose
some uneven pelvic garment contours, particularly in a deep squat. Open garment
boundaries are protected to avoid introducing gaps. A browser/bounds test is not
proof of every clothing intersection or physical Android performance; no new
APK or physical-device test is included in this change.
