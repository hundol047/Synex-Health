# VTuber orbit review — 2026-11-02

**Correction:** the native pelvic body surface is complete. The later
[body-fit correction](VTUBER_BODY_FIT_REVIEW.md) removes the unnecessary shorts
patch described in this historical review; UV seam duplicates were mistaken
for missing geometry. Its old pelvic-fit limitations and assumptions are
superseded by that correction.

The character editor now has left/right 45° orbit buttons alongside the existing
free drag view. Selecting front/side/back restores the corresponding preset.

Changes made after reviewing the actual renderer:

- Free orbit also preserves the camera position in portrait mode. Previously
  selecting free view while face-focused could reapply the 30° portrait preset.
- Orbit steps center the preview in the viewport. The fixed header/navigation
  had obscured the head and feet after scrolling to the controls.
- The VTuber portrait minimum orbit distance is 0.75 m times stature scale,
  preventing the previous very close orbit from entering the head.
- Surface shading uses world-space normals and a fixed light direction.
  Specular detail uses the camera/light half-vector, so highlights change with
  the view without rotating the diffuse light around the model. Double-sided
  surfaces orient their shading normal for the visible face.
- Hair retains its strand detail but no longer uses an inverted-hull outline.
  Overlapping hair cards produced dotted dark contours at rear angles. Skin and
  clothing keep their restrained outlines.
- Interior pelvic fabric is fitted along depth while preserving its height and
  horizontal position, with 0.8 mm normal clearance to prevent overlapping surfaces.
  Its original bridge remains where the source body has
  omitted surfaces. Nearest-point interior fitting was rejected because it could
  jump onto a neighboring thigh. A regression check protects these coordinates.

The personal production build passes. All 21 relevant tests across VtuberSurface,
VtuberTrainer, TrainerMaterials and VtuberCustomization have passed. The new
interior-fit regression was rerun after correcting its assertion to exclude the
stitched boundary and allow the intentional 0.8 mm surface clearance. The model tests sample all 104 exercise/stretch entries
at five phases, including finite geometry, seams and wall/floor constraints.

The browser orbit test samples standing, squat and portrait at 0°, 45°, 90°,
135°, 180°, 225°, 270°, 315° and 360° (27 captures) with enlarged chest, hip and
glute settings. It checks no JavaScript/shader errors, visible preview bounds,
different rear/front images, and pixel-identical return images after each full
turn. The browser test passed in 3.0 minutes.

Actual browser captures (not generated illustrations):

| View | Front | Side | Rear |
| --- | --- | --- | --- |
| Standing | [0°](character-vtuber-rotation-captures/standing-000.png) | [90°](character-vtuber-rotation-captures/standing-090.png) | [180°](character-vtuber-rotation-captures/standing-180.png) |
| Squat | [0°](character-vtuber-rotation-captures/squat-000.png) | [90°](character-vtuber-rotation-captures/squat-090.png) | [180°](character-vtuber-rotation-captures/squat-180.png) |
| Portrait | [0°](character-vtuber-rotation-captures/portrait-000.png) | [90°](character-vtuber-rotation-captures/portrait-090.png) | [180°](character-vtuber-rotation-captures/portrait-180.png) |

All 27 sampled angles are retained in `character-vtuber-rotation-captures/`.

Extreme body settings still expose stylized pelvic contours from the source
model. These captures should not be read as a photorealistic tailoring claim.

This is a production-web-build/browser review, not physical Android device
testing or proof that every continuous angle/outfit/motion combination is free
of artifacts. No new APK is produced by this change.
