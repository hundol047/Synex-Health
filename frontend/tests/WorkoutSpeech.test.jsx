import React from 'react';
import {it,expect,vi,afterEach} from 'vitest';
import {render,screen,fireEvent,cleanup,waitFor} from '@testing-library/react';
import {buildTempoPlan,tempoFrame} from '../src/health/components/exercise/tempoSession.js';
import {tempoAnnouncement,poseAnnouncement,speakWorkout,stopWorkoutSpeech,setTempoSpeechActive} from '../src/health/components/exercise/workoutSpeech.js';
import TempoVoice from '../src/health/components/exercise/TempoVoice.jsx';
const ex=[{motion_id:'squat',exercise_name:'스쿼트',sets:2,reps:'2',rest_seconds:10}];
const plan=buildTempoPlan(ex);
const session=(index,elapsed,status='running')=>({state:{index,elapsed,status},segment:plan[index],frame:tempoFrame(plan[index],elapsed)});
afterEach(()=>{cleanup();setTempoSpeechActive(false);stopWorkoutSpeech();stopWorkoutSpeech('pose');vi.unstubAllGlobals();});
it('reads exercise name, preparation, each repetition, each timed second, and recovery from actual guide state',()=>{
 expect(tempoAnnouncement(session(0,0),ex).text).toContain('스쿼트');
 expect(tempoAnnouncement(session(0,2100),ex).text).toBe('3');
 expect(tempoAnnouncement(session(1,0),ex).text).toBe('스쿼트. 1세트 시작. 1회');expect(tempoAnnouncement(session(1,7100),ex).text).toBe('2회');
 expect(tempoAnnouncement(session(2,0),ex).text).toBe('휴식 10초');expect(tempoAnnouncement(session(2,3100),ex).text).toBe('7초');
 const timed=[{motion_id:'plank',exercise_name:'플랭크',hold_seconds:30,sets:1}],s=buildTempoPlan(timed)[1];
 expect(tempoAnnouncement({state:{status:'running',index:1,elapsed:3000},segment:s,frame:tempoFrame(s,3000)},timed).text).toBe('3초');
 expect(tempoAnnouncement(session(1,4000,'paused'),ex)).toBeNull();
});
it('speaks only when enabled, once per count, and cancels when paused or unmounted',async()=>{
 const speak=vi.fn(),cancel=vi.fn();vi.stubGlobal('speechSynthesis',{speak,cancel,getVoices:()=>[]});vi.stubGlobal('SpeechSynthesisUtterance',class{constructor(text){this.text=text;}});
 const view=render(<TempoVoice session={session(0,0)} exercises={ex}/>);expect(speak).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('checkbox'));await waitFor(()=>expect(speak).toHaveBeenCalledTimes(1));expect(speak.mock.calls[0][0]).toMatchObject({text:'스쿼트. 준비하세요.',lang:'ko-KR'});
 view.rerender(<TempoVoice session={session(0,500)} exercises={ex}/>);expect(speak).toHaveBeenCalledTimes(1);
 view.rerender(<TempoVoice session={session(1,0)} exercises={ex}/>);expect(speak.mock.calls.at(-1)[0].text).toBe('스쿼트. 1세트 시작. 1회');
 const before=cancel.mock.calls.length;view.rerender(<TempoVoice session={session(1,500,'paused')} exercises={ex}/>);expect(cancel.mock.calls.length).toBeGreaterThan(before);
 view.unmount();
});
it('does not queue overlapping pose advice over a spoken workout count',async()=>{
 const speak=vi.fn();vi.stubGlobal('speechSynthesis',{speak,cancel:vi.fn(),getVoices:()=>[]});vi.stubGlobal('SpeechSynthesisUtterance',class{constructor(text){this.text=text;}});
 setTempoSpeechActive(true);expect(await speakWorkout('골반을 올리세요.','pose')).toBe(false);expect(speak).not.toHaveBeenCalled();
 await speakWorkout('2회');expect(speak.mock.calls[0][0].text).toBe('2회');setTempoSpeechActive(false);
 await speakWorkout('골반을 올리세요.','pose');expect(speak.mock.calls.at(-1)[0].text).toBe('골반을 올리세요.');
});
it('prioritizes a sustained observed correction and resumes current counts after it ends',async()=>{
 const speak=vi.fn();vi.stubGlobal('speechSynthesis',{speak,cancel:vi.fn(),getVoices:()=>[]});vi.stubGlobal('SpeechSynthesisUtterance',class{constructor(text){this.text=text;}});
 const result={detected:true,movement_phase:'outward'},detail={differences:[{id:'lean',observedMs:900,action:'몸통을 세우세요.',severity:'warning'}]};
 expect(poseAnnouncement(result,detail)).toMatchObject({priority:true,text:'몸통을 세우세요.'});setTempoSpeechActive(true);
 expect(await speakWorkout('몸통을 세우세요.','pose',{priority:true})).toBe(true);expect(await speakWorkout('3회')).toBe(false);
 speak.mock.calls.at(-1)[0].onend();expect(await speakWorkout('4회')).toBe(true);expect(speak.mock.calls.at(-1)[0].text).toBe('4회');
});
it('rotates through every sustained fault, speaks its evidence, and drops corrected or lost observations',()=>{
 const result={detected:true},fault=(id)=>({id,observedMs:900,severity:'adjust',evidence:`측정 ${id} · 기준`,action:`교정 ${id}`});
 const detail={message:'관절을 보여 주세요.',differences:['손목','몸통','무릎'].map(fault)};
 let key=null;
 for(const expected of ['손목','몸통','무릎','손목']){
  const announcement=poseAnnouncement(result,detail,key);key=announcement.key;
  expect(announcement).toMatchObject({key:expected,text:`측정 ${expected}. 교정 ${expected}`,priority:true});
 }
 detail.differences=detail.differences.filter(i=>i.id!=='몸통');
 expect(poseAnnouncement(result,detail,'손목').key).toBe('무릎');
 detail.differences[1].observedMs=100;
 expect(poseAnnouncement(result,detail,'손목').key).toBe('손목');
 expect(poseAnnouncement({detected:false},detail,'손목')).toMatchObject({priority:false,text:'관절을 보여 주세요.'});
});
