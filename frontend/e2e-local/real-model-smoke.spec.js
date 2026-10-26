import {test,expect} from '@playwright/test';
// Real bundled model + real video frames, but a synthetic empty scene.
// This verifies runtime/tracking-loss behavior, never real-human accuracy.
test('bundled pose model processes empty video without inventing joint corrections',async({page})=>{
 const apiRequests=[],models=[],errors=[];
 page.on('request',r=>{const u=new URL(r.url());if(u.pathname.startsWith('/api/'))apiRequests.push(r.url());if(u.pathname.endsWith('.task')&&r.method()==='GET')models.push(r.url());});
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  localStorage.setItem('synex-personal-onboarding-v1','done');localStorage.setItem('synex-personal-consent-v1','accepted');
  Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:async()=>{
   const canvas=document.createElement('canvas');canvas.width=640;canvas.height=480;
   const ctx=canvas.getContext('2d');let frame=0;
   const draw=()=>{ctx.fillStyle=frame++%2?'#d0d0d0':'#cccccc';ctx.fillRect(0,0,640,480);};draw();
   const timer=setInterval(draw,100),stream=canvas.captureStream(10),track=stream.getVideoTracks()[0],stop=track.stop.bind(track);
   track.stop=()=>{clearInterval(timer);stop();};window.modelSmokeTrack=track;return stream;
  }}});
 });
 await page.goto('/health/pose?motion=squat');
 await page.getByRole('button',{name:'코칭 시작',exact:true}).click();
 await expect(page.getByText('추적 불확실 · 자세 판정 보류',{exact:true})).toBeVisible({timeout:30000});
 expect(models.length).toBeGreaterThan(0);
 await expect(page.locator('.coach-error')).toHaveCount(0);
 await expect(page.locator('.pose-observation dl')).toHaveCount(0);
 await expect(page.getByRole('switch',{name:'자세 피드백 받기'})).toBeChecked();
 await page.getByRole('button',{name:'카메라 끄기',exact:true}).click();
 await expect(page.getByRole('switch',{name:'자세 피드백 받기'})).not.toBeChecked();
 expect(await page.evaluate(()=>window.modelSmokeTrack.readyState)).toBe('ended');
 expect(apiRequests).toEqual([]);expect(errors).toEqual([]);
});
