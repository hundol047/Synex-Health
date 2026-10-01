// Summaries of reported external load, not estimates of strength or bodyweight load.
export function normalizeSets(rows) {
 return rows.map(row=>{
  const reps=Number(row.reps),weight=row.weight_kg===''||row.weight_kg==null?null:Number(row.weight_kg);
  if(row.reps===''||row.reps==null||!Number.isInteger(reps)||reps<0||reps>1000||weight!==null&&(!Number.isFinite(weight)||weight<0||weight>1000))throw Error('각 세트의 횟수(0–1000)와 중량(0–1000kg)을 확인하세요. 중량 미입력은 미기록으로 남습니다.');
  return {reps,weight_kg:weight,kind:row.kind==='warmup'?'warmup':'working'};
 });
}
export const exerciseKey=w=>w.exercise_catalog_id||w.exercise_name;
export function previousWorkout(logs,exercise,before){
 return logs.filter(w=>w.date<before&&((w.exercise_catalog_id&&w.exercise_catalog_id===exercise.motion_id)||(!w.exercise_catalog_id&&w.exercise_name===exercise.exercise_name)))
  .sort((a,b)=>b.date.localeCompare(a.date)||String(b.created_at).localeCompare(String(a.created_at)))[0];
}
export function workoutSummary(logs,now=new Date()){
 const today=new Date(now.getFullYear(),now.getMonth(),now.getDate()),weeks=[];
 const monday=new Date(today);monday.setDate(monday.getDate()-(monday.getDay()+6)%7);
 const dateKey=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
 for(let i=7;i>=0;i--){const d=new Date(monday);d.setDate(d.getDate()-i*7);weeks.push({date:dateKey(d),days:new Set(),sets:0,volume:0,loadedSets:0});}
 const exercises=new Map();
 for(const w of logs){
  if(w.date>dateKey(today))continue;
  const sets=(w.set_records||[]).filter(s=>s.kind!=='warmup'&&s.reps>0);
  const loaded=sets.filter(s=>Number.isFinite(s.weight_kg));
  const week=weeks.findLast(v=>w.date>=v.date);
  if(week){if(w.completed)week.days.add(w.date);week.sets+=w.set_records?.length?sets.length:(w.completed?w.sets_completed||0:0);week.volume+=loaded.reduce((n,s)=>n+s.weight_kg*s.reps,0);week.loadedSets+=loaded.length;}
  const key=exerciseKey(w);
  if(!exercises.has(key))exercises.set(key,{key,name:w.exercise_name,sessions:[]});
  if(sets.length)exercises.get(key).sessions.push({date:w.date,sets:sets.length,reps:sets.reduce((n,s)=>n+s.reps,0),volume:loaded.length?loaded.reduce((n,s)=>n+s.weight_kg*s.reps,0):null,max:loaded.length?Math.max(...loaded.map(s=>s.weight_kg)):null,pain:w.pain||0});
 }
 return {weeks:weeks.map(w=>({...w,days:w.days.size})),exercises:[...exercises.values()].map(e=>({...e,sessions:e.sessions.sort((a,b)=>a.date.localeCompare(b.date))})).filter(e=>e.sessions.length)};
}
