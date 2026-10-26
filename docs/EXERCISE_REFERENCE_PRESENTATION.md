# Instructional 3D presentation (2026-10-26)

Reference: user-provided 18-second screen recording, specifically the final exercise demonstration. The requested scope is the presentation of every existing exercise, not adding only a Bulgarian split squat.

The shared ExerciseMotion3D renderer now starts with a light grey mannequin. Broad target regions use red and secondary regions use pale red. Labels come from the existing exercise catalogue; the colored areas are instructional surface regions, not individual anatomical muscle segmentation or camera-measured activation. Mobility, whole-body and unknown movements without a specific supported muscle label remain neutral. The separate personal body-composition comparison is not part of this renderer.

The existing mesh vertices, triangles, joint animation, calibrated grips, support contacts and equipment are retained. Vertex colors attach to the neutral mesh before skeletal deformation so the regions follow the motion. One rough, nonmetallic material replaces the face/hair/clothing textures in mannequin mode. The full viewer allows switching back to the dressed athlete without resetting the current pose. The camera split viewer uses a small overlaid legend instead of reducing the height available to the exercise.

Validation:
- Existing frontend suite: 552 passing tests.
- Two additional tests cover region selection, front/back masks, and preservation of every mesh position and index.
- Camera split-screen tests: four passed, including 360x640, landscape and camera permission denial.
- Server-mode dressed-avatar regression: passed.
- Personal web production build: passed.
- All 74 exercises rendered three sampled poses offline with no page errors or API requests. Eight library/rendering/browser tests passed, including preserving playback position across appearance changes.

Physical-device GPU performance and biomechanics/clinical accuracy are not established by these rendering checks. Source changes do not update an already installed APK.

Opening an exercise demonstration explicitly starts its looping animation. Pausing, seeking, backgrounding the app, and moving the viewer out of view stop playback; workout timers and recording still use their existing explicit controls.
