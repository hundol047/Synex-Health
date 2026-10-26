import {test,expect} from '@playwright/test';
test.use({viewport:{width:390,height:844},permissions:['camera'],launchOptions:{...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{}),args:['--enable-unsafe-swiftshader','--disable-dev-shm-usage','--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']}});
test('camera split screen stays silent until opted in and releases preview on exercise change',async({page},info)=>{
 let analysisRequests=0;const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>localStorage.setItem('synex-onboarding-v1','done'));
 await page.route('**/api/advanced/pose',route=>{analysisRequests++;return route.fulfill({status:403,contentType:'application/json',body:JSON.stringify({detail:'분석 권한 확인 필요'})});});
 await page.goto('/health/pose?motion=squat');const feedback=page.getByRole('switch',{name:'자세 피드백 받기'});
 // Cold Vite/SwiftShader initialization on CI may finish after the default 5s assertion window.
 await expect(feedback).toBeVisible({timeout:20000});
 await expect(feedback).not.toBeChecked();await expect(page.locator('.coach-demo canvas')).toBeVisible();
 await page.getByRole('button',{name:'카메라 켜기',exact:true}).click();await expect(feedback).toBeEnabled();
 await expect.poll(()=>page.locator('video').evaluate(v=>v.videoWidth)).toBeGreaterThan(0);expect(analysisRequests).toBe(0);
 const panels=await page.locator('.coach-pane').evaluateAll(ps=>ps.map(p=>p.getBoundingClientRect().height));expect(Math.abs(panels[0]-panels[1])).toBeLessThan(3);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.locator('.coach-stage').evaluate(el=>el.scrollIntoView({block:'center'}));
 await page.locator('.coach-stage').screenshot({path:info.outputPath('camera-split-mobile.png')});
 await feedback.click();await expect(page.getByRole('alert')).toBeVisible();await expect(feedback).not.toBeChecked();expect(analysisRequests).toBe(1);
 expect(await page.locator('video').evaluate(v=>v.srcObject.getVideoTracks()[0].readyState)).toBe('live');
 await page.locator('video').evaluate(v=>{window.priorCameraTrack=v.srcObject.getVideoTracks()[0];});
 await page.getByLabel('따라 할 운동').selectOption('plank');await expect(feedback).not.toBeChecked();await expect(feedback).toBeDisabled();expect(await page.evaluate(()=>window.priorCameraTrack.readyState)).toBe('ended');
 await page.getByRole('button',{name:'카메라 켜기',exact:true}).click();await expect(feedback).toBeEnabled();await page.locator('video').evaluate(v=>{window.priorCameraTrack=v.srcObject.getVideoTracks()[0];});await page.getByRole('button',{name:'카메라 끄기',exact:true}).click();await expect(feedback).toBeDisabled();expect(await page.evaluate(()=>window.priorCameraTrack.readyState)).toBe('ended');
 expect(errors).toEqual([]);
});
