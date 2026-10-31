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
The generated character geometry and textures total 5,789,334 bytes (5.52 MiB) on disk,
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
