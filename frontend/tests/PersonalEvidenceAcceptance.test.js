// Synthetic contract fixture only: does not constitute video/device release evidence.
import {it,expect,vi} from 'vitest';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import crypto from 'node:crypto';
vi.mock('../scripts/validate-external-pose.mjs',()=>({evaluateExternal:dataset=>({per_exercise:dataset[0]})}));
import {verifyPersonalEvidence,DEVICE_SCENARIOS} from '../scripts/personal-release-evidence.mjs';
import {COACHING_CATALOG} from '../src/health/components/exercise/coachingCatalog.js';
import {POSE_VERSIONS} from '../src/health/components/exercise/poseThresholds.js';
it('accepts bound evidence and rejects altered metrics, missing coverage and stale model versions',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'synex-gate-contract-'));
 try{
  const write=(name,value)=>{const text=JSON.stringify(value);fs.writeFileSync(path.join(root,name),text);return {file:name,sha256:crypto.createHash('sha256').update(text).digest('hex')};};
  const metrics=Object.fromEntries(Object.keys(COACHING_CATALOG).map(id=>[id,{minimum_sample_target_met:true,categories:{normal:20,imperfect:20,problem:10},subject_count:5,device_count:2,angle_count:2,lighting_count:2,detection_recall:.95,false_positive_rate:.02,correction_precision:.95,correction_recall:.9,phase_accuracy:.9,countSamples:1,rep_count_MAE:.5,holdSamples:1,hold_seconds_MAE:.5}]));
  const apk=write('unit-test.apk','not a real APK'),proof=write('proof.json','unit test, not physical evidence'),dataset=write('dataset.json',[metrics]);
  const env={PERSONAL_RELEASE_EVIDENCE:path.join(root,'manifest.json'),VITE_BUILD_COMMIT:'a'.repeat(40),SYNEX_APPLICATION_ID:'com.synex.health.personal',SYNEX_VERSION_CODE:'123',PERSONAL_SIGNER_SHA256:'b'.repeat(64)};
  const report={...POSE_VERSIONS,commit_sha:env.VITE_BUILD_COMMIT,apk_sha256:apk.sha256,data_origin:'external_human',reviewed:true,reviewer:'fixture',dataset_sha256:dataset.sha256,per_exercise:metrics};
  const m={schema:1,reviewer:'fixture',tested_at:new Date().toISOString(),build:{commit:env.VITE_BUILD_COMMIT,application_id:env.SYNEX_APPLICATION_ID,version_code:123,signer_sha256:env.PERSONAL_SIGNER_SHA256,apk},devices:['fixture-a','fixture-b'].map(model=>({model,os:'test',tester:'test',physical_device:true,apk_sha256:apk.sha256,checks:Object.fromEntries(DEVICE_SCENARIOS.map(s=>[s,{status:'passed',...proof}]))})),video_pipeline:{status:'passed',apk_sha256:apk.sha256,model_version:POSE_VERSIONS.model_version,reviewer:'fixture',...proof},pose:{...write('pose.json',report),dataset}};
  const save=()=>write('manifest.json',m);save();
  expect(verifyPersonalEvidence(env,path.join(root,apk.file))).toEqual([]);
  report.per_exercise.squat.correction_recall=.1;m.pose={...write('pose.json',report),dataset};save();
  expect(verifyPersonalEvidence(env).join()).toContain('does not match');
  report.per_exercise.squat.correction_recall=.9;report.model_version='old-model';m.pose={...write('pose.json',report),dataset};save();
  expect(verifyPersonalEvidence(env).join()).toContain('model_version mismatch');
  report.model_version=POSE_VERSIONS.model_version;delete metrics.squat.subject_count;
  const incomplete=write('dataset.json',[metrics]);report.dataset_sha256=incomplete.sha256;m.pose={...write('pose.json',report),dataset:incomplete};save();
  expect(verifyPersonalEvidence(env).join()).toContain('insufficient real-video coverage');
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
