import {Capacitor,registerPlugin} from '@capacitor/core';
const NativeSpeech=registerPlugin('WorkoutSpeech');
let owner=null,tempoActive=false;
export const speechAvailable=()=>Capacitor.getPlatform()==='android'||!!globalThis.speechSynthesis;
export function setTempoSpeechActive(active){tempoActive=active;}
export async function speakWorkout(text,source='tempo'){
 if(!text||document.hidden||source==='pose'&&tempoActive)return false;
 owner=source;
 if(Capacitor.getPlatform()==='android'){await NativeSpeech.speak({text});return true;}
 if(!globalThis.speechSynthesis||typeof SpeechSynthesisUtterance==='undefined')throw Error('이 기기에서 음성을 사용할 수 없습니다.');
 speechSynthesis.cancel();const utterance=new SpeechSynthesisUtterance(text);utterance.lang='ko-KR';utterance.rate=1.15;
 const korean=speechSynthesis.getVoices?.().find(v=>v.lang.startsWith('ko'));if(korean)utterance.voice=korean;
 speechSynthesis.speak(utterance);return true;
}
export function stopWorkoutSpeech(source='tempo'){
 if(owner!==null&&owner!==source)return;owner=null;
 if(Capacitor.getPlatform()==='android')NativeSpeech.stop().catch(()=>{});else globalThis.speechSynthesis?.cancel();
}
export function tempoAnnouncement(session,exercises){
 const {state,segment,frame}=session;
 if(state.status==='complete')return {key:'complete',text:'운동 시범이 모두 끝났습니다. 수고하셨습니다.'};
 if(state.status!=='running'||!segment)return null;
 const elapsed=Math.floor(state.elapsed/1000),prefix=`${state.index}:`;
 const name=exercises[segment.exerciseIndex]?.exercise_name||exercises[segment.exerciseIndex]?.name||'운동';
 if(segment.kind==='prepare')return elapsed<2?{key:prefix+'intro',text:`${name}. 준비하세요.`}:{key:prefix+frame.remaining,text:`${frame.remaining}`};
 if(segment.kind==='rest')return elapsed<2?{key:prefix+'rest',text:`휴식 ${Math.ceil(segment.durationMs/1000)}초`}:{key:prefix+frame.remaining,text:`${frame.remaining}초`};
 if(segment.prescription.kind==='reps')return {key:prefix+frame.rep,text:`${frame.rep}회`};
 return {key:prefix+elapsed,text:elapsed===0?`${name}, 시작`:`${elapsed}초`};
}
