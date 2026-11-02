# Studio contact and outfit revision — 2026-11-02

The previous tests checked bounds, normals and support, but missed hands inside
the chest. An independent triangle ray cast reproduced about 35 mm penetration
in upright squats/lunges and 63 mm in wall hip hinges on the previous female
Studio surface.

## Fix

- Calibrate the outer chest/clothing envelope from each model's weighted surface.
- Place the clasp in that torso frame and rotate its palms, offsets and elbow
  poles with the chest. Leaning forward no longer leaves the hands behind.
- Tilt the diagonal grip upward to keep the wrist below 40 degrees while
  preserving forearm lengths and continuous palm/forearm rotation.
- Derive fitted navy leggings and a blue exercise top from the same body and
  native garment geometry, with ivory sneakers. Mild limb-shaft shaping and a
  less projected chest contour apply to the skin and garment together.
- Shorten the lash wings and remove sparse central fringe cards. Retain the
  dense side-part, scalp, face UVs and source eye alignment.
- Do not request textures for removed material groups.

An attempted outfit transfer from a different body left gaps around the waist
and deformed the low-poly trousers. That trial was rejected before this revision.
The final outfit shares the original source topology/weights at the hips and
legs; it does not ship the transferred garments.

## Verification

24 related unit tests passed in five files. The new independent BVH test casts
rays against the actual posed chest/shirt triangles for seven clasp motions,
13 phases, two statures and both Studio body profiles (364 poses). Each visible
hand point must remain at least 5 mm × stature scale in front of the chest;
coverage assertions prevent an empty ray intersection set from passing.

The Studio catalog test covers all 74 exercises and 30 stretches at five phases
in both profiles, checking finite geometry, unit normals, welded seams and
wall/floor bounds. The clasp tests also check the torso-local contact frame,
arm lengths and wrist angle. Changing the old world-fixed-frame assertion is
necessary because the clasp now follows a leaning chest.

The personal web build passed. The actual UI selection/save/automatic exercise
playback test passed in 3.3 minutes on software WebGL with no JavaScript or shader
errors. A saved record sentinel survived character selection. This runtime is
the complete headless test duration, not a phone loading benchmark.

Visual review covered the standing clasp, squat front/side, lunge, wall push-up,
floor push-up and bridge, as well as the frontal portrait. A shoe/foot overlap
found during that review was removed before the final captures.

- [Actual app, full body](character-redesign-captures/app-body.png)
- [Actual app, face](character-redesign-captures/app-face.png)
- [Actual app, automatically playing exercise with red muscle guidance](character-redesign-captures/app-exercise.png)
- [Squat side surface audit](character-redesign-captures/squat-side.png)
- [Floor push-up surface audit](character-redesign-captures/floor-pushup.png)
- [Bridge surface audit](character-redesign-captures/bridge.png)

App captures use the actual mobile-sized browser UI. The surface audits use the
same runtime geometry/materials with a fixed inspection camera and omit the
room/equipment; their blank background is not a demonstration of floor contact.
Bounds/support are checked separately by the catalog tests.

The checks do not establish physical Android performance or equivalence to the
user's commercial-game reference. No new APK is implied by this source change.
