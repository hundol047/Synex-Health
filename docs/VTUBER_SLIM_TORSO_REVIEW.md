# VTuber upper-body fit — 2026-11-02

The fitted upper body still inherited the volume of the source's loose tee.
The previous chest control also displaced a broad front region by up to 4.5 cm.
Together these made the torso look inflated, especially at maximum chest size.

A smooth fit now reduces the central ribcage width by up to 16% and depth about
its center by up to 18%, fading toward the waist, shoulder/neck and arm anchors.
Both fabric and adjacent skin use the same transformation. The crop hem and
lower-body geometry keep their positions; this is not a waist-only pinch or a
change to the exercise skeleton. The front chest adjustment now adds up to
2.8 cm and 2.5% width, with the hair-clearance adjustment using the same depth
range. Saved slider values, separate body controls and health records remain.

The retained sleeve rim is identified from physical edges, ignoring duplicated
UV vertices. Its fit target uses a consistent arm-axis distance before projection
onto the upper arm, reducing the uneven cap edge. Subtle side stitching follows
the shirt's bind coordinates, alongside the existing fabric finish and hem
stitches. No added texture download, remote generation or paid asset is used.

Validation:

- Personal production build passed.
- Nineteen tests across torso fit, customization, surface finishing and render
  smoothing passed. Waist/neck/limb anchors remain unchanged; transition samples
  remain continuous. Paired rays verify chest coverage and front/back depth in
  every outfit, including increasing volume with the chest control.
- Existing checks include six outfits at body extremes, 104 exercise/stretch
  motions at five phases, clasp/chest clearance, hand angles, welded seams,
  wall support and red exercise-guide attachment.
- Final production browser review passed in 3.7 minutes: 27 orbit captures
  across standing, squat and portrait, plus three matching-pose reference views.
  Full turns return to pixel-identical start images, with no JavaScript/shader
  errors or preview bounds hidden by navigation. Front, side, rear and the
  clasp/squat views were reviewed in the actual renderer.

Comparisons retain the same crop outfit, colors and maximum chest/hip/glute
settings as the prior body review. Saved values are not reset to create the
appearance change.

Actual app comparisons, with the same settings and camera:

| View | Previous body fit | Slimmer upper body |
| --- | --- | --- |
| Relaxed front | [Before](character-vtuber-body-captures/standing-000.png) | [After](character-vtuber-slim-captures/standing-000.png) |
| Relaxed side | [Before](character-vtuber-body-captures/standing-090.png) | [After](character-vtuber-slim-captures/standing-090.png) |
| Relaxed rear | [Before](character-vtuber-body-captures/standing-180.png) | [After](character-vtuber-slim-captures/standing-180.png) |
| Clasped hands | [Before](character-vtuber-body-captures/reference-front.png) | [After](character-vtuber-slim-captures/reference-front.png) |
| Squat side | [Before](character-vtuber-body-captures/squat-090.png) | [After](character-vtuber-slim-captures/squat-090.png) |

These are rendered anime character proportions, not a scan of the user's body.
Browser and geometry tests do not substitute for physical-device performance
checks. No new APK is produced in this change.
