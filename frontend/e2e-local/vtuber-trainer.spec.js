import {test,expect as baseExpect} from '@playwright/test';
const expect=baseExpect.configure({timeout:90000});

test('dedicated vtuber can be previewed, saved and used for automatically playing exercise',async({page},info)=>{
 test.setTimeout(360000);page.setDefaultTimeout(90000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/shader|WebGLProgram/.test(m.text()))errors.push(m.text());});
 await page.addInitScript(()=>{
  localStorage.setItem('synex-personal-onboarding-v1','done');localStorage.setItem('synex-personal-consent-v1','accepted');
  if(!localStorage.getItem('synex-exercise-character-v1'))localStorage.setItem('synex-exercise-character-v1',JSON.stringify({model:'detailed',body:'female',detailedStyle:'studio'}));
  localStorage.setItem('saved-workout-check','retained');localStorage.setItem('synex-render-quality','medium');
 });
 await page.goto('/health/character');await page.getByRole('button',{name:'버튜버 캐릭터',exact:true}).click();
 const canvas=page.locator('canvas');await expect(canvas).toHaveAttribute('data-character-model','vtuber');
 await expect(canvas).toHaveAttribute('data-character-source','pixiv-vrm');
 await page.getByRole('button',{name:'정면 운동 시범 보기',exact:true}).click();
 await canvas.screenshot({path:info.outputPath('face-front.png')});
 const phase=page.getByLabel('미리보기 동작 구간');await phase.fill('777');
 await expect(canvas).toHaveAttribute('data-exercise-progress','0.777');
 await canvas.screenshot({path:info.outputPath('face-blink.png')});
 await page.getByRole('button',{name:'전신 보기',exact:true}).click();
 for(const [motion,time,view,file]of [['squat',0,'정면','standing'],['squat',500,'정면','squat-front'],['squat',500,'측면','squat-side'],['wall_push',500,'측면','wall-push'],['full_pushup',500,'측면','floor-pushup']]){
  await page.getByLabel('미리볼 운동').selectOption(motion);await phase.fill(String(time));
  await page.getByRole('button',{name:view+' 운동 시범 보기',exact:true}).click();
  await expect(canvas).toHaveAttribute('data-exercise-rendered',motion);
  await expect(canvas).toHaveAttribute('data-exercise-progress',String(time/1000));
  await canvas.screenshot({path:info.outputPath(file+'.png')});
 }
 await page.getByRole('button',{name:'저장하고 운동에 적용',exact:true}).click();
 await expect(page.locator('.character-save').getByRole('status')).toContainText('저장했습니다');
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('synex-exercise-character-v1')))).toMatchObject({model:'vtuber',body:'female',style:'toon'});
 expect(await page.evaluate(()=>localStorage.getItem('saved-workout-check'))).toBe('retained');
 await page.goto('/health/library');await page.getByLabel('운동·근육 검색').fill('맨몸 스쿼트');
 await page.getByRole('button',{name:'맨몸 스쿼트 동작 보기',exact:true}).click();
 const exercise=page.getByRole('region',{name:'선택한 운동 시범'}).locator('canvas');
 await expect(exercise).toHaveAttribute('data-character-model','vtuber');
 const progress=await exercise.getAttribute('data-exercise-progress');
 await expect.poll(()=>exercise.getAttribute('data-exercise-progress'),{timeout:30000}).not.toBe(progress);
 await exercise.screenshot({path:info.outputPath('exercise.png')});
 expect(errors).toEqual([]);
});
