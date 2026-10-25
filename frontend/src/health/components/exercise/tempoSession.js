import {getMotionGuide} from './motionGuide.js';

const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));
const positive=(value,fallback)=>Number.isFinite(Number(value))&&Number(value)>0?Number(value):fallback;
const recovery=new Set(['hamstring_stretch','calf_stretch','chest_open','cat_cow','thoracic_rotation','ankle_pump','shoulder_roll','heel_slide']);
const demanding=new Set(['full_pushup','pushup','lunge','reverse_lunge','side_lunge','single_bridge','barbell_squat','barbell_rdl','leg_press']);
export function recommendedRest(exercise){
 const planned=Number(exercise.rest_seconds);
 if(exercise.rest_seconds!=null&&Number.isFinite(planned))return {seconds:clamp(Math.round(planned),10,120),reason:'내 루틴에 설정된 휴식'};
 const id=exercise.motion_id,guide=getMotionGuide(id);
 if(recovery.has(id))return {seconds:20,reason:'가벼운 가동성 운동 후 호흡 정리'};
 if(demanding.has(id))return {seconds:90,reason:'큰 근육을 쓰거나 한쪽씩 지지하는 동작의 회복'};
 if(guide?.kind==='hold')return {seconds:45,reason:'몸통 지지와 호흡 회복'};
 return {seconds:60,reason:'다음 세트의 자세를 유지하기 위한 기본 회복'};
}
export function tempoPrescription(exercise){
 const guide=getMotionGuide(exercise.motion_id);
 const kind=exercise.dose_type==='hold'||guide?.kind==='hold'?'hold':exercise.dose_type==='duration'||guide?.kind==='cyclic'?'duration':'reps';
 const numbers=String(exercise.reps||'').match(/\d+/g)||[];
 const perSide=/각|쪽|좌우|each/i.test(String(exercise.reps));
 const reps=clamp(Number(numbers[0])||8,1,100)*(guide?.kind==='alternating'&&perSide?2:1);
 const seconds=kind==='hold'?positive(exercise.hold_seconds,30):positive(exercise.duration_seconds,Number(String(exercise.duration||'').match(/([\d.]+)\s*분/)?.[1])*60||60);
 return {kind,reps,sets:clamp(Math.round(positive(exercise.sets,2)),1,20),seconds:clamp(seconds,5,3600),cycleMs:guide?.durationMs||7000,alternating:guide?.kind==='alternating',guide};
}
export function buildTempoPlan(exercises,{speed=1,restOverrides={}}={}){
 const segments=[];
 exercises.forEach((exercise,index)=>{
  const p=tempoPrescription(exercise),rate=clamp(positive(speed,1),.5,1.5);
  const cycleMs=p.cycleMs/rate,repMs=cycleMs/(p.alternating?2:1);
  const restSeconds=clamp(positive(restOverrides[index],recommendedRest(exercise).seconds),10,120);
  segments.push({kind:'prepare',exerciseIndex:index,set:1,durationMs:5000});
  for(let set=1;set<=p.sets;set++){
   segments.push({kind:'work',exerciseIndex:index,set,durationMs:p.kind==='reps'?repMs*p.reps:p.seconds*1000,cycleMs,repMs,prescription:p});
   segments.push({kind:'rest',exerciseIndex:index,set,durationMs:restSeconds*1000,final:set===p.sets,nextExerciseIndex:set===p.sets?index+1:index});
  }
 });
 return segments;
}
export function tempoFrame(segment,elapsedMs=0){
 const elapsed=clamp(Number.isFinite(elapsedMs)?elapsedMs:0,0,segment?.durationMs||0);
 if(segment?.kind!=='work')return {progress:0,rep:0,remaining:Math.ceil(((segment?.durationMs||0)-elapsed)/1000)};
 const p=segment.prescription;
 return {progress:p.kind==='hold'?0:(elapsed%segment.cycleMs)/segment.cycleMs,
  rep:p.kind==='reps'?Math.min(p.reps,Math.floor(elapsed/segment.repMs)+1):0,
  side:p.alternating?(Math.floor(elapsed/segment.repMs)%2===0?'첫 번째 쪽':'반대쪽'):null,
  remaining:Math.ceil((segment.durationMs-elapsed)/1000)};
}
