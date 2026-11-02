import {test,expect} from '@playwright/test';

test('studio appearance is saved and used by the automatically playing exercise view',async({page},info)=>{
 test.setTimeout(480000);page.setDefaultTimeout(120000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/shader|WebGLProgram/.test(m.text()))errors.push(m.text());});
 await page.addInitScript(()=>{
  localStorage.setItem('synex-personal-onboarding-v1','done');localStorage.setItem('synex-personal-consent-v1','accepted');
  if(!localStorage.getItem('synex-exercise-character-v1'))localStorage.setItem('synex-exercise-character-v1',JSON.stringify({model:'detailed',body:'female',detailedStyle:'natural'}));
  if(!localStorage.getItem('record-preservation-check'))localStorage.setItem('record-preservation-check','retained');
  localStorage.setItem('synex-render-quality',sessionStorage.getItem('studio-portrait-done')?'low':'medium');
 });
 await page.goto('/health/character');
 const canvas=page.locator('canvas');await expect(canvas).toHaveAttribute('data-portrait-style','natural');
 await page.getByRole('button',{name:'여성 디테일 모델',exact:true}).click();
 await expect(canvas).toHaveAttribute('data-portrait-style','studio');
 await expect(canvas).toHaveAttribute('data-character-source','jungle-jim-alina');
 await expect(page.getByRole('button',{name:'스튜디오',exact:true})).toHaveAttribute('aria-pressed','true');
 await page.getByRole('button',{name:'정면 운동 시범 보기',exact:true}).click();
 await canvas.evaluate(c=>c.scrollIntoView({block:'center',behavior:'instant'}));
 await canvas.screenshot({path:info.outputPath('studio-face-front.png'),timeout:120000});
 await page.getByRole('button',{name:'전신 보기',exact:true}).click();
 await page.getByLabel('미리볼 운동').selectOption('squat');
 await page.getByRole('button',{name:'정면 운동 시범 보기',exact:true}).click();
 await canvas.evaluate(c=>c.scrollIntoView({block:'center',behavior:'instant'}));
 await canvas.screenshot({path:info.outputPath('studio-body-squat.png'),timeout:120000});
 await page.getByRole('button',{name:'저장하고 운동에 적용',exact:true}).click();
 await expect(page.locator('.character-save').getByRole('status')).toContainText('저장했습니다');
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('synex-exercise-character-v1')))).toMatchObject({model:'detailed',body:'female',detailedStyle:'studio'});
 expect(await page.evaluate(()=>localStorage.getItem('record-preservation-check'))).toBe('retained');
 await page.evaluate(()=>sessionStorage.setItem('studio-portrait-done','1'));
 await page.goto('/health/library');await page.getByLabel('운동·근육 검색').fill('맨몸 스쿼트');
 await page.getByRole('button',{name:'맨몸 스쿼트 동작 보기',exact:true}).click();
 const exercise=page.getByRole('region',{name:'선택한 운동 시범'}).locator('canvas');
 await expect(exercise).toHaveAttribute('data-portrait-style','studio');
 const phase=await exercise.getAttribute('data-exercise-progress');
 await expect.poll(()=>exercise.getAttribute('data-exercise-progress'),{timeout:30000}).not.toBe(phase);
 await exercise.screenshot({path:info.outputPath('studio-exercise.png'),timeout:120000});
 expect(errors).toEqual([]);
});
