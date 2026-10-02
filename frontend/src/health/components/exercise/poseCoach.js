// Angles/phase thresholds are conservative product heuristics, not clinical assessment.
export function jointAngle(a,b,c){
 if(!a||!b||!c)return null;
 const u=[a.x-b.x,a.y-b.y,(a.z||0)-(b.z||0)],v=[c.x-b.x,c.y-b.y,(c.z||0)-(b.z||0)];
 const n=Math.hypot(...u)*Math.hypot(...v);if(!n)return null;
 return Math.acos(Math.max(-1,Math.min(1,u.reduce((s,x,i)=>s+x*v[i],0)/n)))*180/Math.PI;
}
const reliable=p=>p&&[p.x,p.y,p.z??0,p.visibility].every(Number.isFinite)&&p.visibility>=.7;
function squatCorrections(points){
 const ids=[11,12,23,24,25,26,27,28];
 if(!ids.every(i=>reliable(points?.[i])))return [];
 const shoulder={x:(points[11].x+points[12].x)/2,y:(points[11].y+points[12].y)/2};
 const hip={x:(points[23].x+points[24].x)/2,y:(points[23].y+points[24].y)/2};
 const torso=Math.hypot(shoulder.x-hip.x,shoulder.y-hip.y);if(torso<.05)return [];
 const shoulderWidth=Math.abs(points[11].x-points[12].x),ankleWidth=Math.abs(points[27].x-points[28].x),kneeWidth=Math.abs(points[25].x-points[26].x);
 if(shoulderWidth/torso>.6&&ankleWidth>torso*.4&&kneeWidth<ankleWidth*.65)return ['화면상 무릎이 안쪽으로 모이는 것으로 보입니다. 발 방향과 촬영 각도를 확인하세요.'];
 if(shoulderWidth/torso<.35&&Math.abs(shoulder.x-hip.x)>Math.abs(shoulder.y-hip.y))return ['화면상 상체 기울기가 큽니다. 촬영 방향과 편안한 동작 범위를 확인하세요.'];
 return [];
}
function plankSupported(points){
 return [[11,13,23,27],[12,14,24,28]].every(([shoulder,elbow,hip,ankle])=>{
  const a=points[shoulder],b=points[ankle],support=points[elbow];
  if(![a,b,support,points[hip]].every(reliable))return false;
  const length=Math.hypot(b.x-a.x,b.y-a.y);
  return length>.1&&Math.abs(b.y-a.y)<=Math.abs(b.x-a.x)*.65&&support.y>a.y+length*.03;
 });
}
export class SquatCoach{
 constructor(){this.reps=0;this.phase='ready';this.last=0;this.lowAt=0;}
 update(points,time){
  const ids=[11,12,23,24,25,26,27,28];
  if(!points||ids.some(i=>!points[i]||(points[i].visibility??0)<.65||![points[i].x,points[i].y,points[i].z||0].every(Number.isFinite))){this.phase='ready';this.lowAt=0;return {reps:this.reps,phase:'unknown',feedback:'전신이 잘 보이도록 카메라 위치를 조정하세요.'};}
  const knee=(jointAngle(points[23],points[25],points[27])+jointAngle(points[24],points[26],points[28]))/2;
  const hip=(jointAngle(points[11],points[23],points[25])+jointAngle(points[12],points[24],points[26]))/2;
  if(knee>155&&this.phase==='ready')this.phase='standing';
  if(knee<110&&this.phase==='standing'){this.phase='down';this.lowAt=time;}
  if(knee>155&&this.phase==='down'&&time-this.lowAt>350&&time-this.last>1000){this.reps++;this.phase='standing';this.last=time;}
  const dx=(points[11].x+points[12].x-points[23].x-points[24].x)/2,dy=(points[23].y+points[24].y-points[11].y-points[12].y)/2;
  const lean=Math.atan2(Math.abs(dx),Math.abs(dy))*180/Math.PI;
  const ankleWidth=Math.abs(points[27].x-points[28].x),kneeWidth=Math.abs(points[25].x-points[26].x);
  const frontal=Math.abs(points[11].x-points[12].x)>.15;
  const feedback=frontal&&ankleWidth>.12&&kneeWidth<ankleWidth*.65?'화면상 무릎이 안쪽으로 모이는 것으로 보입니다. 발 방향을 확인하세요.':!frontal&&lean>45?'화면상 상체 기울기가 큽니다. 편안한 범위로 줄여주세요.':'동작이 감지되고 있습니다. 통증 없는 범위에서 천천히 움직이세요.';
  return {reps:this.reps,phase:this.phase,knee:Math.round(knee),hip:Math.round(hip),lean:Math.round(lean),feedback};
 }
}

export const POSE_EXERCISES={
 squat:{label:'스쿼트',joints:[23,25,27,24,26,28],down:110,up:155},
 lunge:{label:'런지',joints:[23,25,27,24,26,28],down:110,up:155,minimum:true},
 push_up:{label:'푸시업',joints:[11,13,15,12,14,16],down:100,up:155},
 plank:{label:'플랭크',joints:[11,23,27,12,24,28],hold:true,up:155},
 shoulder_press:{label:'숄더 프레스',joints:[11,13,15,12,14,16],down:100,up:155,overhead:true},
 curl:{label:'컬',joints:[11,13,15,12,14,16],down:65,up:145},
 hip_hinge:{label:'힙힌지',joints:[11,23,25,12,24,26],down:110,up:155},
 lateral_raise:{label:'레터럴 레이즈',joints:[23,11,13,24,12,14],down:30,up:75},
 bent_row:{label:'벤트오버 로우',joints:[11,13,15,12,14,16],down:85,up:145},
 front_raise:{label:'프런트 레이즈',joints:[23,11,15,24,12,16],down:30,up:75},
 side_lunge:{label:'사이드 런지',joints:[23,25,27,24,26,28],down:115,up:155,minimum:true},
 glute_bridge:{label:'글루트 브리지',joints:[11,23,25,12,24,26],down:125,up:160},
};
export class MovementCoach {
 constructor(id='squat'){this.id=id;this.config=POSE_EXERCISES[id];if(!this.config)throw Error('Unsupported movement');this.reps=0;this.phase='ready';this.last=0;this.lowAt=0;this.holdSince=null;this.holdMs=0;this.previousTime=null;}
 update(points,time){const c=this.config;
  if(!Number.isFinite(time)||!points||c.joints.some(i=>!reliable(points[i]))){this.phase='ready';this.lowAt=0;this.previousTime=null;return {reps:this.reps,phase:'unknown',feedback:'전신이 잘 보이도록 위치를 조정하세요. 자세 피드백을 일시 중지합니다.'};}
  const a=jointAngle(...c.joints.slice(0,3).map(i=>points[i])),b=jointAngle(...c.joints.slice(3).map(i=>points[i]));
  if(a==null||b==null){this.phase='ready';this.previousTime=null;return {reps:this.reps,phase:'unknown',feedback:'관절 위치를 확인할 수 없습니다.'};}
  const angle=c.minimum?Math.min(a,b):(a+b)/2;
  if(c.hold){
   if(!plankSupported(points)){this.previousTime=null;this.phase='unknown';return {reps:0,seconds:Math.floor(this.holdMs/1000),phase:'unknown',feedback:'측면에서 몸통과 팔 지지점이 보이도록 촬영해 주세요. 플랭크 자세 확인 전에는 시간을 세지 않습니다.'};}
   if(angle>=c.up){const gap=time-this.previousTime;if(this.previousTime!=null&&gap>0&&gap<=500)this.holdMs+=gap;this.phase='holding';}else this.phase='adjust';
   this.previousTime=angle>=c.up?time:null;
   return {reps:0,seconds:Math.floor(this.holdMs/1000),angle:Math.round(angle),phase:this.phase,feedback:this.phase==='holding'?'유지 시간이 기록되고 있습니다. 통증이 있으면 중지하세요.':'화면상 어깨·골반·발목 정렬을 확인하세요.'};
  }
  const extended=angle>c.up&&(!c.overhead||(points[15].y<points[11].y&&points[16].y<points[12].y));
  if(extended&&this.phase==='ready')this.phase='standing';
  if(angle<c.down&&this.phase==='standing'){this.phase='down';this.lowAt=time;}
  if(extended&&this.phase==='down'&&time-this.lowAt>350&&time-this.last>1000){this.reps++;this.phase='standing';this.last=time;}
  return {reps:this.reps,angle:Math.round(angle),phase:this.phase,feedback:'동작을 감지하고 있습니다. 편안한 범위에서 천천히 움직이세요.'};
 }
}

// Every analyzer instance owns its phase, ROM and timing; unknown frames never infer corrections.
export class ExercisePoseAnalyzer {
 constructor(id){this.id=id;this.engine=new MovementCoach(id);this.phases=new TemporalPhases(id);this.min=Infinity;this.max=-Infinity;this.lastRep=0;this.repAt=null;this.tempo=null;}
 update(points,time,aspectRatio=1){
  const c=this.engine.config;
  const required=this.id==='plank'?[...c.joints,13,14]:c.joints;
  const inFrame=required.every(i=>points?.[i]&&Number.isFinite(points[i].x)&&Number.isFinite(points[i].y)&&points[i].x>=0&&points[i].x<=1&&points[i].y>=0&&points[i].y<=1);
  if(!inFrame||!Number.isFinite(aspectRatio)||aspectRatio<=0)points=[];
  else points=points.map(p=>p?({...p,y:p.y*aspectRatio}):p);
  if(this.phases.lastTime!=null&&(time<=this.phases.lastTime||time-this.phases.lastTime>500))this.engine.previousTime=null;
  const result=this.engine.update(points,time);
  const detected=result.phase!=='unknown';
  const visibleJoints=c.joints.filter(i=>points?.[i]&&(points[i].visibility??0)>=.7);
  const confidence=detected?Math.min(...c.joints.map(i=>points[i].visibility??0)):0;
  const left=detected?jointAngle(...c.joints.slice(0,3).map(i=>points[i])):null;
  const right=detected?jointAngle(...c.joints.slice(3).map(i=>points[i])):null;
  let angle=left!=null&&right!=null?(c.minimum?Math.min(left,right):(left+right)/2):null;
  if(c.overhead&&angle>c.up&&!(points[15].y<points[11].y&&points[16].y<points[12].y))angle=(c.down+c.up)/2;
  if(angle!=null){this.min=Math.min(this.min,angle);this.max=Math.max(this.max,angle);}
  if(!detected){this.repAt=null;this.min=Infinity;this.max=-Infinity;}
  const temporal=this.phases.update(angle,time,confidence);
  if(!c.hold)result.reps=temporal.reps;
  if(result.reps>this.lastRep){this.tempo=this.repAt==null?null:(time-this.repAt)/1000;this.repAt=time;this.lastRep=result.reps;}
  const warnings=[],corrections=[];
  if(detected&&Math.abs(left-right)>20){warnings.push('화면상 좌우 움직임 차이가 보입니다. 카메라 각도도 확인하세요.');}
  if(detected&&this.id==='squat'){
   const extra=[11,12].every(i=>reliable(points[i])&&points[i].x>=0&&points[i].x<=1&&points[i].y>=0&&points[i].y<=aspectRatio);
   if(extra)corrections.push(...squatCorrections(points));
  }
  if(detected&&['push_up','plank'].includes(this.id)){
   const align=jointAngle(points[11],points[23],points[27]);
   if([11,23,27].every(i=>reliable(points[i])&&points[i].x>=0&&points[i].x<=1&&points[i].y>=0&&points[i].y<=aspectRatio)&&align!=null&&align<150)corrections.push('화면상 어깨·골반·발목 정렬을 확인하세요.');
  }

  return {...result,...temporal,detected,confidence,visible_joints:visibleJoints,range_of_motion:detected&&Number.isFinite(this.min)?Math.round(this.max-this.min):null,tempo:this.tempo,left_right_balance:detected?Math.round(Math.abs(left-right)):null,warnings,corrections,completion_state:detected?(c.hold?result.phase:result.reps?'repetition_recorded':'in_progress'):'tracking_lost'};
 }
}
export const ANALYZERS=Object.fromEntries(Object.keys(POSE_EXERCISES).map(id=>[id,class extends ExercisePoseAnalyzer{constructor(){super(id);}}]));
export function createExercisePoseAnalyzer(id){if(!ANALYZERS[id])throw Error('Unsupported exercise');return new ANALYZERS[id]();}

// Exercise-specific temporal hysteresis. Tracking loss invalidates the current repetition.
export const CAMERA_DIRECTIONS={squat:'측면 또는 45도',lunge:'측면 또는 45도',push_up:'측면',plank:'측면',shoulder_press:'정면 또는 45도',curl:'정면',hip_hinge:'측면',lateral_raise:'정면',bent_row:'측면 또는 45도',front_raise:'측면',side_lunge:'정면',glute_bridge:'측면'};
const LOW_START=new Set(['shoulder_press','lateral_raise','front_raise','glute_bridge']);
const CONCENTRIC_FIRST=new Set(['shoulder_press','curl','lateral_raise','bent_row','front_raise','glute_bridge']);
export class TemporalPhases{
 constructor(id){this.id=id;this.reps=0;this.phase='start';this.lastTime=null;this.stableAt=null;this.repAt=null;this.extremeAt=null;this.armed=false;this.duration=null;}
 reset(){this.phase='start';this.stableAt=null;this.repAt=null;this.extremeAt=null;this.armed=false;this.duration=null;}
 update(angle,time,confidence){
  const c=POSE_EXERCISES[this.id];
  if(confidence<.7||angle==null||!Number.isFinite(time)){this.reset();this.lastTime=null;return {movement_phase:'unknown',reps:this.reps,rep_seconds:null};}
  if(this.lastTime!=null&&(time<=this.lastTime||time-this.lastTime>500))this.reset();
  this.lastTime=time;
  if(c.hold)return {movement_phase:angle>=c.up?'holding':'start',reps:0,rep_seconds:null};
  const t=Math.max(0,Math.min(1,LOW_START.has(this.id)?(angle-c.down)/(c.up-c.down):(c.up-angle)/(c.up-c.down)));
  const outward=CONCENTRIC_FIRST.has(this.id)?'concentric':'eccentric',inward=CONCENTRIC_FIRST.has(this.id)?'eccentric':'concentric';
  if(!this.armed){if(t<.12){this.stableAt??=time;if(time-this.stableAt>=150)this.armed=true;}else this.stableAt=null;}
  else if(this.phase==='start'||this.phase==='completion'){
   if(t>.2){this.phase=outward;this.repAt=time;this.extremeAt=null;}
  }else if(this.phase===outward){
   if(t>.85){this.extremeAt??=time;if(time-this.extremeAt>=120)this.phase='bottom';}else this.extremeAt=null;
   if(t<.12){this.phase='start';this.repAt=null;}
  }else if(this.phase==='bottom'&&t<.75)this.phase=inward;
  else if(this.phase===inward&&t<.12){
   if(time-this.repAt>=650){this.reps++;this.duration=(time-this.repAt)/1000;this.phase='completion';}else this.phase='start';
   this.repAt=null;
  }
  return {movement_phase:this.phase,reps:this.reps,rep_seconds:this.duration};
 }
}
