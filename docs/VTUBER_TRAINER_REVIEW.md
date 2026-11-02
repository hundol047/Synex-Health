# Dedicated VTuber-style trainer — 2026-11-02

The user's latest direction permits a VTuber character in place of the uncanny
realistic face. This adds a separate, coherently authored anime model from the
official pixiv three-vrm sample. It does not recolor the existing realistic head.

## Application behavior

Profile → My exercise character → **버튜버 캐릭터** → Save and apply to exercise.
The model has its own native eyes, face, clothes, hair and blink/relaxed expression
shapes. Existing saved trainers and health records are preserved. The current
anime model uses its native face/hair/outfit; unsupported customization controls
are hidden. The existing custom model remains available for those controls.

The native atlas colors are retained for skin, face, eyes and hair. Relighting
the painted face with the realistic softboxes produced a grey, faceted result
during review and was rejected. Clothes use restrained toon shading and a blue
top. Thin outlines define the silhouette. The portrait camera pulls back enough
to include the anime head's crown. No AI-generated face texture is used here.

The shared exercise rig drives the model. Source finger weights produce the
grips, while the chest-envelope correction prevents the clasp from entering the
body. The smaller native hands exposed a 40.32° wrist angle in a wall hip hinge;
a small upward grip adjustment brings it below the existing 40° limit. Tests
for the preceding Studio trainers retain the same limit and pass.

Native blink shapes and a light relaxed expression are preserved. Hair-tip sway
is a small, deterministic phase-driven deformation with anchored roots, not a
strand simulation. Paused/reduced-motion demonstrations also pause these effects.
The app does not track the user's facial expression.

## Assets and license

The converted model contains 24,951 vertices and 36,470 triangles. The geometry
and local WebP maps occupy about 3.3 MiB in the source tree. They load lazily;
there is no runtime model-generation API or paid service.

Source, immutable revision, input hash, reproduction command, original license
settings and modification notice are in the [asset README](../frontend/src/health/components/character/assets/vtuber/README.md).
The source is pixiv Inc. under VRM Public License 1.0 with settings allowing
commercial use, modification and redistribution. It is not CC0. Attribution and
the source conditions are available in the app's asset credits.

## Verification

- 28 related unit tests pass across six files. After the final material change,
  the eight relevant model/material checks were rerun and pass.
- All 74 exercises and 30 stretches are sampled at five phases for the new model:
  finite geometry/normals, welded seams, conservative bounds and wall/floor bounds.
- The independent BVH chest test covers seven clasp motions, 13 phases and two
  statures for this model, in addition to the existing male/female Studio models.
- Wrist angle, fixed forearm lengths, native blink/reset, license metadata and
  preference/record preservation are checked.
- The personal web build passes. The final browser selection/preview/save/
  automatic-exercise-playback test passes in 2.0 minutes on software WebGL,
  with no JavaScript or shader errors. That is the complete test duration,
  not a device loading-time measurement.

The initial browser assertion used a five-second default and expired while
the software renderer still displayed its loading state. The test now has a
90-second readiness allowance for the software renderer;
no rendering, persistence or playback assertion was removed.

Actual application captures, reviewed after the final material/camera changes:

- [Face](character-vtuber-captures/face-front.png)
- [Native blink](character-vtuber-captures/face-blink.png)
- [Standing clasp](character-vtuber-captures/standing.png)
- [Squat, front](character-vtuber-captures/squat-front.png)
- [Squat, side](character-vtuber-captures/squat-side.png)
- [Wall push-up](character-vtuber-captures/wall-push.png)
- [Floor push-up](character-vtuber-captures/floor-pushup.png)
- [Automatically playing exercise, with red muscle guidance](character-vtuber-captures/exercise.png)

These are build-environment browser checks, not physical Android thermal or
frame-rate measurements. No new APK is claimed by this source change.
