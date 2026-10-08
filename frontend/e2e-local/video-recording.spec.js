import {test,expect} from '@playwright/test';
import {readFile,stat} from 'node:fs/promises';

test.beforeEach(async({page})=>{
 await page.addInitScript(()=>{
  localStorage.setItem('synex-personal-onboarding-v1','done');
  window.__recordingCamera={requests:[],tracks:[],frames:0};
  Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:async constraints=>{
   window.__recordingCamera.requests.push(constraints);
   // A real browser MediaStream with changing frames exercises MediaRecorder,
   // replay decoding, and file export without claiming a physical phone test.
   const canvas=document.createElement('canvas');canvas.width=640;canvas.height=480;
   const context=canvas.getContext('2d');let frame=0;
   const draw=()=>{frame++;window.__recordingCamera.frames++;context.fillStyle='#163743';context.fillRect(0,0,640,480);context.fillStyle='#77d5bb';context.fillRect(270+Math.sin(frame/9)*45,100,70,250);context.fillStyle='#eac3a4';context.beginPath();context.arc(305+Math.sin(frame/9)*45,70,35,0,Math.PI*2);context.fill();};
   draw();const interval=setInterval(draw,66),stream=canvas.captureStream(15),track=stream.getVideoTracks()[0];
   const stop=track.stop.bind(track);track.stop=()=>{clearInterval(interval);stop();};window.__recordingCamera.tracks.push(track);
   return stream;
  }}});
 });
});

test('real MediaRecorder records moving video, decodes replay and downloads a nonempty video after explicit save',async({page},testInfo)=>{
 const apiRequests=[],pageErrors=[];page.on('request',request=>{if(new URL(request.url()).pathname.startsWith('/api/'))apiRequests.push(request.url());});page.on('pageerror',error=>pageErrors.push(error.message));
 await page.goto('/health/pose');
 await expect(page.getByRole('button',{name:'동영상 촬영',exact:true})).toBeInViewport();
 expect(await page.evaluate(()=>window.__recordingCamera.requests.length)).toBe(0);
 await page.getByRole('button',{name:'동영상 촬영',exact:true}).click();
 await expect(page.getByRole('button',{name:'촬영 종료',exact:true})).toBeEnabled();
 await expect.poll(()=>page.evaluate(()=>window.__recordingCamera.frames)).toBeGreaterThan(20);
 await page.screenshot({path:testInfo.outputPath('camera-recording-active.png')});
 await page.getByRole('button',{name:'촬영 종료',exact:true}).click();
 const replay=page.getByLabel('촬영한 운동 동영상');await expect(replay).toBeVisible();
 await replay.evaluate(async video=>{video.muted=true;await video.play();});
 await expect.poll(()=>replay.evaluate(video=>({width:video.videoWidth,height:video.videoHeight,playing:video.currentTime>0}))).toEqual({width:640,height:480,playing:true});
 const downloaded=page.waitForEvent('download');await page.getByRole('button',{name:'휴대폰에 저장',exact:true}).click();
 const file=await downloaded,path=await file.path(),data=await readFile(path);
 expect((await stat(path)).size).toBeGreaterThan(1000);
 if(file.suggestedFilename().endsWith('.mp4'))expect(data.toString('ascii',4,8)).toBe('ftyp');else expect(data.subarray(0,4).toString('hex')).toBe('1a45dfa3');
 await file.saveAs(testInfo.outputPath(file.suggestedFilename()));
 await expect(page.getByRole('status')).toContainText('다운로드');
 await page.screenshot({path:testInfo.outputPath('camera-recording-replay.png')});
 expect(await page.evaluate(()=>window.__recordingCamera.requests.every(request=>request.audio===false))).toBe(true);
 expect(await page.evaluate(()=>window.__recordingCamera.tracks.every(track=>track.readyState==='ended'))).toBe(true);
 expect(apiRequests).toEqual([]);expect(pageErrors).toEqual([]);
 await page.getByRole('button',{name:'촬영 영상 버리기'}).click();await expect(replay).toHaveCount(0);
});

test('background and exercise change immediately stop and discard the active camera recording',async({page})=>{
 await page.goto('/health/pose');await page.getByRole('button',{name:'동영상 촬영',exact:true}).click();await expect(page.getByRole('button',{name:'촬영 종료'})).toBeEnabled();
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));Object.defineProperty(document,'hidden',{configurable:true,value:false});});
 await expect(page.getByRole('button',{name:'동영상 촬영',exact:true})).toBeEnabled();await expect(page.getByLabel('촬영한 운동 동영상')).toHaveCount(0);
 expect(await page.evaluate(()=>window.__recordingCamera.tracks.every(track=>track.readyState==='ended'))).toBe(true);
 await page.getByRole('button',{name:'동영상 촬영',exact:true}).click();await expect(page.getByRole('button',{name:'촬영 종료'})).toBeEnabled();await page.getByLabel('따라 할 운동').selectOption('plank');
 await expect(page.getByRole('button',{name:'동영상 촬영',exact:true})).toBeEnabled();await expect(page.getByLabel('촬영한 운동 동영상')).toHaveCount(0);
 expect(await page.evaluate(()=>window.__recordingCamera.tracks.every(track=>track.readyState==='ended'))).toBe(true);
});

test('recording permission errors keep retry available and short phones can reach the capture button',async({page})=>{
 await page.addInitScript(()=>Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:async()=>{throw new DOMException('denied','NotAllowedError');}}}));
 await page.setViewportSize({width:360,height:640});await page.goto('/health/pose');
 const record=page.getByRole('button',{name:'동영상 촬영',exact:true});await record.scrollIntoViewIfNeeded();await expect(record).toBeInViewport();await record.click();
 await expect(page.getByRole('alert')).toContainText('휴대폰 설정');await expect(record).toBeEnabled();await expect(page.getByLabel('촬영한 운동 동영상')).toHaveCount(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('wall push opens its own 3D demonstration and real recording while unsupported correction does not load a model',async({page},testInfo)=>{
 const analysisRequests=[];page.on('request',request=>{if(/pose_landmarker|vision_wasm|\/api\/advanced\/pose/.test(request.url()))analysisRequests.push(request.url());});
 await page.goto('/health/pose?motion=wall_push');await expect(page.getByLabel('따라 할 운동')).toHaveValue('wall_push');await expect(page.getByLabel('따라 할 운동').locator('option')).toHaveCount(42);
 await expect(page.getByText('동영상 촬영 가능 · 실시간 교정 미지원')).toBeVisible();await expect(page.getByRole('button',{name:'실시간 교정 미지원'})).toBeDisabled();await expect(page.getByRole('switch')).toBeDisabled();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await expect(page.locator('.coach-example canvas')).toHaveAttribute('data-exercise-rendered','wall_push');
 await page.getByRole('button',{name:'동영상 촬영',exact:true}).click();await expect(page.getByRole('button',{name:'촬영 종료'})).toBeEnabled();await expect.poll(()=>page.evaluate(()=>window.__recordingCamera.frames)).toBeGreaterThan(12);
 await expect(page.getByRole('switch')).toBeDisabled();await page.getByRole('button',{name:'촬영 종료'}).click();
 const replay=page.getByLabel('촬영한 운동 동영상');await expect(replay).toBeVisible();await replay.evaluate(async video=>{video.muted=true;await video.play();});await expect.poll(()=>replay.evaluate(video=>video.currentTime)).toBeGreaterThan(0);
 expect(analysisRequests).toEqual([]);await page.screenshot({path:testInfo.outputPath('wall-push-recording-replay.png')});
});
