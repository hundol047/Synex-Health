import {test,expect} from '@playwright/test';

test.use({deviceScaleFactor:2});
for(const body of ['female','male'])test(`${body} skin retains facial detail and compiles with exercise muscle guidance`,async({page},info)=>{
 test.setTimeout(300000);
 const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error'&&/shader|WebGLProgram/.test(m.text()))errors.push(m.text());});
 await page.addInitScript(body=>{
  localStorage.setItem('synex-personal-onboarding-v1','done');localStorage.setItem('synex-personal-consent-v1','accepted');
  localStorage.setItem('synex-exercise-character-v1',JSON.stringify({model:'detailed',body}));
  localStorage.setItem('synex-render-quality',sessionStorage.getItem('skin-portrait-checked')?'low':body==='female'?'high':'medium');
 },body);
 await page.goto('/health/character');
 let canvas=page.locator('canvas');
 await expect(canvas).toHaveAttribute('data-character-face','authored-trainer',{timeout:60000});
 await page.getByRole('button',{name:'얼굴 확대',exact:true}).click();
 await expect(canvas).toHaveAttribute('data-portrait-lighting','softboxes',{timeout:60000});
 const capture=async name=>{
  await canvas.evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));
  await expect.poll(()=>canvas.evaluate(c=>c.width/c.clientWidth)).toBeGreaterThanOrEqual(1.99);
  await canvas.screenshot({path:info.outputPath(name),timeout:120000});
 };
 await page.getByRole('button',{name:'정면 운동 시범 보기',exact:true}).click();await capture(`${body}-front.png`);
 await page.getByRole('button',{name:'45° 운동 시범 보기',exact:true}).click();await capture(`${body}-45.png`);
 await page.getByLabel('미리보기 동작 구간').fill('777');await expect(canvas).toHaveAttribute('data-exercise-progress','0.777');await capture(`${body}-blink.png`);
 await page.evaluate(()=>sessionStorage.setItem('skin-portrait-checked','1'));
 await page.goto('/health/library');await page.getByLabel('운동·근육 검색').fill('덤벨 컬');
 await page.getByRole('button',{name:'덤벨 컬 동작 보기',exact:true}).click();
 canvas=page.getByRole('region',{name:'선택한 운동 시범'}).locator('canvas');
 await expect(canvas).toHaveAttribute('data-character-body',body,{timeout:60000});
 await expect(canvas).toHaveAttribute('data-exercise-rendered','curl');
 const first=await canvas.getAttribute('data-exercise-progress');
 await expect.poll(()=>canvas.getAttribute('data-exercise-progress'),{timeout:15000}).not.toBe(first);
 await canvas.evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));
 await canvas.screenshot({path:info.outputPath(`${body}-exercise.png`)});
 expect(errors).toEqual([]);
});
