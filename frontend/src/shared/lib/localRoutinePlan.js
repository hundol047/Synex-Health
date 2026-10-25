import catalog from './localCatalog.json' with {type:'json'};
import {buildTempoPlan,recommendedRest} from '../../health/components/exercise/tempoSession.js';

export const LOCAL_ROUTINE_VERSION='device-balanced-v2';
const patterns=['squat','push','pull','hinge','core'];
const preferred=['sit_stand','wall_push','scapular','bridge','dead_bug','walk'];
const weekdays={1:[1],2:[1,4],3:[1,3,5],4:[1,2,4,6],5:[1,2,3,5,6],6:[1,2,3,4,5,6],7:[1,2,3,4,5,6,7]};
const strengthSlots={1:[0],2:[0,1],3:[0,1,2],4:[0,2,3],5:[0,2,4],6:[0,2,4],7:[0,2,4]};
const seconds=exercises=>Math.ceil(buildTempoPlan(exercises).reduce((sum,s)=>sum+s.durationMs,0)/1000);
export function balancedLocalDays(profile,{gentle=false,cautious=false,fatGoal=false}={}){
 const allowed=catalog.filter(x=>x.auto_recommend!==false&&x.difficulty!=='advanced'&&x.locations.includes(profile.exercise_location)&&x.equipment.every(k=>profile.available_equipment.includes(k))&&(profile.training_mode!=='bodyweight'||!x.equipment.length));
 const pick=(pattern,variation=0)=>{
  let candidates=allowed.filter(x=>x.pattern===pattern);
  if(gentle&&candidates.some(x=>x.easy))candidates=candidates.filter(x=>x.easy);
  const score=x=>(profile.training_mode==='equipment'&&x.equipment.length?30:0)+(preferred.includes(x.id)?3:0);
  candidates.sort((a,b)=>score(b)-score(a));
  const best=candidates.filter(x=>Boolean(x.equipment.length)===Boolean(candidates[0]?.equipment.length));
  return best.length?best[variation%Math.min(best.length,2)]:undefined;
 };
 const exercise=(x,day)=>({exercise_id:`d${day}-${x.id}`,motion_id:x.motion_id||x.id,exercise_name:x.name,day_number:day,target_regions:x.regions,training_type:x.training_type,equipment:x.equipment,instructions:x.instructions,cautions:x.cautions,sets:1,reps:'6',dose_type:x.dose_type,hold_seconds:x.dose_type==='hold'?20:undefined,duration_seconds:x.dose_type==='duration'?60:undefined,intensity:'자세를 유지할 수 있는 부담 · 통증 없는 범위',reason:'하체·밀기·등·엉덩이·몸통을 골고루 배정하고 실제 시범·휴식 시간을 합산했습니다.',rest_seconds:recommendedRest({motion_id:x.motion_id||x.id,equipment:x.equipment,dose_type:x.dose_type}).seconds,transition_seconds:x.equipment.length?30:20});
 const exercises=[],day_minutes={},day_timing={},schedule=[];
 for(let slot=0;slot<profile.days_per_week;slot++){
  const day=slot+1,strength=strengthSlots[profile.days_per_week].includes(slot),variation=strengthSlots[profile.days_per_week].indexOf(slot);
  const budget=Math.min(profile.minutes_per_session*60,cautious?30*60:60*60);
  // Preparation is shown separately, not silently consumed by an unlimited cardio allocation.
  const warmup=budget<=600?60:120,limit=budget-warmup;
  let moves;
  if(strength){
   moves=patterns.map(pattern=>pick(pattern,variation)).filter(Boolean).map(x=>exercise(x,day));
   if(moves.length<4)throw Error('현재 장소·장비로 균형 잡힌 루틴을 만들 수 없습니다. 운동 조건을 확인하세요.');
   // All movement patterns get a first set before any exercise gets extra volume.
   const maxSets=cautious?1:profile.experience_level==='BEGINNER'?2:profile.experience_level==='ADVANCED'?4:3;
   if(seconds(moves)>limit){moves=moves.map(x=>({...x,reps:'4',hold_seconds:15}));}
   if(seconds(moves)>limit)throw Error('선택한 시간 안에 기본 동작과 휴식을 담을 수 없습니다. 운동 시간을 늘려 주세요.');
   for(let round=2;round<=maxSets;round++)for(let i=0;i<moves.length;i++){
    const candidate=moves.map((x,j)=>j===i?{...x,sets:round}:x);
    if(seconds(candidate)<=limit)moves=candidate;
   }
   // Cardio uses only time left after balanced strength work; it cannot displace it.
   const cardio=pick('cardio',variation);
   if(fatGoal&&cardio){const item={...exercise(cardio,day),sets:1,duration_seconds:60,duration:'1분'};
    const remaining=Math.min(600,limit-seconds([...moves,item])+60);
    if(remaining>=60)moves.push({...item,duration_seconds:Math.floor(remaining/30)*30,duration:`${Math.floor(remaining/30)*.5}분`,reason:'근력 동작을 먼저 확보한 뒤 남는 시간에 가벼운 유산소를 배정했습니다.'});
   }
  }else{
   const cardio=pick('cardio',slot),mobility=allowed.filter(x=>x.pattern==='mobility');
   moves=[...(cardio?[{...exercise(cardio,day),duration_seconds:180,duration:'3분'}]:[]),...mobility.slice(slot%2,slot%2+3).map(x=>({...exercise(x,day),duration_seconds:40,transition_seconds:10,reason:'근력 운동 사이의 가벼운 회복·가동성 세션입니다.'}))];
   if(moves.length<2)throw Error('회복 세션에 사용할 동작이 부족합니다. 운동 조건을 확인하세요.');
   if(cardio){const extra=Math.min(600-180,Math.max(0,limit-seconds(moves)));moves[0].duration_seconds+=Math.floor(extra/30)*30;moves[0].duration=`${moves[0].duration_seconds/60}분`;}
  }
  const plan=buildTempoPlan(moves),work=plan.filter(s=>s.kind==='work').reduce((n,s)=>n+s.durationMs,0)/1000,rest=plan.filter(s=>s.kind==='rest').reduce((n,s)=>n+s.durationMs,0)/1000;
  const total=seconds(moves)+warmup;
  for(const move of moves)move.estimated_minutes=Math.round(seconds([move])/6)/10;
  exercises.push(...moves);day_minutes[day]=Math.round(total/6)/10;
  day_timing[day]={kind:strength?'strength':'recovery',exercise_count:moves.length,work_seconds:work,rest_seconds:rest,warmup_seconds:warmup,total_seconds:total,available_seconds:profile.minutes_per_session*60,suggested_weekday:weekdays[profile.days_per_week][slot]};
  schedule.push(`${['','월','화','수','목','금','토','일'][weekdays[profile.days_per_week][slot]]}요일 권장 · ${strength?`전신 근력 ${String.fromCharCode(65+variation)}`:'가벼운 회복·가동성'} · ${moves.length}개 동작`);
 }
 return {exercises,day_minutes,day_timing,schedule};
}
