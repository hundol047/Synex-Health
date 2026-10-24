import profiles from './catalogPoseProfiles.json' with {type:'json'};
import {POSE_VERSIONS} from './poseThresholds.js';
export const CATALOG_POSE_EXERCISES=profiles;
const angle=(a,b,c)=>{const u=[a.x-b.x,a.y-b.y,(a.z||0)-(b.z||0)],v=[c.x-b.x,c.y-b.y,(c.z||0)-(b.z||0)];const length=Math.hypot(...u)*Math.hypot(...v);return length>1e-8?Math.acos(Math.max(-1,Math.min(1,u.reduce((sum,x,i)=>sum+x*v[i],0)/length)))*180/Math.PI:null;};
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const avg=values=>values.reduce((a,b)=>a+b,0)/values.length;

// Observable screen-space checks only. Equipment, force, pain and tissue activation are NOT measured.
export class CatalogPoseAnalyzer{
 constructor(id){if(!profiles[id])throw Error('Unsupported exercise');this.id=id;this.profile=profiles[id];this.reps=0;this.lastTime=null;this.startAngle=null;this.min=Infinity;this.max=-Infinity;this.previous=null;this.activeMs=0;this.phase='ready';this.extremeAt=null;}
 update(raw,time,aspect=1){
  const c=this.profile,valid=Number.isFinite(time)&&Number.isFinite(aspect)&&aspect>0&&c.joints.every(i=>{const p=raw?.[i];return p&&[p.x,p.y,p.z??0,p.visibility].every(Number.isFinite)&&p.visibility>=.7&&p.x>=0&&p.x<=1&&p.y>=0&&p.y<=1;});
  const base={exercise_id:this.id,...POSE_VERSIONS,validation:c.validation,reps:this.reps,repetition_count:this.reps,hold_seconds:null,rep_seconds:null,range_of_motion:null,tempo:null,left_right_balance:null,metrics:{},corrections:[],warnings:[],target_guidance:`운동 안내: ${c.target.join(', ')}을 사용하는 동작입니다. 실제 힘·근활성은 카메라로 측정하지 않습니다.`,limitations:'단일 카메라 참고 분석: 기구 경로·중량·근육 힘·신체 내부 정렬은 측정하지 않습니다.'};
  if(!valid){this.lastTime=null;this.previous=null;this.phase='ready';this.startAngle=null;this.extremeAt=null;this.min=Infinity;this.max=-Infinity;return {...base,detected:false,confidence:0,tracking_quality:'LOST',movement_phase:'unknown',phase:'unknown',feedback:`${c.label}: ${c.camera}에서 필요한 관절이 모두 보이게 촬영하세요.`,completion_state:'tracking_lost'};}
  const p=raw.map(x=>({...x,y:x.y*aspect}));const torso=avg([distance(p[11],p[23]),distance(p[12],p[24])]);
  if(torso<.04)return this.update([],time,aspect);
  const pair=(a,b,d)=>[angle(p[a],p[b],p[d]),angle(p[a+1],p[b+1],p[d+1])];
  const knees=pair(23,25,27),hips=pair(11,23,25),elbows=pair(11,13,15),shoulders=pair(23,11,13);
  const metric=c.metric==='knee'?knees:c.metric==='hip'?hips:c.metric==='elbow'?elbows:c.metric==='ankle'?pair(25,27,31):c.metric==='spread'?[angle(p[25],p[23],p[26]),angle(p[26],p[24],p[25])]:shoulders;
  if([...knees,...hips,...elbows,...metric].some(x=>x==null))return this.update([],time,aspect);
  const lean=avg([0,1].map(s=>Math.atan2(Math.abs(p[11+s].x-p[23+s].x),Math.abs(p[11+s].y-p[23+s].y))*180/Math.PI));
  const metrics={observed_angle_left:metric[0],observed_angle_right:metric[1],knee_angle:knees,hip_angle:hips,elbow_angle:elbows,torso_inclination:lean,shoulder_height_difference:Math.abs(p[11].y-p[12].y)/torso,pelvis_height_difference:Math.abs(p[23].y-p[24].y)/torso,stance_width:distance(p[27],p[28])/torso};
  const corrections=[],warnings=[];const check=(bad,code,text)=>{if(bad)corrections.push(`${c.label} · ${text}`);};
  // Each family evaluates only observable cues appropriate to its support and motion.
  if(['squat','lunge','knee'].includes(c.family)){
   check(c.family==='squat'&&Math.abs(knees[0]-knees[1])>25,'knee_asymmetry','좌우 무릎 굽힘 차이가 큽니다. 카메라 각도와 발 지지를 확인하세요.');
   check(c.family==='squat'&&lean>55,'torso_lean','상체가 크게 기울어 보입니다. 지지한 발 위에서 편안한 깊이로 움직이세요.');
   check(c.family==='lunge'&&metrics.stance_width<.35,'stance','발 간격이 좁아 보입니다. 앞뒤 또는 좌우 지지 범위를 확인하세요.');
   check(c.family==='knee'&&Math.abs(knees[0]-knees[1])>30,'knee_range','양 무릎 가동범위 차이가 큽니다. 기구에 가려진 부분과 좌우 수행을 확인하세요.');
  }
  if(c.family==='push'){
   const end=this.id==='pushup'?25:27,lines=pair(11,23,end);metrics.support_alignment=lines;
   if(!['machine_chest_press','dumbbell_bench_press','dumbbell_floor_press','barbell_bench_press'].includes(this.id))check(Math.min(...lines)<145,'alignment','어깨·골반·지지점이 꺾여 보입니다. 몸통 정렬과 지지 위치를 확인하세요.');
   check(Math.abs(elbows[0]-elbows[1])>25,'arm_difference','좌우 팔꿈치 굽힘 차이를 확인하세요. 한쪽만 먼저 밀지 않도록 천천히 수행하세요.');
  }
  if(c.family==='hinge'){check(Math.min(...knees)<125,'hinge_knee','무릎 굽힘이 커 보입니다. 무릎보다 고관절을 접는 움직임을 확인하세요.');}
  if(c.family==='bridge'||c.family==='core'||c.family==='abduction'){check(metrics.pelvis_height_difference>.3,'pelvis_tilt','골반 높이 차이가 큽니다. 몸통을 안정시키고 범위를 줄여 확인하세요.');}
  if(['row','curl','press'].includes(c.family)){
   const drift=avg([0,1].map(s=>Math.abs(p[13+s].x-p[11+s].x)/torso));metrics.elbow_drift=drift;
   check(c.family==='curl'&&drift>.55,'elbow_drift','팔꿈치가 몸통에서 멀어 보입니다. 반동을 줄이고 팔꿈치 위치를 확인하세요.');
   check(c.family==='row'&&this.id==='dumbbell_row'&&lean<20,'hinge','상체 지지와 고관절 굽힘을 측면에서 확인하세요.');
   check(c.family==='press'&&Math.abs(elbows[0]-elbows[1])>25,'arm_difference','좌우 팔꿈치 움직임 차이가 큽니다. 양쪽을 편안한 범위에서 조절하세요.');
  }
  if(c.family==='raise'){check(Math.min(...elbows)<100,'elbow_bend','팔꿈치 굽힘이 큽니다. 가벼운 부하로 팔 각도를 확인하세요.');}
  if(c.family==='calf'){metrics.heel_lift=avg([p[31].y-p[29].y,p[32].y-p[30].y])/torso;check(Math.abs(metric[0]-metric[1])>25&&this.id!=='single_calf','ankle_difference','좌우 발목 각도 차이가 큽니다. 발끝 방향과 지지면을 확인하세요.');}
  if(c.family==='hold'){
   const alignment=this.id==='wall_sit'?knees:pair(11,23,this.id==='knee_side_plank'?25:27);metrics.support_alignment=alignment;
   check(this.id==='wall_sit'?Math.min(...knees)<65:Math.min(...alignment)<145,'hold_alignment',this.id==='wall_sit'?'무릎이 깊게 굽혀져 보입니다. 통증 없는 높이로 조정하세요.':'어깨·골반·지지점 정렬을 확인하고 무너지면 쉬세요.');
  }
  if(c.family==='cardio'){check(lean>45&&!['stationary_cycle'].includes(this.id),'cardio_lean','몸통 기울기가 큽니다. 촬영 각도와 편안한 상체 자세를 확인하세요.');}
  if(c.family==='mobility'){
   warnings.push(`${c.label}: 미세한 관절·척추 움직임과 늘어나는 강도는 영상만으로 판정하지 않습니다.`);
   check(metrics.shoulder_height_difference>.3,'shoulder_height','좌우 어깨 높이 차이를 확인하세요. 의도한 동작인지 촬영 방향과 함께 확인하세요.');
  }
  const gap=time-this.lastTime;
  if(this.lastTime==null||gap<=0||gap>500){this.phase='ready';this.startAngle=null;this.extremeAt=null;this.previous=null;}
  if(this.previous&&Math.abs(lean-this.previous.torso_inclination)>18)check(true,'sway','이전 프레임보다 몸통 움직임이 큽니다. 반동과 촬영 흔들림을 줄이세요.');
  const value=Math.min(...metric);this.min=Math.min(this.min,value);this.max=Math.max(this.max,value);
  // Count a return to the initial range after a sustained excursion; never count subtle mobility as reps.
  if(c.dose_type==='reps'&&c.family!=='mobility'){
   this.startAngle??=value;
   if(this.phase==='ready'&&Math.abs(value-this.startAngle)>Math.max(15,(c.up-c.down)*.7)){this.extremeAt=time;this.phase='outward';}
   if(this.phase==='outward'&&Math.abs(value-this.startAngle)<10){if(time-this.extremeAt>=350)this.reps++;this.phase='ready';this.extremeAt=null;}
  }
  if(c.dose_type!=='reps'&&corrections.length===0&&this.lastTime!=null&&gap>0&&gap<=500)this.activeMs+=gap;
  this.lastTime=time;this.previous=metrics;const confidence=Math.min(...c.joints.map(i=>raw[i].visibility));
  return {...base,detected:true,confidence,tracking_quality:confidence>=.85?'HIGH':'MEDIUM',metrics,corrections,warnings,phase:this.phase,movement_phase:this.phase,reps:this.reps,repetition_count:this.reps,hold_seconds:c.dose_type==='hold'?this.activeMs/1000:null,observed_seconds:this.activeMs/1000,seconds:c.dose_type!=='reps'?Math.floor(this.activeMs/1000):null,range_of_motion:Math.round(this.max-this.min),left_right_balance:Math.round(Math.abs(metric[0]-metric[1])),completion_state:'observing',feedback:corrections[0]||`${c.label}: 보이는 관절을 추적하고 있습니다. ${c.instructions[0]}`};
 }
}
