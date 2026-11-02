# Studio trainer and wrist review — 2026-11-02

The previous clasp placed wrists far apart vertically and bent them sideways.
The new clasp uses diagonally opposed hands, a small finger stagger, fixed arm
lengths and forearm rotation continuous with the hand. Detailed models fit their
palm plane from their own surface. Unsupported hands inherit forearm twist;
they no longer take an independent shortest rotation around a straight wrist.

The Studio option uses a coordinated cosmetic mapping of skin, clothes, eyes,
hair, finger deltas and rest joints. The pelvis rises from 0.940 to 1.005 m in the
demonstration coordinate system; the upper head/eyes scale to 90%, blended through
the jaw/neck. Equipment scale stays independent of pelvis height. Muscle color
weights retain their canonical anatomical vertices when proportions change.
Personal measurements and calorie inputs do not use these cosmetic dimensions.

The female Studio option adapts the existing attributed Alina Ip asset, with a
locally bundled generated UV-albedo edit and revised hair materials. It is not a
new photographic scan or DLSS integration. Source, license, edits and texture
hashes are in the authored asset README, NOTICE and studio-head.json. This source
retains a neutral expression without native eyelid blink animation. Its visual
quality still differs from the user's commercial-game reference.

## Application path

Profile → My exercise character → female or male detailed model → Studio →
Save and apply to exercise. Selecting a detailed model previews Studio. Existing
saved customizations and the Natural/Original options remain readable.

## Verification

- The Studio tests cover both model profiles across all 74 exercise motions and
  30 recovery stretches at five cycle positions: finite surfaces, unit normals,
  welded UV seams, wall clearance and floor support.
- Clasp wrist bends stay below 40 degrees throughout each complete repetition;
  forearm lengths and continuous palm/forearm rotation are checked separately.
- A synthetic tilted palm verifies surface calibration, independent of the
  shared default hand normal. Unsupported-hand tests check that only the required
  wrist bend remains, with no additional axial twist.
- Local texture hashes, saved selection/record preservation and unchanged muscle
  color vertex assignments are checked.
- Representative hand close-ups inspect squat (two phases), wall push-up, floor
  push-up and dumbbell curl from the back and palm sides of both hands.
- The browser test selects Studio through the actual UI, saves it, opens the
  exercise library and checks that the selected model animates automatically,
  without JavaScript or shader errors.

The exhaustive custom-hand geometry test originally exceeded its 30-second CPU
budget on this host. It retains every motion and now has a 90-second limit, since
this is a geometry correctness check, not a phone frame-rate benchmark. Its
isolated rerun passed in 22.63 seconds including setup. No geometric assertion
was relaxed; the clasp bend threshold was tightened from 60 to 40 degrees.

A depth-only hair prepass produced bright stipples in the app capture and was
rejected. Opaque colored strand cores plus blended edges replace that trial.
Final screenshots are captured from the application, not generated mockups.

## Results and captures

31 related unit checks passed in separate runs, including the two checks for
anatomical color placement added after the proportion review. The personal web
build passed. The build still reports its existing large-chunk advisory.
The final browser selection/save/automatic-exercise-playback test passed in
5.7 minutes on software WebGL, with no JavaScript or shader errors. This elapsed
time is the headless test runtime, not an application load-time measurement.

- [Studio face, application render](character-studio-captures/studio-face-front.png)
- [Studio body and clasp, application render](character-studio-captures/studio-body-squat.png)
- [Automatically playing squat with muscle guidance](character-studio-captures/studio-exercise.png)
- [Clasp hand surfaces](character-studio-captures/hands-squat-0.png)
- [Wall-support hand surfaces](character-studio-captures/hands-wall_push-0.5.png)
- [Floor-support hand surfaces](character-studio-captures/hands-full_pushup-0.5.png)
- [Dumbbell-curl hand surfaces](character-studio-captures/hands-curl-0.5.png)

Hand surface views isolate geometry for inspection; the face/body captures use
the real app's materials and camera. Captures are from the mobile-sized browser
viewport, not an Android handset.

These checks use Chromium with software WebGL in the build environment. They do
not establish physical-phone frame rate, heat behavior, photographic likeness,
or equivalence to the reference game's production assets. No new APK is produced
by this change; the personal web bundle is built and checked separately.
