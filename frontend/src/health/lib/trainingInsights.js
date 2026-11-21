import catalog from '../../shared/lib/localCatalog.json' with {type:'json'};
// Personal records and the measurement → training link (closed loop).
// Everything here summarizes what the user entered; it never estimates strength
// for unrecorded loads and never diagnoses.

const REGION_OF=new Map(catalog.map(e=>[e.id,e.regions||[]]));
// Personal (local) mode logs carry only exercise_name, so match every catalog name.
const REGION_BY_NAME=new Map(catalog.flatMap(e=>[e.name,e.korean_name,e.english_name].filter(Boolean).map(n=>[n,e.regions||[]])));
export const REGIONS=['상체','몸통','하체'];
// Segmental analyzer segments → exercise catalog regions.
export const SEGMENT_REGION={LEFT_ARM:'상체',RIGHT_ARM:'상체',TRUNK:'몸통',LEFT_LEG:'하체',RIGHT_LEG:'하체'};
// Epley is only reasonable at low repetitions; above this we do not estimate.
export const E1RM_MAX_REPS=10;

const dateKey=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const workingSets=w=>(w.set_records||[]).filter(s=>s.kind!=='warmup'&&Number.isInteger(s.reps)&&s.reps>0);
const painful=(w,s)=>w.difficulty==='pain'||(w.pain||0)>0||(s?.pain||0)>0;

export function estimateOneRepMax(weight,reps){
 if(!Number.isFinite(weight)||weight<=0||!Number.isInteger(reps)||reps<1||reps>E1RM_MAX_REPS)return null;
 return reps===1?weight:Math.round(weight*(1+reps/30)*10)/10;
}

export function regionsFor(w){
 const regions=REGION_OF.get(w.exercise_catalog_id)||REGION_BY_NAME.get(w.exercise_name)||[];
 // Whole-body work counts toward every measured region.
 return regions.includes('전신')?REGIONS:regions.filter(r=>REGIONS.includes(r));
}

/** Best entered results per exercise. Sets recorded with pain are excluded. */
export function personalRecords(logs,now=new Date()){
 const today=dateKey(now),byKey=new Map();
 const ordered=[...logs].filter(w=>w.date&&w.date<=today).sort((a,b)=>a.date.localeCompare(b.date));
 for(const w of ordered){
  const key=w.exercise_catalog_id||w.exercise_name;if(!key)continue;
  const entry=byKey.get(key)||{key,name:w.exercise_name,heaviest:null,e1rm:null,reps:null,sessions:0};
  let used=false;
  for(const s of workingSets(w)){
   if(painful(w,s))continue;used=true;
   const weight=Number.isFinite(s.weight_kg)&&s.weight_kg>0?s.weight_kg:null;
   if(weight!=null){
    if(!entry.heaviest||weight>entry.heaviest.weight_kg||weight===entry.heaviest.weight_kg&&s.reps>entry.heaviest.reps)entry.heaviest={weight_kg:weight,reps:s.reps,date:w.date};
    const e=estimateOneRepMax(weight,s.reps);
    if(e!=null&&(!entry.e1rm||e>entry.e1rm.value))entry.e1rm={value:e,weight_kg:weight,reps:s.reps,date:w.date};
   }else if(!entry.reps||s.reps>entry.reps.reps)entry.reps={reps:s.reps,date:w.date};
  }
  if(used){entry.sessions++;byKey.set(key,entry);}
 }
 const latest=ordered.at(-1)?.date;
 return [...byKey.values()].map(e=>({...e,recent:[e.heaviest?.date,e.e1rm?.date,e.reps?.date].some(d=>d&&latest&&d===latest)}))
  .sort((a,b)=>a.name.localeCompare(b.name,'ko'));
}

/** Working sets per region: the current (in-progress) week and the average of the previous `weeks` weeks. */
export function regionWeeklySets(logs,now=new Date(),weeks=4){
 const today=new Date(now.getFullYear(),now.getMonth(),now.getDate());
 const monday=new Date(today);monday.setDate(monday.getDate()-(monday.getDay()+6)%7);
 const start=new Date(monday);start.setDate(start.getDate()-weeks*7);
 const thisWeek=dateKey(monday),from=dateKey(start),to=dateKey(today);
 const rows=Object.fromEntries(REGIONS.map(r=>[r,{region:r,current:0,previous:0}]));
 for(const w of logs){
  if(!w.date||w.date<from||w.date>to)continue;
  const sets=w.set_records?.length?workingSets(w).length:(w.timed_sets_seconds||[]).filter(s=>s>0).length||(w.completed?w.sets_completed||0:0);
  if(!sets)continue;
  for(const r of regionsFor(w))rows[r][w.date>=thisWeek?'current':'previous']+=sets;
 }
 return REGIONS.map(r=>({...rows[r],average:Math.round(rows[r].previous/weeks*10)/10}));
}

/**
 * Compare the latest segmental measurement with recent training share.
 * A region is a "focus" when its lowest measured lean reference % is below `threshold`.
 */
export function measurementTrainingLink(measurement,volume,threshold=90){
 if(!measurement?.segments?.length)return {status:'no_segments',regions:[]};
 const lowest={};
 for(const s of measurement.segments){
  const region=SEGMENT_REGION[s.segment],p=Number(s.lean_reference_percent);
  if(!region||!Number.isFinite(p))continue;
  if(!lowest[region]||p<lowest[region].percent)lowest[region]={percent:p,segment:s.segment};
 }
 if(!Object.keys(lowest).length)return {status:'no_reference',regions:[]};
 const total=volume.reduce((n,v)=>n+v.previous+v.current,0);
 const regions=REGIONS.filter(r=>lowest[r]).map(r=>{
  const v=volume.find(x=>x.region===r),sets=v.previous+v.current,share=total?Math.round(sets/total*100):0;
  const focus=lowest[r].percent<threshold;
  // Equal split across the three regions is the neutral baseline (~33%).
  const advice=!focus?'유지':!total?'기록 없음':share<30?'훈련 비중 확인':'진행 중';
  return {region:r,percent:lowest[r].percent,segment:lowest[r].segment,sets,share,focus,advice};
 });
 return {status:total?'ok':'no_training',regions,date:measurement.measurement_date};
}
