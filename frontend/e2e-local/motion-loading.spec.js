import {test,expect} from '@playwright/test';
test('reopening a guide reuses character setup and starts only after the surface is ready',async({page},info)=>{
 test.setTimeout(180000);const errors=[],loads=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/shader|WebGLProgram/.test(m.text()))errors.push(m.text());});
 await page.addInitScript(()=>{localStorage.setItem('synex-personal-onboarding-v1','done');localStorage.setItem('synex-personal-consent-v1','accepted');});
 await page.goto('/health/library');await page.getByLabel('운동·근육 검색').fill('맨몸 스쿼트');
 for(let i=0;i<3;i++){
  const start=Date.now();await page.getByRole('button',{name:'맨몸 스쿼트 동작 보기',exact:true}).click();
  const stage=page.getByRole('region',{name:'선택한 운동 시범'}),canvas=stage.locator('canvas');
  await expect(canvas).toHaveAttribute('data-exercise-rendered','squat',{timeout:30000});
  await expect(stage.locator('.motion-loading')).toHaveCount(0,{timeout:20000});loads.push(Date.now()-start);
  await expect(stage.getByRole('button',{name:'일시정지',exact:true})).toBeVisible();
  await stage.getByRole('button',{name:'처음 자세로',exact:true}).click();await expect(canvas).toHaveAttribute('data-exercise-progress','0');
  await stage.getByLabel('동작 구간',{exact:true}).fill('50');await expect(canvas).toHaveAttribute('data-exercise-progress','0.5');
  if(i===2){await canvas.evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));await page.screenshot({path:info.outputPath('squat-midpoint.png')});}
  await stage.getByRole('button',{name:'선택한 운동 시범 닫기'}).click();await expect(page.locator('canvas')).toHaveCount(0);
 }
 await info.attach('guide-open-ms',{body:JSON.stringify(loads),contentType:'application/json'});expect(errors).toEqual([]);
});
