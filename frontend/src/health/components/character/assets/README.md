# Face detail assets

The male face atlas is a crop of MakeHuman's bundled skin texture, which
explicitly displays a PUBLIC DOMAIN / MAKEHUMAN.ORG notice. MakeHuman's asset
license statement identifies its bundled graphic data as CC0:
https://github.com/makehumancommunity/makehuman/blob/a8bc2d54ff0ac92e78ff71431b1023eda42bf482/LICENSE.md
The CC0 legal text is included as `LICENSE.CC0.md`. No MakeHuman program code or
GLSL is incorporated.

Male source mirror:
https://github.com/dmaugis/makehuman-py3-assets/tree/2f4033a364a7e97479e17ed630ccb999395730c6/base/skins/textures

- `young_lightskinned_male_diffuse.png`: SHA-256
  `862a26e335e958b70534cb5f0d7c47ef30ab148a56c42b3e9da969cf76f12963`
- Current female atlas: **OnlyTheGhosts**, `young_eurasian_female_diffuse.png`,
  CC0, from `skins01_cc0.zip`. SHA-256
  `e4547a04bab2244d8ec6bcb1d239f4cddb83f145d4ce2a5c7734ec514c8bebcf`.
  The author's license is explicitly listed in the pinned official catalog:
  https://github.com/makehumancommunity/makehuman-static-website/blob/bc07eb3ac5719e89e0068bb8ee4ea8e38e273e8a/content/Assets/AssetPacks/skins01.md
  Download: https://files.makehumancommunity.org/asset_packs/skins01/skins01_cc0.zip

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

`bob01` (layered bob) and `bob02` (classic bob), `short03` (side-swept short hair), and `long01` (face-framing medium hair) are MakeHuman's bundled hair
meshes and textures from the same pinned asset mirror. The project's official
licensing statement above explicitly releases **any MHCLO-based bundled asset**,
meshes and textures under CC0. Old 2016 OBJ/MHCLO headers still mention AGPL;
the later project statement separates graphical data from AGPL program logic.
No MakeHuman scripts, material/shader program logic, or third-party contributed
asset is incorporated here. Authors in the original files: MakeHuman Team,
Data Collection AB, Joel Palmius and Jonas Hauquier.

Source directories: `base/hair/bob01/`, `base/hair/bob02/`, `base/hair/short03/`, and `base/hair/long01/` at the pinned mirror.
`python scripts/build-character-hair.py SOURCE_DIRECTORY BASE_OBJ` reproduces
fitting data, triangulated UVs and 1024px hair textures (Pillow/scipy required).
The script uses only OBJ, MHCLO fitting data and diffuse PNGs. Hair colors are
normalized to grayscale so the user's selected color still applies; original
opacity masks retain individual strands. Omitted helper vertices are expressed
against retained head vertices. Source OBJ hashes are embedded in each JSON.
Textures remain shared loader resources and are not disposed with one viewer.

## Adult portrait head

`portrait-head.json` is a masked head-only delta from MakeHuman's bundled
macrodetail graphic targets at revision
`a8bc2d54ff0ac92e78ff71431b1023eda42bf482`. The official CC0 statement linked above
covers these graphical assets. Source directory: `makehuman/data/targets/macrodetails/`.
The JSON embeds the SHA-256 hashes of its four source targets. Reproduce with
`python scripts/build-portrait-head.py TARGET_DIRECTORY BASE_OBJ`.

The source profiles are normalized independently to the shipped 1.78 m reference
before computing the difference. The mask preserves the body and joint anchors;
eye and mouth alignment is attenuated separately. This is an adult generic
cosmetic profile, not a scan or likeness of a named person. Source filenames
record asset provenance, not a classification of the app's users.


The portrait conversion also blends seventeen authored feature targets from the
same pinned official `makehuman/data/targets/{nose,mouth,chin,head,cheek,eyes}/`
directories. Exact weights and source SHA-256 hashes are embedded as
`sculptWeights` and `sculptHashes`; put these files in `TARGET_DIRECTORY/sculpt/`
when reproducing the conversion. They refine the nose tip/nostrils, lip volume,
jaw and eye-bag surfaces rather than scaling the whole face uniformly.

Hair is subdivided once after fitting and length adjustment. The original
connected topology drives the subdivision and normals, while separate UV islands
retain their coordinates. No new third-party asset or subdivision library is
incorporated. A close scalp underlay covers gaps between alpha-masked hair cards.


## Current layered hairstyle with a fringe — CC-BY

The `sleek` selection now uses **Katherine Hair** (`elvs_katherine_hair`),
by **Elvaerwyn**, released as **CC-BY** in both its OBJ/MHCLO headers and the
publisher's catalog. This community-contributed asset is not claimed as CC0.
The original source labels do not specify a license version; preserve that label.

- Pinned publisher catalog and attribution:
  https://github.com/makehumancommunity/makehuman-static-website/blob/bc07eb3ac5719e89e0068bb8ee4ea8e38e273e8a/content/Assets/AssetPacks/hair02.md
- Official download:
  https://files.makehumancommunity.org/asset_packs/hair02/hair02_ccby.zip
- Generated files: `medium-layered.json`, `medium-layered.webp`,
  `medium-layered-normal.webp`. Each original source-file hash is recorded in
  the JSON, along with author and license. Runtime attribution and a source link
  are available under **캐릭터 에셋 출처** on the character settings page.
- Modifications: head fitting, length/rear-clearance adjustment, one subdivision
  step, neutral hair-color conversion, local secondary motion, and normal-map
  strength. The supplied color and normal PNGs have bad ancillary iCCP checksums; the
  converter strips invalid color metadata (normal vectors stay linear data), verifies
  critical PNG chunk checksums, and losslessly re-encodes unchanged normal pixels.
- Reproduce with `python scripts/build-character-fringe-hair.py SOURCE_DIRECTORY BASE_OBJ`.
  The directory must contain `elvs_katherinehair1.obj`,
  `elvs_katherine_hair.mhclo`, `erbehairtex1.png`, `normalserb.png`.

The prior bundled `long01` files are retained as historical source assets but
are no longer loaded by the medium style. None of these assets is a celebrity
scan or an asset extracted from the referenced commercial game.

## Restrained closed-mouth expression

The refined female portrait also blends the `mouthSmileLeft` and
`mouthSmileRight` graphical targets at 0.08 each from MakeHuman Community's
CC0 `extra-targets` collection, revision
`7eaba3453134385bb5ea9811ef0b33b85b4b556d`:
https://github.com/makehumancommunity/extra-targets/tree/7eaba3453134385bb5ea9811ef0b33b85b4b556d/assets/faceunits01/targets/faceunits
License: https://github.com/makehumancommunity/extra-targets/blob/7eaba3453134385bb5ea9811ef0b33b85b4b556d/LICENSE

Their revision, weights and source-file hashes are in `portrait-head.json`.
For reproduction, place both target files under `TARGET_DIRECTORY/expression/`.
Only graphical vertex deltas are used. The previous female corner-only Gaussian
lift is removed to avoid stacking two smiles. This is a restrained cosmetic
expression, not facial tracking or a person's scanned likeness.

The saved `sleek` identifier is retained when replacing the previous Short Daisy
style. Its front cards are no longer expanded sideways: the authored fringe
remains over the forehead. This fixes the bare-front appearance that a scalp
underlay alone could not address. The former converter remains for historical
reproduction, while the current asset uses `build-character-fringe-hair.py`.
