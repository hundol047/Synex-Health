import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {COACHING_CATALOG} from '../src/health/components/exercise/coachingCatalog.js';
import {evaluateExternal} from './validate-external-pose.mjs';
import {POSE_VERSIONS} from '../src/health/components/exercise/poseThresholds.js';
export const DEVICE_SCENARIOS=['upgrade_records','backup_restore','camera_permission_recovery','background_return','incoming_call','recording_export_share','storage_full','offline_restart','delete_records','sustained_camera_15min'];
const digest=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const hash=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
function checkedFile(root,entry){
 if(!entry||typeof entry.file!=='string'||!hash(entry.sha256))throw Error('Evidence file and SHA-256 required');
 const file=fs.realpathSync(path.resolve(root,entry.file));
 const rel=path.relative(fs.realpathSync(root),file);
 if(rel.startsWith('..')||path.isAbsolute(rel)||!fs.statSync(file).isFile()||digest(file)!==entry.sha256)throw Error('Evidence path or SHA-256 mismatch');
 return file;
}
export function verifyPersonalEvidence(env,apk){
 try{
  if(!env.PERSONAL_RELEASE_EVIDENCE)throw Error('PERSONAL_RELEASE_EVIDENCE: reviewed evidence manifest required; boolean QA flags are not accepted');
  const file=fs.realpathSync(env.PERSONAL_RELEASE_EVIDENCE),root=path.dirname(file),m=JSON.parse(fs.readFileSync(file,'utf8'));
  if(m.schema!==1||!m.reviewer?.trim())throw Error('Reviewed manifest schema 1 required');
  const b=m.build;
  if(!/^[a-f0-9]{40}$/.test(env.VITE_BUILD_COMMIT||'')||b?.commit!==env.VITE_BUILD_COMMIT||b.application_id!==env.SYNEX_APPLICATION_ID||String(b.version_code)!==env.SYNEX_VERSION_CODE||!hash(b.signer_sha256)||b.signer_sha256!==env.PERSONAL_SIGNER_SHA256)throw Error('Evidence commit, application ID, version or pinned signing certificate does not match');
  const candidate=checkedFile(root,b.apk);
  if(apk&&digest(apk)!==digest(candidate))throw Error('APK differs from the reviewed candidate; review this exact APK before distribution');
  const age=Date.now()-Date.parse(m.tested_at);
  if(!Number.isFinite(age)||age<0||age>30*86400000)throw Error('Evidence must be dated within the last 30 days');
  if(!Array.isArray(m.devices)||m.devices.length<2||new Set(m.devices.map(d=>d.model)).size<2)throw Error('Two distinct physical Android device models required');
  for(const d of m.devices){
   if(d.physical_device!==true||!d.model?.trim()||!d.os?.trim()||!d.tester?.trim()||d.apk_sha256!==b.apk.sha256)throw Error('Physical device identity, tester and exact APK hash required');
   for(const scenario of DEVICE_SCENARIOS){const row=d.checks?.[scenario];if(row?.status!=='passed')throw Error(`${d.model}: ${scenario} not passed`);checkedFile(root,row);}
  }
  const pipeline=m.video_pipeline;
  if(pipeline?.status!=='passed'||pipeline.apk_sha256!==b.apk.sha256||pipeline.model_version!==POSE_VERSIONS.model_version||!pipeline.reviewer?.trim())throw Error('Reviewed end-to-end video/model inference evidence required, not landmark rules alone');
  checkedFile(root,pipeline);
  const report=JSON.parse(fs.readFileSync(checkedFile(root,m.pose),'utf8'));
  if(report.commit_sha!==b.commit||report.apk_sha256!==b.apk.sha256||report.data_origin!=='external_human'||report.reviewed!==true||!report.reviewer?.trim()||!hash(report.dataset_sha256))throw Error('Real-video review must identify the exact APK, commit and dataset');
  const dataset=JSON.parse(fs.readFileSync(checkedFile(root,m.pose.dataset),'utf8'));
  const calculated=evaluateExternal(dataset);
  if(JSON.stringify(calculated.per_exercise)!==JSON.stringify(report.per_exercise))throw Error('Pose report does not match evaluation of the attached labelled dataset');
  if(m.pose.dataset.sha256!==report.dataset_sha256)throw Error('Pose dataset hash mismatch');
  for(const [k,v] of Object.entries(POSE_VERSIONS))if(report[k]!==v)throw Error(`Pose ${k} mismatch`);
  const bounded=(n,lo,hi)=>Number.isFinite(n)&&n>=lo&&n<=hi;
  for(const id of Object.keys(COACHING_CATALOG)){
   const r=report.per_exercise?.[id];
   if(!r||r.minimum_sample_target_met!==true||!bounded(r.categories?.normal,20,1e9)||!bounded(r.categories?.imperfect,20,1e9)||!bounded(r.categories?.problem,10,1e9)||!bounded(r.subject_count,5,1e9)||!bounded(r.device_count,2,1e9)||!bounded(r.angle_count,2,1e9)||!bounded(r.lighting_count,2,1e9))throw Error(`${id}: insufficient real-video coverage`);
   if(!bounded(r.detection_recall,.9,1)||!bounded(r.false_positive_rate,0,.05)||!bounded(r.correction_precision,.9,1)||!bounded(r.correction_recall,.8,1)||!bounded(r.phase_accuracy,.8,1))throw Error(`${id}: pose acceptance thresholds not met`);
   if(COACHING_CATALOG[id].hold&&(!bounded(r.holdSamples,1,1e9)||!bounded(r.hold_seconds_MAE,0,2)))throw Error(`${id}: hold duration evidence missing or error too high`);
   if(r.countSamples>0&&!bounded(r.rep_count_MAE,0,1))throw Error(`${id}: repetition error too high`);
  }
  return [];
 }catch(error){return [`Personal release blocked: ${error.message}`];}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const errors=verifyPersonalEvidence(process.env,process.argv[2]);
 if(!process.argv[2])errors.push('Exact APK path required for distribution verification');
 console.log(errors.length?errors.join('\n'):'Reviewed APK and external evidence hashes match. This is not a substitute for truthful human review.');process.exitCode=errors.length?1:0;
}
