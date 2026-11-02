# VTuber body and garment correction — 2026-11-02

Fitted pants had an extra fragment of the original loose shorts over the native
pelvic body mesh. The fragment created baggy folds at the front, a floating lip
at the side and an irregular rear silhouette during squats. The underlying body
was previously assumed to be missing, based on duplicate seam vertices. Ray
checks of the native body instead show continuous front and rear surfaces.

The fitted lower garment now uses the partitioned native body alone. The native
shorts remain available in the casual outfit. No replacement anatomical mesh or
external asset is needed. The upper torso still requires its retained tee panel;
that unrelated region has not been removed. Historical review notes and the
asset README have been corrected to distinguish the two regions.

The cosmetic body field is also more gradual: maximum hip expansion is 12%
instead of 18%, with a wider waist/upper-thigh transition; rear displacement is
bounded at 2.8 cm instead of 4.5 cm and centered slightly higher. The waist blend
is broader and bounded at 12%. Slider values and independent controls remain
available. Joint heights, limb lengths, face, hands and health records are
unchanged. The editor initially previews the relaxed starting phase of the
existing shoulder-roll motion, so the arms no longer obscure the torso with a
squat clasp on entry. Exercise selection and playback remain available.

Validation:

- The personal production build passed.
- All 14 customization and smoothing tests passed. These include all six
  outfits, both shape extremes, the 104 exercise/stretch entries at five phases,
  existing clasp/chest separation, hand support and seam checks.
- For each fitted outfit, paired rays through 42 pelvic locations confirm both
  front and back coverage and a depth separation greater than 2 cm. No retained
  native shorts or pelvic patch triangles remain in fitted lower garments.
- The rendered smoothing surface remains finite and within posed bounds;
  red exercise guidance follows it through movement.
- Final production browser test passed in 3.6 minutes. The 27 orbit captures
  cover relaxed standing, squat and portrait at 45° intervals. Each full turn
  returns to its pixel-identical start, with visible preview bounds and no
  JavaScript/shader errors. Three additional matching-pose captures show the
  original squat-ready pose from the front, side and rear (30 captures total).

The comparison uses the same crop outfit, colors and maximum chest/hip/glute
settings as the reported screenshot. `reference-front.png` uses the same initial
squat phase as the old image; `standing-000.png` shows the new relaxed editor
preview. The screenshot difference is not achieved by resetting saved sliders.

Actual app comparisons (identical crop outfit and slider values):

| View | Before | Corrected |
| --- | --- | --- |
| Same front pose | [Before](character-vtuber-smooth-captures/standing-000.png) | [After](character-vtuber-body-captures/reference-front.png) |
| Same side pose | [Before](character-vtuber-smooth-captures/standing-090.png) | [After](character-vtuber-body-captures/reference-side.png) |
| Same rear pose | [Before](character-vtuber-smooth-captures/standing-180.png) | [After](character-vtuber-body-captures/reference-back.png) |
| Squat | [Before](character-vtuber-smooth-captures/squat-135.png) | [After](character-vtuber-body-captures/squat-135.png) |

New editor starting pose: [front](character-vtuber-body-captures/standing-000.png),
[side](character-vtuber-body-captures/standing-090.png) and
[rear](character-vtuber-body-captures/standing-180.png).

The tests cover geometry and selected rendered views, not a human-motion capture
study or physical-device performance. The character retains its anime style.
