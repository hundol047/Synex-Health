# Fitted Studio exercise trainer

`female.json` is a derivative of the bundled [Alina Ip source](../authored/README.md)
by **Jungle Jim**, CC BY 4.0. The original artwork is
https://sketchfab.com/3d-models/600d4d4aa71c4181b2567a3605ce8c57.
The [attribution notice](../authored/NOTICE.md) and source license continue to apply.
This revision adds no purchased or newly downloaded asset.

Reproduce from the checked-in original export with Python and NumPy:

```sh
python scripts/build-studio-athlete.py
```

The script mildly narrows limb shafts, reduces the projected chest contour in
both the body and native tank, shortens lash wings and removes the separate
sparse fringe cards. The scalp and dense side-part hair remain. Navy leggings
use the source pelvis/leg topology and weights with a 1.5 mm fabric allowance;
the fitted upper panel, native tank and sneakers complete the exercise outfit.
Covered foot skin is removed. Unused body and hair vertices are compacted.
UVs, finger deltas, source seam IDs and face/eye alignment are retained.

The same cosmetic height mapping in `studioTrainer.js` then transforms the
complete model and rig. These dimensions do not alter user measurements.
Textures remain in `assets/authored`; the skin edit's hashes and provenance
remain in `studio-head.json`. Fabric shaders preserve texture luminance/detail
while applying a blue/ivory palette. No texture is downloaded at runtime.

This is a real-time character with a neutral source expression. It is not a new
scan, a photographic likeness, or a claimed match to the reference game's art.
