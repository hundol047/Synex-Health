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
export function evaluateRules(id,p,angle,previous){
 const t=poseThresholds[id];
 const torso=mean(pair(s=>distance(p[11+s],p[23+s])));
 if(!Number.isFinite(torso)||torso<t.minTorso)return {metrics:{},warnings:[],corrections:[],valid:false};
 const knee=()=>pair(s=>angle(p[23+s],p[25+s],p[27+s]));
 const hip=()=>pair(s=>angle(p[11+s],p[23+s],p[25+s]));
 const elbow=()=>pair(s=>angle(p[11+s],p[13+s],p[15+s]));
 const lean=mean(pair(s=>Math.atan2(Math.abs(p[11+s].x-p[23+s].x),Math.abs(p[11+s].y-p[23+s].y))*180/Math.PI));
 const symmetry=Math.abs(p[11].y-p[12].y)/torso;
 const warnings=[],corrections=[];
 const check=(bad,text)=>{if(bad)corrections.push(text);};
 let metrics={torso_inclination:lean};
 if(id==='squat'||id==='lunge'||id==='side_lunge'||id==='hip_hinge'){
  const knees=knee(),hips=hip(),stance=distance(p[27],p[28])/torso;
  metrics={...metrics,knee_flexion:knees,hip_flexion:hips,stance_width:stance,left_right_asymmetry:Math.abs(knees[0]-knees[1]),ankle_visibility:Math.min(p[27].visibility,p[28].visibility)};
  check(lean>t.torsoLean,'화면상 상체 기울기가 큽니다. 촬영 방향과 편안한 범위를 확인하세요.');
  if(id==='squat'){
   metrics.knee_tracking_ratio=Math.abs(p[25].x-p[26].x)/Math.max(.01,Math.abs(p[27].x-p[28].x));
   check(Math.abs(knees[0]-knees[1])>t.asymmetry,'화면상 좌우 무릎 움직임 차이가 큽니다. 촬영 방향을 확인하세요.');
   metrics.depth_candidate=Math.min(...knees)<t.kneeDepth?'bent':'shallow_or_standing';
  }
  if(id==='lunge'){
   check(stance<t.lungeStance,'화면상 발 간격이 좁아 보입니다. 측면에서 자세를 확인하세요.');
   check(Math.min(...knees)>t.kneeDepth&&Math.min(...hips)<t.hipFlexion,'화면상 런지 깊이가 얕을 수 있습니다. 통증 없는 범위를 확인하세요.');
  }
  if(id==='hip_hinge'){
   metrics.classification=Math.min(...knees)<t.kneeDepth?'squat_like':'hinge_candidate';
   metrics.hip_displacement=mean(pair(s=>(p[23+s].x-p[27+s].x)/torso));
   check(metrics.classification==='squat_like','무릎 굽힘이 커 스쿼트와 구분하기 어렵습니다. 엉덩이 중심 움직임을 확인하세요.');
  }
  if(id==='side_lunge'){
   metrics.lateral_displacement=((p[23].x+p[24].x)-(p[27].x+p[28].x))/2/torso;
   metrics.opposite_leg_extension=Math.max(...knees);
   check(stance<t.sideStance,'화면상 좌우 발 간격이 좁습니다. 정면 촬영을 확인하세요.');
   check(Math.min(...knees)<t.kneeDepth&&Math.max(...knees)<t.hipFlexion,'반대쪽 다리도 굽어 보입니다. 편안한 범위에서 확인하세요.');
  }
 }else if(id==='push_up'||id==='plank'){
  const lines=pair(s=>angle(p[11+s],p[23+s],p[27+s]));
  const offset=mean(pair(s=>{const a=p[11+s],b=p[27+s],h=p[23+s];const t=(h.x-a.x)/(b.x-a.x||.001);return (h.y-(a.y+t*(b.y-a.y)))/torso;}));
  metrics={...metrics,body_alignment:lines,hip_height:offset,shoulder_support:mean(pair(s=>Math.abs(p[11+s].x-p[(id==='plank'?13:15)+s].x)/torso)),visibility_stability:Math.min(...REQUIRED_LANDMARKS[id].map(i=>p[i].visibility))};
  if(id==='push_up')metrics.elbow_angle=elbow();
  check(Math.min(...lines)<t.alignment&&offset>t.hipOffset,'화면상 골반이 처져 보입니다. 어깨·골반·발목 정렬을 확인하세요.');
  check(Math.min(...lines)<t.alignment&&offset<-t.hipOffset,'화면상 골반이 높아 보입니다. 어깨·골반·발목 정렬을 확인하세요.');
  check(metrics.shoulder_support>t.support,'어깨와 팔 지지점 위치를 측면에서 확인하세요.');
 }else if(id==='glute_bridge'){
  const hips=hip();
  metrics={...metrics,hip_extension:hips,hip_asymmetry:Math.abs(p[23].y-p[24].y)/torso,knee_angle:knee()};
  check(metrics.hip_asymmetry>t.hipAsymmetry,'화면상 좌우 골반 높이 차이가 보입니다. 촬영 방향을 확인하세요.');
  check(Math.min(...metrics.knee_angle)>t.bridgeKnee,'발 지지점과 무릎 굽힘을 측면에서 확인하세요.');
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
 if(previous){metrics.torso_sway=Math.abs(lean-previous.torso_inclination);check(metrics.torso_sway>t.sway,'프레임 사이 상체 움직임이 큽니다. 천천히 움직이세요.');}
 return {metrics,warnings,corrections,valid:true};
}

export class PoseCalibration{
 constructor(){this.start=null;this.last=null;this.ready=false;}
 update(poses,time){
  const p=poses?.[0],ids=[0,11,12,23,24,25,26,27,28];
  const visible=poses?.length===1&&ids.every(i=>p?.[i]&&[p[i].x,p[i].y,p[i].visibility].every(Number.isFinite)&&p[i].visibility>=T.visibility&&p[i].x>.03&&p[i].x<.97&&p[i].y>.03&&p[i].y<.97);
  const center=visible&&(p[23].x+p[24].x)/2;
  const span=visible?Math.max(...['x','y'].map(axis=>Math.max(...ids.map(i=>p[i][axis]))-Math.min(...ids.map(i=>p[i][axis])))):0;
  const valid=visible&&center>.2&&center<.8&&span>.35&&span<.92&&Number.isFinite(time);
  if(!valid||this.last!==null&&(time<=this.last||time-this.last>500)){this.start=null;this.ready=false;}
  this.last=Number.isFinite(time)?time:null;
  if(valid){this.start??=time;this.ready=time-this.start>=2500;}
  return {ready:this.ready,progress:valid?Math.min(1,(time-this.start)/2500):0,message:this.ready?'촬영 준비 완료':'한 명의 전신을 화면 중앙에 두고 2.5초간 촬영 위치를 유지해주세요.'};
 }
}
