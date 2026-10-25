import catalog from '../../../shared/lib/localCatalog.json' with {type:'json'};

// Activity-class estimates from the 2024 Adult Compendium (not measurements of a
// specific lift, muscle activation or this user's metabolism).
export const CALORIE_SOURCE='https://pacompendium.com/';
export function calorieActivity(exercise){
 const ex={...catalog.find(e=>e.motion_id===exercise.motion_id),...exercise},id=ex.motion_id||'';
 if(/stretch|chest_open|shoulder_roll|ankle_pump|cat_cow|thoracic_rotation/.test(id))return {met:2.3,label:'가벼운 스트레칭·가동성'};
 if(id==='brisk_walk')return {met:4.8,label:'빠른 평지 걷기 · 약 5.6~6.3 km/h'};
 if(/walk/.test(id))return {met:3,label:'느린 평지 걷기 · 약 4 km/h'};
 if(id==='stationary_cycle')return {met:3.5,label:'실내 자전거 · 매우 가벼운 저항'};
 if(id==='elliptical')return {met:5,label:'일립티컬 · 보통 강도'};
 if(ex.training_type==='equipment')return {met:3.5,label:'저항 운동 · 가벼움~보통'};
 return {met:3.8,label:'맨몸 운동 · 보통 강도'};
}
export function calorieOptions(exercise){
 const base=calorieActivity(exercise),id=exercise.motion_id||'';
 let extra=[];
 if(/walk/.test(id))extra=[{met:3,label:'느린 평지 걷기 · 약 4 km/h'},{met:3.8,label:'보통 평지 걷기 · 약 4.5~5.5 km/h'},{met:4.8,label:'빠른 평지 걷기 · 약 5.6~6.3 km/h'}];
 else if(id==='stationary_cycle')extra=[];
 else if(id==='elliptical')extra=[{met:9,label:'일립티컬 · 강한 강도'}];
 else if(base.met===3.5)extra=[{met:6,label:'저항 운동 · 강한 강도'}];
 else if(base.met===3.8)extra=[{met:2.8,label:'맨몸 운동 · 가벼운 강도'},{met:6.5,label:'맨몸 저항 운동 · 높은 강도'}];
 return [base,...extra.filter(option=>option.met!==base.met)];
}
export function estimateCalories(weightKg,minutes,met){
 if(!Number.isFinite(weightKg)||weightKg<20||weightKg>350||!Number.isFinite(minutes)||minutes<0||minutes>240||!Number.isFinite(met)||met<1||met>15)return null;
 return {gross:met*3.5*weightKg/200*minutes,active:(met-1)*3.5*weightKg/200*minutes};
}
export function recordedActiveMinutes(record){
 if(!record)return '';
 const seconds=record.timed_sets_seconds?.reduce((s,v)=>s+(Number.isFinite(v)&&v>0?v:0),0)||record.performed_seconds||0;
 // actual_minutes includes preparation/rest and must never become active time.
 return seconds>0?String(Math.round(seconds/60*100)/100):'';
}
