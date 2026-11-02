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

The current model has a fixed native face/hair/outfit. The existing custom and
realistic models remain selectable; existing preferences and health records are
not migrated or replaced automatically.
