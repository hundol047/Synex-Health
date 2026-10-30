# Face detail assets

The face atlases are crops of MakeHuman's bundled skin textures. The source
images explicitly display a **PUBLIC DOMAIN / MAKEHUMAN.ORG** notice. MakeHuman's
asset licensing statement also identifies textures as CC0 1.0 Universal:
https://github.com/makehumancommunity/makehuman/blob/a8bc2d54ff0ac92e78ff71431b1023eda42bf482/LICENSE.md
The CC0 legal text is included as `LICENSE.CC0.md`. No AGPL application code or
GLSL from MakeHuman is incorporated.

Source mirror (pinned because the former official assets URL is unavailable):
https://github.com/dmaugis/makehuman-py3-assets/tree/2f4033a364a7e97479e17ed630ccb999395730c6/base/skins/textures

- `young_lightskinned_male_diffuse.png`: SHA-256
  `862a26e335e958b70534cb5f0d7c47ef30ab148a56c42b3e9da969cf76f12963`
- `young_lightskinned_female_diffuse.png`: SHA-256
  `b2a6ac8cd4f9febdb447368e29c76cd68410bb66e46d9dcfa2d5f75126eea8fc`

The source names describe the original asset variants, not user ethnicity.
Runtime shading derives relative facial detail from these textures and applies
it to the user's selected cosmetic skin color; it does not infer ethnicity.

UV coordinates come from the existing pinned hm08 base mesh:
https://github.com/makehumancommunity/makehuman/blob/a8bc2d54ff0ac92e78ff71431b1023eda42bf482/makehuman/data/3dobjs/base.obj

`python scripts/build-character-face-atlas.py SOURCE_DIRECTORY` reproduces the
UV table and WebP crops (Pillow required). Put the base OBJ and original images
as `base.obj`, `male.png`, and `female.png` in that directory. The script checks
the exact shipped triangle topology before generating UVs. It keeps the head
island and excludes torso/leg skin pixels; unmapped internal islands retain the
existing surface. No body positions, indices or skinning weights are replaced.
Both bundled images total less than 700 KiB compressed and need no external
service at runtime. They are shared by the texture loader; individual viewer
cleanup must not dispose those shared textures.

Alpha packs quantized high-frequency skin relief derived from the source color
image. It is sampled as microrelief, never as transparency or an anatomical
measurement. The original diffuse textures are not measured normal maps.

## Authored short hairstyles

`bob01` (layered bob) and `bob02` (classic bob), and `short03` (side-swept short hair) are MakeHuman's bundled hair
meshes and textures from the same pinned asset mirror. The project's official
licensing statement above explicitly releases **any MHCLO-based bundled asset**,
meshes and textures under CC0. Old 2016 OBJ/MHCLO headers still mention AGPL;
the later project statement separates graphical data from AGPL program logic.
No MakeHuman scripts, material/shader program logic, or third-party contributed
asset is incorporated here. Authors in the original files: MakeHuman Team,
Data Collection AB, Joel Palmius and Jonas Hauquier.

Source directories: `base/hair/bob01/`, `base/hair/bob02/`, and `base/hair/short03/` at the pinned mirror.
`python scripts/build-character-hair.py SOURCE_DIRECTORY BASE_OBJ` reproduces
fitting data, triangulated UVs and 1024px hair textures (Pillow/scipy required).
The script uses only OBJ, MHCLO fitting data and diffuse PNGs. Hair colors are
normalized to grayscale so the user's selected color still applies; original
opacity masks retain individual strands. Omitted helper vertices are expressed
against retained head vertices. Source OBJ hashes are embedded in each JSON.
Textures remain shared loader resources and are not disposed with one viewer.
