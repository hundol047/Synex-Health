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
The JSON embeds source-file SHA-256 hashes, profile weights, eye center and uniform
alignment scale. Reproduce the **current** head with
`python scripts/build-coherent-portrait.py TARGET_DIRECTORY BASE_OBJ`.

Both profiles are normalized to the shipped 1.78 m reference. The new head is
uniformly aligned at the original eye joints and blended only through the neck;
the body/support vertices stay unchanged. It uses one normalized macro profile
instead of accumulating local nose, jaw, lip and expression sculpts. The old
`build-portrait-head.py` converter remains for historical reproduction only.
The source profile labels record provenance, not the user's ethnicity. This is
an adult generic cosmetic head, not a scan or likeness of a named person.

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

The saved `sleek` identifier is retained when replacing the previous Short Daisy
style. Its front cards are no longer expanded sideways: the authored fringe
remains over the forehead. This fixes the bare-front appearance that a scalp
underlay alone could not address. The former converter remains for historical
reproduction, while the current asset uses `build-character-fringe-hair.py`.


## Fitted eyes, eyebrows and eyelashes

The realistic renderer uses authored opaque eyeballs and separate corneal
surfaces instead of planar almond patches. Original UVs retain photographic
iris fibers and sclera detail; a local shader recolors the iris only. Eye motion
rotates the globes around their fitted centers. Skin and lashes share the lid
motion, while the skin supplies actual eye occlusion. Toon eyes retain their
separate stylized construction.

- `eye-globes.json/.webp`: `high-poly.obj`, `high-poly.mhclo`, `brown_eye.png`
  from the pinned official revision above, `makehuman/data/eyes/`. Headers
  explicitly identify the assets as CC0.
- `natural-brows.json/.webp`: `eyebrow010.obj/.mhclo/.png` in
  `base/eyebrows/eyebrow010/` at mirror revision
  `2f4033a364a7e97479e17ed630ccb999395730c6`.
- `natural-lashes.json/.webp`: `eyelashes01.obj/.mhclo/.png` in
  `base/eyelashes/eyelashes01/` at that same mirror revision. As with bundled
  hair, the official later license explicitly covers MHCLO-based graphics as
  CC0, superseding old asset headers. Only graphic data is used.
- Source mirror: https://github.com/dmaugis/makehuman-py3-assets
  PNGs are Git LFS assets: obtain their binary content, not pointer files.
  Each generated JSON records every input asset's SHA-256 checksum.
- Reproduce with `python scripts/build-authored-face.py BASE_OBJ EYES_DIRECTORY
  PARTS_DIRECTORY` (numpy, scipy and Pillow). The first directory contains eye
  source files; the second contains the named brow/lash files. Bindings express
  missing helper vertices against retained body topology. Source alpha masks
  are preserved; brow/lash RGB is neutralized for user-selected hair color.
- Runtime brows/lashes are subdivided, projected just outside the selected face,
  and alpha blended to prevent the broken black fragments caused by opaque
  alpha testing. Every mounted viewer owns and disposes its geometry and eye
  material, but shared texture-loader resources remain alive.

These are general-purpose authored models, not photoreal scanned heads. Their
rendered appearance still requires visual review; geometry tests do not certify
perceptual realism, and no likeness percentage is claimed.

## Natural short workout hair (2026-10-31)

The saved `wavy` selection now uses the bundled MakeHuman `short02` authored
mesh and its strand opacity texture, replacing the procedural parallel ribbons.
The UI label is now **내추럴 쇼트**; stored character settings retain the same
identifier. Both body profiles and user-selected hair colors are supported.

Source: `base/hair/short02/{short02.obj,short02.mhclo,short02_diffuse.png}` at
`dmaugis/makehuman-py3-assets`, revision
`2f4033a364a7e97479e17ed630ccb999395730c6`. The official later CC0 statement
linked above covers this bundled MHCLO graphic asset, including its mesh and
texture; no application code is imported. Old AGPL headers have the same
historical context as the other bundled hair assets described above.

Reproduce with `python scripts/build-character-hair.py SOURCE_DIRECTORY BASE_OBJ
short02`. The three original source-file hashes are embedded in `short02.json`.
The PNG is an LFS file; verify the content against the repository's pointer hash.
The source texture is converted to neutral strand luminance/alpha so saved hair
color preferences still apply. Geometry fitting and a single subdivision follow
the existing authored-hair pipeline. A smaller 64×32 root underlay suffices under
this dense short style. The final WebP is about 207 KiB and loads locally.

The short style also feathers its physical open boundary with vertex alpha.
UV-seam duplicates share the same physical boundary classification, preventing
an unintended transparent parting. Other authored hairstyles keep their own
source opacity masks.

## Studio adult heads and athletic ponytail (2026-10-31)

`studio-heads.json` combines the pinned CC0 Asian/Caucasian adult macro profiles
(90%/10%) with a restrained smile and lower-lip adjustment. The female profile
also includes small oval-head and nose-flare adjustments. Each coherent source
head is aligned to the original eye helpers before a smooth neck transition is
applied; it does not stack localized pinches on the refined face. All source
weights, checksums, eye centers and alignment scales are embedded in the JSON.
These are generic adult characters, not identities or celebrity replicas.

Macro/sculpt graphic targets: `makehuman/data/targets/{macrodetails,head,mouth,nose}`
at official MakeHuman revision `a8bc2d54ff0ac92e78ff71431b1023eda42bf482`.
Smile graphic targets: CC0 `makehumancommunity/extra-targets`, revision
`7eaba3453134385bb5ea9811ef0b33b85b4b556d`,
`assets/faceunits01/targets/faceunits/`. Reproduction
requires the downloaded `expression/mouthSmileLeft.target` and
`expression/mouthSmileRight.target` files, whose hashes are recorded in JSON.
Run `python scripts/build-studio-heads.py TARGET_DIRECTORY BASE_OBJ` (numpy).
The target directory contains the macro filenames plus `sculpt/` and
`expression/` subdirectories named in `sourceWeights`.

`ponytail01.json/.webp` comes from the bundled graphic asset
`base/hair/ponytail01/{ponytail01.obj,ponytail01.mhclo,ponytail01_diffuse.png}`
at mirror `dmaugis/makehuman-py3-assets`, revision
`2f4033a364a7e97479e17ed630ccb999395730c6`. The later official CC0 graphics
license linked above applies to this bundled MHCLO asset. Source-file SHA-256
hashes are recorded in JSON. Reproduce with
`python scripts/build-character-hair.py SOURCE_DIRECTORY BASE_OBJ ponytail01`.
The source texture is neutralized for selectable hair color. Runtime fitting
shortens the free ends, leaves the crown anchored and bounds phase-driven sway.
No source application code is included. The existing selected `ponytail` value
now displays the fitted textured asset rather than procedural tubular strands.
