import {getCoachingProfile} from './coachingCatalog.js';
import {POSE_VERSIONS} from './poseThresholds.js';

const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const mean=a=>a.reduce((s,v)=>s+v,0)/a.length;
const angle=(a,b,c)=>{
 const u=[a.x-b.x,a.y-b.y],v=[c.x-b.x,c.y-b.y],length=Math.hypot(...u)*Math.hypot(...v);
 return length>1e-8?Math.acos(Math.max(-1,Math.min(1,(u[0]*v[0]+u[1]*v[1])/length)))*180/Math.PI:null;
};
const names={kneeTracking:'무릎 간격 / 발 간격',elbow:'팔꿈치 각도',knee:'무릎 각도',kneeMin:'더 굽힌 무릎',kneeMax:'더 편 무릎',hip:'어깨–골반–무릎 각도',hipMin:'더 접힌 고관절',arm:'위팔과 몸통 사이 각도',ankle:'무릎–발목–발끝 각도',bodyLine:'어깨–골반–발목 각도',trunkLean:'몸통 기울기',shoulderLevel:'어깨 높이 차이',hipLevel:'골반 높이 차이',elbowDrift:'어깨에서 팔꿈치의 가로 이동',wristStack:'팔꿈치에서 손목의 가로 이동',wristHeight:'어깨 아래 손목 위치',handSpan:'양손 간격',kneeSpan:'양 무릎 간격',footSpan:'양발 간격',shoulderSpan:'어깨 간격',hipSpan:'골반 간격',supportOffset:'어깨–손 지지점 가로 간격',kneeDifference:'양 무릎 각도 차이',ankleDifference:'양 발목 각도 차이'};
const degrees=new Set(['elbow','knee','kneeMin','kneeMax','hip','hipMin','arm','ankle','bodyLine','trunkLean','kneeDifference','ankleDifference']);
export const metricDescription=(key,value)=>key==='kneeTracking'?`무릎 간격 / 발 간격 ${value.toFixed(2)}`:`${names[key]||key} ${degrees.has(key)?`${Math.round(value)}°`:`몸통 길이의 ${Math.round(value*100)}%`}`;
function measure(p,key,torso){
 const angles=(a,b,c)=>[0,1].map(s=>angle(p[a+s],p[b+s],p[c+s]));
 const pair=(a,b,axis)=>[0,1].map(s=>Math.abs(p[a+s][axis]-p[b+s][axis])/torso);
 const safe=a=>a.every(Number.isFinite)?a:null;
 if(key==='elbow')return safe(angles(11,13,15));
 if(['knee','kneeMin','kneeMax','kneeDifference'].includes(key)){
  const a=safe(angles(23,25,27));return !a?null:key==='kneeMin'?Math.min(...a):key==='kneeMax'?Math.max(...a):key==='kneeDifference'?Math.abs(a[0]-a[1]):a;
 }
 if(key==='hip'||key==='hipMin'){const a=safe(angles(11,23,25));return a&&key==='hipMin'?Math.min(...a):a;}
 if(key==='arm')return safe(angles(23,11,13));
 if(key==='bodyLine')return safe(angles(11,23,27));
 if(key==='ankle'||key==='ankleDifference'){const a=safe(angles(25,27,31));return a&&key==='ankleDifference'?Math.abs(a[0]-a[1]):a;}
 if(key==='trunkLean')return mean([0,1].map(s=>Math.atan2(Math.abs(p[11+s].x-p[23+s].x),Math.abs(p[11+s].y-p[23+s].y))*180/Math.PI));
 if(key==='shoulderLevel')return Math.abs(p[11].y-p[12].y)/torso;
 if(key==='hipLevel')return Math.abs(p[23].y-p[24].y)/torso;
 if(key==='elbowDrift')return mean(pair(13,11,'x'));
 if(key==='wristStack')return safe(pair(15,13,'x'));
 if(key==='supportOffset')return mean(pair(15,11,'x'));
 if(key==='wristHeight')return mean([0,1].map(s=>(p[15+s].y-p[11+s].y)/torso));
 if(key==='kneeTracking')return Math.abs(p[25].x-p[26].x)/Math.max(torso*.2,Math.abs(p[27].x-p[28].x));
 const pairs={handSpan:[15,16],kneeSpan:[25,26],footSpan:[27,28],shoulderSpan:[11,12],hipSpan:[23,24]};
 if(pairs[key])return distance(...pairs[key].map(i=>p[i]))/torso;
 return null;
}
const scalar=value=>Array.isArray(value)?mean(value):value;
const valid=p=>p&&[p.x,p.y,p.visibility].every(Number.isFinite)&&p.visibility>=.7&&p.x>=0&&p.x<=1&&p.y>=0&&p.y<=1;

// A complete observed start -> endpoint -> start is required. Missing, stale,
// wrong-view or wrong-posture frames disarm the partial rep and hold timer.
export class CatalogPoseAnalyzer{
 constructor(id){this.config=getCoachingProfile(id);if(!this.config)throw Error('Unsupported exercise');this.reps=0;this.holdMs=0;this.last=null;this.reset();}
 reset(){this.stage='ready';this.stableAt=null;this.startedAt=null;this.endpointAt=null;this.since=new Map();this.minimum=Infinity;this.maximum=-Infinity;this.wasHolding=false;}
 unavailable(time,message,quality='LOW'){
  this.reset();this.last=null;
  return {...POSE_VERSIONS,detected:false,confidence:0,tracking_quality:quality,phase:'unknown',movement_phase:'unknown',feedback:message,reps:this.reps,repetition_count:this.reps,seconds:this.config.hold?Math.floor(this.holdMs/1000):null,metrics:{},issues:[],corrections:[],warnings:[],observations:[],count_supported:!!this.config.counter,range_of_motion:null};
 }
 update(raw,time,aspectRatio=1){
  const c=this.config;
  if(!Number.isFinite(time)||!Number.isFinite(aspectRatio)||aspectRatio<=0)return this.unavailable(time,'새 영상의 시간과 크기를 확인할 수 없습니다.');
  const missing=c.required.filter(i=>!valid(raw?.[i]));
  if(missing.length)return this.unavailable(time,`${c.label}: 필요한 관절이 가려지거나 화면 밖에 있습니다. ${c.cameraView}에서 ${c.required.includes(31)?'발끝과 뒤꿈치까지':'어깨와 골반, 움직이는 관절이'} 보이게 카메라를 고정하세요.`,missing.length===c.required.length?'LOST':'LOW');
  const p=raw.map(x=>x?{...x,y:x.y*aspectRatio}:x),torso=mean([distance(p[11],p[23]),distance(p[12],p[24])]);
  if(torso<.04)return this.unavailable(time,'몸이 너무 작게 보입니다. 카메라를 조금 가까이 두세요.');
  const width=Math.abs(p[11].x-p[12].x)/torso,height=Math.abs(p[11].y-p[12].y)/torso;
  const view=width>=.45&&height<.3?'front':width<=.3?'side':'oblique';
  if(!c.views.includes('any')&&!c.views.includes(view))return this.unavailable(time,`${c.label}은 ${c.cameraView} 촬영이 필요합니다. 지금 방향에서는 자세와 횟수 판정을 보류합니다.`);
  const shoulderY=mean([p[11].y,p[12].y]),hipY=mean([p[23].y,p[24].y]);
  const horizontal=Math.abs(shoulderY-hipY)<torso*.72;
  if((c.posture==='floor'||c.posture==='supine')&&!horizontal)return this.unavailable(time,`${c.label}: 누운 자세 또는 바닥 지지 자세를 먼저 잡아 주세요.`);
  if(c.posture==='upright'&&shoulderY>=hipY-torso*.45)return this.unavailable(time,`${c.label}: 상체를 세운 준비 자세가 보이도록 촬영하세요.`);
  if(c.posture==='standing'&&p[27]&&mean([p[27].y,p[28].y])<hipY+torso*.25)return this.unavailable(time,`${c.label}: 서 있는 다리와 발 지지점이 보이도록 촬영하세요.`);
  if(c.posture==='seated'&&p[25]&&(shoulderY>=hipY||Math.abs(mean([p[25].y,p[26].y])-hipY)>torso*.85))return this.unavailable(time,`${c.label}: 앉은 자세에서 골반과 무릎이 함께 보이도록 촬영하세요.`);
  const keys=new Set([...c.observations,...c.rules.flatMap(r=>[r.metric,r.when?.[0]]),c.counter?.metric,c.holdMetric?.[0]].filter(Boolean));
  const metrics={camera_view:view};for(const key of keys){const value=measure(p,key,torso);if(value==null||!(Array.isArray(value)?value:[value]).every(Number.isFinite))return this.unavailable(time,'관절이 겹쳐 각도를 계산할 수 없습니다. 카메라 방향을 조금 조정하세요.');metrics[key]=value;}
  const gap=this.last==null?null:time-this.last;if(gap!=null&&(gap<=0||gap>500))this.reset();this.last=time;
  const issues=[];
  for(const r of c.rules){
   if(r.view&&view!==r.view)continue;
   if(r.when){const [key,threshold,direction]=r.when,v=scalar(metrics[key]);if(direction==='below'?v>=threshold:v<=threshold)continue;}
   const measured=metrics[r.metric];
   const value=Array.isArray(measured)&&r.aggregate==='max'?Math.max(...measured):Array.isArray(measured)&&r.aggregate==='min'?Math.min(...measured):scalar(measured);
   if(r.below?value>=r.limit:value<=r.limit)continue;
   const side=Array.isArray(measured)&&r.aggregate?measured.map((v,i)=>(r.below?v<r.limit:v>r.limit)?['왼쪽','오른쪽'][i]:null).filter(Boolean).join('·'):null;
   const id=`${c.id}_${r.metric}${side?':'+side:''}`,since=this.since.get(id)??time;this.since.set(id,since);
   issues.push({id,exercise:c.id,metric:r.metric,value,side,bodyPart:`${side?side+' ':''}${r.bodyPart}`,joints:r.joints,severity:'adjust',view,observedMs:Math.max(0,time-since),message:`${c.label}: ${side?side+' ':''}${r.message}`,evidence:`${side?side+' ':''}${metricDescription(r.metric,value)} · 관찰 기준 ${r.below?'미만':'초과'} ${degrees.has(r.metric)?`${r.limit}°`:r.metric==='kneeTracking'?r.limit.toFixed(2):`${Math.round(r.limit*100)}%`}`});
  }
  const active=new Set(issues.map(i=>i.id));for(const id of this.since.keys())if(!active.has(id))this.since.delete(id);
  let repSeconds=null;
  if(c.counter){
   const value=scalar(metrics[c.counter.metric]);this.minimum=Math.min(this.minimum,value);this.maximum=Math.max(this.maximum,value);
   const t=(value-c.counter.start)/(c.counter.end-c.counter.start);
   if(this.stage==='ready'){if(t<=.08){this.stableAt??=time;if(time-this.stableAt>=200)this.stage='start';}else this.stableAt=null;}
   else if(this.stage==='start'||this.stage==='completion'){if(t>.2){this.stage='outward';this.startedAt=time;}}
   else if(this.stage==='outward'){if(t>=.9){this.endpointAt??=time;if(time-this.endpointAt>=150)this.stage='endpoint';}else this.endpointAt=null;if(t<.08){this.stage='start';this.startedAt=null;}}
   else if(this.stage==='endpoint'&&t<.75)this.stage='returning';
   else if(this.stage==='returning'&&t<.08){if(time-this.startedAt>=700&&time-this.startedAt<=30000){this.reps++;repSeconds=(time-this.startedAt)/1000;this.stage='completion';}else this.stage='start';this.startedAt=null;}
  }
  let holding=false;
  if(c.hold){const [key,min,max]=c.holdMetric||['bodyLine',150,180];const value=scalar(metrics[key]);holding=issues.length===0&&Number.isFinite(value)&&value>=min&&value<=max;if(holding&&this.wasHolding&&gap>0&&gap<=500)this.holdMs+=gap;this.wasHolding=holding;}
  const observations=c.observations.map(key=>({label:names[key],value:Array.isArray(metrics[key])?metrics[key].map((v,i)=>`${['왼쪽','오른쪽'][i]} ${degrees.has(key)?`${Math.round(v)}°`:`몸통 길이의 ${Math.round(v*100)}%`}`).join(' · '):metricDescription(key,metrics[key]),reference:c.steps[1]||c.steps[0]}));
  return {...POSE_VERSIONS,detected:true,confidence:Math.min(...c.required.map(i=>raw[i].visibility)),tracking_quality:c.required.every(i=>raw[i].visibility>=.85)?'HIGH':'MEDIUM',reps:this.reps,repetition_count:this.reps,seconds:c.hold?Math.floor(this.holdMs/1000):null,hold_seconds:c.hold?Math.floor(this.holdMs/1000):null,count_supported:!!c.counter,movement_phase:c.hold?(holding?'holding':'adjust'):this.stage,phase:this.stage,rep_seconds:repSeconds,metrics,issues,observations,corrections:issues.map(i=>i.message),warnings:[],range_of_motion:c.counter&&Number.isFinite(this.minimum)?Math.round(this.maximum-this.minimum):null,feedback:issues[0]?.message||`${c.label}: ${metricDescription(c.observations[0],scalar(metrics[c.observations[0]]))}. ${c.steps[1]||c.steps[0]}`};
 }
}
