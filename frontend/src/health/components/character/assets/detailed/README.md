# Detailed exercise characters

These local assets are derivatives of **Microsoft Rocketbox Avatar Library**,
Copyright (c) 2020 Microsoft, under the **MIT License** in
[LICENSE-Microsoft.txt](LICENSE-Microsoft.txt).

Source repository: https://github.com/microsoft/Microsoft-Rocketbox
Pinned commit: `0943055db6ec570bcef9f2c8b41c9e5467c808f9`.
Sources: `Assets/Avatars/Professions/Sports_Female_02` and
`Assets/Avatars/Professions/Sports_Male_04`, including the `_facial.fbx` exports
and their head/body color, normal, specular and (female) opacity textures.
The source-file paths, sizes and Git blob hashes are in
`scripts/assets/detailed-character-sources.json`.

## Conversion

Run from the repository root (Blender 4.3.2, Python 3 and Pillow):

```
python scripts/fetch-detailed-characters.py /tmp/rocketbox-source
blender -b -t 2 --python scripts/build-detailed-characters.py -- /tmp/rocketbox-source
python scripts/build-detailed-textures.py /tmp/rocketbox-source
```

The fetcher downloads from the pinned official repository and verifies each Git
blob hash. It does not use API credentials or send any user data. Source files
are about 160 MB; only the converted runtime files belong in the application.

The converter fits segment directions/lengths to the existing exercise rig,
preserving authored skin weights, UV seams and material groups. Facial bones,
including the source's mixed-case `RUpperlip`/`LUpperlip` names, remain attached
to the head. It exports authored eyelid blendshapes and bounded finger-joint
poses for relaxed, clasped and closed hands. Facial deltas under 10 micrometers
are dropped as numerical noise. Source vertex identities are retained so UV
seams can share smooth normals without joining unrelated surfaces.

Face and eye curves receive one subdivision pass. Eyelid/lip edges and material
boundaries are creased; original neck-seam corners are pinned. The final mesh
combines that refined head with the original body and alpha hair cards so the
runtime stays below 15,000 vertices per character. Body/portrait normalization
uses the same original height. Eye triangles have a separate wet-surface material.

Color/opacity maps are 2048 px; normals and derived roughness maps are 1024 px.
Color and normal data use different color spaces at runtime. The source gloss/
specular artwork is converted to a bounded roughness approximation; these are
not measured PBR material parameters. Local texture URLs are loaded only when
the detailed renderer is selected. The female mesh has 14,154 vertices / 25,170
triangles, and the male mesh has 12,566 vertices / 22,860 triangles, separate
from the existing configurable model.

### Additional face albedo

`female-portrait.webp` is an AI-assisted edit of the MIT female head atlas, made
on 2026-10-31 with the image-generation tool. It changes facial skin/brow/lip
artwork, not the skeleton or the user's physical measurements. The source PNG
SHA-256 is `7f48180625275df1b2ebb3085c9d4f8de3390c1307729f09cbcbee338afd6f29`.
The PNG was converted without resizing to RGB WebP, Pillow quality 94 / method 6.
It is blended only in the central face; original eyelid, neck, eye, hair and
mouth-interior islands retain their authored atlas. The original copyright and
MIT notice remain included. The source portrait generation prompt requested a
new adult Korean fitness character, neutral diffuse illumination, natural skin
microdetail, preserved UV layout and empty eye sockets, without baked shadows.
Generation is nondeterministic; the committed WebP is the production artifact.

This is a texture used on a rotating 3D mesh, not an app screenshot or proof of
photographic quality. A full-atlas replacement tried during development was
rejected because its neck boundaries did not align.

## Product limits

These are authored real-time characters, not a proof of photographic
indistinguishability or a reconstruction of the user's body. The detailed presets
retain their original face, hair, clothing and proportions. The editor explicitly
offers the existing configurable model for skin/eye/hair/body/outfit changes.
No celebrity identity or licensed game character is represented. Hair is authored
geometry; it is not strand-level physical simulation.

No paid generation API was called. Meshy documents API-key authentication and
credit usage; no such credential is configured in this environment. Other scan
libraries reviewed have redistribution or application-use restrictions and were
not included. This MIT source permits distributing the converted assets with the
app and repository while preserving its copyright and license notice.
