// Angles/phase thresholds are conservative product heuristics, not clinical assessment.
export function jointAngle(a,b,c){
 if(!a||!b||!c)return null;
 const u=[a.x-b.x,a.y-b.y,(a.z||0)-(b.z||0)],v=[c.x-b.x,c.y-b.y,(c.z||0)-(b.z||0)];
 const n=Math.hypot(...u)*Math.hypot(...v);if(!n)return null;
 return Math.acos(Math.max(-1,Math.min(1,u.reduce((s,x,i)=>s+x*v[i],0)/n)))*180/Math.PI;
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
 glute_bridge:{label:'글루트 브리지',joints:[11,23,25,12,24,26],down:125,up:160},
};
export class MovementCoach {
 constructor(id='squat'){this.config=POSE_EXERCISES[id];if(!this.config)throw Error('Unsupported movement');this.reps=0;this.phase='ready';this.last=0;this.lowAt=0;this.holdSince=null;this.holdMs=0;this.previousTime=null;}
 update(points,time){const c=this.config;
  if(!points||c.joints.some(i=>!points[i]||(points[i].visibility??0)<.7||![points[i].x,points[i].y,points[i].z??0].every(Number.isFinite))){this.phase='ready';this.lowAt=0;this.previousTime=null;return {reps:this.reps,phase:'unknown',feedback:'전신이 잘 보이도록 위치를 조정하세요. 자세 피드백을 일시 중지합니다.'};}
  const a=jointAngle(...c.joints.slice(0,3).map(i=>points[i])),b=jointAngle(...c.joints.slice(3).map(i=>points[i]));
  if(a==null||b==null){this.phase='ready';this.previousTime=null;return {reps:this.reps,phase:'unknown',feedback:'관절 위치를 확인할 수 없습니다.'};}
  const angle=c.minimum?Math.min(a,b):(a+b)/2;
  if(c.hold){if(angle>=c.up){if(this.previousTime!=null)this.holdMs+=Math.min(200,time-this.previousTime);this.phase='holding';}else this.phase='adjust';this.previousTime=angle>=c.up?time:null;return {reps:0,seconds:Math.floor(this.holdMs/1000),angle:Math.round(angle),phase:this.phase,feedback:this.phase==='holding'?'유지 시간이 기록되고 있습니다. 통증이 있으면 중지하세요.':'화면상 어깨·골반·발목 정렬을 확인하세요.'};}
  const extended=angle>c.up&&(!c.overhead||(points[15].y<points[11].y&&points[16].y<points[12].y));
  if(extended&&this.phase==='ready')this.phase='standing';
  if(angle<c.down&&this.phase==='standing'){this.phase='down';this.lowAt=time;}
  if(extended&&this.phase==='down'&&time-this.lowAt>350&&time-this.last>1000){this.reps++;this.phase='standing';this.last=time;}
  return {reps:this.reps,angle:Math.round(angle),phase:this.phase,feedback:'동작을 감지하고 있습니다. 편안한 범위에서 천천히 움직이세요.'};
 }
}
