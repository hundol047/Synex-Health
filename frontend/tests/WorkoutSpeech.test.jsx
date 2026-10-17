import React from 'react';
import {it,expect,vi,afterEach} from 'vitest';
import {render,screen,fireEvent,cleanup,waitFor} from '@testing-library/react';
import {buildTempoPlan,tempoFrame} from '../src/health/components/exercise/tempoSession.js';
import {tempoAnnouncement,speakWorkout,stopWorkoutSpeech,setTempoSpeechActive} from '../src/health/components/exercise/workoutSpeech.js';
import TempoVoice from '../src/health/components/exercise/TempoVoice.jsx';
const ex=[{motion_id:'squat',exercise_name:'스쿼트',sets:1,reps:'2',rest_seconds:10}];
const plan=buildTempoPlan(ex);
const session=(index,elapsed,status='running')=>({state:{index,elapsed,status},segment:plan[index],frame:tempoFrame(plan[index],elapsed)});
afterEach(()=>{cleanup();setTempoSpeechActive(false);stopWorkoutSpeech();stopWorkoutSpeech('pose');vi.unstubAllGlobals();});
it('reads exercise name, preparation, each repetition, each timed second, and recovery from actual guide state',()=>{
 expect(tempoAnnouncement(session(0,0),ex).text).toContain('스쿼트');
 expect(tempoAnnouncement(session(0,2100),ex).text).toBe('3');
 expect(tempoAnnouncement(session(1,0),ex).text).toBe('1회');expect(tempoAnnouncement(session(1,7100),ex).text).toBe('2회');
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
 view.rerender(<TempoVoice session={session(1,0)} exercises={ex}/>);expect(speak.mock.calls.at(-1)[0].text).toBe('1회');
 const before=cancel.mock.calls.length;view.rerender(<TempoVoice session={session(1,500,'paused')} exercises={ex}/>);expect(cancel.mock.calls.length).toBeGreaterThan(before);
 view.unmount();
});
it('does not queue overlapping pose advice over a spoken workout count',async()=>{
 const speak=vi.fn();vi.stubGlobal('speechSynthesis',{speak,cancel:vi.fn(),getVoices:()=>[]});vi.stubGlobal('SpeechSynthesisUtterance',class{constructor(text){this.text=text;}});
 setTempoSpeechActive(true);expect(await speakWorkout('골반을 올리세요.','pose')).toBe(false);expect(speak).not.toHaveBeenCalled();
 await speakWorkout('2회');expect(speak.mock.calls[0][0].text).toBe('2회');setTempoSpeechActive(false);
 await speakWorkout('골반을 올리세요.','pose');expect(speak.mock.calls.at(-1)[0].text).toBe('골반을 올리세요.');
});
