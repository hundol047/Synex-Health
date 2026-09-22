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
