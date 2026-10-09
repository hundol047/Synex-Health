import {test,expect} from '@playwright/test';
const stats=page=>page.locator('[data-mannequin]').evaluate(el=>JSON.parse(el.dataset.mannequin));
async function expectRegisteredBodies(page){
 await expect.poll(async()=>{try{const state=await stats(page);return {layout:state.layout,layerCount:state.layers.length};}catch{return null;}},{timeout:30000}).toEqual({layout:'overlap',layerCount:2});
 const state=await stats(page),own=state.layers.find(l=>l.name==='my-muscle'),reference=state.layers.find(l=>l.name==='reference-average'),box=await page.locator('[data-mannequin]').boundingBox();
 expect(state.layout).toBe('overlap');expect(own.placement).toEqual(reference.placement);
 expect(state.contour).toMatchObject({color:'#7c8fa7',opacity:.72,depthTest:false,source:'reference-mesh-edges'});expect(state.contour.segments).toBeGreaterThan(50);
 expect(new Set(state.layers.map(l=>l.geometryId)).size).toBe(2);
 for(const layer of state.layers){
  expect(layer.vertexCount).toBeGreaterThan(10000);expect(layer.screenBounds.left).toBeGreaterThan(0);expect(layer.screenBounds.right).toBeLessThan(box.width);expect(layer.screenBounds.top).toBeGreaterThan(0);expect(layer.screenBounds.bottom).toBeLessThan(box.height);
  expect(layer.headOcclusion).toMatchObject({sourceBody:'my-muscle',colorWrite:false,depthWrite:true,depthTest:true,sharedPositions:layer.name==='my-muscle',polygonOffset:false,lessEqual:true});
  expect(layer.headVisible).toBe(layer.name==='my-muscle');
  expect(layer.headOcclusion.triangles).toBeGreaterThan(100);expect(layer.headOcclusion.triangles).toBe(layer.headOcclusion.surfaceTriangles);
 }
}
async function expectSeparatedBodies(page){
 await expect.poll(async()=>{try{
  const {layers}=await stats(page),own=layers.find(l=>l.name==='my-muscle'),reference=layers.find(l=>l.name==='reference-average');
  return !!(own&&reference&&own.screenBounds.right<reference.screenBounds.left);
 }catch{return false;}},{timeout:30000}).toBe(true);
 const {layers}=await stats(page),box=await page.locator('[data-mannequin]').boundingBox();
 expect(new Set(layers.map(l=>l.geometryId)).size).toBe(2);
 for(const layer of layers){
  expect(layer.vertexCount).toBeGreaterThan(10000);expect(layer.screenBounds.left).toBeGreaterThan(0);expect(layer.screenBounds.right).toBeLessThan(box.width);expect(layer.screenBounds.top).toBeGreaterThan(0);expect(layer.screenBounds.bottom).toBeLessThan(box.height);
  expect(layer.headOcclusion).toMatchObject({sourceBody:layer.name,colorWrite:false,depthWrite:true,sharedPositions:true,polygonOffset:false,lessEqual:true});
  expect(layer.headVisible).toBe(true);
 }
}
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
 expect(initial.layout).toBe('overlap');await expectRegisteredBodies(page);
 expect(initial.layers.find(l=>l.name==='my-muscle')).toMatchObject({opacity:.66,color:'#2563eb',headColor:'#2563eb',roughness:.86});expect(initial.layers.find(l=>l.name==='reference-average')).toMatchObject({opacity:.22,color:'#7c8fa7',headColor:'#7c8fa7',roughness:.86});
 expect(initial.layers[0].shapeFingerprint).not.toBe(initial.layers[1].shapeFingerprint);
 expect(initial.layers.every(l=>l.opacity>0&&l.opacity<1&&!l.wireframe)).toBe(true);
 await expect(page.locator('.mannequin-mass-comparison')).toContainText('33');await expect(page.locator('.mannequin-stats')).toContainText('추정 골량');await expect(page.locator('.mannequin-stats')).toContainText('3.7');
 await page.locator('.mannequin-scene').scrollIntoViewIfNeeded();await page.getByRole('button',{name:'후면',exact:true}).click();
 const back=await page.locator('[data-camera]').getAttribute('data-camera');await page.getByRole('button',{name:'정면',exact:true}).click();await expect.poll(()=>page.locator('[data-camera]').getAttribute('data-camera')).not.toBe(back);
 await page.getByRole('button',{name:'왼쪽',exact:true}).click();await expectRegisteredBodies(page);await page.getByRole('button',{name:'오른쪽',exact:true}).click();await expectRegisteredBodies(page);
 await page.getByRole('button',{name:'나란히 비교',exact:true}).click();await expectSeparatedBodies(page);await page.getByRole('button',{name:'겹쳐보기',exact:true}).click();await expectRegisteredBodies(page);
 await page.getByText('투명도 · 골격 · 표현 설정').click();await page.getByLabel('내 마네킹 투명도').fill('80');await page.getByLabel('평균 마네킹 투명도').fill('75');await page.getByRole('button',{name:'후면',exact:true}).click();
 await expect.poll(async()=>(await stats(page)).layers.find(l=>l.name==='my-muscle').opacity).toBe(.2);await expect.poll(async()=>(await stats(page)).layers.find(l=>l.name==='reference-average').opacity).toBe(.25);
 await page.getByRole('checkbox',{name:'평균 윤곽선 보기',exact:true}).uncheck();await expect.poll(async()=>(await stats(page)).contour).toBeNull();await page.getByRole('checkbox',{name:'평균 윤곽선 보기',exact:true}).check();
 await page.getByRole('checkbox',{name:/골격 구조 보기/}).check();await page.getByRole('button',{name:'정면',exact:true}).click();await expect.poll(async()=>(await stats(page)).meshCount).toBeGreaterThan(20);
 await page.getByRole('checkbox',{name:/골격 구조 보기/}).uncheck();await page.getByLabel('내 마네킹 투명도').fill('34');await page.getByLabel('평균 마네킹 투명도').fill('78');await page.getByText('투명도 · 골격 · 표현 설정').click();
 for(const viewport of [{width:393,height:852},{width:360,height:640}]){
  await page.setViewportSize(viewport);await page.getByRole('button',{name:'정면',exact:true}).click();await expectRegisteredBodies(page);await page.locator('.mannequin-scene').evaluate(el=>el.scrollIntoView({block:'center'}));await page.waitForTimeout(400);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  const directions=await Promise.all(['정면','후면','왼쪽','오른쪽','초기화'].map(name=>page.getByRole('button',{name,exact:true}).boundingBox()));
  expect(new Set(directions.map(box=>box.y)).size).toBe(1);expect(directions.every(box=>box.width>=44&&box.height>=44)).toBe(true);
  await page.locator('.mannequin-scene').screenshot({path:info.outputPath(`mannequin-${viewport.width}.png`)});
 }
 await page.setViewportSize({width:393,height:852});await page.screenshot({path:info.outputPath('mannequin-page.png'),fullPage:true});
 await page.getByRole('button',{name:'내 몸만',exact:true}).click();await expect.poll(async()=>(await stats(page)).layers.length).toBe(1);
 expect((await stats(page)).layers[0].headOcclusion).toMatchObject({sourceBody:'my-muscle',colorWrite:false,depthWrite:true,sharedPositions:true});
 await page.getByRole('button',{name:'평균 비교 모형',exact:true}).click();await expect.poll(async()=>(await stats(page)).layers.length).toBe(1);
 expect((await stats(page)).layers[0]).toMatchObject({name:'reference-average',opacity:.22,headVisible:true,headOcclusion:{sourceBody:'reference-average',colorWrite:false,depthWrite:true,sharedPositions:true}});
 await context.setOffline(true);await page.getByRole('button',{name:'겹쳐보기',exact:true}).click();await page.getByRole('button',{name:'후면',exact:true}).click();
 await expect.poll(async()=>(await stats(page)).layers.length).toBe(2);
 await expectRegisteredBodies(page);await page.getByRole('button',{name:'나란히 비교',exact:true}).click();await expectSeparatedBodies(page);await page.getByRole('button',{name:'겹쳐보기',exact:true}).click();
 await page.getByRole('button',{name:'정면',exact:true}).click();const surface=page.locator('.mannequin-scene canvas');await surface.scrollIntoViewIfNeeded();const surfaceBox=await surface.boundingBox();await surface.click({position:{x:surfaceBox.width*.5,y:surfaceBox.height*.53}});
 await expect(page.getByRole('status').filter({hasText:'몸통 선택'})).toBeVisible();expect((await stats(page)).layers.every(l=>l.headColor=== (l.name==='my-muscle'?'#2563eb':'#7c8fa7'))).toBe(true);
 await context.setOffline(false);await page.reload();
 await expect.poll(async()=>{try{return (await stats(page)).layers.length;}catch{return 0;}},{timeout:30000}).toBe(2);await expectRegisteredBodies(page);
 await expect(page.locator('.mannequin-stats')).toContainText('3.7');
 await page.goto('/health');await page.getByRole('button',{name:'3D 미리보기 열기',exact:true}).click();await expectRegisteredBodies(page);
 await expect(page.locator('.home-body-card .body-scene button')).toHaveCount(0);
 const home=await stats(page);expect(home.layers.find(l=>l.name==='my-muscle')).toMatchObject({opacity:.66,color:'#2563eb',headColor:'#2563eb'});expect(home.layers.find(l=>l.name==='reference-average')).toMatchObject({opacity:.22,color:'#7c8fa7',headColor:'#7c8fa7'});
 expect(requests).toEqual([]);expect(errors).toEqual([]);
});
test('average appears only after actual eligible profile inputs and aligns with the personal body in 3D',async({page})=>{
 await page.goto('/health/body');await expect(page.getByRole('link',{name:'측정값 입력하기',exact:true})).toBeVisible();await page.getByRole('link',{name:'측정값 입력하기',exact:true}).click();
 await page.getByLabel('체중 (kg)',{exact:true}).fill('60');await page.getByLabel('골격근량 (kg)',{exact:true}).fill('24');await page.getByLabel('키 (cm)',{exact:true}).first().fill('170');await page.getByLabel('체지방률 (%)',{exact:true}).fill('25');await page.getByRole('button',{name:'측정값 저장',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'측정값을 저장했습니다.'})).toBeVisible();
 await page.goto('/health/body');await expect(page.getByRole('status').filter({hasText:'성별 · 생년월일'})).toBeVisible();await expect(page.getByRole('link',{name:'평균 모형에 필요한 정보 입력',exact:true})).toHaveAttribute('href','/health/profile');
 await expect(page.getByRole('button',{name:'평균 비교 모형',exact:true})).toBeDisabled();await expect.poll(async()=>{try{return (await stats(page)).layers.length;}catch{return 0;}}).toBe(1);
 await page.goto('/health/profile');await page.getByLabel('인체 모형 성별').selectOption('female');await page.getByLabel('생년월일').fill('2015-01-01');await page.getByRole('button',{name:'저장하기',exact:true}).click();
 await expect(page.getByText('저장되었습니다.',{exact:true})).toBeVisible();await page.goto('/health/body');await expect(page.getByRole('status').filter({hasText:'18–88세'})).toBeVisible();await expect(page.getByRole('button',{name:'평균 비교 모형',exact:true})).toBeDisabled();
 await page.goto('/health/profile');await page.getByLabel('생년월일').fill('1995-01-01');await page.getByRole('button',{name:'저장하기',exact:true}).click();await expect(page.getByText('저장되었습니다.',{exact:true})).toBeVisible();await page.goto('/health/body');await expectRegisteredBodies(page);await expect(page.locator('.mannequin-mass-comparison')).toContainText('21');
});
test('equal muscle mass yields coincident geometry without an inflated reference shell',async({page})=>{
 await page.goto('/health/profile');await page.getByLabel('인체 모형 성별').selectOption('male');await page.getByLabel('생년월일').fill('1996-01-01');await page.getByRole('button',{name:'저장하기',exact:true}).click();await expect(page.getByText('저장되었습니다.',{exact:true})).toBeVisible();
 for(const [label,value] of [['체중 (kg)','78'],['키 (cm)','178'],['골격근량 (kg)','33'],['체지방률 (%)','23']])await page.getByLabel(label,{exact:true}).first().fill(value);
 await page.getByRole('button',{name:'측정값 저장',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'측정값을 저장했습니다.'})).toBeVisible();await page.goto('/health/body');
 for(const name of ['정면','후면','왼쪽','오른쪽']){
  await page.getByRole('button',{name,exact:true}).click();await expectRegisteredBodies(page);
  const {layers}=await stats(page);expect(layers[0].shapeFingerprint).toBe(layers[1].shapeFingerprint);expect(layers[0].screenBounds).toEqual(layers[1].screenBounds);
 }
});
