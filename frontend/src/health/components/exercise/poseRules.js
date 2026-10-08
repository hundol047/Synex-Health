import {poseThresholds,RULE_THRESHOLDS as T} from './poseThresholds.js';
// Screen-space heuristics, not medical thresholds. Proxies cannot establish 3D joint safety.
const pair=(fn)=>[fn(0),fn(1)];
const mean=a=>a.reduce((s,v)=>s+v,0)/a.length;
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export const REQUIRED_LANDMARKS={
 squat:[11,12,23,24,25,26,27,28],lunge:[11,12,23,24,25,26,27,28],
 push_up:[11,12,13,14,15,16,23,24,27,28],plank:[11,12,13,14,23,24,27,28],
 shoulder_press:[11,12,13,14,15,16,23,24],curl:[11,12,13,14,15,16,23,24],
 lateral_raise:[11,12,13,14,15,16,23,24],bent_row:[11,12,13,14,15,16,23,24,25,26],
 hip_hinge:[11,12,23,24,25,26,27,28],glute_bridge:[11,12,23,24,25,26,27,28],
 front_raise:[11,12,13,14,15,16,23,24],side_lunge:[11,12,23,24,25,26,27,28],
};
export function trackingQuality(points,id){
 const ids=REQUIRED_LANDMARKS[id];
 const visible=ids.filter(i=>{const p=points?.[i];return p&&[p.x,p.y,p.z??0,p.visibility].every(Number.isFinite)&&p.x>=0&&p.x<=1&&p.y>=0&&p.y<=1&&p.visibility>=T.visibility;});
 const confidence=visible.length===ids.length?Math.min(...ids.map(i=>points[i].visibility)):0;
 return {confidence,level:confidence>=T.highVisibility?'HIGH':confidence>=T.visibility?'MEDIUM':visible.length?'LOW':'LOST',visible};
}

// View is a conservative screen-space estimate. An oblique view cannot establish
// knee tracking or forward/backward alignment from a single image.
export function estimateView(p,torso){
 const width=Math.abs(p[11].x-p[12].x)/torso;
 const height=Math.abs(p[11].y-p[12].y)/torso;
 if(width>=T.frontViewWidth&&height<.3)return 'front';
 if(width<=T.sideViewWidth)return 'side';
 return 'oblique';
}

// Positive means below the shoulder-to-ankle line for either facing direction.
// The perpendicular form avoids unstable division by a near-vertical line.
export function signedBodyOffset(shoulder,hip,ankle,torso){
 const dx=ankle.x-shoulder.x,dy=ankle.y-shoulder.y,length=Math.hypot(dx,dy);
 if(length<.1||Math.abs(dx)<Math.abs(dy)*1.5)return null;
 return (dx*(hip.y-shoulder.y)-dy*(hip.x-shoulder.x))*Math.sign(dx)/length/torso;
}
export function evaluateRules(id,p,angle,previous){
 const t=poseThresholds[id];
 const torso=mean(pair(s=>distance(p[11+s],p[23+s])));
 if(!Number.isFinite(torso)||torso<t.minTorso)return {metrics:{},warnings:[],corrections:[],issues:[],valid:false};
 const knee=()=>pair(s=>angle(p[23+s],p[25+s],p[27+s]));
 const hip=()=>pair(s=>angle(p[11+s],p[23+s],p[25+s]));
 const elbow=()=>pair(s=>angle(p[11+s],p[13+s],p[15+s]));
 const lean=mean(pair(s=>Math.atan2(Math.abs(p[11+s].x-p[23+s].x),Math.abs(p[11+s].y-p[23+s].y))*180/Math.PI));
 const symmetry=Math.abs(p[11].y-p[12].y)/torso;
 const view=estimateView(p,torso),front=view==='front',side=view==='side';
 const warnings=[],issues=[];
 const check=(bad,message,meta={})=>{if(bad)issues.push({id:meta.id??`${id}_alignment`,exercise:id,bodyPart:meta.bodyPart??'몸통',joints:meta.joints??[11,12,23,24],severity:meta.severity??'adjust',view,message,...meta});};
 let metrics={torso_inclination:lean,camera_view:view};
 if(id==='squat'||id==='lunge'||id==='side_lunge'||id==='hip_hinge'){
  const knees=knee(),hips=hip(),stance=distance(p[27],p[28])/torso;
  metrics={...metrics,knee_flexion:knees,hip_flexion:hips,stance_width:stance,left_right_asymmetry:Math.abs(knees[0]-knees[1]),ankle_visibility:Math.min(p[27].visibility,p[28].visibility)};
  // A forward lean is expected in a hip hinge, and can be normal in a deep squat.
  // Front-view leaning is lateral; side-view leaning is checked only during a
  // shallow squat/lunge where the knees have not bent far enough for a deep rep.
  if(id!=='hip_hinge')check(front&&lean>t.torsoLean||side&&id!=='side_lunge'&&lean>t.sideTorsoLean&&Math.min(...knees)>t.kneeDepth,
   '화면상 상체 기울기가 큽니다. 깊이를 조금 줄이고 가슴과 골반을 함께 움직여 보세요.',
   {id:`${id}_trunk_lean`,bodyPart:'몸통',joints:[11,12,23,24],metric:'torso_inclination',value:lean});
  if(id==='squat'){
   metrics.knee_tracking_ratio=Math.abs(p[25].x-p[26].x)/Math.max(.01,Math.abs(p[27].x-p[28].x));
   const ankleWidth=Math.abs(p[27].x-p[28].x);
   check(front&&Math.min(...knees)<150&&ankleWidth>torso*.4&&metrics.knee_tracking_ratio<t.kneeTrackingRatio,
    '화면상 무릎이 안쪽으로 모여 보입니다. 무릎을 두 번째 발가락 방향으로 맞춰 보세요.',
    {id:'squat_knee_inward',bodyPart:'무릎',joints:[25,26],referenceJoints:[27,28],metric:'knee_tracking_ratio',value:metrics.knee_tracking_ratio});
   check(front&&Math.abs(knees[0]-knees[1])>t.asymmetry,'화면상 좌우 무릎 움직임 차이가 큽니다. 양발에 체중을 나누고 카메라 수평도 확인하세요.',
    {id:'squat_knee_asymmetry',bodyPart:'무릎',joints:[25,26],referenceJoints:[23,24],metric:'left_right_asymmetry',value:metrics.left_right_asymmetry});
   metrics.depth_candidate=Math.min(...knees)<t.kneeDepth?'bent':'shallow_or_standing';
  }
  if(id==='lunge'){
   check(Math.min(...knees)<125&&stance<t.lungeStance,side?'화면상 앞뒤 발 간격이 좁아 보입니다. 균형을 유지하며 발 간격을 조금 넓혀 보세요.':'발 간격은 정면 영상만으로 판단하기 어렵습니다. 측면에서 양발이 보이게 촬영하세요.',
    {id:side?'lunge_stance':'lunge_camera',bodyPart:'발',joints:side?[27,28]:[],severity:side?'adjust':'camera',metric:'stance_width',value:stance});
   check(side&&lean>35&&Math.min(...knees)>t.kneeDepth&&Math.min(...hips)<t.hipFlexion,
    '상체가 먼저 숙여지는 것으로 보입니다. 몸통을 세우고 통증 없는 범위에서 무릎을 천천히 굽혀 보세요.',
    {id:'lunge_hip_fold',bodyPart:'골반·무릎',joints:[11,12,23,24,25,26]});
  }
  if(id==='hip_hinge'){
   metrics.classification=Math.min(...knees)<t.kneeDepth?'squat_like':'hinge_candidate';
   metrics.hip_displacement=mean(pair(s=>(p[23+s].x-p[27+s].x)/torso));
   check(side&&metrics.classification==='squat_like','무릎 굽힘이 커 스쿼트와 구분하기 어렵습니다. 무릎은 살짝만 굽히고 엉덩이를 뒤로 보내 보세요.',
    {id:'hinge_knee_flexion',bodyPart:'무릎·골반',joints:[23,24,25,26,27,28],metric:'knee_flexion',value:Math.min(...knees)});
  }
  if(id==='side_lunge'){
   metrics.lateral_displacement=((p[23].x+p[24].x)-(p[27].x+p[28].x))/2/torso;
   metrics.opposite_leg_extension=Math.max(...knees);
   check(front&&stance<t.sideStance,'화면상 좌우 발 간격이 좁습니다. 양발을 조금 넓히고 한쪽으로 체중을 옮겨 보세요.',
    {id:'side_lunge_stance',bodyPart:'발',joints:[27,28],metric:'stance_width',value:stance});
   check(front&&Math.min(...knees)<t.kneeDepth&&Math.max(...knees)<t.hipFlexion,
    '반대쪽 다리도 굽어 보입니다. 체중을 옮기는 쪽만 굽히고 반대 다리는 편안하게 펴 보세요.',
    {id:'side_lunge_support_leg',bodyPart:'반대쪽 무릎',joints:knees[0]>knees[1]?[23,25,27]:[24,26,28],metric:'opposite_leg_extension',value:Math.max(...knees)});
  }
 }else if(id==='push_up'||id==='plank'){
  const lines=pair(s=>angle(p[11+s],p[23+s],p[27+s]));
  const offsets=pair(s=>signedBodyOffset(p[11+s],p[23+s],p[27+s],torso));
  const offset=offsets.every(Number.isFinite)?mean(offsets):null;
  metrics={...metrics,body_alignment:lines,hip_height:offset,shoulder_support:mean(pair(s=>Math.abs(p[11+s].x-p[(id==='plank'?13:15)+s].x)/torso)),visibility_stability:Math.min(...REQUIRED_LANDMARKS[id].map(i=>p[i].visibility))};
  if(id==='push_up')metrics.elbow_angle=elbow();
  check(side&&offset!==null&&Math.min(...lines)<t.alignment&&offset>t.hipOffset,
   '화면상 골반이 처져 보입니다. 배에 힘을 주고 골반을 조금 들어 어깨와 발목을 이어 보세요.',
   {id:`${id}_hip_sag`,bodyPart:'골반',joints:[23,24],referenceJoints:[11,12,27,28],metric:'hip_height',value:offset});
  check(side&&offset!==null&&Math.min(...lines)<t.alignment&&offset<-t.hipOffset,
   '화면상 골반이 높아 보입니다. 골반을 조금 낮춰 어깨부터 발목까지 한 줄로 맞춰 보세요.',
   {id:`${id}_hip_pike`,bodyPart:'골반',joints:[23,24],referenceJoints:[11,12,27,28],metric:'hip_height',value:offset});
  // At the bottom of a push-up the shoulder naturally moves past the wrist.
  // Check support placement near extension, rather than penalizing every phase.
  const nearTop=id==='plank'||Math.min(...metrics.elbow_angle)>140;
  check(side&&nearTop&&metrics.shoulder_support>t.support,
   id==='plank'?'팔꿈치가 어깨에서 멀어 보입니다. 팔꿈치를 어깨 아래로 옮겨 보세요.':'손목이 어깨에서 멀어 보입니다. 올라온 자세에서 손을 어깨 아래에 놓아 보세요.',
   {id:`${id}_shoulder_support`,bodyPart:id==='plank'?'어깨·팔꿈치':'어깨·손목',joints:id==='plank'?[11,12,13,14]:[11,12,15,16],metric:'shoulder_support',value:metrics.shoulder_support});
 }else if(id==='glute_bridge'){
  const hips=hip();
  metrics={...metrics,hip_extension:hips,hip_asymmetry:Math.abs(p[23].y-p[24].y)/torso,knee_angle:knee()};
  check(metrics.hip_asymmetry>t.hipAsymmetry,'화면상 골반 높이 차이가 보입니다. 카메라 수평을 맞추고 측면에서 자세를 다시 확인하세요.',
   {id:'bridge_camera',bodyPart:'골반',joints:[],severity:'camera'});
  check(side&&Math.min(...metrics.knee_angle)>t.bridgeKnee,'무릎 굽힘이 적어 보입니다. 발을 엉덩이 쪽으로 조금 당기고 발바닥을 지지해 보세요.',
   {id:'bridge_foot_position',bodyPart:'무릎·발',joints:[25,26,27,28],metric:'knee_angle',value:Math.min(...metrics.knee_angle)});
 }else{
  const elbows=elbow();
  const drift=mean(pair(s=>Math.abs(p[13+s].x-p[11+s].x)/torso));
  metrics={...metrics,elbow_flexion:elbows,shoulder_symmetry:symmetry,elbow_drift:drift,left_right_difference:Math.abs(elbows[0]-elbows[1])};
  if(id==='shoulder_press'){
   metrics.wrist_over_elbow=mean(pair(s=>Math.abs(p[15+s].x-p[13+s].x)/torso));
   metrics.overhead_completion=pair(s=>p[15+s].y<p[11+s].y).every(Boolean);
   check(metrics.wrist_over_elbow>t.wristDrift,'손목과 팔꿈치 정렬을 정면에서 확인하세요.');
  }
  if(id==='curl')check(drift>t.elbowDrift,'화면상 팔꿈치가 몸통에서 멀어 보입니다. 어깨 움직임을 확인하세요.');
  if(id==='lateral_raise'||id==='front_raise'){
   metrics.arm_elevation=pair(s=>angle(p[23+s],p[11+s],p[13+s]));
   check(Math.min(...elbows)<t.raiseElbow,'팔꿈치 굽힘이 큽니다. 편안한 팔 각도를 확인하세요.');
  }
  if(id==='bent_row'){
   metrics.hip_hinge=hip();metrics.elbow_path=mean(pair(s=>(p[13+s].y-p[11+s].y)/torso));
   metrics.shoulder_retraction_proxy=distance(p[11],p[12])/torso;
   check(lean<t.rowLean,'상체가 서 있는 것으로 보입니다. 측면에서 힙힌지 자세를 확인하세요.');
  }else check(lean>t.upperLean,'화면상 몸통 기울기가 큽니다. 상체 보상 움직임을 확인하세요.');
  check(symmetry>t.shoulderAsymmetry,'화면상 좌우 어깨 높이 차이가 보입니다. 카메라 수평을 확인하세요.');
 }
 // A frame-to-frame angle change is not a speed measurement. Fast inference
 // jitter and slow device sampling must not produce exercise form corrections.
 if(previous)metrics.torso_sway=Math.abs(lean-previous.torso_inclination);
 return {metrics,warnings,corrections:issues.map(issue=>issue.message),issues,valid:true};
}

export class PoseCalibration{
 constructor(){this.start=null;this.last=null;this.ready=false;}
 update(poses,time){
  const p=poses?.[0],ids=[0,11,12,23,24,25,26,27,28];
  const visible=poses?.length===1&&ids.every(i=>p?.[i]&&[p[i].x,p[i].y,p[i].visibility].every(Number.isFinite)&&p[i].visibility>=T.visibility&&p[i].x>.03&&p[i].x<.97&&p[i].y>.03&&p[i].y<.97);
  const center=visible&&(p[23].x+p[24].x)/2;
  const span=visible?Math.max(...['x','y'].map(axis=>Math.max(...ids.map(i=>p[i][axis]))-Math.min(...ids.map(i=>p[i][axis])))):0;
  const valid=visible&&center>.2&&center<.8&&span>.35&&span<.92&&Number.isFinite(time);
  // Slow on-device CPU inference can take 800 ms between valid frames. Camera
  // framing needs continuity, while repetition timing retains its 500 ms limit.
  if(!valid||this.last!==null&&(time<=this.last||time-this.last>1200)){this.start=null;this.ready=false;}
  this.last=Number.isFinite(time)?time:null;
  if(valid){this.start??=time;this.ready=time-this.start>=2500;}
  return {ready:this.ready,progress:valid?Math.min(1,(time-this.start)/2500):0,message:this.ready?'촬영 준비 완료':'한 명의 전신을 화면 중앙에 두고 2.5초간 촬영 위치를 유지해주세요.'};
 }
}
