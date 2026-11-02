# VTuber shoulder and leg refinement — 2026-11-02

The supplied VTuber references guide a narrower shoulder silhouette, rounded
leg contours and more deliberate clothing detail. They are style references;
this change does not reproduce their characters or claim equivalent finished
asset quality.

- Shoulder caps taper inward by up to 14 mm per side, with a smooth falloff into
  torso and upper arm. Local front/back bulk is reduced moderately. Joint centers,
  hand anchors, neck and lower-body customization remain intact.
- Coincident leg UV vertices are welded for render smoothing only when their
  positions and deformation weights match. False boundaries no longer prevent
  rounding. Hand, face and other overlapping surfaces are not welded this way.
- Leg contours use full existing subdivision blending and a gentle additional
  relaxation composed into the cached stencils. It fades out at the ankle and
  upper thigh. Positive weights retain the no-overshoot property; no second
  subdivision, added textures or extra skeleton deformation are required.
- Fitted outfits gain tonal side panels and narrow piping, using the selected
  colors and bind-space coordinates. Existing red muscle guidance remains last
  in the material composition.

Validation:

- Production personal build passed; 20 targeted tests passed across shoulder/
  torso fit, customization, smoothing and materials. These include six outfits,
  both body extremes, the 104 exercise/stretch entries, seam continuity, hand
  support/clasp clearance and finite refined surfaces within original bounds.
- Geometry changes passed the full orbit test (4.0 minutes, 30 captures).
- After the final garment material change, a focused browser test passed in
  1.1 minutes: front/side/back of standing and squat, no JS/shader errors.
- No extra subdivision level or texture asset was introduced. Physical phone
  frame rates have not been measured.

Actual final app captures:

| View | Previous | Updated |
| --- | --- | --- |
| Front | [Before](character-vtuber-slim-captures/standing-000.png) | [After](character-vtuber-contour-captures/standing-front.png) |
| Side | [Before](character-vtuber-slim-captures/standing-090.png) | [After](character-vtuber-contour-captures/standing-side.png) |
| Rear | [Before](character-vtuber-slim-captures/standing-180.png) | [After](character-vtuber-contour-captures/standing-back.png) |
| Squat | [Before](character-vtuber-slim-captures/squat-090.png) | [After](character-vtuber-contour-captures/squat-side.png) |

The outfit, colors and maximum chest/hip/glute values match the prior captures.

This improves the current exercise avatar. The references' elaborate hair,
layered costumes and illustration-level face work are still beyond this asset.
The browser review is not a physical-phone performance or capture-accuracy test.
