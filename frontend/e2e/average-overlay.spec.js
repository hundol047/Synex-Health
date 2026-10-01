import {test,expect} from '@playwright/test';

test.beforeEach(async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('synex-onboarding-v1','done'));
});
const stats=page=>page.locator('[data-overlay]').evaluate(el=>JSON.parse(el.dataset.overlay));

test('same viewer renders both meshes, opacity/selection/camera/mobile and original range mode',async({page},info)=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/health/body');
 await expect(page.getByRole('button',{name:/Average Compare/})).toBeVisible();
 await expect.poll(async()=>{try{return (await stats(page)).layers.length;}catch{return 0;}},{timeout:30000}).toBe(2);
 const initial=await stats(page);expect(initial.layers.map(l=>l.name).sort()).toEqual(['my-muscle','reference-average']);
 await page.getByText('레이어 · 투명도 · 겹쳐보기 설정').click();
 await page.getByLabel('비교 표면 투명도').fill('0.7');
 // A camera change invalidates demand rendering and records current GPU-side state.
 await page.getByRole('button',{name:'후면',exact:true}).click();
 await expect.poll(async()=>(await stats(page)).layers.find(l=>l.name==='reference-average').opacity).toBe(.7);
 await page.getByRole('button',{name:'정면',exact:true}).click();
 const target=(await stats(page)).layers.find(l=>l.name==='my-muscle').regionPixels.RIGHT_ARM;const canvasBox=await page.locator('canvas').boundingBox();await page.mouse.click(canvasBox.x+target[0],canvasBox.y+target[1]);
 await expect(page.getByRole('table')).toContainText('오른팔');
 await expect(page.getByRole('table').locator('tr.selected')).toContainText('오른팔');
 await page.getByRole('checkbox',{name:'비교군 평균',exact:true}).uncheck();
 await page.getByRole('button',{name:'후면',exact:true}).click();
 await expect.poll(async()=>(await stats(page)).layers.length).toBe(1);
 await page.getByRole('checkbox',{name:'비교군 평균',exact:true}).check();
 await page.getByRole('button',{name:'정면',exact:true}).click();
 await page.getByText('레이어 · 투명도 · 겹쳐보기 설정').click();
 await page.locator('.overlay-viewer').screenshot({path:info.outputPath('overlay-desktop.png')});
 const canvas=page.locator('canvas').first();const before=await page.locator('[data-camera]').getAttribute('data-camera');
 await page.getByRole('button',{name:'3D 확대',exact:true}).click();
 await expect.poll(()=>page.locator('[data-camera]').getAttribute('data-camera')).not.toBe(before);
 const box=await canvas.boundingBox();await page.mouse.move(box.x+box.width*.6,box.y+box.height*.6);await page.mouse.down();await page.mouse.move(box.x+box.width*.7,box.y+box.height*.55,{steps:8});await page.mouse.up();
 await page.getByRole('button',{name:'초기화',exact:true}).click();
 await page.setViewportSize({width:390,height:844});
 await expect(page.getByLabel('레이어 범례')).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 await page.locator('.overlay-viewer').screenshot({path:info.outputPath('overlay-390.png')});
 await page.getByRole('button',{name:/Previous Compare/}).click();
 await expect(page.getByRole('table')).toContainText('이전 측정');
 await page.getByRole('button',{name:/Range View/}).click();await expect(page.getByText('기준 범위',{exact:true})).toBeVisible();
 expect(errors).toEqual([]);
});

test('reference-unavailable retains body; numeric fixture changes volume with same camera',async({page},info)=>{
 const raw=await (await page.request.get('/api/body-map/latest')).json();
 const fixture=structuredClone(raw);const g=fixture.average_comparison.groups[0];
 const leg=fixture.measurement.segments.find(s=>s.segment==='RIGHT_LEG');leg.lean_mass_kg=7.1;g.segments.RIGHT_LEG.lean.reference_value=7.8;
 await page.route('**/api/body-map/latest',r=>r.fulfill({json:fixture}));
 await page.goto('/health/body');await expect(page.getByRole('table')).toContainText('-9.0');
 await expect.poll(async()=>{try{return (await stats(page)).layers.length;}catch{return 0;}}).toBe(2);
 const layers=(await stats(page)).layers;expect(layers.find(l=>l.name==='reference-average').regions.RIGHT_LEG.depth).toBeGreaterThan(layers.find(l=>l.name==='my-muscle').regions.RIGHT_LEG.depth);
 await page.locator('.overlay-viewer').screenshot({path:info.outputPath('fixture-two-volumes.png')});
 await page.unroute('**/api/body-map/latest');
 await page.route('**/api/body-map/latest',r=>r.fulfill({json:{...raw,average_comparison:{available:false,groups:[]}}}));
 await page.reload();
 await expect(page.getByRole('status').filter({hasText:'현재 조건에 맞는 비교군'})).toBeVisible();
 await expect(page.locator('canvas')).toBeVisible();
 expect(await page.getByRole('table').innerText()).not.toContain('NaN');
});

test('routine previews and instructions visible; workout flow persists feedback and stops on pain',async({page},info)=>{
 await page.goto('/health/routine');
 const generated=await page.request.post('/api/exercise-routines/generate',{data:{}});expect(generated.ok()).toBeTruthy();
 await page.reload();await expect(page.getByTestId('exercise-preview').first()).toBeVisible();
 await expect(page.locator('.exercise-cues').first()).not.toBeEmpty();await expect(page.locator('.exercise-reason').first()).not.toBeEmpty();
 await page.screenshot({path:info.outputPath('routine-inline.png'),fullPage:true});
 await page.goto('/health/workout');await page.getByRole('button',{name:/Workout Mode/}).click();
 await expect(page.getByRole('heading',{name:/Workout Mode/})).toBeVisible();
 await page.getByRole('button',{name:/Complete Set/}).click();
 await page.getByLabel('RPE (1–10)',{exact:true}).fill('6');
 await page.getByLabel('실제 반복 횟수',{exact:true}).fill('10');
 await page.getByRole('button',{name:'완료 기록 · 다음 운동',exact:true}).click();
 await expect(page.getByRole('heading',{name:/2 \//})).toBeVisible();
 await page.getByLabel('통증 (0–10)',{exact:true}).fill('3');
 await page.getByRole('button',{name:'통증 기록 · 운동 중단',exact:true}).click();
 await expect(page.getByRole('heading',{name:'오늘의 운동 요약'})).toBeVisible();
 await expect(page.getByRole('alert')).toContainText('진행을 중단');
 const logs=await(await page.request.get('/api/workouts')).json();expect(logs.some(w=>w.rpe===6&&w.completed)).toBeTruthy();expect(logs.some(w=>w.pain===3&&!w.completed)).toBeTruthy();
 await page.goto('/health/pose');await expect(page.getByText('시작 전 준비')).toBeVisible();await expect(page.getByText(/권장 카메라 방향/)).toBeVisible();
});
