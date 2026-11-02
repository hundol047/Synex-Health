# VTuber surface refinement — 2026-11-02

This refines the existing anime character rather than replacing the liked face
or resetting the user's wardrobe/body/color choices.

## Appearance changes

- Hair retains its native atlas and chosen color, with fine, UV-aligned strands,
  a restrained soft highlight and curved-surface shading. Subpixel detail is
  filtered with derivatives to reduce shimmer during exercise.
- Skin retains the painted anime face and unlit base. A narrow, warm shading
  range adds contour without the grey cast from realistic portrait lighting.
- Iris detail preserves the native pupil/catchlights. Eye-white and highlight
  meshes are untouched; the existing blink and relaxed expression remain.
- Clothes use a smooth 32-step toon ramp, soft surface shading, fine fabric
  detail, waistbands and hem stitching. These details use an immutable bind-space
  attribute, so they follow the posed garment and do not swim through it.
- VTuber surfaces no longer receive the directional shadow map that produced
  blotchy self-shadows over layered garments. The character still casts shadows,
  and the existing floor/contact shadow remains. Its visible, hidden and outline
  meshes are excluded from high-tier GTAO to avoid reintroducing grey facial
  shading through the postprocessing normal pass.
- Thinner, colored, depth-safe outlines replace harsh dark contour edges.
- The fitted neckline rises smoothly over the shoulders to cover the triangular
  exposed-skin gaps between the fitted body and native upper-shirt panel.

The geometry silhouette, existing body-slider range, shared exercise skeleton,
record storage and custom/realistic trainer appearance are retained. Only the
fitted shoulder material boundary is re-partitioned. Native texture files and
their [license](../frontend/src/health/components/character/assets/vtuber/NOTICE.md)
are unchanged. No model download, generation API, extra draw pass or texture
allocation is added. The VTuber bind attribute adds about 0.3 MB per live mesh;
the shading adds fragment work, so this is not a physical-device FPS claim.

## Validation

The personal build passes. All 22 tests pass across the five relevant suites
(`VtuberSurface`, `VtuberCustomization`, `VtuberTrainer`, `TrainerMaterials`,
`Character`). The automated checks cover immutable tailoring coordinates across
motion/stature, shoulder coverage, detail/highlight composition, preserved eye
whites, outlines and existing wardrobe/rig/preference behavior.

Browser evaluation uses the actual personal production build at the existing
mobile viewport and medium render tier. It checks lavender, chestnut, black and
silver hair, brown/blue irises, a blink, standing, squat, wall push-up, and automatic
exercise playback with red muscle guidance. Captures are actual renderer output,
not illustrations. The final browser test passes in 3.7 minutes on software
WebGL with no captured JavaScript/shader errors. This is the complete workflow
duration, not a device loading-time measurement.

Reviewed final-build captures:

- [Lavender hair / blue irises](character-vtuber-polish-captures/face-lavender.png)
- [Native chestnut / brown irises](character-vtuber-polish-captures/face-default.png)
- [Black hair](character-vtuber-polish-captures/face-black.png)
- [Silver hair](character-vtuber-polish-captures/face-silver.png)
- [Blink](character-vtuber-polish-captures/face-blink.png)
- [Standing, 45°](character-vtuber-polish-captures/standing.png)
- [Standing, front](character-vtuber-polish-captures/front.png)
- [Squat](character-vtuber-polish-captures/squat.png)
- [Wall push-up](character-vtuber-polish-captures/wall-push.png)
- [Automatic exercise / red guidance](character-vtuber-polish-captures/exercise.png)

No new APK or physical-phone evaluation is claimed here.
