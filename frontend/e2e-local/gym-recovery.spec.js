import {test,expect} from '@playwright/test';
test.beforeEach(async({page})=>{await page.addInitScript(()=>(localStorage.setItem('synex-personal-onboarding-v1','done'),localStorage.setItem('synex-personal-consent-v1','accepted')));});

test('gym coaching exposes its own demonstration and instructions without opening the camera implicitly',async({page},info)=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{window.__cameraRequests=0;Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:async()=>{window.__cameraRequests++;throw new DOMException('denied','NotAllowedError');}}});});
 await page.goto('/health/pose?motion=leg_extension');
 await expect(page.getByLabel('따라 할 운동')).toHaveValue('leg_extension');await expect(page.getByLabel('따라 할 운동').locator('option')).toHaveCount(74);
 await expect(page.locator('.coach-example canvas')).toHaveAttribute('data-exercise-rendered','leg_extension');
 await expect(page.getByRole('region',{name:'자세 차이와 힘 사용 안내'})).toContainText('허벅지 앞쪽');
 expect(await page.evaluate(()=>window.__cameraRequests)).toBe(0);
 await page.getByRole('button',{name:'코칭 시작',exact:true}).click();await expect(page.getByRole('alert')).toContainText('권한');
 await page.screenshot({path:info.outputPath('gym-coach-mobile.png'),fullPage:true});expect(errors).toEqual([]);
});

test('finished exercise automatically starts five recovery motions, calculates confirmed calories, and can skip recovery',async({page},info)=>{
 test.setTimeout(600000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/health/library');await page.getByLabel('운동·근육 검색').fill('맨몸 스쿼트');await page.getByRole('button',{name:'맨몸 스쿼트 동작 보기',exact:true}).click();
 const panel=page.getByRole('region',{name:'자동 운동 템포'});
 await page.evaluate(()=>{window.__renderFrame=requestAnimationFrame.bind(window);window.__cancelRenderFrame=cancelAnimationFrame.bind(window);});
 await page.clock.install({time:new Date('2026-10-19T00:00:00Z')});
 // Keep actual WebGL frames on the browser clock while controlling workout
 // intervals. Swapping an already-running R3F RAF loop freezes new canvases.
 await page.evaluate(()=>{window.requestAnimationFrame=window.__renderFrame;window.cancelAnimationFrame=window.__cancelRenderFrame;});
 await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));await panel.getByRole('button',{name:'자동 따라하기 시작'}).click();
 // Deliver bounded one-second ticks; avoid rendering thousands of virtual
 // intermediate WebGL frames while preserving the timer's stall protection.
 for(let i=0;i<1200&&await panel.getAttribute('data-stage')!=='complete';i++)await page.clock.fastForward(1000);
 await expect(page.getByRole('heading',{name:'오늘의 운동 결과'})).toBeVisible();
 const recovery=page.getByRole('region',{name:'운동 후 스트레칭'});await expect(recovery.getByText('자동 진행 중')).toBeVisible();
 await expect(recovery.locator('.stretch-choice')).toHaveCount(5);
 await recovery.getByRole('button',{name:'스트레칭 일시정지'}).click();
 await page.clock.runFor(100);await expect(recovery.locator('canvas')).toHaveAttribute('data-exercise-rendered',/^recovery_/);
 const first=await recovery.locator('canvas').getAttribute('data-exercise-rendered');expect(first).toMatch(/^recovery_/);
 await recovery.getByRole('button',{name:'이 스트레칭 건너뛰기'}).click();await expect(recovery.locator('canvas')).not.toHaveAttribute('data-exercise-rendered',first);
 await expect(page.getByText(/칼로리/)).toHaveCount(0);
 await recovery.getByRole('button',{name:'전체 30가지 · 동작 바꾸기'}).click();await expect(recovery.locator('.stretch-choice')).toHaveCount(30);
 await page.screenshot({path:info.outputPath('automatic-recovery-and-calories.png'),fullPage:true});
 const motions=new Set();
 for(let i=0;i<30;i++){
  await recovery.locator('.stretch-choice').nth(i).click({timeout:5000});
  for(let tick=0;tick<9;tick++)await page.clock.fastForward(1000);
  await recovery.getByRole('button',{name:'스트레칭 일시정지'}).click({timeout:5000});
  await page.clock.runFor(100);
  const canvas=recovery.locator('canvas');await expect(canvas).toHaveAttribute('data-exercise-rendered',/^recovery_/);
  const motion=await canvas.getAttribute('data-exercise-rendered');motions.add(motion);
  await canvas.scrollIntoViewIfNeeded();await canvas.screenshot({path:info.outputPath(motion+'.png')});
  expect(Number(await canvas.getAttribute('data-exercise-vertices'))).toBeGreaterThan(10000);
 }
 expect(motions.size).toBe(30);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(errors).toEqual([]);
});

test('skipping every exercise never starts recovery or adds calories',async({page})=>{
 await page.goto('/health/pose?motion=hammer_curl');await page.getByRole('region',{name:'자동 운동 템포'}).getByRole('button',{name:'이 운동 건너뛰기'}).click();
 await expect(page.getByRole('heading',{name:'오늘의 운동 결과'})).toBeVisible();await expect(page.getByRole('region',{name:'운동 후 스트레칭'}).locator('canvas')).toHaveCount(0);
 await expect(page.getByLabel(/실제 운동 분/)).toHaveCount(0);
});
