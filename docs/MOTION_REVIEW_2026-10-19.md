# Motion and feedback review — 2026-10-19

Scope: 74 training motions and 30 recovery motions. This is a software geometry/rendering review, not clinical approval or physical-phone validation.

## Review method

- All 104 rigs were sampled at 121 positions through one complete cycle. Bone lengths, finite coordinates, loop closure and hand/foot rotations were checked.
- `AllMotionContinuity.test.js` additionally checks 240 positions per motion at a very small time step, including wrist/ankle quaternion continuity and recovery wrist flexion. A coarse rotation step during a three-second arm raise is not itself a discontinuity.
- The actual deformed clothing mesh was inspected at phases 0, .25, .5 and .75 in CPU contact sheets. Actual Chromium renders cover 74 training motions at 0, .25 and .5; `gym-recovery.spec.js` also captures all 30 recovery motions. Release verification reports determine the final browser pass status.
- `WallSupportSurface.test.js` tests the actual skin/shoe envelope against support walls at 81 phases, across three sex profiles and three stature scales. Equipment tests check fixed bones, seats, benches, grips, pedals, joint pivots and load placement. This is not an exhaustive collision proof for every possible body shape.
- Feedback uses synthetic landmark projections and controlled changes to shoulders, elbows, wrists, hips, knees and feet. Every one of 74 actual analyzer routes produces more than one observation and feedback message. 72 profiles exercise a visible correction condition; single-leg calf raises and calf stretches report observations without mislabeling their intentional left/right differences. Real-person video accuracy remains unvalidated.

## Corrections made during review

Neutralized excessive hand bending in band pull-apart, overhead triceps extension, shoulder press, goblet/back squat, selected presses/rows, cycling, elliptical and Pallof press. Chest opening and thoracic rotation now let the hands follow the forearms. Overhead triceps extension uses two neutral-grip dumbbells. Palm-target IK keeps the back-squat bar behind the upper torso and both goblet palms near the upper plate across tested stature scales; the rendered goblet load was moved below its support points.

Recovery arm transitions interpolate fixed-length limb rotations to avoid IK flips. Child poses now face the floor, keep anatomical sides, and use supported hands/feet. Triceps/shoulder stretches, rear-knee placement, quad ankle support, knee hugs, hamstring extension and ankle circles were adjusted. Support palms in push-ups/quadruped/wall exercises retain their intended extension.

Final screen inspection also found that a constant shoulder-width skinning mask partially attached the waist to the forearms. The arm mask now follows torso height, keeping the waist and shirt hem stable during arm raises while preserving the original shoulder attachment. The upper-arm surface is also checked against its posed bone segments so the waist correction cannot leave the armpit behind and stretch it into a bulge. A regression raises only the arms and checks the actual waist surface for male, female and mixed anatomy while ensuring the hands still move. All 74 exercise thumbnails were regenerated from the corrected renderer.

The table's wrist deviation is the angle between the rig's forearm and hand axes, **not a clinical wrist measurement or a quality score**. Supported palms intentionally have larger values. The fine-step continuity regression is separate from this maximum bend.

## Per-motion inventory

The hand-detail revision replaces the single cylindrical finger bend with separate finger-root, middle and distal flexion, plus thumb opposition. It retains calibrated open support palms, uses gentle curls for unsupported hands and permits separate right/left shapes. Seven upright clasp demonstrations now solve both arms to a shared, staggered palm frame. The deep-squat reach was shortened after inspection found excessive wrist deviation. `HandDetail.test.js` checks clasp stability and wrist angles at 121 phases, unmodified support surfaces and finite surfaces for all 104 motions across male/female profiles. Four-phase body sheets and three-view hand close-ups supplement actual browser captures; these are authored demonstrations, not motion-capture data or an exhaustive mesh collision proof.

| Motion | Name | Maximum rig wrist deviation | Review |
|---|---|---:|---|
| `sit_stand` | 의자 앉았다 일어나기 | 55° | 51 feedback messages under varied synthetic inputs |
| `squat` | 맨몸 스쿼트 | 60° | 41 feedback messages under varied synthetic inputs |
| `wall_push` | 벽 푸시업 | 69° | 29 feedback messages under varied synthetic inputs |
| `pushup` | 무릎 푸시업 | 79° | 40 feedback messages under varied synthetic inputs |
| `band_row` | 밴드 로우 | 24° | 30 feedback messages under varied synthetic inputs |
| `scapular` | 서서 날개뼈 모으기 | 0° | 2 feedback messages under varied synthetic inputs |
| `bridge` | 글루트 브리지 | 12° | 25 feedback messages under varied synthetic inputs |
| `hinge` | 맨몸 힙 힌지 | 0° | 19 feedback messages under varied synthetic inputs |
| `bird_dog` | 버드독 | 66° | 29 feedback messages under varied synthetic inputs |
| `dead_bug` | 누워 발뒤꿈치 터치 | 12° | 23 feedback messages under varied synthetic inputs |
| `curl` | 덤벨 컬 | 0° | 30 feedback messages under varied synthetic inputs |
| `calf` | 지지대 잡고 뒤꿈치 들기 | 60° | 20 feedback messages under varied synthetic inputs |
| `walk` | 편안한 걷기 | 0° | 58 feedback messages under varied synthetic inputs |
| `march` | 앉아서 제자리 발 들기 | 51° | 56 feedback messages under varied synthetic inputs |
| `lunge` | 교대 런지 | 54° | 25 feedback messages under varied synthetic inputs |
| `shoulder_press` | 덤벨 숄더 프레스 | 0° | 17 feedback messages under varied synthetic inputs |
| `lateral_raise` | 덤벨 레터럴 레이즈 | 0° | 11 feedback messages under varied synthetic inputs |
| `plank` | 팔꿈치 플랭크 | 1° | 7 feedback messages under varied synthetic inputs |
| `step_touch` | 좌우 스텝 터치 | 0° | 50 feedback messages under varied synthetic inputs |
| `standing_march` | 서서 제자리 걷기 | 0° | 51 feedback messages under varied synthetic inputs |
| `hip_abduction` | 서서 다리 옆으로 들기 | 59° | 11 feedback messages under varied synthetic inputs |
| `heel_slide` | 누워 발뒤꿈치 밀기 | 12° | 26 feedback messages under varied synthetic inputs |
| `chest_open` | 서서 가슴 열기 | 0° | 8 feedback messages under varied synthetic inputs |
| `shoulder_roll` | 어깨 가볍게 돌리기 | 0° | 2 feedback messages under varied synthetic inputs |
| `cat_cow` | 네발기기 등 움직이기 | 66° | 8 feedback messages under varied synthetic inputs |
| `thoracic_rotation` | 서서 몸통 회전 | 0° | 28 feedback messages under varied synthetic inputs |
| `ankle_pump` | 앉아서 발목 움직이기 | 51° | 20 feedback messages under varied synthetic inputs |
| `hamstring_stretch` | 앉아서 뒤 허벅지 늘리기 | 51° | 22 feedback messages under varied synthetic inputs |
| `calf_stretch` | 벽 잡고 종아리 늘리기 | 84° | 26 feedback messages under varied synthetic inputs |
| `triceps_extension` | 덤벨 트라이셉스 익스텐션 | 0° | 19 feedback messages under varied synthetic inputs |
| `goblet_squat` | 고블릿 스쿼트 | 0° | 51 feedback messages under varied synthetic inputs |
| `sumo_squat` | 와이드 스쿼트 | 55° | 62 feedback messages under varied synthetic inputs |
| `split_squat` | 스플릿 스쿼트 | 39° | 26 feedback messages under varied synthetic inputs |
| `reverse_lunge` | 리버스 런지 | 55° | 20 feedback messages under varied synthetic inputs |
| `incline_push` | 높은 지지대 푸시업 | 48° | 35 feedback messages under varied synthetic inputs |
| `close_wall_push` | 좁게 벽 푸시업 | 67° | 26 feedback messages under varied synthetic inputs |
| `dumbbell_row` | 덤벨 로우 | 0° | 36 feedback messages under varied synthetic inputs |
| `band_pull_apart` | 밴드 풀어파트 | 0° | 6 feedback messages under varied synthetic inputs |
| `hammer_curl` | 해머 컬 | 0° | 38 feedback messages under varied synthetic inputs |
| `front_raise` | 덤벨 프런트 레이즈 | 0° | 16 feedback messages under varied synthetic inputs |
| `single_bridge` | 한 다리 브리지 | 12° | 42 feedback messages under varied synthetic inputs |
| `wall_hinge` | 벽 터치 힙 힌지 | 52° | 42 feedback messages under varied synthetic inputs |
| `seated_calf` | 앉아서 뒤꿈치 들기 | 51° | 23 feedback messages under varied synthetic inputs |
| `brisk_walk` | 활기찬 걷기 | 0° | 57 feedback messages under varied synthetic inputs |
| `full_pushup` | 기본 푸시업 | 75° | 37 feedback messages under varied synthetic inputs |
| `side_lunge` | 사이드 런지 | 54° | 26 feedback messages under varied synthetic inputs |
| `wall_sit` | 벽 기대 앉기 | 41° | 8 feedback messages under varied synthetic inputs |
| `knee_side_plank` | 무릎 사이드 플랭크 | 11° | 11 feedback messages under varied synthetic inputs |
| `standing_knee_crunch` | 서서 무릎 당기기 | 21° | 26 feedback messages under varied synthetic inputs |
| `clamshell` | 옆으로 누워 무릎 벌리기 | 50° | 62 feedback messages under varied synthetic inputs |
| `prone_y` | 엎드려 Y자 팔 들기 | 2° | 30 feedback messages under varied synthetic inputs |
| `single_calf` | 한 발 뒤꿈치 들기 | 72° | 35 feedback messages under varied synthetic inputs |
| `machine_chest_press` | 머신 체스트 프레스 | 0° | 29 feedback messages under varied synthetic inputs |
| `lat_pulldown` | 랫 풀다운 | 0° | 24 feedback messages under varied synthetic inputs |
| `machine_row` | 머신 시티드 로우 | 0° | 30 feedback messages under varied synthetic inputs |
| `leg_press` | 레그 프레스 | 55° | 30 feedback messages under varied synthetic inputs |
| `leg_extension` | 레그 익스텐션 | 8° | 35 feedback messages under varied synthetic inputs |
| `seated_leg_curl` | 시티드 레그 컬 | 8° | 36 feedback messages under varied synthetic inputs |
| `machine_hip_abduction` | 머신 힙 어브덕션 | 8° | 16 feedback messages under varied synthetic inputs |
| `cable_pushdown` | 케이블 트라이셉스 푸시다운 | 0° | 24 feedback messages under varied synthetic inputs |
| `cable_face_pull` | 케이블 페이스 풀 | 51° | 19 feedback messages under varied synthetic inputs |
| `cable_row` | 케이블 로우 | 0° | 30 feedback messages under varied synthetic inputs |
| `dumbbell_bench_press` | 덤벨 벤치 프레스 | 54° | 33 feedback messages under varied synthetic inputs |
| `dumbbell_floor_press` | 덤벨 플로어 프레스 | 53° | 35 feedback messages under varied synthetic inputs |
| `dumbbell_rdl` | 덤벨 루마니안 데드리프트 | 0° | 42 feedback messages under varied synthetic inputs |
| `barbell_rdl` | 바벨 루마니안 데드리프트 | 0° | 42 feedback messages under varied synthetic inputs |
| `barbell_bench_press` | 바벨 벤치 프레스 | 34° | 34 feedback messages under varied synthetic inputs |
| `barbell_squat` | 바벨 백 스쿼트 | 0° | 51 feedback messages under varied synthetic inputs |
| `dumbbell_split_squat` | 덤벨 스플릿 스쿼트 | 0° | 27 feedback messages under varied synthetic inputs |
| `dumbbell_shrug` | 덤벨 슈러그 | 0° | 3 feedback messages under varied synthetic inputs |
| `treadmill_walk` | 트레드밀 걷기 | 0° | 60 feedback messages under varied synthetic inputs |
| `stationary_cycle` | 실내 자전거 | 0° | 36 feedback messages under varied synthetic inputs |
| `elliptical` | 일립티컬 | 0° | 60 feedback messages under varied synthetic inputs |
| `cable_pallof` | 케이블 팔로프 프레스 | 0° | 9 feedback messages under varied synthetic inputs |
| `recovery_neck_side` | 목 옆면 늘리기 | 0° | Recovery pose / continuous cycle |
| `recovery_neck_diagonal` | 목 뒤 대각선 늘리기 | 0° | Recovery pose / continuous cycle |
| `recovery_neck_turn` | 목 좌우 돌아보기 | 0° | Recovery pose / continuous cycle |
| `recovery_shoulder_cross` | 어깨 가로 당기기 | 0° | Recovery pose / continuous cycle |
| `recovery_triceps` | 팔 뒤쪽 늘리기 | 37° | Recovery pose / continuous cycle |
| `recovery_lat_reach` | 광배근 위로 뻗기 | 0° | Recovery pose / continuous cycle |
| `recovery_side_reach` | 서서 옆구리 늘리기 | 0° | Recovery pose / continuous cycle |
| `recovery_chest_open` | 낮은 팔 가슴 열기 | 0° | Recovery pose / continuous cycle |
| `recovery_chest_high` | W자 가슴 열기 | 0° | Recovery pose / continuous cycle |
| `recovery_biceps` | 위팔 앞쪽 늘리기 | 0° | Recovery pose / continuous cycle |
| `recovery_wrist_flex` | 손목 굽힘근 늘리기 | 60° | Recovery pose / continuous cycle |
| `recovery_wrist_extend` | 손목 폄근 늘리기 | 60° | Recovery pose / continuous cycle |
| `recovery_upper_back` | 등 위쪽 둥글게 뻗기 | 0° | Recovery pose / continuous cycle |
| `recovery_thoracic_turn` | 서서 흉추 돌아보기 | 0° | Recovery pose / continuous cycle |
| `recovery_hamstring_stand` | 서서 뒤 허벅지 늘리기 | 0° | Recovery pose / continuous cycle |
| `recovery_hamstring_floor` | 앉아서 뒤 허벅지 늘리기 | 0° | Recovery pose / continuous cycle |
| `recovery_figure_four` | 누워 4자 엉덩이 늘리기 | 0° | Recovery pose / continuous cycle |
| `recovery_quad_stand` | 서서 앞 허벅지 늘리기 | 14° | Recovery pose / continuous cycle |
| `recovery_hip_flexor` | 반무릎 고관절 앞 늘리기 | 0° | Recovery pose / continuous cycle |
| `recovery_calf_straight` | 무릎 편 종아리 늘리기 | 0° | Recovery pose / continuous cycle |
| `recovery_calf_bent` | 무릎 굽힌 종아리 늘리기 | 0° | Recovery pose / continuous cycle |
| `recovery_adductor_side` | 옆으로 체중 옮겨 안쪽 허벅지 늘리기 | 0° | Recovery pose / continuous cycle |
| `recovery_butterfly` | 나비 자세 | 0° | Recovery pose / continuous cycle |
| `recovery_child` | 아기 자세 | 55° | Recovery pose / continuous cycle |
| `recovery_child_side` | 아기 자세 옆으로 뻗기 | 55° | Recovery pose / continuous cycle |
| `recovery_knee_hug` | 누워 한 무릎 안기 | 0° | Recovery pose / continuous cycle |
| `recovery_double_knee` | 누워 두 무릎 안기 | 0° | Recovery pose / continuous cycle |
| `recovery_supine_hamstring` | 누워 뒤 허벅지 늘리기 | 0° | Recovery pose / continuous cycle |
| `recovery_ankle_circles` | 앉아서 발목 돌리기 | 0° | Recovery pose / continuous cycle |
| `recovery_cat_release` | 네발 자세 등 풀기 | 66° | Recovery pose / continuous cycle |

Sampling time: 2026-10-19T05:24:55.111Z. Reproducible regression coverage is in `AllMotionContinuity.test.js`, `CatalogFeedbackCoverage.test.js`, `EquipmentCatalogRig.test.js`, `WorkoutRecovery.test.jsx`, `WallSupportSurface.test.js` and the two browser render scenarios. Stored screenshot artifacts are published only with their actual run results; an interrupted or failed run is not a passing release check.
