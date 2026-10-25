import catalog from '../../../shared/lib/localCatalog.json' with {type:'json'};
import {cameraMotionId, getMotionGuide} from './motionGuide.js';

// Explicit observation contracts for every catalog entry. These are conservative
// 2D coaching heuristics, not validated clinical limits or equipment tracking.
const upper=[11,12,13,14,15,16,23,24],lower=[11,12,23,24,25,26,27,28];
const all=[...new Set([...upper,...lower])],feet=[...lower,29,30,31,32];
const profiles={};
function group(ids,profile){for(const id of ids.split(' '))profiles[id]={...profile};}
const count=(metric,start,end)=>({metric,start,end});
const rule=(metric,limit,message,bodyPart,joints,options={})=>({metric,limit,message,bodyPart,joints,...options});
const upright=rule('trunkLean',30,'몸통 기울기가 큽니다. 반동을 줄이고 가슴과 골반을 함께 세워 보세요.','몸통',[11,12,23,24]);
const level=rule('shoulderLevel',.28,'양쪽 어깨 높이가 다르게 보입니다. 카메라 수평을 확인한 뒤 어깨를 나란히 맞춰 보세요.','어깨',[11,12],{view:'front'});
const elbows=rule('elbowDrift',.55,'팔꿈치가 몸통에서 멀어졌습니다. 위팔을 몸 옆에 두고 팔꿈치를 중심으로 움직여 보세요.','팔꿈치',[11,12,13,14],{view:'front'});
const knees=rule('kneeTracking',.60,'무릎이 발 간격보다 안으로 모여 보입니다. 무릎을 발끝 방향으로 유지하며 범위를 줄여 보세요.','무릎',[25,26,27,28],{below:true,view:'front',when:['knee',150,'below']});
const alignment=rule('bodyLine',150,'어깨·골반·발목의 선이 꺾여 보입니다. 복부와 엉덩이에 힘을 주고 몸통을 길게 정렬하세요.','몸통',[11,12,23,24,27,28],{below:true,view:'side'});
const effort={
 squat:'허벅지와 엉덩이로 내려가는 힘을 버티고 발바닥 전체로 바닥을 밀어 일어나세요.',
 split:'앞발 전체를 누르며 앞다리 허벅지와 엉덩이로 올라오세요. 뒷다리는 균형을 돕습니다.',
 hinge:'엉덩이를 뒤로 보내 허벅지 뒤쪽을 늘리고, 발을 누르며 엉덩이로 고관절을 펴세요.',
 press:'가슴과 팔 뒤쪽으로 밀고 내려올 때도 천천히 버티세요. 손목과 팔꿈치를 연결해 힘을 전달하세요.',
 overhead:'배에 힘을 주어 몸통을 고정하고 어깨와 팔 뒤쪽으로 위를 향해 미세요.',
 row:'몸통을 고정하고 팔꿈치를 뒤로 보내 등으로 당기세요. 어깨를 귀 쪽으로 끌어올리지 마세요.',
 curl:'위팔을 고정하고 팔 앞쪽으로 굽히세요. 내려갈 때도 덤벨에 끌려가지 않게 천천히 버티세요.',
 triceps:'위팔을 고정한 채 팔 뒤쪽으로 팔꿈치를 펴세요. 손목에 힘을 몰거나 관절을 세게 잠그지 마세요.',
 raise:'어깨로 팔을 천천히 들어 올리세요. 몸통 반동과 어깨 으쓱임을 줄이고 편안한 높이에서 돌아오세요.',
 bridge:'발바닥을 누르고 엉덩이로 골반을 올리세요. 허리를 꺾어 높이를 늘리지 마세요.',
 core:'복부에 가볍게 힘을 주고 골반을 안정시킨 채 움직이세요. 숨을 참지 마세요.',
 calf:'발 앞부분으로 지지하며 종아리로 뒤꿈치를 올리고 천천히 내리세요.',
 mobility:'늘어나는 부위를 느끼며 편안한 범위에서 천천히 움직이세요. 반동으로 범위를 늘리지 마세요.',
 gait:'지지하는 발로 바닥을 밀고 몸통을 세워 부드럽게 체중을 옮기세요.',
 legExtend:'허벅지 앞쪽으로 무릎을 펴고 천천히 돌아오세요. 무릎을 튕겨 잠그지 마세요.',
 legCurl:'허벅지 뒤쪽으로 뒤꿈치를 당기고 돌아갈 때도 천천히 버티세요.',
 abduct:'골반을 고정한 채 엉덩이 옆쪽으로 다리를 벌리세요. 몸통을 기울여 범위를 늘리지 마세요.',
};
group('sit_stand squat goblet_squat sumo_squat barbell_squat',{family:'squat',required:lower,views:['side','front'],posture:'standing',observations:['knee','hip','trunkLean'],counter:count('knee',155,110),rules:[knees,rule('trunkLean',70,'몸통이 크게 기울어져 보입니다. 깊이를 줄이고 가슴과 골반을 함께 움직이세요.','몸통',[11,12,23,24],{when:['knee',125,'above']})]});
group('lunge reverse_lunge split_squat dumbbell_split_squat',{family:'split',required:lower,views:['side'],posture:'standing',observations:['kneeMin','hip','trunkLean'],counter:count('kneeMin',155,110),rules:[upright]});
group('side_lunge',{family:'split',required:lower,views:['front'],posture:'standing',observations:['kneeMin','kneeDifference','trunkLean'],counter:count('kneeMin',155,115),rules:[upright]});
group('hinge wall_hinge dumbbell_rdl barbell_rdl',{family:'hinge',required:lower,views:['side'],posture:'standing',observations:['hip','knee','trunkLean'],counter:count('hip',155,110),rules:[rule('knee',125,'무릎이 많이 굽혀졌습니다. 엉덩이를 뒤로 보내 고관절을 접고 무릎 굽힘을 줄여 보세요.','무릎·골반',[23,24,25,26,27,28],{below:true})]});
group('wall_push close_wall_push incline_push',{family:'press',required:all,views:['side'],posture:'supportedPress',observations:['elbow','bodyLine'],counter:count('elbow',155,100),rules:[alignment]});
group('full_pushup',{family:'press',required:all,views:['side'],posture:'floor',observations:['elbow','bodyLine'],counter:count('elbow',155,100),rules:[alignment]});
group('pushup',{family:'press',required:all,views:['side'],posture:'floor',observations:['elbow','hip'],counter:count('elbow',155,100),rules:[rule('hip',145,'어깨·골반·무릎의 선이 꺾여 보입니다. 무릎으로 지지한 채 복부에 힘을 주고 몸통을 함께 움직이세요.','골반',[11,12,23,24,25,26],{below:true})]});
group('plank',{family:'core',required:all,views:['side'],posture:'floor',observations:['bodyLine','elbow'],hold:true,rules:[alignment]});
group('wall_sit',{family:'squat',required:lower,views:['side'],posture:'standing',observations:['knee','trunkLean'],hold:true,rules:[upright,rule('knee',70,'무릎을 깊게 굽힌 상태입니다. 편안한 높이로 올라가 허벅지와 엉덩이로 버티세요.','무릎',[23,24,25,26,27,28],{below:true})],holdMetric:['knee',70,130],limitation:'벽에 등이 실제로 닿는지는 관절만으로 확인할 수 없습니다.'});
group('knee_side_plank',{family:'core',required:all,views:['any'],posture:'floor',observations:['hip','shoulderLevel'],hold:true,rules:[rule('hip',140,'몸통과 허벅지 선이 접혀 보입니다. 옆구리에 힘을 주어 골반을 정렬해 보세요.','골반',[11,12,23,24,25,26],{below:true})],holdMetric:['hip',140,180]});
group('bridge',{family:'bridge',required:lower,views:['side'],posture:'supine',observations:['hip','knee'],counter:count('hip',135,165),rules:[]});
group('single_bridge',{family:'bridge',required:lower,views:['side'],posture:'supine',observations:['hip','kneeDifference'],rules:[rule('hipLevel',.45,'골반 높이가 한쪽으로 크게 달라 보입니다. 지지하는 발과 엉덩이로 버티며 골반을 안정시켜 보세요.','골반',[23,24])],limitation:'지지하는 다리가 가려지면 단일 다리 브리지 횟수는 세지 않습니다. 골반 정렬을 관찰합니다.'});
group('shoulder_press',{family:'overhead',required:upper,views:['front'],posture:'upright',observations:['elbow','arm','wristStack'],counter:count('elbow',95,155),rules:[upright,level,rule('wristStack',.55,'손목이 팔꿈치에서 옆으로 벗어났습니다. 중량을 조절하고 손목을 팔꿈치 위에 가깝게 두세요.','손목·팔꿈치',[13,14,15,16],{aggregate:'max'})]});
group('curl hammer_curl',{family:'curl',required:upper,views:['front','side'],posture:'upright',observations:['elbow','elbowDrift','trunkLean'],counter:count('elbow',150,65),rules:[upright,elbows,level]});
group('triceps_extension',{family:'triceps',required:upper,views:['side'],posture:'upright',observations:['elbow','arm','trunkLean'],counter:count('elbow',65,155),rules:[upright,rule('arm',110,'위팔이 머리 옆에서 내려왔습니다. 편안한 범위에서 위팔을 유지하고 팔꿈치를 중심으로 움직이세요.','위팔',[11,12,13,14,23,24],{below:true})]});
group('cable_pushdown',{family:'triceps',required:upper,views:['side','front'],posture:'upright',observations:['elbow','arm','trunkLean'],counter:count('elbow',90,155),rules:[upright,elbows,rule('arm',45,'위팔이 몸통에서 크게 움직입니다. 위팔을 몸 옆에 두고 팔꿈치를 펴 보세요.','위팔',[11,12,13,14,23,24])]});
group('lateral_raise',{family:'raise',required:upper,views:['front'],posture:'upright',observations:['arm','elbow','shoulderLevel'],counter:count('arm',25,75),rules:[upright,level,rule('arm',110,'팔이 어깨보다 높게 올라갔습니다. 편안한 어깨 높이까지 범위를 줄여 보세요.','어깨',[11,12,13,14])]});
group('front_raise',{family:'raise',required:upper,views:['side'],posture:'upright',observations:['arm','elbow','trunkLean'],counter:count('arm',25,75),rules:[upright,rule('arm',110,'팔을 너무 높이 들지 않도록 어깨 높이 근처에서 천천히 돌아오세요.','어깨',[11,12,13,14])]});
group('dumbbell_row',{family:'row',required:all,views:['side'],posture:'standing',observations:['elbow','hip','trunkLean'],counter:count('elbow',150,80),rules:[rule('trunkLean',20,'몸통이 세워져 보입니다. 고관절을 접어 준비하고 몸통 각도를 유지하며 당기세요.','몸통',[11,12,23,24],{below:true})]});
group('band_row machine_row cable_row',{family:'row',required:upper,views:['side'],posture:'upright',observations:['elbow','arm','trunkLean'],counter:count('elbow',150,80),rules:[upright]});
group('lat_pulldown',{family:'row',required:upper,views:['front'],posture:'upright',observations:['elbow','arm','shoulderLevel'],counter:count('elbow',155,85),rules:[upright,level],limitation:'바의 위치·중량과 기구 설정은 스켈레톤으로 확인하지 않습니다.'});
group('cable_face_pull',{family:'row',required:upper,views:['front'],posture:'upright',observations:['elbow','wristHeight','shoulderLevel'],counter:count('elbow',150,80),rules:[upright,level,rule('wristHeight',.45,'당긴 손이 어깨보다 많이 낮습니다. 가벼운 중량으로 얼굴 양옆을 향해 당겨 보세요.','손·어깨',[11,12,15,16],{when:['elbow',110,'below']})]});
group('band_pull_apart chest_open',{family:'raise',required:upper,views:['front'],posture:'upright',observations:['handSpan','elbow','shoulderLevel'],rules:[upright,level,rule('elbow',105,'팔꿈치가 많이 굽혀졌습니다. 편안하게 편 팔을 유지하며 벌려 보세요.','팔꿈치',[11,12,13,14,15,16],{below:true})],limitation:'앞뒤 움직임이 정면 영상에서 겹치므로 반복 횟수 대신 보이는 팔·몸통 정렬을 안내합니다.'});
group('machine_chest_press',{family:'press',required:upper,views:['side'],posture:'upright',observations:['elbow','trunkLean'],counter:count('elbow',90,155),rules:[upright]});
group('dumbbell_bench_press dumbbell_floor_press barbell_bench_press',{family:'press',required:all,views:['side'],posture:'supine',observations:['elbow','hip','wristStack'],counter:count('elbow',90,155),rules:[rule('wristStack',.60,'손목이 팔꿈치에서 크게 벗어났습니다. 중량을 줄이고 팔뚝을 세워 지지해 보세요.','손목·팔꿈치',[13,14,15,16],{aggregate:'max'})],limitation:'가슴 깊이·등의 아치·바 경로는 관절만으로 판정하지 않습니다.'});
group('leg_press',{family:'squat',required:lower,views:['side'],posture:'seated',observations:['knee','hip'],counter:count('knee',95,155),rules:[rule('hip',55,'무릎을 몸통 가까이 많이 당겼습니다. 골반이 말리지 않도록 깊이를 줄여 보세요.','골반',[11,12,23,24,25,26],{below:true})],limitation:'등받이 접촉과 골반 말림 자체는 보장할 수 없습니다. 발판·중량은 분석하지 않습니다.'});
group('leg_extension',{family:'legExtend',required:lower,views:['side'],posture:'seated',observations:['knee','trunkLean'],counter:count('knee',95,155),rules:[rule('trunkLean',45,'몸통 기울기가 큽니다. 등받이에 안정적으로 기대고 허벅지를 지지해 보세요.','몸통',[11,12,23,24])]});
group('seated_leg_curl',{family:'legCurl',required:lower,views:['side'],posture:'seated',observations:['knee','trunkLean'],counter:count('knee',155,80),rules:[rule('trunkLean',45,'몸통이 크게 기울어져 보입니다. 골반과 허벅지를 패드에 안정시키고 무릎으로만 당겨 보세요.','몸통',[11,12,23,24])]});
group('machine_hip_abduction',{family:'abduct',required:lower,views:['front'],posture:'seated',observations:['kneeSpan','hipLevel','trunkLean'],rules:[upright,rule('hipLevel',.3,'좌우 골반 높이가 다릅니다. 좌석에 골반을 고정하고 편안한 범위에서 벌려 보세요.','골반',[23,24])],limitation:'좌석·패드 접촉은 확인하지 않습니다. 보이는 골반 수평과 무릎 간격을 관찰합니다.'});
group('hip_abduction',{family:'abduct',required:lower,views:['front'],posture:'standing',observations:['kneeSpan','hipLevel','trunkLean'],rules:[rule('trunkLean',20,'다리를 들며 몸통이 기울어졌습니다. 지지하는 다리에 힘을 주고 몸통을 세워 보세요.','몸통',[11,12,23,24]),rule('hipLevel',.28,'골반을 한쪽으로 들어 올리지 않도록 다리 높이를 줄여 보세요.','골반',[23,24])]});
group('calf single_calf seated_calf ankle_pump calf_stretch',{family:'calf',required:feet,views:['side'],posture:'any',observations:['ankle','knee','trunkLean'],rules:[rule('ankleDifference',30,'양쪽 발목 각도 차이가 큽니다. 발 전체가 보이게 한 뒤 지지 발의 정렬을 확인하세요.','발목',[25,26,27,28,31,32])],limitation:'발끝·뒤꿈치가 가려지면 분석을 멈춥니다. 종아리 힘이나 바닥 압력은 측정하지 않습니다.'});
profiles.single_calf={...profiles.single_calf,rules:[rule('trunkLean',30,'몸통이 크게 기울어졌습니다. 지지대를 가볍게 잡고 지지 다리 위로 몸통을 세워 보세요.','몸통',[11,12,23,24])],observations:['ankle','kneeMin','trunkLean']};
profiles.calf_stretch={...profiles.calf_stretch,family:'mobility',rules:[rule('kneeMax',150,'양 무릎이 모두 굽혀져 보입니다. 뒤쪽 무릎을 편안하게 펴고 뒤꿈치를 지지해 보세요.','무릎',[23,24,25,26,27,28],{below:true})],observations:['ankle','kneeMin']};
profiles.ankle_pump={...profiles.ankle_pump,family:'mobility'};
group('walk brisk_walk treadmill_walk elliptical standing_march march step_touch',{family:'gait',required:lower,views:['front','side'],posture:'any',observations:['knee','hip','trunkLean'],rules:[upright],limitation:'보행 속도·균형 능력이나 기구 안전을 판정하지 않습니다. 화면에 보이는 관절과 몸통을 안내합니다.'});
group('stationary_cycle',{family:'gait',required:lower,views:['side'],posture:'seated',observations:['knee','hip'],rules:[rule('kneeMax',175,'페달 아래에서 무릎이 거의 펴집니다. 잠시 멈춘 뒤 안장 높이와 무릎의 여유를 확인하세요.','무릎',[23,24,25,26,27,28])],limitation:'페달·안장과의 실제 접촉 및 저항은 분석하지 않습니다.'});
group('standing_knee_crunch',{family:'core',required:lower,views:['side'],posture:'standing',observations:['hipMin','kneeMin','trunkLean'],rules:[rule('trunkLean',45,'몸통을 크게 접기보다 배에 힘을 주고 무릎을 편안한 높이까지 당겨 보세요.','몸통',[11,12,23,24])]});
group('bird_dog',{family:'core',required:all,views:['side'],posture:'floor',observations:['hip','elbow','hipLevel'],rules:[rule('hipLevel',.35,'골반 높이가 한쪽으로 크게 달라 보입니다. 팔·다리 높이를 줄이고 골반을 안정시키세요.','골반',[23,24])],limitation:'몸통 회전과 허리 곡선은 측면 스켈레톤만으로 확정하지 않습니다.'});
group('dead_bug heel_slide',{family:'core',required:lower,views:['side'],posture:'supine',observations:['knee','hip','hipLevel'],rules:[rule('hipLevel',.35,'골반 높이가 한쪽으로 달라 보입니다. 다리 움직임을 줄이고 골반을 안정시켜 보세요.','골반',[23,24])],limitation:'허리가 바닥에 닿는지나 복압은 카메라 관절로 확인할 수 없습니다.'});
group('cat_cow',{family:'mobility',required:all,views:['side'],posture:'floor',observations:['elbow','supportOffset','hip'],rules:[rule('supportOffset',.65,'손이 어깨 아래에서 멀리 놓여 있습니다. 손과 무릎 지지 위치를 다시 잡아 보세요.','손·어깨',[11,12,15,16])],limitation:'척추의 둥글어짐은 관절 33점으로 측정하지 않습니다. 팔과 지지점만 비교합니다.'});
group('clamshell',{family:'abduct',required:lower,views:['any'],posture:'floor',observations:['kneeSpan','footSpan','hipLevel'],rules:[rule('footSpan',.6,'양발이 벌어져 보입니다. 발을 모은 상태에서 위쪽 무릎만 편안하게 열어 보세요.','발',[27,28])],limitation:'골반 회전은 한 방향 영상만으로 판정하지 않습니다.'});
group('prone_y',{family:'raise',required:all,views:['any'],posture:'floor',observations:['arm','elbow','shoulderLevel'],rules:[rule('elbow',130,'팔꿈치가 많이 굽혀졌습니다. 목의 힘을 풀고 편안하게 편 팔로 작게 들어 보세요.','팔꿈치',[11,12,13,14,15,16],{below:true})],limitation:'등 근육 활성도나 가슴의 바닥 접촉은 확인하지 않습니다.'});
group('hamstring_stretch',{family:'mobility',required:lower,views:['side'],posture:'seated',observations:['kneeMax','hip','trunkLean'],rules:[rule('trunkLean',65,'상체를 많이 숙였습니다. 반동 없이 편안한 범위로 돌아와 허벅지 뒤쪽을 늘려 보세요.','몸통',[11,12,23,24])]});
group('scapular shoulder_roll dumbbell_shrug',{family:'mobility',required:upper,views:['front'],posture:'upright',observations:['shoulderLevel','elbow','trunkLean'],rules:[upright,level],limitation:'날개뼈 자체와 근육 활성도는 추적하지 않습니다. 어깨 높이·팔꿈치·몸통만 관찰합니다.'});
profiles.dumbbell_shrug={...profiles.dumbbell_shrug,family:'raise',rules:[upright,level,rule('elbow',140,'팔꿈치를 많이 굽히고 있습니다. 팔을 편안히 늘어뜨린 채 어깨만 작게 올려 보세요.','팔꿈치',[11,12,13,14,15,16],{below:true})]};
group('thoracic_rotation cable_pallof',{family:'core',required:upper,views:['front','side','oblique'],posture:'upright',observations:['shoulderSpan','hipSpan','trunkLean','elbow'],rules:[upright],limitation:'화면 속 어깨·골반 간격은 관찰하지만 몸통의 실제 회전 각도나 저항은 측정하지 않습니다.'});

export const COACHING_CATALOG=Object.freeze(Object.fromEntries(catalog.map(exercise=>{
 const config=profiles[exercise.motion_id];
 if(!config)throw Error(`Missing coaching contract: ${exercise.motion_id}`);
 const id=cameraMotionId(exercise.motion_id)||exercise.motion_id,guide=getMotionGuide(exercise.motion_id);
 const cameraView=config.views.includes('any')?'관절이 겹치지 않는 45도':config.views.map(v=>({front:'정면',side:'측면',oblique:'45도'})[v]).join(' 또는 ');
 return [id,Object.freeze({...config,id,label:exercise.name,motionId:exercise.motion_id,trainingType:exercise.training_type,
  cameraView,defaultView:guide.defaultView,floor:guide.floor,durationMs:guide.durationMs,
  target:exercise.target_muscle.join(' · '),steps:exercise.instructions,cues:exercise.cautions,phases:guide.phases.map(p=>p.cue),
  effort:{target:exercise.target_muscle.join(' · '),load:effort[config.family],avoid:exercise.cautions.join(' ')},
  limitation:config.limitation||'카메라에 보이는 관절만 비교합니다. 중량·기구 경로·근육 활성도는 측정하지 않습니다.'})];
})));
export function coachingMotionId(id){const key=cameraMotionId(id)||id;return Object.hasOwn(COACHING_CATALOG,key)?key:null;}
export const getCoachingProfile=id=>COACHING_CATALOG[coachingMotionId(id)]||null;
