import {it,expect} from 'vitest';
import {evaluateExternal} from '../scripts/validate-external-pose.mjs';
import {createExercisePoseAnalyzer} from '../src/health/components/exercise/poseCoach.js';
import {POSE_VERSIONS} from '../src/health/components/exercise/poseThresholds.js';
it('empty external validation produces no numerical accuracy',()=>{const r=evaluateExternal([]);expect(r.status).toBe('NO EXTERNAL VALIDATION DATA');expect(Object.keys(r.per_exercise)).toHaveLength(74);expect(JSON.stringify(r)).not.toContain('detection_recall');});
it('rejects synthetic/unconsented samples rather than claiming external accuracy',()=>{expect(()=>evaluateExternal([{exercise:'squat',data_origin:'synthetic'}])).toThrow();});
it('versions every tracking-lost result and suppresses corrections',()=>{const r=createExercisePoseAnalyzer('squat').update([],1000);expect(r).toMatchObject(POSE_VERSIONS);expect(r.corrections).toEqual([]);expect(r.tracking_quality).toBe('LOST');});

it('reports non-counting catalog exercises without a fabricated count accuracy',()=>{
 const sample={sample_id:'case-1',exercise:'cat_cow',camera_angle:'side',device:'label-fixture',fps:30,subject_id_anonymized:'subject-1',ground_truth_phase:'unknown',ground_truth_rep_count:0,known_form_issue:'none',label_source:'independent reviewer fixture',reviewer:'test',consent_status:'approved',data_origin:'external_human',category:'problem',frames:[{time_ms:1,landmarks:[],person_count:0,expected_detected:false,phase:'unknown',expected_warnings:[],expected_corrections:[]}]};
 // A metadata fixture checks evaluator behavior; it does not attest to actual human validation.
 const result=evaluateExternal([sample]);expect(result.per_exercise.cat_cow.samples).toBe(1);expect(result.per_exercise.cat_cow.detection_rate).toBe(0);expect(result.per_exercise.cat_cow.rep_count_MAE).toBeNull();expect(result.per_exercise.squat.status).toBe('EXTERNAL VALIDATION DATA REQUIRED');
});
