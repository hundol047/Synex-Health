export const WORKOUT_STATUS={not_started:'미수행',partial:'일부 수행',completed:'완료',stopped:'통증 중단'};
export function targetSeconds(ex){return ex.dose_type==='hold'?ex.hold_seconds||0:Number((ex.duration||'').match(/([\d.]+)\s*분/)?.[1]||0)*60;}
export function workoutStatus(body,ex){
 if(Number(body.pain)>0||body.difficulty==='pain')return 'stopped';
 let performed=false,enough=false;
 if(ex.dose_type==='hold') {const rows=body.timed_sets_seconds||[];performed=rows.some(s=>s>0);enough=rows.filter(s=>s>=(ex.hold_seconds||1)).length>=(ex.sets||1);}
 else if(ex.dose_type==='duration'){performed=Number(body.performed_seconds)>0;enough=targetSeconds(ex)>0&&Number(body.performed_seconds)>=targetSeconds(ex);}
 else {let n=body.set_records?.length?body.set_records.filter(s=>s.kind!=='warmup'&&s.reps>0).length:Number(body.sets_completed)||0;if(!body.set_records?.length&&body.reps_completed&&/^[0\s,]+$/.test(body.reps_completed))n=0;performed=n>0;enough=n>=(ex.sets||1);}
 return !performed?'not_started':enough&&body.completed!==false?'completed':'partial';
}
