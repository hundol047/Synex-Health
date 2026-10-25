import {Capacitor,registerPlugin} from '@capacitor/core';
const NativeSpeech=registerPlugin('WorkoutSpeech');
let owner=null,tempoActive=false,poseUntil=0;
export const speechAvailable=()=>Capacitor.getPlatform()==='android'||!!globalThis.speechSynthesis;
export function setTempoSpeechActive(active){tempoActive=active;}
export async function speakWorkout(text,source='tempo',{priority=false}={}){
 if(!text||document.hidden||source==='pose'&&tempoActive&&!priority||source==='tempo'&&performance.now()<poseUntil)return false;
 if(source==='pose'&&priority)poseUntil=performance.now()+Math.min(20000,Math.max(4000,text.length*115+1200));
 owner=source;
 if(Capacitor.getPlatform()==='android'){try{await NativeSpeech.speak({text});return true;}catch(error){if(source==='pose')poseUntil=0;throw error;}}
 if(!globalThis.speechSynthesis||typeof SpeechSynthesisUtterance==='undefined'){if(source==='pose')poseUntil=0;throw Error('이 기기에서 음성을 사용할 수 없습니다.');}
 speechSynthesis.cancel();const utterance=new SpeechSynthesisUtterance(text);utterance.lang='ko-KR';utterance.rate=1.15;
 const korean=speechSynthesis.getVoices?.().find(v=>v.lang.startsWith('ko'));if(korean)utterance.voice=korean;
 const until=poseUntil;utterance.onend=utterance.onerror=()=>{if(source==='pose'&&poseUntil===until)poseUntil=0;};
 speechSynthesis.speak(utterance);return true;
}
export function stopWorkoutSpeech(source='tempo'){
 if(source==='pose')poseUntil=0;
 if(owner!==null&&owner!==source)return;owner=null;
 if(Capacitor.getPlatform()==='android')NativeSpeech.stop().catch(()=>{});else globalThis.speechSynthesis?.cancel();
}
export function poseAnnouncement(result,detail,lastKey=null){
 if(!result)return null;
 const active=result.detected?(detail?.differences||[]).filter(i=>i.severity!=='camera'&&(i.observedMs??0)>=600):[];
 // Rotate only among faults still visible in this frame. Never invent a new
 // diagnosis to vary wording, and never let the first fault starve the others.
 const issue=active[(active.findIndex(i=>i.id===lastKey)+1)%active.length];
 if(issue)return {key:issue.id,text:[issue.evidence?.split(' · ')[0],issue.action].filter(Boolean).join('. '),priority:true};
 if(!result.detected)return {key:'framing:'+detail?.message,text:detail?.message,priority:false};
 const observation=detail?.observations?.[0];
 return {key:`observed:${result.movement_phase}:${observation?.value}`,text:observation?`${observation.label}. ${observation.value}. ${detail.muscle?.load||''}`:detail.message,priority:false};
}
export function tempoAnnouncement(session,exercises){
 const {state,segment,frame}=session;
 if(state.status==='complete')return {key:'complete',text:'운동 시범이 모두 끝났습니다. 수고하셨습니다.'};
 if(state.status!=='running'||!segment)return null;
 const elapsed=Math.floor(state.elapsed/1000),prefix=`${state.index}:`;
 const name=exercises[segment.exerciseIndex]?.exercise_name||exercises[segment.exerciseIndex]?.name||'운동';
 if(segment.kind==='prepare')return elapsed<2?{key:prefix+'intro',text:`${name}. 준비하세요.`}:{key:prefix+frame.remaining,text:`${frame.remaining}`};
 if(segment.kind==='rest')return elapsed<2?{key:prefix+'rest',text:segment.restType==='transition'?`다음 운동 ${exercises[segment.nextExerciseIndex]?.exercise_name||exercises[segment.nextExerciseIndex]?.name||''}. 준비 ${Math.ceil(segment.durationMs/1000)}초`:`휴식 ${Math.ceil(segment.durationMs/1000)}초`}:{key:prefix+frame.remaining,text:`${frame.remaining}초`};
 if(segment.prescription.kind==='reps')return {key:prefix+frame.rep,text:elapsed===0?`${name}. ${segment.set}세트 시작. ${frame.rep}회`:`${frame.rep}회`};
 return {key:prefix+elapsed,text:elapsed===0?`${name}, 시작`:`${elapsed}초`};
}
