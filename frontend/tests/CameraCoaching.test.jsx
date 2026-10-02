import React from 'react';
import {it,expect,vi,beforeEach,afterEach} from 'vitest';
import {render,screen,fireEvent,waitFor,act,cleanup} from '@testing-library/react';
import CameraCoaching from '../src/health/components/exercise/CameraCoaching.jsx';
import {api} from '../src/shared/lib/api.js';
import {createPoseRunner} from '../src/health/components/exercise/poseRunner.js';
vi.mock('../src/shared/lib/api.js',()=>({api:vi.fn()}));
vi.mock('../src/health/components/exercise/poseRunner.js',()=>({createPoseRunner:vi.fn()}));
vi.mock('../src/health/components/exercise/ExerciseMotion3D.jsx',()=>({default:()=> <div>3D 시범</div>}));
let track,media,getMedia,detector,frames,frameId;
const deferred=()=>{let resolve;const promise=new Promise(r=>{resolve=r;});return {promise,resolve};};
beforeEach(()=>{
 vi.clearAllMocks();frames=new Map();frameId=0;
 vi.stubGlobal('requestAnimationFrame',vi.fn(fn=>{frames.set(++frameId,fn);return frameId;}));vi.stubGlobal('cancelAnimationFrame',vi.fn(id=>frames.delete(id)));
 track={stop:vi.fn(),onended:null};media={getTracks:()=>[track],getVideoTracks:()=>[track]};getMedia=vi.fn().mockResolvedValue(media);Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:getMedia}});
 vi.spyOn(HTMLMediaElement.prototype,'play').mockResolvedValue();
 Object.defineProperty(HTMLMediaElement.prototype,'readyState',{configurable:true,get:()=>4});Object.defineProperty(HTMLVideoElement.prototype,'videoWidth',{configurable:true,get:()=>640});Object.defineProperty(HTMLVideoElement.prototype,'videoHeight',{configurable:true,get:()=>480});
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,headers:new Headers({'content-type':'application/octet-stream'})}));
 api.mockResolvedValue({});detector={close:vi.fn(),detectForVideo:vi.fn().mockResolvedValue({landmarks:[]})};createPoseRunner.mockResolvedValue(detector);
 vi.stubGlobal('speechSynthesis',{cancel:vi.fn(),speak:vi.fn()});vi.stubGlobal('SpeechSynthesisUtterance',class{constructor(text){this.text=text;}});
});
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.unstubAllGlobals();});
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
