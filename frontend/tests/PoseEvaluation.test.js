import {it,expect} from 'vitest';
import {evaluate} from '../scripts/evaluate-pose.mjs';
import {createExercisePoseAnalyzer} from '../src/health/components/exercise/poseCoach.js';
it('rejects high-visibility landmarks outside camera frame',()=>{
 const points=Array.from({length:33},()=>({x:-.2,y:.3,z:0,visibility:1}));
 const result=createExercisePoseAnalyzer('curl').update(points,100);
 expect(result.detected).toBe(false);expect(result.corrections).toEqual([]);expect(result.reps).toBe(0);
});
it('reports actual count errors and missing coverage without claiming validation',()=>{
 const result=evaluate({sessions:[{participant_id:'synthetic-1',device:'fixture',lighting:'fixture',view:'front',exercise:'squat',expected_reps:2,frames:[{time_ms:0,landmarks:[],expected_visible:false}]}]});
 expect(result.real_data_attested).toBe(false);expect(result.per_exercise.squat.mean_absolute_error).toBe(2);expect(result.per_exercise.squat.tracking_coverage).toBe(0);expect(result.missing_exercises).toContain('curl');
 expect(()=>evaluate({sessions:[]})).toThrow();
});
