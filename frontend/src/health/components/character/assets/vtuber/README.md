# Dedicated anime exercise character

Source: pixiv Inc., `VRM1_Constraint_Twist_Sample`, v1.0.1.
The native anime face, eyes, hair, clothes and expression shapes form one model.
This is separate from the realistic trainers and the custom mannequin's toon
color mode. It is loaded only when `character.model === 'vtuber'`.

## Input and permissions

- Repository: https://github.com/pixiv/three-vrm
- Commit: `5a3242b66124386c32b085c6693d9059040e72e5`
- Path: `packages/three-vrm/examples/models/VRM1_Constraint_Twist_Sample.vrm`
- Size: 10,776,032 bytes
- SHA-256: `12c2b97e95e700783a6a550dc0eee2d7880aeedccef9ae67bc4c5a2f0f2631a2`
- License: [VRM Public License 1.0](https://vrm.dev/licenses/1.0/), together with
  the exact embedded settings in [license-settings.json](license-settings.json).

The settings allow avatar use by everyone, commercial use including corporations,
modification and redistribution of modified data. They prohibit antisocial/hate
usage. This is not CC0. The original copyright, license, settings, modification
notice and warranty disclaimer remain in [NOTICE.md](NOTICE.md), linked in the UI.

## Reproduction

With Python, NumPy, SciPy and Pillow:

```sh
python scripts/build-vtuber-trainer.py /path/to/VRM1_Constraint_Twist_Sample.vrm frontend/src/health/components/character/assets/vtuber
```

The converter validates the input hash and license settings before processing.
It reads GLB accessors, skin inverse bind matrices, native weights, images and
expression morphs. It runs no source scripts. Uniform stature normalization and
segment retargeting fit the shared exercise rig; the face remains a uniform
mapping. Native hand length is preserved. Named twist/helper joints retain the
correct limb assignments. Finger poses use the source's own joints and weights.

Both eyelid morphs and the relaxed expression are preserved. Hair-tip sway is a
small deterministic offset with anchored roots, driven by the same phase as the
exercise. It is not a physical hair simulation or facial tracking. Pause and
reduced-motion behavior continue to use the existing demonstration phase.

The converted body has 24,951 vertices and 36,470 triangles. Local color maps are
packed as WebP at up to 2048 px; no generated skin texture or remote rendering
API is used. Toon surfaces, painted eyes and a thin outline replace realistic
skin highlights. Exercise-muscle colors remain attached to the posed geometry.

The native face and hairstyle remain intact. The VTuber editor adds independent
hair/iris colors, six sportswear combinations, top/bottom colors and bounded
chest, hip-width, glute-volume and waist controls. Hair and iris recoloring keeps
painted luminance, pupil and highlight details. New fitted garments partition
the native body surface into opaque fabric and skin; shared boundary vertices
avoid overlapping skin or open hems. A retained and refitted native tee panel
completes the upper torso. The native body already covers the pelvis; duplicate
UV seam vertices were previously mistaken for a hole. Fitted bottoms now use
only that body surface, without an overlapping shorts fragment. Hip and glute
controls spread moderate changes over a broader waist/upper-thigh transition.
Loose garments and the underlying body
use the same cosmetic deformation field. These changes are in
`vtuberAppearance.js` and `vtuberMaterials.js`, so rerunning the source converter
does not bake or erase customization.

The existing custom and realistic models remain selectable. Old VTuber settings
receive default customization values; health records are not changed. Appearance
does not alter measurements or the exercise skeleton. The sliders use a bounded
range to preserve fitting, rather than arbitrary scaling of individual bones.

`vtuberSurface.js` adds filtered hair/iris detail, soft surface shading and fabric
finishing. Hem/waistband detail follows immutable bind coordinates through the
exercise pose. The original maps remain unchanged; the finish adds no texture
download. The anime skin retains an unlit base, and the layered VTuber surfaces
skip self-shadow reception and high-tier GTAO to avoid grey/blotchy shading.


The subsequent upper-body fit uses a smooth ribcage field shared by cloth and
adjacent skin. It fades into the waist and shoulder/neck anchors, while the
independent chest control adds bounded volume. Sleeve hems are fitted from
physical boundary edges, excluding UV duplicates. See
[the fit review](../../../../../../../docs/VTUBER_SLIM_TORSO_REVIEW.md) for
geometry checks and matching-pose browser comparisons.
