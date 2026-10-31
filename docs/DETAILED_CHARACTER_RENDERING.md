# Detailed character rendering

The previous procedural head and separately fitted hair do not reach the visual
quality requested for the exercise character. This change adds a full authored
character pipeline instead of further small edits to that head. It starts from
`30b9caa` on the latest pushed `feat/routine-conditions-period` branch.

The character editor offers **여성 디테일 모델**, **남성 디테일 모델**, and
**자유 꾸미기 모델**. Applying a detailed preset previews its original face,
hair, outfit and body. Saving stores the validated local `model` preference and
applies it to exercise demonstrations. Legacy saved settings normalize to the
existing configurable model. Health records and body-composition measurements
are not rewritten. Controls that cannot alter an authored preset are hidden with
an explicit explanation and a switch back to the configurable model.

The new renderer uses locally bundled MIT Rocketbox graphics, normal maps,
texture-driven roughness, authored eyelid shapes, original finger-joint weights
and UV-seam normal smoothing. Exercise motion continues to use the existing
corrected joint solver and red muscle guidance. Wall clearance is calibrated
against the new complete surface. Every viewer owns its disposable geometry and
materials; shared texture-loader resources are retained. Only the selected
character's texture maps are requested. No selfie, health record or video is
sent to a generation service.

Sources and reproducible conversion steps are in
`frontend/src/health/components/character/assets/detailed/README.md`.
The generated character geometry and textures total 7,752,236 bytes (7.39 MiB) on disk,
including both bodies; this is not a measurement of on-device GPU memory.

## Research and limits

- Meshy official API documentation: https://docs.meshy.ai/en/api/image-to-3d
  and https://docs.meshy.ai/en/api/authentication. A paid/key-authenticated
  generation service does not guarantee usable topology, exact likeness or
  correct exercise articulation. No credential was configured and no paid task
  was submitted.
- Renderpeople's free models permit some commercial rendering, but its terms
  restrict raw redistribution and some third-party/learning application uses:
  https://renderpeople.com/general-terms-and-conditions/ . Those assets were not
  included in the app or repository.
- Microsoft Rocketbox's source is explicitly MIT licensed:
  https://github.com/microsoft/Microsoft-Rocketbox/blob/0943055db6ec570bcef9f2c8b41c9e5467c808f9/LICENSE.md .

This is a substantial asset/rendering replacement, not a claim that the output
is indistinguishable from a photograph. The detailed model does not support the
old arbitrary hair/outfit/body morph controls; they remain available on the
configurable model. Visual inspection and automated surface checks do not
establish physical-phone performance, biometric fidelity or photographic
similarity percentages.

## Verification — 2026-10-31

- Personal production build passed.
- 25 focused tests passed across seven unit/geometry suites: detailed character,
  saved character settings, render quality, elbow hinge, ankle twist, joint seams,
  and scene fallback recovery.
- Both models were evaluated for finite geometry and bounded surfaces across all
  74 exercise and 30 stretch entries at five sampled phases. Wall-support tests
  cover five motions at 17 phases. These checks are not an assessment of human
  coaching accuracy or exhaustive collision certification.
- Two mobile-viewport Chromium flows passed against the final production build:
  model selection, eye blink, wall view, save/reload, exercise demonstration and
  switching back to the configurable model. Neither flow made external HTTP
  requests or reported page/shader errors. Unsupported customization controls
  are hidden for the authored models.
- Actual rendered captures were inspected for both faces, the female closed-eye
  shape, wall contact and squat demonstration. The lip attachment, opaque-looking
  hair cards and free-standing floor offset found during iteration were corrected.
  Anchored machines and benches retain their own support height.
- All 16 upstream inputs, including the license, match pinned Git blob hashes.

Browser checks used software-rendered Chromium at 393 × 852. They do not replace
Android hardware testing, thermal/GPU-memory measurements, or an APK release.
The new presets are still visibly rendered characters at portrait scale; further
asset authoring is needed to meet a photographic visual target.

## Reference-image quality review — follow-up

**The requested photographic / premium-game-character quality gate is NOT met.**
The user reaffirmed a free-only budget and asked for a fresh comparison with the
uploaded reference images. Do not describe the following incremental corrections
as completion of that visual target.

The follow-up adds refined face/eye surfaces, a separate wet eye material, matte
scalp shading, and an additional generated face-albedo layer. Opaque skin and
transparent hair now render as separate material sets so the high-quality AO
pass does not omit the entire female model. The original body/hair topology is
retained to limit per-frame deformation work. A full-body subdivision trial was
replaced with selective head refinement; shrinking lip/hair boundaries and a
neck seam gap found in that trial were fixed before final validation.
Coincident front/back hair cards keep separate surface normals; only the actual
shared neck boundary is welded for smooth shading. A regression check covers
unit normals on every exported vertex.

Remaining visual differences from the uploaded references:

- The source facial identity and proportions still differ substantially.
- The hair is a small set of authored cards with painted scalp detail, not a
  densely groomed premium hairstyle; close-ups expose that structure.
- Skin shading lacks a calibrated multi-layer skin/scattering pipeline.
- The detailed preset retains its original outfit and proportions.

### Free-source and service investigation

- Reviewed 19 additional MIT Rocketbox adult/party previews; changing to another
  avatar from that library did not establish the requested quality improvement.
- MB-Lab's actual `license.txt` licenses its model database and generated models
  under AGPL3, not CC0. No MB-Lab asset was incorporated.
- Tencent Hunyuan3D 2 / 2.1 community licenses exclude South Korea. No generation
  request was made to those services for this Korean application.
- The official TripoSR demo reported `RUNTIME_ERROR`; the official Microsoft
  TRELLIS demo reported `CONFIG_ERROR` with an unsupported Torch version.
- Stable Fast 3D accepted a newly generated, non-personal reconstruction reference,
  but its generation endpoint failed both with optional remeshing and default
  settings. Its public Gradio API returned an upstream exception without details.
  No usable 3D model was returned. The image-generation reference is not an app
  screenshot and is not shipped in the app.
- [Alina Ip by Jungle Jim](https://sketchfab.com/3d-models/600d4d4aa71c4181b2567a3605ce8c57)
  is a closer-looking free candidate, listed by its publisher under CC BY 4.0.
  The official `/v3/models/600d4d4aa71c4181b2567a3605ce8c57/download` endpoint
  returned HTTP 401, `Authentication credentials were not provided.` No source
  model was downloaded; viewer assets were not extracted. Its original archive
  and included license must be reviewed before adaptation.
- MetaHuman's official licensing page permits use with other engines, with free
  use under its stated revenue threshold. No Epic authoring account or compatible
  production environment is connected here; no MetaHuman was created or imported.
  The separately published DNA Calibration sample repository has its own older
  license explicitly limiting sample-character use to Unreal Engine products;
  those DNA files were not imported into this WebGL app.

These are observed availability/quality limits of the attempted sources, not a
claim that photorealistic 3D is categorically impossible with free tools.

### Follow-up validation

31 tests passed across seven focused suites, including both refined-head/body
neck seams (gap below 20 micrometers), eye material isolation, all 74 exercise
and 30 stretch entries at sampled phases, walls, fingers and scene recovery.
The personal production build passed. Both final production browser flows passed
in 4.9 minutes, covering the female and male presets, authored blinking,
wall view, saved selection after reload, exercise playback and return to the
customizable character. Neither flow reported page/shader errors or external
HTTP requests.

Final app captures were inspected again, including the female portrait/blink,
male portrait and female squat. The neck seam and invalid hair normals were
corrected, but the face proportions, hair structure and overall visual fidelity
still fall short of the uploaded references. This remains an unmet acceptance
criterion, not a completed photographic-quality upgrade. Captures were produced
by the real app in software-rendered Chromium at a mobile viewport; no physical
Android device or new APK was validated in this follow-up.

A development run forcing the high-quality override through the entire female
navigation flow reached the final model-switch step but exceeded the 240-second
software-renderer test budget. The final test limits the forced high tier to the
portrait/wall checks, then restores automatic GPU detection for navigation and
exercise playback. The product's existing software-GPU fallback remains intact.
