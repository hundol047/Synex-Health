# Authored exercise trainers

The current `detailed` selection uses complete, coherently fitted adult trainers
exported from **MPFB 2.0.18**, rather than a separately reshaped head on the old
Rocketbox body. The female and male meshes are loaded in separate lazy chunks.
The previous Rocketbox files are retained for historical reproduction, but are
not loaded by this renderer.

These are real deformable 3D meshes, not images mapped onto a plane. They use the
same exercise rig as the workout demonstrations, with native finger weights,
fitted eye globes, eyelid pivots, brows, lashes, hair, clothing and shoes. Facial
proportions are kept uniform when fitting the head to the exercise rig; stretching
the spine must not stretch the face. Source skin hidden by clothing is masked
before export. A full authored tee replaces the cropped sportsuit top; only the
trousers from that sportsuit are retained. Clothing uses the native fitted mesh
and exercise weights, without stretching a cropped shirt over exposed skin.
The waistband has a 4 mm radial fitting allowance after rig conversion to avoid
abdomen skin peeking through its surface. The tee retains its authored fabric
bump map as well as its diffuse map.

## Sources and permissions

Only graphical output is shipped. MPFB's GPL program code is used as an external
authoring tool and is not included in the runtime application. Its graphical
database/output and the selected assets below are **CC0**. See the bundled
[`LICENSE.CC0.md`](../LICENSE.CC0.md), the
[official MPFB asset license](https://github.com/makehumancommunity/mpfb2/blob/d0a32e57a7f915cb2f2b95410e2117648c7bbb7e/LICENSE.ASSETS.md)
and [official asset/output clarification](https://static.makehumancommunity.org/mpfb/faq/is_it_really_free.html).

- Tool/base/rig/targets: MakeHuman Community, MPFB commit
  `d0a32e57a7f915cb2f2b95410e2117648c7bbb7e` (`v2.0.18`).
- Female skin: **bobby_03**, `young_female_hairless`, from the official
  [skins01 CC0 pack](https://static.makehumancommunity.org/assets/assetpacks/skins01.html).
- Male skin, high-poly eyes and brown iris maps, eyebrow010, eyelashes01,
  ponytail01, short02, female_sportsuit01 and shoes06: MakeHuman Team,
  Data Collection AB, Joel Palmius and Jonas Hauquier; official
  [MakeHuman system assets CC0 pack](https://static.makehumancommunity.org/assets/assetpacks/makehuman_system_assets.html).
- Full tee: **Margaret Toigo (MRT)**, `toigo_basic_tucked_t-shirt`, from the
  official [shirts01 CC0 pack](https://static.makehumancommunity.org/assets/assetpacks/shirts01.html).
  Its fabric maps are retained with a light blue material tint.

The female sportswear is fitted to both adult builds. Native source identifiers
and phenotype labels describe the authoring inputs, not any user's ethnicity,
measurements or identity. Neither trainer is a scan of a named person or a model
extracted from the commercial game shown in the user's references.

Each JSON records the individual MHCLO/OBJ/material hashes, source profile, tool
revision and original texture hashes. Verified input archive SHA-256 values:

| Archive | SHA-256 |
| --- | --- |
| MPFB v2.0.18 source ZIP | `ada7c4ff11e79cf6ed9b441bccabc52c9359f2848b988f66e89c14c30b21fed7` |
| makehuman_system_assets_cc0.zip | `b542127a8e25547c7c29c19f2d1d2adb9a664c80396ecd694095dbc8028a0107` |
| skins01_cc0.zip | `7495ab99287053bd19ff1636114e64b608994d9f7437fea6cc75ea387f96dba9` |
| shirts01_cc0.zip | `a5a723b0e84a109bb190fcfeac7f1de4138d875da3e30fe5b3340eac9f38bcd3` |

Official archives:

- https://codeload.github.com/makehumancommunity/mpfb2/zip/refs/tags/v2.0.18
- https://files.makehumancommunity.org/asset_packs/makehuman_system_assets/makehuman_system_assets_cc0.zip
- https://files.makehumancommunity.org/asset_packs/skins01/skins01_cc0.zip
- https://files.makehumancommunity.org/asset_packs/shirts01/shirts01_cc0.zip

## Reproduction

Extract the three asset packs into the same `ASSET_ROOT`, containing `skins/`,
`eyes/`, `hair/`, `clothes/` etc. With Blender 4.3.2 and Pillow installed:

```sh
blender -b -t 2 --python scripts/build-trainer-character.py -- MPFB_SOURCE ASSET_ROOT GENERATED female
blender -b -t 2 --python scripts/build-trainer-character.py -- MPFB_SOURCE ASSET_ROOT GENERATED male
python scripts/pack-trainer-character.py GENERATED frontend/src/health/components/character/assets/trainer female
python scripts/pack-trainer-character.py GENERATED frontend/src/health/components/character/assets/trainer male
```

The build script writes the authoring tool's cache beneath `GENERATED/build-cache`.
It does not modify an installed Blender profile. The packer limits maps to 2048px,
encodes color/alpha as WebP, preserves normal-map vectors losslessly and shares
identical maps across genders by source hash. The optional PNG metadata cleanup
verifies critical pixel chunks before stripping ancillary metadata.

The standalone native cornea island is omitted from the opaque globe; the runtime
provides a clearcoat reflection layer. Treating that shell as opaque hid the iris
with a white disc. Authored eye closure deforms the skin and lashes together and
leaves the globe fixed. Full-height normalization happens before clothing masks
the body; computing height from exposed skin had enlarged the face incorrectly.

## Limits

The trainers remain rendered characters. They do **not** meet the user's
photographic/premium-game reference quality. The source hair cards, skin maps and
limited facial expression still show that gap. Hair is fitted geometry; this
renderer does not claim a strand-based physical hair simulation. CPU/browser
verification does not establish Android hardware frame rate or thermal behavior.
