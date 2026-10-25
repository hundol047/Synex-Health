import {test,expect} from '@playwright/test';
const stats=page=>page.locator('[data-mannequin]').evaluate(el=>JSON.parse(el.dataset.mannequin));
async function chooseView(page,name){
 await page.getByRole('button',{name,exact:true}).click();
 const [axis,sign]=({'정면':[2,1],'후면':[2,-1],'왼쪽':[0,1],'오른쪽':[0,-1]})[name];
 await expect.poll(async()=>page.locator('[data-camera]').evaluate((el,{axis,sign})=>{
  const position=el.dataset.camera.split(',').map(Number),target=(el.dataset.cameraTarget||'0,0,0').split(',').map(Number);
  return (position[axis]-target[axis])*sign>.3&&Math.abs(position[2-axis]-target[2-axis])<.001;
 },{axis,sign}),{timeout:15000}).toBe(true);
}
async function expectBodiesFit(page){
 await expect.poll(async()=>{
  const state=await stats(page),box=await page.locator('[data-mannequin]').boundingBox();
  return state.layers.every(({screenBounds:b})=>b.left>0&&b.right<box.width&&b.top>0&&b.bottom<box.height);
 },{timeout:30000}).toBe(true);
}
async function expectRegisteredBodies(page){
 await expect.poll(async()=>{try{const state=await stats(page);return {layout:state.layout,layerCount:state.layers.length};}catch{return null;}},{timeout:30000}).toEqual({layout:'overlap',layerCount:2});
 await expectBodiesFit(page);
 const state=await stats(page),own=state.layers.find(l=>l.name==='my-muscle'),reference=state.layers.find(l=>l.name==='reference-average'),box=await page.locator('[data-mannequin]').boundingBox();
 expect(state.layout).toBe('overlap');expect(own.placement).toEqual(reference.placement);
 await expect(page.locator('.mannequin-scene').first()).toHaveCSS('background-color','rgb(241, 245, 247)');
 expect(state.contour).toMatchObject({color:'#d86a16',opacity:.55,depthTest:false,source:'reference-mesh-edges',dashed:false,lineWidth:1.2});expect(state.contour.segments).toBeGreaterThan(50);
 expect(state.ownContour).toMatchObject({color:'#006274',opacity:.65,source:'personal-mesh-edges',dashed:false,lineWidth:2});expect(state.ownContour.segments).toBeGreaterThan(50);
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
 await expectBodiesFit(page);
 const {layers}=await stats(page),box=await page.locator('[data-mannequin]').boundingBox();
 expect(new Set(layers.map(l=>l.geometryId)).size).toBe(2);
 for(const layer of layers){
  expect(layer.vertexCount).toBeGreaterThan(10000);expect(layer.screenBounds.left).toBeGreaterThan(0);expect(layer.screenBounds.right).toBeLessThan(box.width);expect(layer.screenBounds.top).toBeGreaterThan(0);expect(layer.screenBounds.bottom).toBeLessThan(box.height);
  expect(layer.headOcclusion).toMatchObject({sourceBody:layer.name,colorWrite:false,depthWrite:true,sharedPositions:true,polygonOffset:false,lessEqual:true});
  expect(layer.headVisible).toBe(true);
 }
}
test.beforeEach(async({page})=>{
 await page.addInitScript(()=>(localStorage.setItem('synex-personal-onboarding-v1','done'),localStorage.setItem('synex-personal-consent-v1','accepted')));
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
 await expect(page.locator('.mannequin-scene-key .own')).toHaveText('내 몸 30 kg');await expect(page.locator('.mannequin-scene-key .reference')).toHaveText('평균 33 kg');
 expect(initial.layers.find(l=>l.name==='my-muscle')).toMatchObject({opacity:.5,color:'#007f91',headColor:'#007f91',roughness:.86});expect(initial.layers.find(l=>l.name==='reference-average')).toMatchObject({opacity:.3,color:'#ed9748',headColor:'#ed9748',roughness:.86});
 expect(initial.layers[0].shapeFingerprint).not.toBe(initial.layers[1].shapeFingerprint);
 await expect(page.getByLabel('내 골격근량과 평균의 차이')).toContainText('문헌 평균보다 3 kg 적어요');
 expect(initial.layers.every(l=>l.opacity>0&&l.opacity<1&&!l.wireframe)).toBe(true);
 await expect(page.locator('.mannequin-mass-comparison')).toContainText('33');await expect(page.locator('.mannequin-stats')).toContainText('추정 골량');await expect(page.locator('.mannequin-stats')).toContainText('3.7');
 await page.locator('.mannequin-scene').scrollIntoViewIfNeeded();await chooseView(page,'후면');
 const back=await page.locator('[data-camera]').getAttribute('data-camera');await chooseView(page,'정면');await expect.poll(()=>page.locator('[data-camera]').getAttribute('data-camera')).not.toBe(back);
 await chooseView(page,'왼쪽');await expectRegisteredBodies(page);await chooseView(page,'오른쪽');await expectRegisteredBodies(page);
 await page.getByRole('button',{name:'나란히 비교',exact:true}).click();await expectSeparatedBodies(page);await page.getByRole('button',{name:'겹쳐보기',exact:true}).click();await expectRegisteredBodies(page);
 await page.getByText('투명도 · 골격 · 표현 설정').click();await page.getByLabel('내 마네킹 투명도').fill('80');await page.getByLabel('평균 마네킹 투명도').fill('75');await chooseView(page,'후면');
 await expect.poll(async()=>(await stats(page)).layers.find(l=>l.name==='my-muscle').opacity).toBe(.2);await expect.poll(async()=>(await stats(page)).layers.find(l=>l.name==='reference-average').opacity).toBe(.25);
 await page.getByRole('checkbox',{name:'평균 윤곽선 보기',exact:true}).uncheck();await expect.poll(async()=>(await stats(page)).contour).toBeNull();expect((await stats(page)).layers.find(l=>l.name==='reference-average')).toMatchObject({opacity:.25,wireframe:false});await page.getByRole('checkbox',{name:'평균 윤곽선 보기',exact:true}).check();
 await page.getByRole('checkbox',{name:/골격 구조 보기/}).check();await chooseView(page,'정면');await expect.poll(async()=>(await stats(page)).meshCount).toBeGreaterThan(20);
 await page.getByRole('checkbox',{name:/골격 구조 보기/}).uncheck();await page.getByLabel('내 마네킹 투명도').fill('50');await page.getByLabel('평균 마네킹 투명도').fill('70');await page.getByText('투명도 · 골격 · 표현 설정').click();
 for(const viewport of [{width:393,height:852},{width:360,height:640}]){
  await page.setViewportSize(viewport);await chooseView(page,'정면');await expectRegisteredBodies(page);await page.locator('.mannequin-scene').evaluate(el=>el.scrollIntoView({block:'center'}));await page.waitForTimeout(400);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  const directions=await Promise.all(['정면','후면','왼쪽','오른쪽','초기화'].map(name=>page.getByRole('button',{name,exact:true}).boundingBox()));
  expect(new Set(directions.map(box=>box.y)).size).toBe(1);expect(directions.every(box=>box.width>=44&&box.height>=44)).toBe(true);
  const keyBox=await page.locator('.mannequin-scene-key').boundingBox(),canvasBox=await page.locator('.mannequin-scene canvas').boundingBox();
  expect(keyBox.y+keyBox.height).toBeLessThan(canvasBox.y);
  await page.locator('.mannequin-scene').screenshot({path:info.outputPath(`mannequin-${viewport.width}.png`)});
 }
 await page.setViewportSize({width:393,height:852});await page.screenshot({path:info.outputPath('mannequin-page.png'),fullPage:true});
 await page.getByRole('button',{name:'내 몸만',exact:true}).click();await expect.poll(async()=>(await stats(page)).layers.length).toBe(1);
 expect((await stats(page)).layers[0].headOcclusion).toMatchObject({sourceBody:'my-muscle',colorWrite:false,depthWrite:true,sharedPositions:true});
 await page.getByRole('button',{name:'평균 비교 모형',exact:true}).click();await expect.poll(async()=>(await stats(page)).layers.map(layer=>layer.name)).toEqual(['reference-average']);
 expect((await stats(page)).layers[0]).toMatchObject({name:'reference-average',opacity:.3,headVisible:true,headOcclusion:{sourceBody:'reference-average',colorWrite:false,depthWrite:true,sharedPositions:true}});
 await context.setOffline(true);await page.getByRole('button',{name:'겹쳐보기',exact:true}).click();await chooseView(page,'후면');
 await expect.poll(async()=>(await stats(page)).layers.length).toBe(2);
 await expectRegisteredBodies(page);await page.getByRole('button',{name:'나란히 비교',exact:true}).click();await expectSeparatedBodies(page);await page.getByRole('button',{name:'겹쳐보기',exact:true}).click();
 await chooseView(page,'정면');const surface=page.locator('.mannequin-scene canvas');await surface.scrollIntoViewIfNeeded();const surfaceBox=await surface.boundingBox();await surface.click({position:{x:surfaceBox.width*.5,y:surfaceBox.height*.53}});
 await expect(page.getByRole('status').filter({hasText:'몸통 선택'})).toBeVisible();expect((await stats(page)).layers.every(l=>l.headColor=== (l.name==='my-muscle'?'#007f91':'#ed9748'))).toBe(true);
 await context.setOffline(false);await page.reload();
 await expect.poll(async()=>{try{return (await stats(page)).layers.length;}catch{return 0;}},{timeout:30000}).toBe(2);await expectRegisteredBodies(page);
 await expect(page.locator('.mannequin-stats')).toContainText('3.7');
 await page.goto('/health');await page.getByRole('button',{name:'3D 미리보기 열기',exact:true}).click();await expectRegisteredBodies(page);
 await expect(page.locator('.home-body-card .body-scene button')).toHaveCount(0);
 const home=await stats(page);expect(home.layers.find(l=>l.name==='my-muscle')).toMatchObject({opacity:.5,color:'#007f91',headColor:'#007f91'});expect(home.layers.find(l=>l.name==='reference-average')).toMatchObject({opacity:.3,color:'#ed9748',headColor:'#ed9748'});
 expect(requests).toEqual([]);expect(errors).toEqual([]);
});
test('average appears only after actual eligible profile inputs and aligns with the personal body in 3D',async({page})=>{
 await page.goto('/health/body');await expect(page.getByRole('link',{name:'측정값 입력하기',exact:true})).toBeVisible();await page.getByRole('link',{name:'측정값 입력하기',exact:true}).click();
 await page.getByLabel('체중 (kg)',{exact:true}).fill('60');await page.getByLabel('골격근량 (kg)',{exact:true}).fill('24');await page.getByLabel('키 (cm)',{exact:true}).first().fill('170');await page.getByLabel('체지방률 (%)',{exact:true}).fill('25');await page.getByRole('button',{name:'측정값 저장',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'측정값을 저장했습니다.'})).toBeVisible();
 await page.goto('/health/body');await expect(page.getByRole('status').filter({hasText:'성별 · 생년월일'})).toBeVisible();await expect(page.getByRole('link',{name:'평균 모형에 필요한 정보 입력',exact:true})).toHaveAttribute('href','/health/profile');
 await expect(page.getByRole('button',{name:'평균 비교 모형',exact:true})).toBeDisabled();await expect.poll(async()=>{try{return (await stats(page)).layers.length;}catch{return 0;}}).toBe(1);
 await page.goto('/health/profile');await page.getByLabel('인체 모형 성별').selectOption('female');await page.getByLabel('생년월일').fill('2015-01-01');await page.getByRole('button',{name:'저장하기',exact:true}).click();await expect(page.getByRole('alert').filter({hasText:'만 14세 이상만 사용할 수 있습니다.'})).toBeVisible();await page.getByLabel('생년월일').fill('2010-01-01');await page.getByRole('button',{name:'저장하기',exact:true}).click();
 await expect(page.getByText('저장되었습니다.',{exact:true})).toBeVisible();await page.goto('/health/body');await expect(page.getByRole('status').filter({hasText:'18–88세'})).toBeVisible();await expect(page.getByRole('button',{name:'평균 비교 모형',exact:true})).toBeDisabled();
 await page.goto('/health/profile');await page.getByLabel('생년월일').fill('1995-01-01');await page.getByRole('button',{name:'저장하기',exact:true}).click();await expect(page.getByText('저장되었습니다.',{exact:true})).toBeVisible();await page.goto('/health/body');await expectRegisteredBodies(page);await expect(page.locator('.mannequin-mass-comparison')).toContainText('21');
});
test('equal muscle mass aligns exactly and greater own mass keeps both contrasting boundaries visible',async({page},info)=>{
 await page.goto('/health/profile');await page.getByLabel('인체 모형 성별').selectOption('male');await page.getByLabel('생년월일').fill('1996-01-01');await page.getByRole('button',{name:'저장하기',exact:true}).click();await expect(page.getByText('저장되었습니다.',{exact:true})).toBeVisible();
 for(const [label,value] of [['체중 (kg)','78'],['키 (cm)','178'],['골격근량 (kg)','33'],['체지방률 (%)','23']])await page.getByLabel(label,{exact:true}).first().fill(value);
 await page.getByRole('button',{name:'측정값 저장',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'측정값을 저장했습니다.'})).toBeVisible();await page.goto('/health/body');
 for(const name of ['정면','후면','왼쪽','오른쪽']){
  await chooseView(page,name);await expectRegisteredBodies(page);
  const {layers}=await stats(page);expect(layers[0].shapeFingerprint).toBe(layers[1].shapeFingerprint);expect(layers[0].screenBounds).toEqual(layers[1].screenBounds);
 }
 await page.goto('/health/profile');
 for(const [label,value] of [['체중 (kg)','78'],['키 (cm)','178'],['골격근량 (kg)','39'],['체지방률 (%)','23']])await page.getByLabel(label,{exact:true}).first().fill(value);
 await page.getByRole('button',{name:'측정값 저장',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'측정값을 저장했습니다.'})).toBeVisible();
 await page.goto('/health/body');await expectRegisteredBodies(page);
 await expect(page.getByLabel('내 골격근량과 평균의 차이')).toContainText('문헌 평균보다 6 kg 많아요');
 const {layers}=await stats(page);expect(layers[0].shapeFingerprint).not.toBe(layers[1].shapeFingerprint);
 await page.locator('.mannequin-scene').scrollIntoViewIfNeeded();
 await page.locator('.mannequin-scene').screenshot({path:info.outputPath('mannequin-above-average.png')});
});

test('body-area buttons frame both actual surfaces, turn the back, and restore the whole body',async({page},info)=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/health/profile');await page.getByLabel('인체 모형 성별').selectOption('male');await page.getByLabel('생년월일').fill('1996-01-01');await page.getByRole('button',{name:'저장하기',exact:true}).click();await expect(page.getByText('저장되었습니다.',{exact:true})).toBeVisible();
 for(const [label,value] of [['체중 (kg)','78'],['키 (cm)','178'],['골격근량 (kg)','30'],['체지방률 (%)','23']])await page.getByLabel(label,{exact:true}).first().fill(value);
 await page.getByRole('button',{name:'측정값 저장',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'측정값을 저장했습니다.'})).toBeVisible();await page.goto('/health/body');await expectRegisteredBodies(page);
 const picker=page.getByRole('group',{name:'부위 확대 선택'}),canvas=page.locator('[data-mannequin]');
 const wholeDistance=Math.hypot(...(await canvas.getAttribute('data-camera')).split(',').map(Number));
 const fit=async id=>{
  await expect.poll(async()=>{
   const state=await stats(page),box=await canvas.boundingBox();
   return state.focusRegion===id&&state.layers.every(l=>{const b=l.focusScreenBounds;return b&&b.left>0&&b.right<box.width&&b.top>0&&b.bottom<box.height;});
  },{timeout:15000}).toBe(true);
 };
 for(const [id,name,back] of [['chest','가슴'],['abdomen','복부'],['back','등',true],['hips','엉덩이',true],['left_arm','왼팔'],['right_arm','오른팔'],['left_leg','왼다리'],['right_leg','오른다리']]){
  await picker.getByRole('button',{name,exact:true}).click();await expect(picker.getByRole('button',{name,exact:true})).toHaveAttribute('aria-pressed','true');await fit(id);
  const state=await stats(page);expect(state.layers[0].placement).toEqual(state.layers[1].placement);
  const camera=(await canvas.getAttribute('data-camera')).split(',').map(Number),target=(await canvas.getAttribute('data-camera-target')).split(',').map(Number);
  expect(Math.hypot(...camera.map((v,i)=>v-target[i]))).toBeLessThan(wholeDistance*.85);
  expect(back?camera[2]<target[2]:camera[2]>target[2]).toBe(true);
  if(id.includes('left'))expect(target[0]).toBeGreaterThan(0);if(id.includes('right'))expect(target[0]).toBeLessThan(0);
  if(id.includes('leg'))expect(target[1]).toBeLessThan(0);
  if(['back','left_arm'].includes(id))await page.locator('.mannequin-scene').screenshot({path:info.outputPath(`focus-${id}.png`)});
 }
 await page.setViewportSize({width:360,height:640});await fit('right_leg');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 for(const button of await picker.getByRole('button').all()){const b=await button.boundingBox();expect(b.width).toBeGreaterThanOrEqual(44);expect(b.height).toBeGreaterThanOrEqual(44);}
 await chooseView(page,'후면');await fit('right_leg');
 await page.locator('.mannequin-scene').screenshot({path:info.outputPath('focus-leg-360.png')});
 const beforeTarget=await canvas.getAttribute('data-camera-target'),beforeZoom=await canvas.getAttribute('data-camera');
 await page.getByRole('button',{name:'3D 확대',exact:true}).click();await expect.poll(()=>canvas.getAttribute('data-camera')).not.toBe(beforeZoom);expect(await canvas.getAttribute('data-camera-target')).toBe(beforeTarget);
 await picker.getByRole('button',{name:'오른다리',exact:true}).click();await fit('right_leg');
 await expect.poll(()=>canvas.getAttribute('data-camera')).not.toBe(beforeZoom);
 await picker.getByRole('button',{name:'전체 보기',exact:true}).click();await expectRegisteredBodies(page);await expect(canvas).toHaveAttribute('data-camera-target','0.0000,0.0000,0.0000');
 await picker.getByRole('button',{name:'왼팔',exact:true}).click();await fit('left_arm');await page.getByRole('button',{name:'나란히 비교',exact:true}).click();await fit('left_arm');
 await page.getByRole('button',{name:'겹쳐보기',exact:true}).click();await fit('left_arm');
 await page.getByRole('button',{name:'내 몸만',exact:true}).click();await fit('left_arm');await expect.poll(async()=>(await stats(page)).layers.length).toBe(1);
 await page.getByRole('button',{name:'평균 비교 모형',exact:true}).click();await fit('left_arm');await expect.poll(async()=>(await stats(page)).layers[0].name).toBe('reference-average');
 await page.getByRole('button',{name:'겹쳐보기',exact:true}).click();await page.getByRole('button',{name:'초기화',exact:true}).click();await expectRegisteredBodies(page);await expect(picker.getByRole('button',{name:'전체 보기',exact:true})).toHaveAttribute('aria-pressed','true');
 expect(errors).toEqual([]);
});

test('selected areas show their own report differences, preserve them offline, and explain missing regional values',async({page,context},info)=>{
 await page.goto('/health/profile');await page.getByLabel('인체 모형 성별').selectOption('male');await page.getByLabel('생년월일').fill('1996-01-01');await page.getByRole('button',{name:'저장하기',exact:true}).click();await expect(page.getByText('저장되었습니다.',{exact:true})).toBeVisible();
 for(const [label,value] of [['체중 (kg)','78'],['키 (cm)','178'],['골격근량 (kg)','30'],['체지방률 (%)','23']])await page.getByLabel(label,{exact:true}).first().fill(value);
 await page.getByText('팔·다리 근육 분석 입력 (선택)',{exact:true}).click();
 await expect(page.locator('#segment-entry-help')).toContainText('제지방이란?');await expect(page.locator('#segment-entry-help')).toContainText('100%는 결과지의 기준값');
 await page.setViewportSize({width:360,height:640});
 for(const input of await page.locator('.measurement-segment-card').first().locator('input').all()){const box=await input.boundingBox();expect(box.width).toBeGreaterThan(100);expect(box.height).toBeGreaterThanOrEqual(44);}
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.locator('.measurement-segment-card').first().screenshot({path:info.outputPath('beginner-segment-input-360.png')});
 await page.setViewportSize({width:393,height:852});
 for(const [region,kg,percent] of [['왼팔','2.7','90'],['오른팔','3.3','110'],['왼다리','9','100'],['몸통','24','96']]){
  await page.getByLabel(`${region} 근육 분석 값 (kg)`,{exact:true}).fill(kg);await page.getByLabel(`${region} 기준 대비 (%)`,{exact:true}).fill(percent);
 }
 await page.getByRole('button',{name:'측정값 저장',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'측정값을 저장했습니다.'})).toBeVisible();await page.goto('/health/body');await expectRegisteredBodies(page);
 const picker=page.getByRole('group',{name:'부위 확대 선택'}),card=page.getByRole('status',{name:'선택 부위 수치 비교'});
 for(const [name,message] of [['왼팔','결과지 기준보다 0.3 kg 적어요'],['오른팔','결과지 기준보다 0.3 kg 많아요'],['왼다리','결과지 기준과 같아요']]){
  await picker.getByRole('button',{name,exact:true}).click();await expect(card).toContainText(`${name} 선택`);await expect(card.locator('.segment-comparison-difference')).toHaveText(message);await expect(card).toContainText('문헌 평균과 다릅니다');
  await expect.poll(()=>page.evaluate(()=>document.querySelector('.segment-comparison-readout').getBoundingClientRect().bottom<document.querySelector('.mannequin-scene canvas').getBoundingClientRect().top)).toBe(true);
 }
 await page.setViewportSize({width:360,height:640});await picker.getByRole('button',{name:'왼팔',exact:true}).click();
 await expect(card).toContainText('내 측정 2.7 kg');await expect(card).toContainText('약 3 kg');
 await expect.poll(async()=>{const b=await page.locator('.mannequin-focus-view').boundingBox();return b.y>=0&&b.y+b.height<=640-65;}).toBe(true);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.locator('.mannequin-focus-view').screenshot({path:info.outputPath('segment-difference-arm-360.png')});
 await picker.getByRole('button',{name:'등',exact:true}).click();await expect(card).toContainText('몸통 전체 분석 값');await expect(card).toContainText('등만의 수치가 아닌 몸통 전체 비교');await expect(card).toContainText('1 kg 적어요');
 await picker.getByRole('button',{name:'엉덩이',exact:true}).click();await expect(card).toContainText('엉덩이만의 비교 수치는 없어요');await expect(card).not.toContainText('1 kg 적어요');
 await picker.getByRole('button',{name:'오른다리',exact:true}).click();await expect(card).toContainText('부위 비교 정보가 필요해요');await expect(card).toContainText('해당 부위 차이 아님');await expect(card.getByRole('link',{name:/부위 수치 입력/})).toHaveAttribute('href','/health/profile#segment-measurements');
 await card.getByRole('link',{name:/부위 수치 입력/}).click();await expect(page.locator('#segment-measurements')).toHaveAttribute('open','');await expect(page.getByLabel('오른다리 기준 대비 (%)',{exact:true})).toBeVisible();
 await page.goto('/health/body');await page.reload();await expectRegisteredBodies(page);await context.setOffline(true);await picker.getByRole('button',{name:'왼팔',exact:true}).click();await expect(card).toContainText('결과지 기준보다 0.3 kg 적어요');
 await picker.getByRole('button',{name:'전체 보기',exact:true}).click();await expect(card).toHaveCount(0);await expectRegisteredBodies(page);
});
