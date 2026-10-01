// Local-only partial sample summary. Never mix native workouts with app completion counts.
export function summarizeDeviceActivity(samples){
 const days=new Map(),seen=new Set(),intervals=new Map();let excluded=0;
 const key=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
 for(const s of [...samples].sort((a,b)=>String(a.startDate).localeCompare(String(b.startDate)))){
  const start=new Date(s.startDate),end=new Date(s.endDate||s.startDate);
  const id=`${s.type}|${s.platformId||`${s.startDate}|${s.endDate}|${s.value}|${s.duration}`}`;
  if(seen.has(id)||!Number.isFinite(+start)||!Number.isFinite(+end)||end<start){excluded++;continue;}seen.add(id);
  const day=key(start);
  // Avoid assigning a cross-midnight aggregate entirely to its start day.
  if(day!==key(end)){excluded++;continue;}
  if(!days.has(day))days.set(day,{date:day,steps:0,stepSamples:0,minutes:0,workoutSamples:0,weight:null});
  const row=days.get(day),bucket=`${day}|${s.type}`,prior=intervals.get(bucket)||[];
  if(s.type==='steps'||s.type==='workouts'){
   if(prior.some(([a,b])=>+start<b&&+end>a||+start===a&&+end===b)){excluded++;continue;}
   if(s.type==='steps'){
    if(!Number.isFinite(s.value)||s.value<0){excluded++;continue;}
    row.steps+=s.value;row.stepSamples++;
   }else{
    const seconds=Math.min((end-start)/1000,Number.isFinite(s.duration)?s.duration:(end-start)/1000);
    if(seconds<=0){excluded++;continue;}row.minutes+=seconds/60;row.workoutSamples++;
   }
   intervals.set(bucket,[...prior,[+start,+end]]);
  }else if(s.type==='weight'&&s.unit==='kg'&&Number.isFinite(s.value)&&s.value>0)row.weight=s.value;
 }
 return {days:[...days.values()].sort((a,b)=>a.date.localeCompare(b.date)),excluded};
}
