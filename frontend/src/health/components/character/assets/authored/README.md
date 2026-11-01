# Authored female exercise character

The female detailed preset uses **Alina Ip, realistic Asian woman (Animated)**
by **Jungle Jim**, under the CC BY 4.0 license displayed by its publisher.
The [attribution and modification notice](NOTICE.md) is also linked in the app.
The male preset and configurable avatars have separate sources and licenses.

## Provenance

- Original artwork: https://sketchfab.com/3d-models/600d4d4aa71c4181b2567a3605ce8c57
- Public metadata: https://api.sketchfab.com/v3/models/600d4d4aa71c4181b2567a3605ce8c57
- On 2026-11-01 the publisher's API lists `isDownloadable: true`, CC Attribution,
  https://creativecommons.org/licenses/by/4.0/, and “Commercial use is allowed.”
- Public redistribution: `eojnus/wolf-of-tarkov`, commit
  `d3ab9d9b1dc636fb625453254809722480dcfc1d`,
  `public/assets/models/character/Alina_Ip_Animated.usdz`.
- Input size: 16,323,875 bytes.
- SHA-256: `9ee66be79042aa3fcf3c411a83325dcaeaba1638a47c4bd06ea50fcfdae2deb4`.
- The publisher identifies FaceGen Artist Pro, DAZ3D and Character Creator 4 as
  authoring tools. The archive also names TMDesign hair. These are recorded as
  source information, not a claim that Synex independently cleared every upstream
  vendor's rights. The redistribution's notice also flags that distinction;
  commercial release review must not equate the publisher's CC label with a
  completed chain-of-rights audit.

The input is obtained as an openly redistributed file with attribution. No
authenticated Sketchfab download endpoint, viewer extraction or generation API
is used. Only the USD geometry, rig data and local texture images are read;
third-party scripts are not run. No user image or health information is sent out.

## Conversion and runtime

`scripts/build-authored-trainer.py` reads the pinned USDZ using `usd-core 26.11`,
NumPy and SciPy. It retains the original facial proportions and all 62,325 hair
vertices. The 28,644 body vertices use the exercise solver. Hair has its own
rigid head transform, retaining its authored normals rather than recomputing
them every frame. A 554-point convex hull provides exact rigid-hair extrema for
wall clearance and floor support. This is fitted hair, not a physical simulation.

Native finger-joint weights generate relaxed, clasped and closed grips. The
duplicated inner eye shells are removed; the original outer iris surfaces use
a clearcoat lobe. Body and eye UVs are unchanged. The source USDZ has no facial
blendshapes, so this preset currently retains its original neutral expression;
it does **not** inherit the previous MakeHuman preset's eyelid blink targets.
Do not describe a screenshot taken at progress 0.777 as proof of blinking.

Textures are locally bundled WebP files, at their original resolution up to
1024 px. Geometry and the 28 unique maps total 22,807,621 bytes. Normal maps are
lossless. The hair uses alpha-tested blending to retain
soft strand edges. A depth-writing alpha-to-coverage trial produced stippled
edges and was rejected after inspecting the app captures. The fringe tint
brings the separately authored front and rear hair
closer in color. Skin keeps its source diffuse/normal detail without the previous
trainer's blur filter. Exercise color masks use the resting anatomy across all
selected skin/clothing materials, excluding eyes, mouth, hair and shoes.

## Reproduction

Install `usd-core==26.11`, `numpy`, `scipy` and `Pillow` into an isolated Python
environment. Obtain the input from the public redistribution above and verify
its SHA-256 (the converter refuses other input). Then:

```sh
python scripts/fetch-authored-trainer.py Alina_Ip_Animated.usdz
python scripts/build-authored-trainer.py Alina_Ip_Animated.usdz GENERATED
python scripts/pack-trainer-character.py GENERATED frontend/src/health/components/character/assets/authored female
npm --prefix frontend run build:personal
```

Original map SHA-256 values, source material names and artwork attribution are
retained in `female.json`. This is an authored game character, not a face scan
of the app user. Browser/geometry checks do not establish physical-phone frame
rate, thermal behavior or identity similarity to a photographic reference.
