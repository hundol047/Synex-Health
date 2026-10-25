import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createExercisePoseAnalyzer,POSE_EXERCISES} from '../src/health/components/exercise/poseCoach.js';
import {POSE_VERSIONS} from '../src/health/components/exercise/poseThresholds.js';
const required=['sample_id','exercise','camera_angle','device','fps','subject_id_anonymized','ground_truth_phase','ground_truth_rep_count','known_form_issue','label_source','reviewer','consent_status'];
const ratio=(n,d)=>d?n/d:null;
export function evaluateExternal(samples){
 const ids=new Set(),rows={};
 for(const s of samples){
  if(required.some(k=>s[k]===undefined)||!POSE_EXERCISES[s.exercise]||s.consent_status!=='approved'||s.data_origin!=='external_human'||!s.reviewer||!s.label_source||!s.subject_id_anonymized||!Number.isFinite(s.fps)||s.fps<=0||!Number.isInteger(s.ground_truth_rep_count)||s.ground_truth_rep_count<0||!s.frames?.length||!['normal','imperfect','problem'].includes(s.category))throw Error('External consented, reviewed metadata and frames required');
  if(ids.has(s.sample_id))throw Error('Duplicate sample_id');ids.add(s.sample_id);
  const coach=createExercisePoseAnalyzer(s.exercise),r=rows[s.exercise]??={samples:0,frames:0,tp:0,fp:0,fn:0,tn:0,lost:0,phaseCorrect:0,phaseFrames:0,warnCorrect:0,warnings:0,correctionCorrect:0,corrections:0,repError:0,categories:{normal:0,imperfect:0,problem:0}};
  let last=-Infinity,out;
  for(const f of s.frames){
   if(!Number.isFinite(f.time_ms)||f.time_ms<=last||!Array.isArray(f.landmarks)||typeof f.expected_detected!=='boolean'||typeof f.phase!=='string'||!Array.isArray(f.expected_warnings)||!Array.isArray(f.expected_corrections))throw Error('Independent per-frame detection/phase/warning/correction labels and increasing timestamps required');
   if(!Number.isInteger(f.person_count)||f.person_count<0||![0,33].includes(f.landmarks.length))throw Error('person_count and 33 landmarks (or empty tracking loss) required');
   if(f.landmarks.some(p=>!p||!['x','y','z','visibility'].every(k=>Number.isFinite(p[k]))))throw Error('Invalid landmarks');
   last=f.time_ms;out=coach.update(f.person_count===1?f.landmarks:[],f.time_ms,s.aspect_ratio??1);r.frames++;
   r[out.detected?(f.expected_detected?'tp':'fp'):(f.expected_detected?'fn':'tn')]++;
   r.lost+=Number(['LOW','LOST'].includes(out.tracking_quality));
   if(f.expected_detected){r.phaseFrames++;r.phaseCorrect+=Number(out.phase===f.phase);}
   for(const [actual,expected,total,correct] of [[out.warnings,f.expected_warnings,'warnings','warnCorrect'],[out.corrections,f.expected_corrections,'corrections','correctionCorrect']]){r[total]+=actual.length;r[correct]+=actual.filter(x=>expected.includes(x)).length;}
  }
  r.samples++;r.categories[s.category]++;r.repError+=Math.abs(out.reps-s.ground_truth_rep_count);
 }
 return {...POSE_VERSIONS,status:samples.length?'EXTERNAL LABEL EVALUATION — NOT CLINICAL VALIDATION':'NO EXTERNAL VALIDATION DATA',per_exercise:Object.fromEntries(Object.keys(POSE_EXERCISES).map(id=>{const r=rows[id];return [id,r?{...r,detection_rate:ratio(r.tp+r.fp,r.frames),detection_recall:ratio(r.tp,r.tp+r.fn),false_positive_rate:ratio(r.fp,r.fp+r.tn),false_negative_rate:ratio(r.fn,r.tp+r.fn),rep_count_MAE:ratio(r.repError,r.samples),phase_accuracy:ratio(r.phaseCorrect,r.phaseFrames),tracking_loss_rate:ratio(r.lost,r.frames),warning_precision:ratio(r.warnCorrect,r.warnings),correction_precision:ratio(r.correctionCorrect,r.corrections),false_correction_rate:ratio(r.corrections-r.correctionCorrect,r.corrections),minimum_sample_target_met:r.categories.normal>=20&&r.categories.imperfect>=20&&r.categories.problem>=10}:{status:'EXTERNAL VALIDATION DATA REQUIRED'}]}))};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{
  const root=process.argv[2]||fileURLToPath(new URL('../../validation/pose/',import.meta.url));
  const files=fs.readdirSync(root,{recursive:true}).filter(f=>f.endsWith('.landmarks.json')).sort();
  const raw=files.map(f=>fs.readFileSync(path.join(root,f),'utf8'));
  const report={...evaluateExternal(raw.map(JSON.parse)),dataset_sha256:crypto.createHash('sha256').update(raw.join('\n')).digest('hex')};
  console.log(JSON.stringify(report,null,2));if(process.argv[3])fs.writeFileSync(process.argv[3],JSON.stringify(report,null,2));
 }catch(e){console.error('POSE EVALUATION BLOCKED:',e.message);process.exitCode=1;}
}
