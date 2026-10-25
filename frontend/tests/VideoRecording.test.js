import {it,expect,vi,beforeEach,afterEach} from 'vitest';
import {createVideoRecording,recordingMimeType,recordingFilename,saveRecordedVideo,MAX_RECORDING_SECONDS,MAX_RECORDING_BYTES} from '../src/health/components/exercise/videoRecording.js';

const native=vi.hoisted(()=>({enabled:false,available:true,begin:vi.fn(),append:vi.fn(),finish:vi.fn(),cancel:vi.fn()}));
vi.mock('@capacitor/core',()=>({Capacitor:{isNativePlatform:()=>native.enabled,getPlatform:()=>native.enabled?'android':'web',isPluginAvailable:()=>native.available},registerPlugin:()=>native}));
class Recorder {
 static isTypeSupported=vi.fn(type=>type==='video/webm;codecs=vp8');
 constructor(stream,options){this.stream=stream;this.mimeType=options.mimeType;this.state='inactive';this.stop=vi.fn(()=>{this.state='inactive';});}
 start=vi.fn(()=>{this.state='recording';});
 data(blob=new Blob(['real video chunk'],{type:'video/webm'})){this.ondataavailable({data:blob});}
 finish(){this.onstop();}
}
beforeEach(()=>{
 vi.clearAllMocks();native.enabled=false;native.available=true;native.begin.mockResolvedValue({id:'session'});native.append.mockResolvedValue({});native.finish.mockResolvedValue({saved:true,path:'다운로드/Synex Health/test.webm'});native.cancel.mockResolvedValue({});
 vi.stubGlobal('MediaRecorder',Recorder);vi.stubGlobal('URL',class extends URL{static createObjectURL=vi.fn(()=> 'blob:local-video');static revokeObjectURL=vi.fn();});
});
afterEach(()=>{vi.useRealTimers();vi.restoreAllMocks();vi.unstubAllGlobals();});
it('probes supported video MIME formats and rejects unsupported recorders before starting',()=>{
 expect(recordingMimeType()).toBe('video/webm;codecs=vp8');
 expect(()=>recordingMimeType(undefined)).not.toThrow();
 expect(()=>recordingMimeType(null)).toThrow('동영상 촬영');
 class Unsupported {static isTypeSupported(){return false;}}
 expect(()=>recordingMimeType(Unsupported)).toThrow('동영상 형식');
});
it('flushes the final recorder chunk before publishing a nonempty locally playable blob',()=>{
 const onComplete=vi.fn(),onPhase=vi.fn(),media={getVideoTracks:()=>[]};
 const session=createVideoRecording(media,{onComplete,onPhase});
 expect(session.recorder.stream).toBe(media);expect(session.recorder.start).toHaveBeenCalledWith(250);
 session.recorder.data();session.stop();expect(onComplete).not.toHaveBeenCalled();expect(onPhase).toHaveBeenLastCalledWith('finishing');
 session.recorder.data(new Blob(['tail']));session.recorder.finish();
 expect(onComplete).toHaveBeenCalledTimes(1);expect(onComplete.mock.calls[0][0].blob.size).toBe(20);expect(onComplete.mock.calls[0][0].blob.type).toBe('video/webm;codecs=vp8');
});
it('cancel discards chunks and prevents a late stop or data event from reviving a recording',()=>{
 const onComplete=vi.fn(),onError=vi.fn(),session=createVideoRecording({}, {onComplete,onError});
 session.recorder.data();session.cancel();session.recorder.data();session.recorder.finish();
 expect(session.recorder.stop).toHaveBeenCalledTimes(1);expect(onComplete).not.toHaveBeenCalled();expect(onError).not.toHaveBeenCalled();
});
it('rejects empty recordings and recovers from a recorder that never finishes',()=>{
 const onError=vi.fn(),onComplete=vi.fn();const empty=createVideoRecording({}, {onError,onComplete});empty.stop();empty.recorder.finish();
 expect(onError).toHaveBeenLastCalledWith(expect.stringContaining('촬영된 영상이 없습니다'));expect(onComplete).not.toHaveBeenCalled();
 vi.useFakeTimers();const stalled=createVideoRecording({}, {onError,onComplete});stalled.stop();vi.advanceTimersByTime(5001);
 expect(onError).toHaveBeenLastCalledWith(expect.stringContaining('시간이 초과'));stalled.recorder.data();stalled.recorder.finish();expect(onComplete).not.toHaveBeenCalled();
});
it('automatically finishes at 60 seconds or the memory bound and cancels every timer',()=>{
 vi.useFakeTimers();const seconds=vi.fn();const session=createVideoRecording({}, {onSeconds:seconds});vi.advanceTimersByTime(MAX_RECORDING_SECONDS*1000);
 expect(session.recorder.stop).toHaveBeenCalledTimes(1);session.recorder.data();session.recorder.finish();expect(vi.getTimerCount()).toBe(0);
 const bounded=createVideoRecording({});bounded.recorder.data(new Blob([new Uint8Array(MAX_RECORDING_BYTES)]));expect(bounded.recorder.stop).toHaveBeenCalledTimes(1);bounded.cancel();expect(vi.getTimerCount()).toBe(0);
});
it('native export streams 256KB chunks, publishes only after all chunks and returns the Downloads result',async()=>{
 native.enabled=true;const blob=new Blob([new Uint8Array(600000)],{type:'video/webm'});const result=await saveRecordedVideo(blob,'squat');
 expect(native.begin).toHaveBeenCalledWith({name:expect.stringMatching(/^Synex-squat-[A-Za-z0-9_-]+\.webm$/),mimeType:'video/webm',share:false});
 expect(native.append).toHaveBeenCalledTimes(3);expect(native.append.mock.calls.every(([chunk])=>chunk.id==='session'&&chunk.data.length<=349528)).toBe(true);
 expect(native.finish).toHaveBeenCalledWith({id:'session'});expect(native.cancel).not.toHaveBeenCalled();expect(result.message).toContain('다운로드/Synex Health');
});
it('native export cancels a partially written file on errors or aborted navigation',async()=>{
 native.enabled=true;native.append.mockRejectedValueOnce(Error('disk full'));
 await expect(saveRecordedVideo(new Blob(['video'],{type:'video/webm'}),'plank')).rejects.toThrow('disk full');expect(native.cancel).toHaveBeenCalledWith({id:'session'});expect(native.finish).not.toHaveBeenCalled();
 vi.clearAllMocks();const abort=new AbortController();native.append.mockImplementationOnce(async()=>{abort.abort();});
 await expect(saveRecordedVideo(new Blob([new Uint8Array(300000)],{type:'video/webm'}),'plank',{signal:abort.signal})).rejects.toMatchObject({name:'AbortError'});
 expect(native.append).toHaveBeenCalledTimes(1);expect(native.cancel).toHaveBeenCalledWith({id:'session'});expect(native.finish).not.toHaveBeenCalled();
});
it('browser save downloads only after an explicit action and native export refuses missing plugin or empty data',async()=>{
 const click=vi.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(()=>{});
 const result=await saveRecordedVideo(new Blob(['video'],{type:'video/mp4'}),'lunge');expect(click).toHaveBeenCalledTimes(1);expect(result.message).toContain('다운로드');
 expect(recordingFilename('../bad/motion','video/mp4',new Date('2026-10-08T10:00:00Z'))).toBe('Synex-badmotion-2026-10-08T10-00-00-000Z.mp4');
 await expect(saveRecordedVideo(new Blob(),'squat')).rejects.toThrow('먼저 동영상');native.enabled=true;native.available=false;
 await expect(saveRecordedVideo(new Blob(['video']),'squat')).rejects.toThrow('업데이트');expect(native.begin).not.toHaveBeenCalled();
});
