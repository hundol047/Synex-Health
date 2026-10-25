import {test,expect} from '@playwright/test';
test.use({viewport:{width:390,height:844},permissions:['camera'],launchOptions:{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||undefined,args:['--enable-unsafe-swiftshader','--disable-dev-shm-usage','--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']}});
test('native-shaped preview needs no API, runs bundled model on fake frames, and closes camera on withdrawal',async({page})=>{
 const errors=[],apiRequests=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{window.CapacitorCustomPlatform={name:'android'};localStorage.setItem('synex-onboarding-v1','done');});
 await page.route('**/api/**',route=>{apiRequests.push(route.request().url());return route.abort();});
 await page.goto('/');await page.getByRole('button',{name:'서버 없이 운동 카메라 테스트'}).click();
 await page.getByRole('checkbox',{name:'만 14세 이상이며 검증 전 카메라 테스트에 동의합니다'}).click();await expect(page.getByLabel('테스트할 운동').locator('option')).toHaveCount(74);
 await page.getByLabel('테스트할 운동').selectOption('wall_push');
 await page.getByRole('button',{name:'카메라 켜기',exact:true}).click();
 const toggle=page.getByRole('switch');await expect(toggle).toBeEnabled();await toggle.check();
 await expect(page.getByText('추적 불확실 · 자세 판정 보류')).toBeVisible({timeout:30000});
 await expect(page.getByRole('alert')).toHaveCount(0);
 await page.locator('video').evaluate(v=>window.testTrack=v.srcObject.getVideoTracks()[0]);
 await page.getByRole('button',{name:'카메라 테스트 동의 철회'}).click();
 expect(await page.evaluate(()=>window.testTrack.readyState)).toBe('ended');expect(apiRequests).toEqual([]);expect(errors).toEqual([]);
});
