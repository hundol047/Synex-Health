import {describe,it,expect} from 'vitest';
import {balancedLocalDays} from '../src/shared/lib/localRoutinePlan.js';
import catalog from '../src/shared/lib/localCatalog.json';
import {buildTempoPlan,tempoPrescription} from '../src/health/components/exercise/tempoSession.js';
const base={experience_level:'BEGINNER',days_per_week:3,minutes_per_session:10,training_mode:'bodyweight',exercise_location:'home',available_equipment:[]};
describe('balanced device routines',()=>{
 it('does not let cardio consume the entire first ten-minute session',()=>{
  const result=balancedLocalDays(base,{gentle:true,fatGoal:true});
  const day=result.exercises.filter(e=>e.day_number===1);
  expect(day.length).toBeGreaterThanOrEqual(5);
  expect(day.slice(0,5).map(e=>catalog.find(c=>c.id===e.motion_id).pattern)).toEqual(['squat','push','pull','hinge','core']);
  expect(result.day_timing[1].total_seconds).toBeLessThanOrEqual(600);
 });
 it('fits playback and warmup into the time budget across supported settings',()=>{
  for(const minutes_per_session of [10,20,30,60,180])for(const days_per_week of [1,2,3,4,5,6,7])for(const experience_level of ['BEGINNER','INTERMEDIATE','ADVANCED'])for(const exercise_location of ['home','gym','outdoor']){
   const profile={...base,minutes_per_session,days_per_week,experience_level,exercise_location};
   const result=balancedLocalDays(profile,{gentle:experience_level==='BEGINNER',fatGoal:true});
   for(const [day,timing] of Object.entries(result.day_timing)){
    const moves=result.exercises.filter(e=>e.day_number===Number(day)),plan=buildTempoPlan(moves);
    expect(moves.length).toBeGreaterThanOrEqual(timing.kind==='strength'?4:2);
    expect(timing.total_seconds).toBe(Math.ceil(plan.reduce((s,x)=>s+x.durationMs,0)/1000)+timing.warmup_seconds);
    expect(timing.total_seconds).toBeLessThanOrEqual(minutes_per_session*60);
    expect(plan.filter(x=>x.kind==='prepare')).toHaveLength(1);
    expect(plan.at(-1).kind).toBe('work');
   }
  }
 });
 it('uses available gym equipment and preserves balanced volume',()=>{
  const result=balancedLocalDays({...base,minutes_per_session:30,exercise_location:'gym',training_mode:'equipment',available_equipment:[...new Set(catalog.flatMap(x=>x.equipment))]});
  const first=result.exercises.filter(e=>e.day_number===1);
  expect(first.some(e=>e.equipment.length>0)).toBe(true);
  expect(Math.max(...first.map(e=>e.sets))-Math.min(...first.map(e=>e.sets))).toBeLessThanOrEqual(1);
 });
 it('does not silently repeat continuous cardio when sets are omitted',()=>{
  expect(tempoPrescription({motion_id:'walk',duration:'10분'}).sets).toBe(1);
  expect(buildTempoPlan([{motion_id:'walk',duration:'10분'}]).reduce((s,x)=>s+x.durationMs,0)).toBe(605000);
 });
 it('orders focused regions first and gives them one more set',()=>{
  const profile={...base,experience_level:'INTERMEDIATE',minutes_per_session:60,focus_regions:['hinge']};
  const pattern=e=>catalog.find(c=>c.id===e.motion_id).pattern;
  const day=balancedLocalDays(profile).exercises.filter(e=>e.day_number===1&&pattern(e)!=='cardio');
  expect(pattern(day[0])).toBe('hinge');
  const sets=Object.fromEntries(day.map(e=>[pattern(e),e.sets]));
  expect(sets.hinge).toBe(4);expect(sets.squat).toBe(3);expect(sets.push).toBe(3);
  expect(day[0].reason).toContain('집중 부위');
  const held=balancedLocalDays(profile,{cautious:true}).exercises.filter(e=>e.day_number===1&&pattern(e)!=='cardio');
  expect(Math.max(...held.map(e=>e.sets))).toBe(1);
 });
});
