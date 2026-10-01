import {it,expect} from 'vitest';
import {normalizeSets,workoutSummary,previousWorkout} from '../src/health/lib/workoutProgress.js';
import {summarizeDeviceActivity} from '../src/health/lib/deviceActivity.js';
it('retains unknown external loads and rejects incomplete, negative or fractional reps',()=>{
 expect(normalizeSets([{reps:'8',weight_kg:''}])).toEqual([{reps:8,weight_kg:null,kind:'working'}]);
 for(const row of [{reps:''},{reps:'1.5'},{reps:3,weight_kg:-2}])expect(()=>normalizeSets([row])).toThrow();
});
it('weekly totals exclude warmup and future records, include performed sets from stopped sessions',()=>{
 const logs=[{exercise_catalog_id:'squat',exercise_name:'스쿼트',date:'2026-09-30',completed:false,pain:2,set_records:[{weight_kg:10,reps:10,kind:'warmup'},{weight_kg:20,reps:8},{weight_kg:null,reps:8}]},{date:'2026-10-03',completed:true,sets_completed:99}];
 const summary=workoutSummary(logs,new Date(2026,9,1));
 expect(summary.weeks.at(-1)).toMatchObject({date:'2026-09-28',sets:2,volume:160,days:0,loadedSets:1});
 expect(summary.exercises[0].sessions[0]).toMatchObject({max:20,reps:16,pain:2});
 expect(previousWorkout(logs,{motion_id:'squat'},'2026-10-01')).toBe(logs[0]);
});
it('native partial summaries discard duplicates, overlaps and cross-midnight samples',()=>{
 const samples=[{type:'steps',platformId:'a',startDate:'2026-10-01T10:00:00',endDate:'2026-10-01T11:00:00',value:100},
 {type:'steps',platformId:'b',startDate:'2026-10-01T10:30:00',endDate:'2026-10-01T11:30:00',value:200},
 {type:'steps',platformId:'c',startDate:'2026-10-01T23:00:00',endDate:'2026-10-02T01:00:00',value:999}];
 const result=summarizeDeviceActivity([...samples,samples[0]]);expect(result.excluded).toBe(3);expect(result.days[0].steps).toBe(100);
});
