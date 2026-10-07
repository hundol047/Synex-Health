import catalog from './localCatalog.json';
import schools from './localSchools.json';
import {loadLocalDocument,saveLocalDocument} from './offline.js';
import {secureUUID} from './uuid.js';
import {LOCAL_ACCOUNT} from './localMode.js';
const segments=['LEFT_ARM','RIGHT_ARM','TRUNK','LEFT_LEG','RIGHT_LEG'];
const safety=['safety_chest_pain','safety_fainting','safety_breathlessness','safety_acute_injury','safety_medical_restriction'];
const now=()=>new Date().toISOString();
export const localDate=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
const fail=(message,status=422)=>{throw Object.assign(Error(message),{status});};
const initial=()=>({version:1,profile:{id:LOCAL_ACCOUNT,name:'나',role:'student',gender:'unspecified',height:null,school_id:null,share_with_center:false},exercise:{user_id:LOCAL_ACCOUNT,experience_level:'BEGINNER',goal:'GENERAL_HEALTH',days_per_week:3,minutes_per_session:20,training_mode:'bodyweight',exercise_location:'home',available_equipment:[],limitations:[],preferences:[],...Object.fromEntries(safety.map(k=>[k,false]))},measurements:[],routines:[],workouts:[],history:[],goal:null});
const numeric=(v,min,max,label)=>{if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)fail(`${label}: ${min}–${max} 범위의 숫자를 입력하세요.`);};
const latest=s=>[...s.measurements].sort((a,b)=>a.measurement_date.localeCompare(b.measurement_date)||a.created_at.localeCompare(b.created_at)).at(-1);
function measured(s){const m=latest(s);if(!m)fail('체성분 측정값을 먼저 입력하세요.',404);return m;}
function validateMeasurement(b){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(b.measurement_date)||Number.isNaN(Date.parse(b.measurement_date))||new Date(b.measurement_date).toISOString().slice(0,10)!==b.measurement_date||b.measurement_date>localDate())fail('올바른 오늘 이전 측정일을 입력하세요.');
 numeric(b.weight,.1,500,'체중');numeric(b.skeletal_muscle_mass,0,b.weight,'골격근량');
 if(b.height!=null)numeric(b.height,50,250,'키');if(b.body_fat_percentage!=null)numeric(b.body_fat_percentage,0,100,'체지방률');
 const seen=new Set();for(const seg of b.segments||[]){if(!segments.includes(seg.segment)||seen.has(seg.segment))fail('측정 부위가 잘못되거나 중복되었습니다.');seen.add(seg.segment);for(const k of ['lean_mass_kg','fat_mass_kg','lean_reference_percent'])if(seg[k]!=null)numeric(seg[k],0,k.endsWith('_kg')?b.weight:1000,'부위 측정값');}
}
function review(s){for(const r of s.routines){r.needs_review=true;r.review_reason='측정값·운동 조건이 바뀌었습니다. 운동 전에 계획을 다시 생성하세요.';}}
function body(s){
 const m=measured(s),list=[...s.measurements].sort((a,b)=>a.measurement_date.localeCompare(b.measurement_date)||a.created_at.localeCompare(b.created_at)),prev=list.at(-2)||null;
 const delta=(a,b)=>a==null||b==null?null:Number((a-b).toFixed(2));
 const map=new Map((m.segments||[]).map(x=>[x.segment,x])),old=new Map((prev?.segments||[]).map(x=>[x.segment,x]));
 return {measurement:m,previous_measurement:prev,current_measurement_id:m.id,previous_measurement_id:prev?.id||null,body_profile:{gender:s.profile.gender,height_cm:m.height||s.profile.height,model_type:'illustrative_human',personal_scan:false},average_comparison:{groups:[],selected_group_id:null,selection_mode:'auto'},reference_comparison:Object.fromEntries(segments.map(id=>[id,{status:map.has(id)?'no_reference':'no_measurement'}])),top_level_deltas:Object.fromEntries(['weight','skeletal_muscle_mass','body_fat_percentage','body_fat_mass'].map(k=>[k+'_delta',delta(m[k],prev?.[k])])),left_right_balance:Object.fromEntries([['arm','LEFT_ARM','RIGHT_ARM'],['leg','LEFT_LEG','RIGHT_LEG']].map(([part,l,r])=>{const a=map.get(l)?.lean_mass_kg,b=map.get(r)?.lean_mass_kg;return [part,{left_kg:a??null,right_kg:b??null,diff_percent:a!=null&&b>0?Number(((a-b)/b*100).toFixed(1)):null}];})),segment_deltas:segments.map(id=>({segment:id,lean_mass_delta_kg:delta(map.get(id)?.lean_mass_kg,old.get(id)?.lean_mass_kg),fat_mass_delta_kg:delta(map.get(id)?.fat_mass_kg,old.get(id)?.fat_mass_kg)}))};
}
export function generateLocalRoutine(s){
 const p=s.exercise,m=measured(s),recent=s.workouts.filter(w=>Date.now()-Date.parse(w.date)<7*86400000);
 if(safety.some(k=>p[k])||p.limitations.length||recent.some(w=>(w.pain??0)>=4||(w.set_records||[]).some(x=>(x.pain??0)>=4)))fail('건강센터 또는 의료전문가와 상담 후 운동계획을 설정하세요.',409);
 const bmi=m.height?m.weight/(m.height/100)**2:null;
 const previous=[...s.measurements].filter(x=>x.measurement_date<m.measurement_date).sort((a,b)=>a.measurement_date.localeCompare(b.measurement_date)).at(-1);
 const muscleDown=previous&&m.skeletal_muscle_mass<previous.skeletal_muscle_mass;
 const gentle=p.experience_level==='BEGINNER'||(bmi!=null&&bmi<18.5)||muscleDown||recent.some(w=>(w.rpe??0)>=8);
 const allowed=catalog.filter(x=>x.auto_recommend!==false&&x.difficulty!=='advanced'&&x.locations.includes(p.exercise_location)&&x.equipment.every(k=>p.available_equipment.includes(k))&&(p.training_mode!=='bodyweight'||!x.equipment.length));
 const byPattern=pattern=>allowed.filter(x=>x.pattern===pattern).sort((a,b)=>{
  const score=x=>(gentle&&x.easy?10:0)+(p.training_mode==='equipment'&&x.equipment.length?8:0)+(['sit_stand','wall_push','scapular','bridge','dead_bug','walk'].includes(x.id)?3:0);
  return score(b)-score(a);
 })[0];
 const moves=['squat','push','pull','hinge','core'].map(byPattern).filter(Boolean);
 if(!moves.length)fail('선택한 환경에 맞는 운동이 없습니다. 운동 기구와 장소를 확인하세요.');
 const sets=gentle?1:p.experience_level==='ADVANCED'?3:2;
 const strengthDays=Math.min(3,p.days_per_week),exercises=[],day_minutes={};
 for(let day=1;day<=p.days_per_week;day++){
  let used=0;const fatGoal=p.goal==='FAT_MANAGEMENT'||['fat_loss','weight_loss'].includes(s.goal?.strategy);const choices=day<=strengthDays?[...(fatGoal?[byPattern('cardio')].filter(Boolean):[]),...moves]:[byPattern('cardio')].filter(Boolean);
  for(const x of choices){const minutes=x.pattern==='cardio'?Math.min(10,p.minutes_per_session):sets*2;if(used+minutes>p.minutes_per_session)continue;used+=minutes;
   exercises.push({exercise_id:`d${day}-${x.id}`,motion_id:x.id,exercise_name:x.name,day_number:day,target_regions:x.regions,training_type:x.training_type,equipment:x.equipment,instructions:x.instructions,cautions:x.cautions,sets:x.pattern==='cardio'?null:sets,reps:'6–10',duration:x.pattern==='cardio'?`${minutes}분`:null,dose_type:x.dose_type,rest_seconds:60,estimated_minutes:minutes,intensity:'편안한 범위 · 통증 없는 동작',reason:gentle?'경험·최근 측정·수행 부담을 고려해 적은 세트로 시작합니다.':'선택한 운동 경험·장소·기구에 맞춘 기본 동작입니다.'});
  }day_minutes[day]=used;
 }
 if(!exercises.length)fail('운동 시간이 너무 짧습니다. 프로필의 회당 시간을 확인하세요.');
 return {id:secureUUID(),user_id:LOCAL_ACCOUNT,created_at:now(),based_on_measurement_id:m.id,goal:p.goal,summary:'이 폰에서 생성한 기본 운동 계획입니다. 최대 3일의 근력 운동 사이에 휴식일을 두고, 남은 날은 편안한 걷기를 선택하세요.',duration_weeks:4,days_per_week:p.days_per_week,exercises,day_minutes,generated_by:'local_rules',algorithm_version:'device-basic-v1',needs_review:false,rationale:[`경험 ${p.experience_level} · ${p.exercise_location} · ${p.training_mode}`,`측정 체중 ${m.weight}kg · 골격근량 ${m.skeletal_muscle_mass}kg`,muscleDown?'이전보다 낮은 골격근량 기록이 있어 부담을 낮췄습니다. 측정 차이만으로 근력 저하를 진단하지 않습니다.':'근육량만으로 실제 근력·적정 중량을 추정하지 않습니다.'],notices:['개인용 기본 규칙이며 서버의 전체 추천 알고리즘과 다릅니다.','부위별 측정값과 실제 인구 평균은 만들거나 추정하지 않습니다.','통증·어지럼·흉통이 있으면 즉시 중단하세요.'],sources:[],input_snapshot:{weight_kg:m.weight,muscle_kg:m.skeletal_muscle_mass,body_fat_percent:m.body_fat_percentage,profile:structuredClone(p)},schedule:Array.from({length:p.days_per_week},(_,i)=>i<strengthDays?'근력 운동 · 다음 근력 운동까지 휴식일 확보':'편안한 걷기 · 회복'),progression:gentle?'적은 세트부터 시작하고 통증과 수행 부담을 기록하세요.':'실제 수행 기록을 확인한 뒤 재생성하세요. 중량은 자동으로 올리지 않습니다.'};
}
let chain=Promise.resolve();
export function localApi(path,b,{method,signal}={}){
 const execute=async()=>{if(signal?.aborted)throw new DOMException('Aborted','AbortError');const s=await loadLocalDocument()||initial(),m=method||(b===undefined?'GET':'POST'),url=new URL(path,'https://device.invalid'),p=url.pathname;let result,write=false;
 const save=x=>{result=x;write=true;};
 if(p==='/api/health/status')result={status:'ok',service:'synex-health',demo:false,local:true};
 else if(p==='/api/health/profile'){if(m==='PUT'){if(b.height!=null)numeric(b.height,50,250,'키');if(b.gender&&!['male','female','unspecified'].includes(b.gender))fail('성별 값이 잘못되었습니다.');s.profile={...s.profile,height:b.height??s.profile.height,gender:b.gender||s.profile.gender};review(s);save(s.profile);}else result=s.profile;}
 else if(p==='/api/exercise-profile'){if(m==='PUT'){const next={...s.exercise,...b};numeric(next.days_per_week,1,7,'운동 일수');if(!Number.isInteger(next.days_per_week))fail('운동 일수는 정수입니다.');numeric(next.minutes_per_session,10,180,'운동 시간');if(!['BEGINNER','INTERMEDIATE','ADVANCED'].includes(next.experience_level)||!['mixed','bodyweight','equipment'].includes(next.training_mode)||!['home','gym','outdoor'].includes(next.exercise_location))fail('운동 설정이 잘못되었습니다.');for(const k of ['available_equipment','limitations','preferences'])if(!Array.isArray(next[k])||next[k].some(x=>typeof x!=='string'))fail('운동 조건을 확인하세요.');s.exercise=next;review(s);save(next);}else result=s.exercise;}
 else if(p==='/api/schools')result=schools;
 else if(p==='/api/health/school-connection')result={verified:false,integration_status:'기기 전용 · 미연결'};
 else if(p==='/api/health/school'&&m==='PUT'){if(b.share_with_center)fail('기기 전용 모드에서는 건강센터 공유를 사용할 수 없습니다.');if(b.school_id&&!schools.some(x=>x.id===b.school_id))fail('학교를 확인하세요.');s.profile.school_id=b.school_id;s.profile.share_with_center=false;save(s.profile);}
 else if(p==='/api/schools/request')fail('학교 추가 요청은 서버 연결 후 사용할 수 있습니다.',503);
 else if(p==='/api/body-composition'){if(m==='POST'){validateMeasurement(b);const item={...b,id:secureUUID(),user_id:LOCAL_ACCOUNT,source:'manual',created_at:now(),bmi:b.height?Number((b.weight/(b.height/100)**2).toFixed(1)):null,body_fat_mass:b.body_fat_percentage!=null?Number((b.weight*b.body_fat_percentage/100).toFixed(2)):null};s.measurements.push(item);review(s);save(item);}else result=[...s.measurements].sort((a,b)=>a.measurement_date.localeCompare(b.measurement_date));}
 else if(p==='/api/body-composition/latest')result=measured(s);
 else if(p.startsWith('/api/body-composition/')){const id=p.split('/').at(-1);if(m==='DELETE'){s.measurements=s.measurements.filter(x=>x.id!==id);s.routines=[];s.history=[];s.workouts=s.workouts.map(x=>({...x,routine_id:null}));save({notice:'측정과 파생 계획을 삭제했습니다.'});}else result=s.measurements.find(x=>x.id===id)||fail('측정값이 없습니다.',404);}
 else if(['/api/body-map/latest','/api/body-map/comparison'].includes(p))result=body(s);
 else if(p==='/api/body-map/reference-group')fail('기기 전용 모드에는 검증된 비교군 평균 자료가 없습니다.');
 else if(p==='/api/exercise-catalog')result=catalog;
 else if(p==='/api/exercise-routines/generate'){const r=generateLocalRoutine(s);s.history.unshift({id:secureUUID(),date:now(),old_routine:s.routines[0]||null,new_routine:{id:r.id,goal:r.goal},reason:r.progression,workout_adherence:null});s.routines.unshift(r);save(r);}
 else if(p==='/api/exercise-routines')result=s.routines;
 else if(p.startsWith('/api/exercise-routines/')){if(p.includes('/replace/')||p.includes('/alternatives/'))fail('개인용 모드에서는 프로필을 바꾸고 루틴을 재생성하세요.');result=s.routines.find(x=>x.id===p.split('/').at(-1))||fail('루틴이 없습니다.',404);}
 else if(p==='/api/advanced/body')result={measurements:[...s.measurements].sort((a,b)=>a.measurement_date.localeCompare(b.measurement_date)),profile:{gender:s.profile.gender,height_cm:s.profile.height}};
 else if(p==='/api/advanced/progress')result={first_date:s.measurements[0]?.measurement_date||'미입력',last_date:latest(s)?.measurement_date||'미입력',measurement_count:s.measurements.length,summary:'이 폰에 직접 입력한 측정 기록입니다.',notice:'운동 효과나 건강 상태를 진단하지 않습니다.'};
 else if(p==='/api/adaptive-history')result=s.history;
 else if(p==='/api/workouts'){if(m==='POST'){if(!b.exercise_name||!/^\d{4}-\d{2}-\d{2}$/.test(b.date))fail('운동명과 날짜를 확인하세요.');for(const k of ['rpe','pain'])if(b[k]!=null)numeric(b[k],k==='rpe'?1:0,10,k);for(const row of b.set_records||[]){if(row.reps!=null)numeric(row.reps,0,1000,'횟수');if(row.weight_kg!=null)numeric(row.weight_kg,0,1000,'중량');if(row.pain!=null)numeric(row.pain,0,10,'통증');}
 const prior=s.workouts.find(x=>b.mutation_id&&x.mutation_id===b.mutation_id);if(prior)result=prior;else{const existing=s.workouts.find(x=>x.routine_id===b.routine_id&&x.date===b.date&&x.routine_exercise_id===b.routine_exercise_id&&x.exercise_name===b.exercise_name);if(existing&&(b.expected_revision??0)!==existing.revision)fail('다른 입력에서 기록이 바뀌었습니다. 화면을 다시 열어 확인하세요.',409);const routine=s.routines.find(x=>x.id===b.routine_id);if(routine?.needs_review)fail('변경된 조건으로 루틴을 다시 생성하세요.',409);const item={...b,id:existing?.id||secureUUID(),revision:(existing?.revision||0)+1,created_at:existing?.created_at||now(),pending_sync:false};if(existing)s.workouts[s.workouts.indexOf(existing)]=item;else s.workouts.push(item);save(item);}}else result=s.workouts;}
 else if(p.startsWith('/api/workouts/')&&m==='DELETE'){s.workouts=s.workouts.filter(x=>x.id!==p.split('/').at(-1));save({notice:'운동 기록을 삭제했습니다.'});}
 else if(p==='/api/progress')result={measurements:[...s.measurements].sort((a,b)=>a.measurement_date.localeCompare(b.measurement_date)),workout_count:s.workouts.length,completed_workout_count:s.workouts.filter(x=>x.completed||x.completion_status==='completed').length,workout_weeks:[],average_comparison:null};
 else if(p==='/api/goals'){if(m==='PUT'){numeric(b.target,.1,1000,'목표');s.goal={...b,current:null,progress:null};review(s);save(s.goal);}else result=s.goal;}
 else if(p==='/api/integrations/inbody')result={status:'not_connected',operational_state:'UNMAPPED',message:'기기 전용 모드입니다. 건강센터 연결 없이 수동 측정값을 입력하세요.'};
 else if(p==='/api/billing/plans')result={plans:[{id:'free',name:'개인용 무료',price_label:'무료',features:['기기 내 체성분·운동 기록','기본 규칙 운동 추천','3D·동작 안내']}]};
 else if(['/api/billing/subscription','/api/billing/sync'].includes(p))result={state:'free',mode:'disabled',active:false,demo:false};
 else if(p==='/api/health-agent/analyze'){const m=measured(s);result={summary:`${m.measurement_date}에 직접 입력한 체중 ${m.weight}kg, 골격근량 ${m.skeletal_muscle_mass}kg입니다.`,recommendations:['측정 환경을 일정하게 유지하고 변화 기록을 확인하세요.','프로필의 운동 조건과 안전 문진을 확인하세요.'],local:true};}
 else if(p==='/api/privacy/export')result={profile:s.profile,exercise_profile:s.exercise,measurements:s.measurements,routines:s.routines,workouts:s.workouts,goals:s.goal,sharing_history:[],storage:'device-only'};
 else if(['/api/privacy/health-data','/api/privacy/account'].includes(p)&&m==='DELETE'){if(b?.confirmation!=='DELETE')fail('DELETE 확인 문구가 필요합니다.');const empty=initial();if(p.endsWith('health-data')){empty.profile=s.profile;empty.exercise=s.exercise;}Object.assign(s,empty);save({notice:'이 폰의 기록을 삭제했습니다.'});}
 else fail('이 기능은 서버 연결이 필요합니다. 체성분·운동 기록·기본 루틴은 이 폰에서 사용할 수 있습니다.',503);
 if(signal?.aborted)throw new DOMException('Aborted','AbortError');if(write)await saveLocalDocument(s);return structuredClone(result);
 };const next=chain.then(execute);chain=next.catch(()=>{});return next;
}
