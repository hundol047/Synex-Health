import React from 'react';
import {it,expect,vi,beforeEach,afterEach} from 'vitest';
import {render,screen,fireEvent,waitFor,act,cleanup,within} from '@testing-library/react';
import CameraCoaching from '../src/health/components/exercise/CameraCoaching.jsx';
import {api} from '../src/shared/lib/api.js';
import {createPoseRunner} from '../src/health/components/exercise/poseRunner.js';
import {PoseCalibration} from '../src/health/components/exercise/poseRules.js';
import {ExercisePoseAnalyzer} from '../src/health/components/exercise/poseCoach.js';
const mode=vi.hoisted(()=>({local:false}));
vi.mock('../src/shared/lib/localMode.js',()=>({get LOCAL_ONLY(){return mode.local;}}));
vi.mock('../src/shared/lib/api.js',()=>({api:vi.fn()}));
vi.mock('../src/health/components/exercise/poseRunner.js',()=>({createPoseRunner:vi.fn()}));
vi.mock('../src/health/components/exercise/BodyweightDemo.jsx',()=>({default:({exerciseId})=> <div>3D 시범 · {exerciseId}</div>}));
let track,media,getMedia,detector,frames,frameId;
const deferred=()=>{let resolve;const promise=new Promise(r=>{resolve=r;});return {promise,resolve};};
beforeEach(()=>{
 vi.clearAllMocks();mode.local=false;frames=new Map();frameId=0;
 vi.stubGlobal('requestAnimationFrame',vi.fn(fn=>{frames.set(++frameId,fn);return frameId;}));vi.stubGlobal('cancelAnimationFrame',vi.fn(id=>frames.delete(id)));
 track={stop:vi.fn(),onended:null};media={getTracks:()=>[track],getVideoTracks:()=>[track]};getMedia=vi.fn().mockResolvedValue(media);Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:getMedia}});
 vi.spyOn(HTMLMediaElement.prototype,'play').mockResolvedValue();
 Object.defineProperty(HTMLMediaElement.prototype,'readyState',{configurable:true,get:()=>4});Object.defineProperty(HTMLVideoElement.prototype,'videoWidth',{configurable:true,get:()=>640});Object.defineProperty(HTMLVideoElement.prototype,'videoHeight',{configurable:true,get:()=>480});
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,headers:new Headers({'content-type':'application/octet-stream'})}));
 api.mockResolvedValue({});detector={close:vi.fn(),detectForVideo:vi.fn().mockResolvedValue({landmarks:[]})};createPoseRunner.mockResolvedValue(detector);
 vi.stubGlobal('speechSynthesis',{cancel:vi.fn(),speak:vi.fn()});vi.stubGlobal('SpeechSynthesisUtterance',class{constructor(text){this.text=text;}});
});
afterEach(()=>{cleanup();vi.useRealTimers();vi.restoreAllMocks();vi.unstubAllGlobals();});
async function camera(){fireEvent.click(screen.getByRole('button',{name:'카메라 켜기'}));await waitFor(()=>expect(screen.getByRole('switch').disabled).toBe(false));}
async function enable(){fireEvent.click(screen.getByRole('switch'));await waitFor(()=>expect(createPoseRunner).toHaveBeenCalledTimes(1));await waitFor(()=>expect(screen.queryByText('피드백 준비 중…')).toBeNull());}
it('never requests camera or analysis automatically and mirror mode needs no model or subscription',async()=>{
 render(<CameraCoaching/>);expect(getMedia).not.toHaveBeenCalled();expect(screen.getByRole('switch').checked).toBe(false);
 await camera();expect(api).not.toHaveBeenCalled();expect(fetch).not.toHaveBeenCalled();expect(createPoseRunner).not.toHaveBeenCalled();expect(screen.queryByRole('status')).toBeNull();
 expect(getMedia).toHaveBeenCalledWith(expect.objectContaining({audio:false}));
});
it('opt-out closes inference, cancels speech, rejects in-flight results and keeps camera running',async()=>{
 render(<CameraCoaching/>);await camera();await enable();fireEvent.click(screen.getByLabelText('음성으로도 듣기'));
 const pending=deferred();detector.detectForVideo.mockReturnValueOnce(pending.promise);
 const callback=[...frames.values()][0];let inflight;act(()=>{inflight=callback(500);});
 fireEvent.click(screen.getByRole('switch'));expect(detector.close).toHaveBeenCalledTimes(1);expect(track.stop).not.toHaveBeenCalled();expect(speechSynthesis.cancel).toHaveBeenCalled();
 await act(async()=>{pending.resolve({landmarks:[]});await inflight;});expect(screen.queryByRole('status')).toBeNull();expect(speechSynthesis.speak).not.toHaveBeenCalled();expect(screen.getByRole('switch').checked).toBe(false);
});
it('turning off while the model loads disposes the late detector',async()=>{
 const pending=deferred();createPoseRunner.mockReturnValueOnce(pending.promise);render(<CameraCoaching/>);await camera();fireEvent.click(screen.getByRole('switch'));
 await waitFor(()=>expect(createPoseRunner).toHaveBeenCalled());fireEvent.click(screen.getByRole('switch'));
 await act(async()=>pending.resolve(detector));expect(detector.close).toHaveBeenCalledTimes(1);expect(detector.detectForVideo).not.toHaveBeenCalled();expect(track.stop).not.toHaveBeenCalled();
});
it('camera stop cancels a pending permission request and closes the late stream',async()=>{
 const pending=deferred();getMedia.mockReturnValueOnce(pending.promise);render(<CameraCoaching/>);fireEvent.click(screen.getByRole('button',{name:'카메라 켜기'}));fireEvent.click(screen.getByRole('button',{name:'카메라 끄기'}));
 await act(async()=>pending.resolve(media));expect(track.stop).toHaveBeenCalledTimes(1);expect(screen.getByRole('switch').disabled).toBe(true);
});
it('analysis failure preserves preview and allows retry; leaving releases camera and detector',async()=>{
 api.mockRejectedValueOnce(Error('분석 권한 없음'));const view=render(<CameraCoaching/>);await camera();fireEvent.click(screen.getByRole('switch'));await screen.findByRole('alert');expect(screen.getByRole('switch').checked).toBe(false);expect(track.stop).not.toHaveBeenCalled();
 await enable();view.unmount();expect(detector.close).toHaveBeenCalledTimes(1);expect(track.stop).toHaveBeenCalledTimes(1);
});
it('pause and demo-only mode release camera and reset opt-in',async()=>{
 const view=render(<CameraCoaching/>);await camera();await enable();view.rerender(<CameraCoaching paused/>);expect(track.stop).toHaveBeenCalledTimes(1);expect(screen.getByRole('switch').checked).toBe(false);
 view.rerender(<CameraCoaching/>);await camera();fireEvent.change(screen.getByLabelText('화면 배치'),{target:{value:'demo'}});expect(track.stop).toHaveBeenCalledTimes(2);expect(screen.getByRole('switch').disabled).toBe(true);
});
it('tracking loss shows uncertainty only when opted in and hiding the page stops everything',async()=>{
 render(<CameraCoaching/>);await camera();await enable();await act(async()=>{await [...frames.values()][0](500);});expect(screen.getByText('추적 불확실 · 자세 판정 보류')).toBeTruthy();
 Object.defineProperty(document,'hidden',{configurable:true,value:true});fireEvent(document,new Event('visibilitychange'));expect(track.stop).toHaveBeenCalledTimes(1);expect(detector.close).toHaveBeenCalledTimes(1);expect(screen.queryByText('추적 불확실 · 자세 판정 보류')).toBeNull();Object.defineProperty(document,'hidden',{configurable:true,value:false});
});
it('times out pending authorization and aborts the request without stopping preview',async()=>{
 render(<CameraCoaching/>);await camera();vi.useFakeTimers({toFake:['setTimeout','clearTimeout','setInterval','clearInterval','Date']});api.mockReturnValueOnce(new Promise(()=>{}));fireEvent.click(screen.getByRole('switch'));
 const signal=api.mock.calls[0][2].signal;await act(async()=>vi.advanceTimersByTimeAsync(20001));
 expect(signal.aborted).toBe(true);expect(screen.getByRole('switch').checked).toBe(false);expect(screen.getByRole('alert').textContent).toContain('준비 시간이 초과');expect(track.stop).not.toHaveBeenCalled();
});
it('times out model setup and disposes a detector that resolves after timeout',async()=>{
 render(<CameraCoaching/>);await camera();vi.useFakeTimers({toFake:['setTimeout','clearTimeout','setInterval','clearInterval','Date']});const pending=deferred();createPoseRunner.mockReturnValueOnce(pending.promise);
 fireEvent.click(screen.getByRole('switch'));await act(async()=>vi.advanceTimersByTimeAsync(20001));
 expect(screen.getByRole('alert').textContent).toContain('준비 시간이 초과');await act(async()=>pending.resolve(detector));expect(detector.close).toHaveBeenCalledTimes(1);expect(detector.detectForVideo).not.toHaveBeenCalled();
});
it('clears stale results and speech after inference stalls; late results cannot restore feedback',async()=>{
 render(<CameraCoaching/>);await camera();await enable();fireEvent.click(screen.getByLabelText('음성으로도 듣기'));vi.useFakeTimers({toFake:['setTimeout','clearTimeout','setInterval','clearInterval','Date']});
 await act(async()=>[...frames.values()].at(-1)(500));expect(screen.getByRole('status')).toBeTruthy();
 const pending=deferred();detector.detectForVideo.mockReturnValueOnce(pending.promise);let inFlight;act(()=>{inFlight=[...frames.values()].at(-1)(700);});
 await act(async()=>vi.advanceTimersByTimeAsync(5001));expect(screen.queryByRole('status')).toBeNull();expect(screen.getByRole('alert').textContent).toContain('새 분석 결과');expect(detector.close).toHaveBeenCalledTimes(1);expect(track.stop).not.toHaveBeenCalled();
 const count=speechSynthesis.speak.mock.calls.length;await act(async()=>{pending.resolve({landmarks:[]});await inFlight;});expect(screen.queryByRole('status')).toBeNull();expect(speechSynthesis.speak).toHaveBeenCalledTimes(count);
});
it('a second camera owner cancels the first pending permission request without reclaiming it',async()=>{
 const pending=deferred();getMedia.mockReturnValueOnce(pending.promise);render(<><CameraCoaching/><CameraCoaching motion="plank"/></>);
 const [one,two]=screen.getAllByRole('region',{name:'선택형 카메라 코칭'}).map(el=>within(el));
 fireEvent.click(one.getByRole('button',{name:'카메라 켜기'}));fireEvent.click(two.getByRole('button',{name:'카메라 켜기'}));await waitFor(()=>expect(two.getByRole('switch').disabled).toBe(false));
 const lateTrack={stop:vi.fn()};await act(async()=>pending.resolve({getTracks:()=>[lateTrack],getVideoTracks:()=>[lateTrack]}));expect(lateTrack.stop).toHaveBeenCalledTimes(1);expect(one.getByRole('switch').disabled).toBe(true);expect(two.getByRole('switch').disabled).toBe(false);expect(track.stop).not.toHaveBeenCalled();
});
it('a new camera closes the live owner and its analysis before requesting another stream',async()=>{
 const first=render(<CameraCoaching/>);await camera();await enable();
 const nextTrack={stop:vi.fn()},nextMedia={getTracks:()=>[nextTrack],getVideoTracks:()=>[nextTrack]};
 getMedia.mockImplementationOnce(async()=>{expect(track.stop).toHaveBeenCalledTimes(1);expect(detector.close).toHaveBeenCalledTimes(1);return nextMedia;});
 const second=render(<CameraCoaching motion="plank"/>);const scope=within(second.container);fireEvent.click(scope.getByRole('button',{name:'카메라 켜기'}));await waitFor(()=>expect(scope.getByRole('switch').disabled).toBe(false));
 first.unmount();expect(nextTrack.stop).not.toHaveBeenCalled();second.unmount();expect(nextTrack.stop).toHaveBeenCalledTimes(1);
});
it('aborts a hanging model asset check at the preparation deadline',async()=>{
 render(<CameraCoaching/>);await camera();vi.useFakeTimers({toFake:['setTimeout','clearTimeout','setInterval','clearInterval','Date']});fetch.mockReturnValueOnce(new Promise(()=>{}));fireEvent.click(screen.getByRole('switch'));
 await act(async()=>vi.advanceTimersByTimeAsync(20001));expect(fetch.mock.calls[0][1].signal.aborted).toBe(true);expect(createPoseRunner).not.toHaveBeenCalled();expect(screen.getByRole('switch').checked).toBe(false);expect(track.stop).not.toHaveBeenCalled();
});
it('starts camera and real inference together only after the local coach action, with no server access',async()=>{
 mode.local=true;render(<CameraCoaching immersive/>);expect(getMedia).not.toHaveBeenCalled();expect(createPoseRunner).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:'코칭 시작'}));await waitFor(()=>expect(createPoseRunner).toHaveBeenCalledTimes(1));
 expect(screen.getByRole('switch').checked).toBe(true);expect(api).not.toHaveBeenCalled();expect(createPoseRunner.mock.calls[0][0]).toBe('/pose/pose_landmarker_lite.task');expect(getMedia).toHaveBeenCalledWith(expect.objectContaining({audio:false}));
});
it('releases front camera and analyzer before opening rear camera and restarting opted-in feedback',async()=>{
 render(<CameraCoaching/>);await camera();await enable();
 const rearTrack={stop:vi.fn()},rearMedia={getTracks:()=>[rearTrack],getVideoTracks:()=>[rearTrack]};
 getMedia.mockImplementationOnce(async constraints=>{expect(track.stop).toHaveBeenCalledTimes(1);expect(detector.close).toHaveBeenCalledTimes(1);expect(constraints.video.facingMode.ideal).toBe('environment');return rearMedia;});
 fireEvent.click(screen.getByRole('button',{name:'전면·후면 카메라 전환'}));await waitFor(()=>expect(createPoseRunner).toHaveBeenCalledTimes(2));
 expect(screen.getByRole('switch').checked).toBe(true);expect(screen.getByLabelText('내 운동 모습').parentElement.classList.contains('coach-feed-mirrored')).toBe(false);
});
it('highlights the actual problem joints while camera-position issues keep ordinary skeleton colors',async()=>{
 const raw=Array.from({length:33},()=>({x:.5,y:.5,z:0,visibility:.99}));detector.detectForVideo.mockResolvedValue({landmarks:[raw]});
 vi.spyOn(PoseCalibration.prototype,'update').mockReturnValue({ready:true});
 const analyzed={detected:true,reps:2,tracking_quality:'HIGH',feedback:'동작 확인',issues:[{id:'hip_low',severity:'adjust',bodyPart:'골반',message:'골반을 조금 들어 어깨와 발목 사이에 맞추세요.',joints:[11,23,27]}]};
 const update=vi.spyOn(ExercisePoseAnalyzer.prototype,'update').mockReturnValue(analyzed);
 const view=render(<CameraCoaching motion="push_up"/>);await camera();await enable();await act(async()=>[...frames.values()].at(-1)(500));
 expect(screen.getByRole('status').textContent).toContain('골반을 조금 들어');expect(screen.getByText('골반 · 빨간 관절 부위를 확인하세요')).toBeTruthy();expect(view.container.querySelector('circle[data-joint="23"]').getAttribute('fill')).toBe('#ff7c72');
 update.mockReturnValue({...analyzed,issues:[{id:'view',severity:'camera',bodyPart:'촬영 방향',message:'휴대폰을 측면에 놓아 주세요.',joints:[11,23,27]}]});await act(async()=>[...frames.values()].at(-1)(700));
 expect(screen.getByRole('status').textContent).toContain('휴대폰을 측면에');expect(view.container.querySelectorAll('[data-highlighted="true"]').length).toBe(0);
});
it('a denied camera permission leaves a clear retry state without trying pose inference',async()=>{
 getMedia.mockRejectedValueOnce(new DOMException('denied','NotAllowedError'));render(<CameraCoaching/>);fireEvent.click(screen.getByRole('button',{name:'코칭 시작'}));
 expect((await screen.findByRole('alert')).textContent).toContain('휴대폰 설정');expect(createPoseRunner).not.toHaveBeenCalled();expect(screen.getByRole('button',{name:'코칭 시작'}).disabled).toBe(false);expect(screen.getByRole('switch').checked).toBe(false);
});
it('withholds transient corrections and red joints until 300ms, then clears them immediately on tracking loss',async()=>{
 const raw=Array.from({length:33},()=>({x:.5,y:.5,z:0,visibility:.99}));detector.detectForVideo.mockResolvedValue({landmarks:[raw]});
 vi.spyOn(PoseCalibration.prototype,'update').mockReturnValue({ready:true});
 const message='골반을 조금 들어 어깨와 발목 사이에 맞추세요.';
 const issue={id:'hip_low',severity:'adjust',bodyPart:'골반',message,joints:[23,24],observedMs:0};
 const base={detected:true,reps:0,tracking_quality:'HIGH',feedback:message,corrections:[message],issues:[issue]};
 const update=vi.spyOn(ExercisePoseAnalyzer.prototype,'update').mockReturnValue(base),evaluated=vi.fn();
 const view=render(<CameraCoaching motion="push_up" onEvaluation={evaluated}/>);await camera();await enable();fireEvent.click(screen.getByLabelText('음성으로도 듣기'));
 await act(async()=>[...frames.values()].at(-1)(500));
 expect(evaluated.mock.calls.at(-1)[0].corrections).toEqual([]);expect(evaluated.mock.calls.at(-1)[0].message).not.toBe(message);expect(view.container.querySelectorAll('[data-highlighted="true"]').length).toBe(0);
 update.mockReturnValue({...base,issues:[{...issue,observedMs:299}]});await act(async()=>[...frames.values()].at(-1)(700));
 expect(evaluated.mock.calls.at(-1)[0].issues).toEqual([]);expect(speechSynthesis.speak.mock.calls.some(([utterance])=>utterance.text===message)).toBe(false);
 update.mockReturnValue({...base,issues:[{...issue,observedMs:300}]});await act(async()=>[...frames.values()].at(-1)(900));
 expect(evaluated.mock.calls.at(-1)[0].corrections).toEqual([message]);expect(screen.getByRole('status').textContent).toContain(message);expect(view.container.querySelector('circle[data-joint="23"]').getAttribute('fill')).toBe('#ff7c72');
 speechSynthesis.cancel.mockClear();
 update.mockReturnValue({detected:false,reps:0,tracking_quality:'LOST',feedback:'전신이 잘 보이도록 위치를 조정하세요.',corrections:[],issues:[]});await act(async()=>[...frames.values()].at(-1)(1100));
 expect(evaluated.mock.calls.at(-1)[0].corrections).toEqual([]);expect(screen.getByRole('status').textContent).not.toContain(message);expect(view.container.querySelectorAll('[data-highlighted="true"]').length).toBe(0);expect(speechSynthesis.cancel).toHaveBeenCalledTimes(1);
});
it('shows camera placement guidance immediately even before the persistence window',async()=>{
 const raw=Array.from({length:33},()=>({x:.5,y:.5,z:0,visibility:.99}));detector.detectForVideo.mockResolvedValue({landmarks:[raw]});vi.spyOn(PoseCalibration.prototype,'update').mockReturnValue({ready:true});
 const message='휴대폰을 측면에 놓아 주세요.';vi.spyOn(ExercisePoseAnalyzer.prototype,'update').mockReturnValue({detected:true,reps:0,issues:[{id:'view',severity:'camera',message,joints:[],observedMs:0}],corrections:[message]});
 const evaluated=vi.fn();render(<CameraCoaching motion="push_up" onEvaluation={evaluated}/>);await camera();await enable();await act(async()=>[...frames.values()].at(-1)(500));
 expect(screen.getByRole('status').textContent).toContain(message);expect(evaluated.mock.calls.at(-1)[0].corrections).toEqual([message]);
});
