import catalog from '../../../shared/lib/localCatalog.json';

const holds=new Set(['plank','wall_sit','knee_side_plank']);
const cyclic=new Set(['walk','brisk_walk','treadmill_walk','stationary_cycle','elliptical','march','standing_march','step_touch','shoulder_roll','ankle_pump']);
const alternating=new Set(['lunge','reverse_lunge','side_lunge','bird_dog','dead_bug','heel_slide','hip_abduction','standing_knee_crunch','single_calf','single_bridge']);
const floor=new Set(['bridge','single_bridge','pushup','full_pushup','plank','bird_dog','dead_bug','heel_slide','cat_cow','knee_side_plank','clamshell','prone_y','dumbbell_floor_press','dumbbell_bench_press','barbell_bench_press']);
const frontal=new Set(['curl','hammer_curl','lateral_raise','shoulder_press','band_pull_apart','machine_hip_abduction','side_lunge','sumo_squat','step_touch','hip_abduction','cable_pallof']);
const angledFloor=new Set(['prone_y','bird_dog','clamshell','knee_side_plank','dead_bug']);
const wallSupported=new Set(['wall_push','close_wall_push','calf_stretch','wall_hinge','wall_sit']);

// Catalogue IDs and camera-coach IDs deliberately remain distinct. Knee,
// incline and machine variants are never advertised as full push-up analysis.
export const CAMERA_MOTION_ALIASES=Object.freeze({squat:'squat',lunge:'lunge',side_lunge:'side_lunge',full_pushup:'push_up',plank:'plank',hinge:'hip_hinge',bridge:'glute_bridge',push_up:'push_up',hip_hinge:'hip_hinge',glute_bridge:'glute_bridge'});
export const cameraMotionId=id=>CAMERA_MOTION_ALIASES[id]||null;

const labels={};
function family(ids,moving,check,returning){for(const id of ids.split(' '))labels[id]=[moving,check,returning];}
family('sit_stand squat goblet_squat sumo_squat barbell_squat','천천히 앉기','깊이·무릎 방향 확인','바닥을 밀어 일어나기');
family('lunge split_squat dumbbell_split_squat','무릎 굽혀 낮추기','앞발 지지 확인','앞발로 밀어 올라오기');
family('reverse_lunge','뒤로 딛고 낮추기','앞발 지지 확인','앞발로 밀어 돌아오기');
family('side_lunge','옆으로 체중 이동','발·무릎 방향 확인','중앙으로 돌아오기');
family('wall_push close_wall_push','벽 쪽으로 기울이기','몸통 정렬 확인','벽을 밀어 돌아오기');
family('pushup full_pushup incline_push','가슴 천천히 낮추기','몸통·팔꿈치 확인','손으로 밀어 올라오기');
family('band_row dumbbell_row machine_row cable_row','팔꿈치 뒤로 당기기','몸통·어깨 확인','팔을 천천히 펴기');
family('scapular','날개뼈 모으기','어깨 힘 확인','편안하게 풀기');
family('bridge single_bridge','골반 천천히 올리기','어깨·골반 정렬','골반 천천히 내리기');
family('hinge wall_hinge dumbbell_rdl barbell_rdl','고관절 접기','등·고관절 확인','엉덩이 힘으로 일어나기');
family('bird_dog','반대 팔·다리 뻗기','골반 수평 확인','손·무릎 돌아오기');
family('dead_bug','한쪽 발 내리기','허리 지지 확인','발을 시작 위치로');
family('heel_slide','뒤꿈치 밀어내기','골반 지지 확인','뒤꿈치 당기기');
family('curl hammer_curl','팔꿈치 굽히기','위팔 고정 확인','천천히 내리기');
family('calf single_calf seated_calf','뒤꿈치 올리기','발목·균형 확인','뒤꿈치 천천히 내리기');
family('shoulder_press','팔 위로 밀기','어깨·몸통 확인','팔 천천히 내리기');
family('lateral_raise','팔 옆으로 들기','어깨 높이 확인','팔 천천히 내리기');
family('front_raise','팔 앞으로 들기','어깨 높이 확인','팔 천천히 내리기');
family('hip_abduction','다리 옆으로 들기','몸통 고정 확인','다리 돌아오기');
family('standing_knee_crunch','무릎 당기기','몸통·균형 확인','발 내려놓기');
family('chest_open band_pull_apart','팔 벌려 가슴 열기','어깨·몸통 확인','천천히 모으기');
family('cat_cow','등 천천히 둥글게','목·골반 확인','등 부드럽게 펴기');
family('thoracic_rotation','몸통 부드럽게 돌리기','골반 고정 확인','중앙으로 돌아오기');
family('hamstring_stretch calf_stretch','편안한 범위 늘리기','편안하게 호흡','힘 빼고 돌아오기');
family('triceps_extension','팔꿈치 펴기','위팔 고정 확인','천천히 굽히기');
family('clamshell','위쪽 무릎 열기','발 모아 골반 고정','무릎 천천히 닫기');
family('prone_y','팔을 낮게 들기','목·허리 확인','팔 내려놓기');
family('machine_chest_press','가슴 앞에서 밀기','어깨·손목 확인','팔꿈치 천천히 굽히기');
family('dumbbell_bench_press dumbbell_floor_press barbell_bench_press','가슴 위로 밀기','어깨·손목 확인','팔꿈치 천천히 굽히기');
family('lat_pulldown','가슴 앞으로 당기기','상체 고정 확인','팔을 천천히 펴기');
family('leg_press','발판 밀기','골반·무릎 확인','무릎 천천히 굽히기');
family('leg_extension','무릎 펴기','무릎 축 확인','천천히 굽히기');
family('seated_leg_curl','뒤꿈치 당기기','허벅지 지지 확인','무릎 천천히 펴기');
family('machine_hip_abduction','양 무릎 벌리기','골반 고정 확인','천천히 모으기');
family('cable_pushdown','팔꿈치 펴서 내리기','위팔 고정 확인','팔꿈치 천천히 굽히기');
family('cable_face_pull','얼굴 양옆으로 당기기','어깨 높이 확인','팔 천천히 펴기');
family('cable_pallof','두 손 앞으로 밀기','몸통 정렬 유지','두 손 가슴으로');
family('dumbbell_shrug','어깨 작게 올리기','목·팔 힘 확인','어깨 천천히 내리기');
family('walk brisk_walk treadmill_walk','발 번갈아 딛기','몸통 세우기','편안한 리듬 이어가기');
family('march standing_march','한쪽 발 들기','몸통·균형 확인','반대 발로 교대');
family('step_touch','옆으로 딛기','발·균형 확인','모으고 반대쪽으로');
family('shoulder_roll','어깨 부드럽게 돌리기','목의 힘 풀기','편안한 리듬 이어가기');
family('ankle_pump','발끝 당기기','발목 범위 확인','발끝 천천히 펴기');
family('stationary_cycle','페달 부드럽게 밀기','무릎 방향 확인','반대 페달 이어가기');
family('elliptical','팔·다리 번갈아 밀기','몸통 세우기','편안한 리듬 이어가기');
const holdLabels={plank:'몸통 정렬 유지 · 호흡',wall_sit:'벽 지지 유지 · 호흡',knee_side_plank:'팔꿈치·무릎 지지 · 호흡'};

export const MOTION_GUIDES=Object.fromEntries(catalog.map(exercise=>{
  const id=exercise.motion_id,kind=holds.has(id)?'hold':cyclic.has(id)?'cyclic':alternating.has(id)?'alternating':'reps';
  const instructions=exercise.instructions;
  const verbs=labels[id]||['천천히 움직이기','자세 확인','천천히 돌아오기'];
  const phases=kind==='hold'?[{label:holdLabels[id],cue:instructions[1]||instructions[0],start:0,end:1}]:[
    {label:'준비',cue:instructions[0],start:0,end:.08},
    {label:verbs[0],cue:instructions[1]||instructions[0],start:.08,end:.43},
    {label:verbs[1],cue:exercise.cautions?.[0]||instructions[1]||instructions[0],start:.43,end:.57},
    {label:verbs[2],cue:instructions.at(-1),start:.57,end:1},
  ];
  const durationMs=kind==='hold'?6000:kind==='alternating'?12000:id==='stationary_cycle'?3200:kind==='cyclic'?4000:7000;
  return [id,{name:exercise.name,kind,durationMs,defaultView:wallSupported.has(id)?'side':angledFloor.has(id)?'45':frontal.has(id)?'front':floor.has(id)?'side':'45',floor:floor.has(id),phases}];
}));
export const getMotionGuide=id=>MOTION_GUIDES[id]||null;
export function motionPhase(id,progress=0){
  const guide=getMotionGuide(id);if(!guide)return null;
  let t=Number.isFinite(progress)?Math.max(0,Math.min(progress,1)):0;
  if(guide.kind==='alternating')t=t===1?1:(t*2)%1;
  const index=Math.max(0,guide.phases.findIndex(phase=>t<phase.end||phase.end===1));
  return {...guide.phases[index],index,total:guide.phases.length,cycleProgress:t};
}
