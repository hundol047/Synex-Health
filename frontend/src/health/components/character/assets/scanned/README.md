# Scanned female exercise trainer

**Sophia Animated 003 - Animated 3D Woman** by **Renderpeople** replaces the
previous Alina female preset. The source face, photographed skin, coherent hair
surface and original clothes are used together. The male preset is unchanged.
This is a licensed representation of an adult model, not a reconstruction of an
app user's face or body. Clothing/hair choices remain on the separate custom
avatar; this scan retains its original blouse, jeans and shoes.

## Source and rights

- Publisher: https://sketchfab.com/renderpeople
- Original: https://sketchfab.com/3d-models/dc448c3be0e74f96a55fb475a13433cf
- Official metadata: https://api.sketchfab.com/v3/models/dc448c3be0e74f96a55fb475a13433cf
- On 2026-11-01 the publisher explicitly lists **CC BY 4.0**, downloadable, author
  attribution required and commercial use allowed for this particular artwork.
- The public glTF redistribution includes the same author, title, source and
  CC-BY-4.0 notice both in `license.txt` and glTF `asset.extras`. It is pinned to
  `Xornotor/cg-2023-1`, commit `390e4671632cd0e01460521e4927ed67f8061be3`, directory
  `atividade01-vistandomaquetevirtual-Xornotor/gltf/avatar_c/`.
- Exact paths, sizes and SHA-256 hashes are in
  `scripts/assets/scanned-character-sources.json`.

The attribution and modifications are in [NOTICE.md](NOTICE.md), linked in the
app. This specific publisher CC release is the licensing basis, not a claim that
all Renderpeople catalog products have the same terms. No authenticated viewer
extraction, paid download or user photo submission was used.

## Conversion

- Native inverse bind matrices and weights retarget the body to the existing
  exercise joints. The original facial identity is retained.
- The 8192 px texture's face and four eye islands are cropped at their native
  resolution and UVs are remapped exactly. The rest uses a 2048 px map. No skin
  detail is invented by upscaling or a blur shader.
- Source eyelid animation supplies two blink shapes. The resting pose uses 18%
  of its own closure to relax the upper lids; full closure remains in the exercise
  animation. Native finger weights supply relaxed/clasped/closed grips.
- One shared-edge subdivision removes coarse sampling. Loop smoothing affects
  only the upper hair silhouette, with a transition below it. Face coordinates
  stay on their original surface; UV seams share geometric positions/weights.
- The final model has 35,182 vertices and 65,900 triangles. Six local WebP maps
  replace the previous 28-map female asset. This reduces the bundled payload;
  it does not establish phone frame rate or thermal behavior.

## Reproduce

Install NumPy, SciPy and Pillow in an isolated environment, then run:

```sh
python scripts/fetch-scanned-trainer.py SOURCE
python scripts/build-scanned-trainer.py SOURCE GENERATED
python scripts/pack-trainer-character.py GENERATED frontend/src/health/components/character/assets/scanned female
npm --prefix frontend run build:personal
```

This remains a real-time 3D scan with fixed clothes and a fitted hair surface,
not a photorealism percentage guarantee or physical hair/cloth simulation.
Geometry/browser verification and real Android validation are separate.
