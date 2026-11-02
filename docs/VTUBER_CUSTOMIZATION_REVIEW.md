# VTuber customization — 2026-11-02

Profile → My exercise character → VTuber character now offers:

- Hair and iris palettes plus arbitrary RGB color pickers; pupil, highlights,
  eye whites and native facial shading are retained.
- Loose tee/shorts, tee/leggings, fitted tank/leggings, cropped tank/leggings,
  cropped tank/bike shorts and long-sleeve/leggings; separate top/bottom colors.
- Independent chest size, hip width, rear glute volume and waist width sliders,
  with individual resets. All outfits cover the chest and pelvis with opaque
  fabric. The shorter outfits expose shoulders and/or midriff.
- Immediate preview, save/reload and use of the same choices in exercise.

The source and license remain the pixiv sample documented in the
[asset README](../frontend/src/health/components/character/assets/vtuber/README.md).
There are no remote generation requests, new downloads or paid services.

## Geometry and performance

Fitted garments reuse native body triangles. The clothing boundaries split
triangles and share interpolated positions/skin weights at skin/fabric seams.
They replace the covered skin surface, avoiding a second full body shell.
The source has no upper chest or central pelvic skin beneath its original
clothes. Modified panels from the native tee/shorts complete those regions;
removing the native clothes without those panels exposes holes. The tee panel
is fitted to the intact waist cross-section. Its native sleeves are shortened
and fitted to the shoulder/upper arm while retaining their connected surface;
cutting away the loose sleeves exposed the source's absent armpit skin. The
retained pelvic panel's border is fitted to the adjacent body surface and uses
interpolated body skin weights; the original loose-shorts border would float
away from the leggings when viewed from the side.
Inactive native garment vertices are compacted out of collision bounds and
skinning work. Native loose tee/shorts remain separate authored garments.
Active meshes retain roughly 25,000 vertices, close to the original 24,951.
All options share the same texture files.

Body controls use smooth cosmetic fields on skin and clothes together; head,
support hands, skeleton and joint heights are retained. Hip width changes the
left/right extent and glutes change rear projection. Sliders are normalized to
−1…1 (shown as −100…100), not physical body measurements. At the center of each
field the maximum contribution is 18% hip width, 14% waist width and 4.5 cm
chest/rear projection. Long front hair tips follow increased chest volume.

Six wardrobe geometries are cached per source model. Body slider changes rebuild
the fitted geometry and its contact calibration; color changes rebuild materials
without rebuilding geometry. No model or texture set is loaded per outfit.

## Verification

The customization, preferences, VTuber model and shared trainer material suites
pass 19 tests across four files. Checks include:

- Default migration, malformed-input normalization and record preservation.
- Independent hip/glute adjustment, unchanged face/blink/support hands.
- Conservation of body surface area, valid indices and shared seams for all six
  outfits; opaque chest/pelvis coverage for fitted outfits. Independent rays
  verify actual torso/pelvis surfaces exist, including the previously omitted
  upper chest and both torso sides. Hand/nail weights must not appear in the
  pants material.
- Six outfits × three body configurations × seven representative motions ×
  three phases: finite geometry, welded seams, conservative bounds and walls.
- All 74 exercises and 30 stretches at five phases on the enlarged crop model.
- Independent BVH rays against the posed chest for seven clasp motions at
  13 phases: at least 5 mm clearance, with the existing <40° wrist limit.

The personal build passes. The final browser test passes in 4.1 minutes on
software WebGL (the complete workflow duration, not a device load-time result).
It changes colors, exercises all six outfit buttons at enlarged body settings,
checks squat/wall/floor poses, saves four independent body values, reloads them,
and opens the exercise library with the saved character playing automatically.
There are no captured JavaScript or shader errors; the record sentinel is intact.

Actual final-build captures were reviewed after the surface/fit corrections:

- [Hair and iris colors](character-vtuber-custom-captures/lavender-blue-face.png)
- [Loose tee/shorts](character-vtuber-custom-captures/outfit-casual.png)
- [Tee/leggings](character-vtuber-custom-captures/outfit-training.png)
- [Fitted top](character-vtuber-custom-captures/outfit-tank.png)
- [Cropped set](character-vtuber-custom-captures/outfit-crop.png)
- [Bike shorts](character-vtuber-custom-captures/outfit-bike.png)
- [Long sleeves](character-vtuber-custom-captures/outfit-long.png)
- [Squat, side](character-vtuber-custom-captures/crop-squat.png)
- [Wall push-up](character-vtuber-custom-captures/crop-wall-push.png)
- [Floor push-up](character-vtuber-custom-captures/crop-floor-pushup.png)
- [Saved settings after reload](character-vtuber-custom-captures/saved-character.png)
- [Automatic exercise with red muscle guidance](character-vtuber-custom-captures/custom-exercise.png)

These are browser/build-environment checks; physical Android performance and a
new APK are outside this change. The customization range is bounded, and the
hair remains the existing hairstyle with light phase-driven sway.
