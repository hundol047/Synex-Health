import {test,expect} from '@playwright/test';
const stats=page=>page.locator('[data-overlay]').evaluate(el=>JSON.parse(el.dataset.overlay));
test.beforeEach(async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('synex-personal-onboarding-v1','done'));
});
test('InBody inputs restore and render two distinct translucent mannequins offline on a phone',async({page,context},info)=>{
 const requests=[],errors=[];page.on('request',r=>{if(new URL(r.url()).pathname.startsWith('/api/'))requests.push(r.url());});page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/health/profile');
 await page.getByLabel('인체 모형 성별').selectOption('male');await page.getByLabel('생년월일').fill('1996-01-01');
 await page.getByRole('button',{name:'저장하기',exact:true}).click();await expect(page.getByText('저장되었습니다.',{exact:true})).toBeVisible();
 await page.getByLabel('체중 (kg)',{exact:true}).fill('78');await page.getByLabel('키 (cm)',{exact:true}).first().fill('178');await page.getByLabel('골격근량 (kg)',{exact:true}).fill('30');await page.getByLabel('체지방률 (%)',{exact:true}).fill('23');
 await page.getByText('내 체형 맞추기 · 둘레와 골량 (선택)').click();
 for(const [label,value] of [['가슴둘레 (cm)','99'],['허리둘레 (cm)','84'],['엉덩이둘레 (cm)','101'],['추정 골량 (kg)','3'],['무기질량 (kg)','3.7']])await page.getByLabel(label,{exact:true}).fill(value);
 await page.getByRole('button',{name:'측정값 저장',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'측정값을 저장했습니다.'})).toBeVisible();await page.getByRole('link',{name:'내 3D 마네킹 보기',exact:true}).last().click();
 await expect(page.getByRole('heading',{name:'수치로 그린 내 몸'})).toBeVisible();
 await expect.poll(async()=>{try{return (await stats(page)).layers.length;}catch{return 0;}},{timeout:30000}).toBe(2);
 const initial=await stats(page);expect(initial.layers.map(l=>l.name).sort()).toEqual(['my-muscle','reference-average']);
 expect(initial.layers.find(l=>l.name==='reference-average').regions.RIGHT_LEG.depth).toBeGreaterThan(initial.layers.find(l=>l.name==='my-muscle').regions.RIGHT_LEG.depth);
 expect(initial.layers.every(l=>l.opacity>0&&l.opacity<1&&!l.wireframe)).toBe(true);
 await expect(page.locator('.mannequin-mass-comparison')).toContainText('33');await expect(page.locator('.mannequin-stats')).toContainText('추정 골량');await expect(page.locator('.mannequin-stats')).toContainText('3.7');
 await page.locator('.mannequin-scene').scrollIntoViewIfNeeded();await page.getByRole('button',{name:'후면',exact:true}).click();
 const back=await page.locator('[data-camera]').getAttribute('data-camera');await page.getByRole('button',{name:'정면',exact:true}).click();await expect.poll(()=>page.locator('[data-camera]').getAttribute('data-camera')).not.toBe(back);
 await page.getByText('투명도 · 골격 · 표현 설정').click();await page.getByLabel('내 마네킹 농도').fill('0.4');await page.getByRole('button',{name:'후면',exact:true}).click();
 await expect.poll(async()=>(await stats(page)).layers.find(l=>l.name==='my-muscle').opacity).toBe(.4);
 await page.getByRole('checkbox',{name:/골격 구조 보기/}).check();await page.getByRole('button',{name:'정면',exact:true}).click();await expect.poll(async()=>(await stats(page)).meshCount).toBeGreaterThan(20);
 await page.getByRole('checkbox',{name:/골격 구조 보기/}).uncheck();await page.getByLabel('내 마네킹 농도').fill('0.6');await page.getByText('투명도 · 골격 · 표현 설정').click();
 for(const viewport of [{width:393,height:852},{width:360,height:640}]){
  await page.setViewportSize(viewport);await page.getByRole('button',{name:'정면',exact:true}).click();await page.locator('.mannequin-scene').evaluate(el=>el.scrollIntoView({block:'center'}));await page.waitForTimeout(400);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.locator('.mannequin-scene').screenshot({path:info.outputPath(`mannequin-${viewport.width}.png`)});
 }
 await page.setViewportSize({width:393,height:852});await page.screenshot({path:info.outputPath('mannequin-page.png'),fullPage:true});
 await page.getByRole('button',{name:'내 몸만',exact:true}).click();await expect.poll(async()=>(await stats(page)).layers.length).toBe(1);
 await context.setOffline(true);await page.getByRole('button',{name:'겹쳐보기',exact:true}).click();await page.getByRole('button',{name:'후면',exact:true}).click();
 await expect.poll(async()=>(await stats(page)).layers.length).toBe(2);
 await context.setOffline(false);await page.reload();
 await expect.poll(async()=>{try{return (await stats(page)).layers.length;}catch{return 0;}},{timeout:30000}).toBe(2);
 await expect(page.locator('.mannequin-stats')).toContainText('3.7');expect(requests).toEqual([]);expect(errors).toEqual([]);
});
test('unmeasured and ineligible profiles never receive a fabricated average',async({page})=>{
 await page.goto('/health/body');await expect(page.getByRole('link',{name:'측정값 입력하기',exact:true})).toBeVisible();await page.getByRole('link',{name:'측정값 입력하기',exact:true}).click();
 await page.getByLabel('체중 (kg)',{exact:true}).fill('60');await page.getByLabel('골격근량 (kg)',{exact:true}).fill('24');await page.getByRole('button',{name:'측정값 저장',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'측정값을 저장했습니다.'})).toBeVisible();
 await page.goto('/health/body');await expect(page.getByRole('status').filter({hasText:'미입력'})).toBeVisible();
 await expect(page.getByRole('button',{name:'평균 비교 모형',exact:true})).toBeDisabled();await expect.poll(async()=>{try{return (await stats(page)).layers.length;}catch{return 0;}}).toBe(1);
 await page.goto('/health/profile');await page.getByLabel('인체 모형 성별').selectOption('female');await page.getByLabel('생년월일').fill('2015-01-01');await page.getByRole('button',{name:'저장하기',exact:true}).click();
 await expect(page.getByText('저장되었습니다.',{exact:true})).toBeVisible();await page.goto('/health/body');await expect(page.getByRole('status').filter({hasText:'18–88세'})).toBeVisible();await expect(page.getByRole('button',{name:'평균 비교 모형',exact:true})).toBeDisabled();
});
