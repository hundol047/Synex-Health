// Offline evaluation of consented, independently labelled landmark sequences. No raw video upload.
import fs from 'node:fs';
import crypto from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {createExercisePoseAnalyzer,POSE_EXERCISES} from '../src/health/components/exercise/poseCoach.js';
export function evaluate(dataset) {
 if(!Array.isArray(dataset.sessions)||!dataset.sessions.length)throw Error('Labelled sessions required');
 const buckets={},conditions={},participants=new Set();
 for(const s of dataset.sessions){
  if(!POSE_EXERCISES[s.exercise]||!s.participant_id||!s.device||!s.lighting||!s.view||!s.frames?.length)throw Error('Exercise, anonymous participant, device, lighting, view and frames required');
  const hold=POSE_EXERCISES[s.exercise].hold,expected=hold?s.expected_seconds:s.expected_reps;
  if(!Number.isFinite(expected)||expected<0||(!hold&&!Number.isInteger(expected)))throw Error('Independent count/time label required');
  participants.add(s.participant_id);let previous=-Infinity,detected=0,unknownCorrections=0,last;
  const coach=createExercisePoseAnalyzer(s.exercise);
  for(const frame of s.frames){
   if(!Number.isFinite(frame.time_ms)||frame.time_ms<=previous||!Array.isArray(frame.landmarks))throw Error('Frames need strictly increasing time_ms and landmarks');
   previous=frame.time_ms;last=coach.update(frame.landmarks,frame.time_ms);detected+=Number(last.detected);
   if(frame.expected_visible===false)unknownCorrections+=(last.corrections?.length||0);
  }
  const error=Math.abs((hold?last.seconds||0:last.reps)-expected);
  for(const [target,key] of [[buckets,s.exercise],[conditions,`${s.device}|${s.lighting}|${s.view}`]]){
   const row=target[key]??={sessions:0,absolute_error:0,exact:0,within_one:0,frames:0,detected_frames:0,corrections_when_labelled_invisible:0};
   row.sessions++;row.absolute_error+=error;row.exact+=Number(error===0);row.within_one+=Number(error<=1);row.frames+=s.frames.length;row.detected_frames+=detected;row.corrections_when_labelled_invisible+=unknownCorrections;
  }
 }
 const summarize=rows=>Object.fromEntries(Object.entries(rows).map(([key,r])=>[key,{...r,mean_absolute_error:r.absolute_error/r.sessions,exact_rate:r.exact/r.sessions,within_one_rate:r.within_one/r.sessions,tracking_coverage:r.detected_frames/r.frames}]));
 return {schema_version:1,generated_at:new Date().toISOString(),real_data_attested:dataset.real_data_attested===true,reviewer:dataset.reviewer||null,participants:participants.size,per_exercise:summarize(buckets),conditions:summarize(conditions),missing_exercises:Object.keys(POSE_EXERCISES).filter(k=>!buckets[k]),notice:'Counts/hold-time evaluation only; not clinical validation or correct-form accuracy. Labels and consent must be independently reviewed.'};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{const raw=fs.readFileSync(process.argv[2]);const report={...evaluate(JSON.parse(raw)),dataset_sha256:crypto.createHash('sha256').update(raw).digest('hex')};
  if(process.argv[3])fs.writeFileSync(process.argv[3],JSON.stringify(report,null,2));else console.log(JSON.stringify(report,null,2));
 }catch(e){console.error('POSE EVALUATION BLOCKED:',e.message);process.exitCode=1;}
}
