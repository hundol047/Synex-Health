import {it,expect} from 'vitest';
import {evaluateExternal} from '../scripts/validate-external-pose.mjs';
import {createExercisePoseAnalyzer} from '../src/health/components/exercise/poseCoach.js';
import {POSE_VERSIONS} from '../src/health/components/exercise/poseThresholds.js';
it('empty external validation produces no numerical accuracy',()=>{const r=evaluateExternal([]);expect(r.status).toBe('NO EXTERNAL VALIDATION DATA');expect(Object.keys(r.per_exercise)).toHaveLength(12);expect(JSON.stringify(r)).not.toContain('detection_recall');});
it('rejects synthetic/unconsented samples rather than claiming external accuracy',()=>{expect(()=>evaluateExternal([{exercise:'squat',data_origin:'synthetic'}])).toThrow();});
it('versions every tracking-lost result and suppresses corrections',()=>{const r=createExercisePoseAnalyzer('squat').update([],1000);expect(r).toMatchObject(POSE_VERSIONS);expect(r.corrections).toEqual([]);expect(r.tracking_quality).toBe('LOST');});
