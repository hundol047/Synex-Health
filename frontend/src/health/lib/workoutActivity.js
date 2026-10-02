// Activity is evidence of performed work, independent of target completion.
export function hasWorkoutActivity(w){
 if(w.completion_status==='not_started')return false;
 if(w.set_records?.length)return w.set_records.some(s=>s.reps>0);
 if(w.timed_sets_seconds?.length)return w.timed_sets_seconds.some(s=>s>0);
 if(Number(w.performed_seconds)>0)return true;
 if(w.completion_status==='partial'||w.completion_status==='completed')return true;
 if(w.reps_completed&&/^[0\s,]+$/.test(w.reps_completed))return false;
 return Number(w.sets_completed)>0||w.completed===true;
}
