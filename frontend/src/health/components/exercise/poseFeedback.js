import {getBodyweightGuide} from './bodyweightGuide.js';
import {RULE_THRESHOLDS as T} from './poseThresholds.js';
import {getCoachingProfile} from './coachingCatalog.js';

// Technique cues describe intended effort, never muscle activation inferred from pixels.
const effort={
 squat:{target:'허벅지 앞쪽·엉덩이',load:'내려갈 때 허벅지와 엉덩이로 버티고, 올라올 때 발바닥 전체로 바닥을 미세요. 배는 몸통이 흔들리지 않을 정도로 조입니다.',avoid:'발 안쪽으로만 체중을 싣거나 허리로 먼저 일어나지 마세요.'},
 lunge:{target:'앞다리 허벅지·엉덩이',load:'앞발의 뒤꿈치와 엄지·새끼발가락 아래를 지지하며 앞다리로 바닥을 미세요. 뒤쪽 다리는 균형을 돕습니다.',avoid:'뒷발로만 튀어 오르거나 앞 무릎을 안으로 접지 마세요.'},
 side_lunge:{target:'굽힌 다리 엉덩이·허벅지, 반대쪽 허벅지 안쪽',load:'체중을 받는 쪽 엉덩이를 뒤로 보내 버티고 그쪽 발로 중앙까지 밀어 돌아오세요.',avoid:'반대쪽 무릎까지 같이 접거나 발 안쪽으로 무너지지 마세요.'},
 push_up:{target:'가슴·팔 뒤쪽·복부',load:'내려갈 때 가슴과 팔 뒤쪽으로 버티고 올라올 때 손바닥 전체로 바닥을 미세요. 복부와 엉덩이를 함께 조여 몸통을 유지하세요.',avoid:'허리만 처뜨리거나 어깨를 귀 쪽으로 끌어올리지 마세요.'},
 plank:{target:'복부·엉덩이·어깨 주변 지지 근육',load:'팔뚝으로 바닥을 밀며 배와 엉덩이를 함께 조이세요. 갈비뼈와 골반 사이를 길게 유지하며 작게 호흡하세요.',avoid:'허리에 압박이 느껴지면 내려놓고 쉬세요. 숨을 참지 마세요.'},
 hip_hinge:{target:'엉덩이·허벅지 뒤쪽',load:'엉덩이를 뒤로 보낼 때 허벅지 뒤쪽이 길어지는 느낌을 찾으세요. 돌아올 때 발 전체를 누르며 엉덩이로 고관절을 펴세요.',avoid:'허리를 둥글게 말거나 마지막에 허리를 뒤로 젖히지 마세요.'},
 glute_bridge:{target:'엉덩이·허벅지 뒤쪽',load:'발바닥을 누르고 엉덩이를 조여 골반을 올리세요. 어깨와 발로 지지하며 내려올 때도 엉덩이의 긴장을 천천히 풀어 주세요.',avoid:'허리를 꺾어 높이를 늘리지 마세요. 허벅지 뒤가 경련하면 내려놓고 발 위치를 조정하세요.'},
};
const phaseText={ready:'시작 자세 확인',outward:'동작 진행 구간',endpoint:'방향을 바꾸는 구간',returning:'시작 위치로 돌아오는 구간',adjust:'정렬 확인',start:'시작 자세',standing:'시작 자세',eccentric:'천천히 내려가는 구간',concentric:'힘을 써서 돌아오는 구간',bottom:'방향을 바꾸는 구간',completion:'반복 마무리',holding:'유지 구간',unknown:'관찰 대기'};
const round=value=>Number.isFinite(value)?Math.round(value):null;
const pair=(values,label,reference)=>Array.isArray(values)&&values.length===2&&values.every(Number.isFinite)?{label,value:`왼쪽 ${round(values[0])}° · 오른쪽 ${round(values[1])}°`,reference}:null;
function evidence(issue){
 if(issue.evidence)return issue.evidence;
 const v=issue.value;if(!Number.isFinite(v))return null;
 if(issue.metric==='hip_height')return `어깨–발목 선에서 골반이 ${v>0?'아래':'위'}로 몸통 길이의 약 ${round(Math.abs(v)*100)}% 벗어남 · 비교: 선에 가깝게 유지`;
 if(issue.metric==='knee_tracking_ratio')return `무릎 간격/발목 간격 ${v.toFixed(2)} · 안쪽 모임 관찰 기준 ${T.kneeTrackingRatio} 미만`;
 if(issue.metric==='left_right_asymmetry')return `양쪽 무릎 각도 차이 ${round(v)}° · 차이 관찰 기준 ${T.asymmetry}° 초과`;
 if(issue.metric==='torso_inclination')return `화면 세로축에서 몸통 기울기 ${round(v)}° · 깊이와 촬영 방향을 함께 비교`;
 if(issue.metric==='shoulder_support')return `어깨와 지지점 가로 간격: 몸통 길이의 ${round(v*100)}% · 지지점을 어깨 아래에 가깝게`;
 if(['knee_angle','knee_flexion','opposite_leg_extension'].includes(issue.metric))return `관찰한 무릎 각도 ${round(v)}° · 완전히 편 상태는 약 180°`;
 if(issue.metric==='stance_width')return `화면 속 발 간격: 몸통 길이의 ${round(v*100)}% · 발 위치와 균형을 함께 확인`;
 return null;
}
export function poseFeedback(id,result){
 const profile=getCoachingProfile(id),guide=getBodyweightGuide(id)||profile,muscle=effort[id]||profile?.effort||{target:guide?.target,load:guide?.cues?.[0],avoid:guide?.cues?.[1]};
 if(!result?.detected)return {message:result?.feedback||'전신과 지지점이 보이도록 위치를 잡아 주세요.',observations:[],differences:[],muscle,phase:null};
 const m=result.metrics||{},view=m.camera_view,phase=phaseText[result.movement_phase]||'동작 관찰 중';
 const observations=[...(result.observations||[])];
 const add=x=>{if(x)observations.push(x);};
 if(['squat','lunge','side_lunge','hip_hinge'].includes(id)){
  add(pair(m.knee_flexion,'무릎 각도',id==='hip_hinge'?'무릎은 가볍게 굽히고 고관절로 접기':'내려갈 때 작아지고, 돌아올 때 커지는지 확인'));
  add(pair(m.hip_flexion,'고관절 각도','개인의 편안한 가동범위에서 비교'));
 }
 if(id==='push_up')add(pair(m.elbow_angle,'팔꿈치 각도','내려갈 때 굽히고, 몸 전체를 함께 밀어 올리기'));
 if(id==='plank'||id==='push_up')add(pair(m.body_alignment,'어깨–골반–발목 각도','측면에서 180°에 가까운 한 줄 정렬'));
 if(id==='glute_bridge'){
  add(pair(m.hip_extension,'어깨–골반–무릎 각도','위쪽에서 길게 정렬하되 허리를 꺾지 않기'));
  add(pair(m.knee_angle,'무릎 각도','발을 너무 멀리 두지 않고 발바닥으로 지지'));
 }
 if(['curl','shoulder_press','lateral_raise','front_raise'].includes(id)){
  add(pair(m.elbow_flexion,'팔꿈치 각도',profile?.steps?.[1]||'팔꿈치를 편안한 범위에서 움직이세요.'));
  add(pair(m.arm_elevation,'위팔과 몸통 사이 각도','반동을 줄이고 몸통을 고정하세요.'));
 }
 const differences=(result.issues||[]).map(issue=>({...issue,evidence:evidence(issue),action:issue.message}));
 const primary=differences[0];
 let message=primary?.message;
 if(!message){
  const angle=observations[0];
  message=angle?`${phase} · ${angle.label} ${angle.value}. ${angle.reference}.`:`${guide?.label||'운동'} ${phase}을 관찰하고 있습니다.`;
 }
 const sideOnly=['push_up','plank','hip_hinge','glute_bridge'].includes(id),limited=sideOnly&&view!=='side'||id==='side_lunge'&&view!=='front'||view==='oblique';
 const viewNote=limited?'현재 촬영 방향에서는 일부 정렬을 판정할 수 없습니다. 권장 방향으로 옮겨 주세요.':id==='squat'&&view==='side'?'측면에서는 무릎이 안으로 모이는지 판정하지 않습니다.':'화면에서 보이는 관절만 비교합니다. 교정 표시가 없다고 모든 자세가 정확하다는 뜻은 아닙니다.';
 return {message,observations,differences,muscle,phase,viewNote:profile?`${viewNote} ${profile.limitation}`:viewNote,view,limited,breathing:'힘을 쓰는 동안 천천히 숨을 내쉬고, 숨을 참지 마세요.'};
}

// Retains only bounded numeric aggregates and observed issue text, never frames or landmarks.
export class PoseSessionReport{
 constructor(motionId=null){this.motionId=motionId;this.profile=getCoachingProfile(motionId);this.observations=new Map();this.frames=0;this.valid=0;this.last=null;this.validMs=0;this.issues=new Map();this.metrics=new Map();this.baseReps=null;this.reps=0;this.previousIssues=new Set();this.countSupported=true;}
 add(result,time){
  if(!Number.isFinite(time))return;
  if(result.count_supported===false)this.countSupported=false;
  const gap=this.last==null?0:time-this.last;
  const delta=gap>0&&gap<=1200?gap:0;this.last=time;this.frames++;
  if(!result.detected){this.wasValid=false;this.previousIssues.clear();return;}
  for(const observation of result.coaching?.observations||result.observations||[]){if(observation.label&&this.observations.size<16)this.observations.set(observation.label,{label:observation.label,value:observation.value,reference:observation.reference});}
  this.valid++;if(this.wasValid)this.validMs+=delta;this.wasValid=true;
  this.baseReps??=result.reps||0;this.reps=Math.max(this.reps,(result.reps||0)-this.baseReps);
  for(const issue of result.issues||[]){
   if(issue.severity==='camera')continue;
   const old=this.issues.get(issue.id)||{id:issue.id,bodyPart:issue.bodyPart,message:issue.message,samples:0,observedMs:0};
   this.issues.set(issue.id,{...old,samples:old.samples+1,observedMs:old.observedMs+(this.previousIssues.has(issue.id)?delta:0),evidence:evidence(issue)});
  }
  this.previousIssues=new Set((result.issues||[]).map(issue=>issue.id));
  for(const [key,value] of Object.entries(result.metrics||{})){
   const values=Array.isArray(value)?value:[value];if(!values.length||!values.every(Number.isFinite))continue;
   const old=this.metrics.get(key)||{min:Infinity,max:-Infinity};
   this.metrics.set(key,{min:Math.min(old.min,...values),max:Math.max(old.max,...values)});
  }
 }
 snapshot(){return {motionId:this.motionId,exerciseName:this.profile?.label,observations:[...this.observations.values()],countSupported:this.countSupported,frames:this.frames,validFrames:this.valid,observedSeconds:Math.round(this.validMs/100)/10,reps:this.reps,issues:[...this.issues.values()].sort((a,b)=>b.samples-a.samples).slice(0,5),ranges:Object.fromEntries(this.metrics),sufficient:this.valid>=5&&this.validMs>=1000};}
}
