import {test,expect} from '@playwright/test';

test.use({deviceScaleFactor:2});
for(const body of ['female','male'])test(`${body} natural portrait can be compared, saved and used for exercise`,async({page},info)=>{
 test.setTimeout(420000);page.setDefaultTimeout(120000);
 const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error'&&/shader|WebGLProgram/.test(m.text()))errors.push(m.text());});
 await page.addInitScript(body=>{
  localStorage.setItem('synex-personal-onboarding-v1','done');localStorage.setItem('synex-personal-consent-v1','accepted');
  if(!localStorage.getItem('synex-exercise-character-v1'))localStorage.setItem('synex-exercise-character-v1',JSON.stringify({model:'detailed',body,detailedStyle:'original'}));
  localStorage.setItem('synex-render-quality',sessionStorage.getItem('portrait-done')?'low':'medium');
 },body);
 await page.goto('/health/character');const portrait=page.locator('canvas');
 await expect(portrait).toHaveAttribute('data-portrait-style','original',{timeout:90000});
 await page.getByRole('button',{name:'얼굴 확대',exact:true}).click();
 await expect(portrait).toHaveAttribute('data-portrait-lighting','softboxes',{timeout:90000});
 const capture=async file=>{
  await portrait.evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));
  const result=await portrait.screenshot({path:info.outputPath(`${body}-${file}.png`),timeout:120000});
  expect(await portrait.evaluate(c=>c.width/c.clientWidth)).toBeGreaterThanOrEqual(1.99);
  return result;
 };
 await page.getByRole('button',{name:'45° 운동 시범 보기',exact:true}).click();
 const original=await capture('original');
 await page.getByRole('button',{name:'내추럴',exact:true}).click();
 await expect(portrait).toHaveAttribute('data-portrait-style','natural',{timeout:90000});
 expect(await capture('natural-45')).not.toEqual(original);
 await page.getByRole('button',{name:'정면 운동 시범 보기',exact:true}).click();
 await capture('natural-front');
 await page.getByLabel('미리보기 동작 구간').fill('777');
 await capture('natural-blink');
 await page.getByRole('button',{name:'저장하고 운동에 적용',exact:true}).click();
 await expect(page.locator('.character-save').getByRole('status')).toContainText('저장했습니다');
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('synex-exercise-character-v1')))).toMatchObject({body,detailedStyle:'natural'});
 await page.evaluate(()=>sessionStorage.setItem('portrait-done','1'));
 await page.goto('/health/library');await page.getByLabel('운동·근육 검색').fill('맨몸 스쿼트');
 await page.getByRole('button',{name:'맨몸 스쿼트 동작 보기',exact:true}).click();
 const exercise=page.getByRole('region',{name:'선택한 운동 시범'}).locator('canvas');
 await expect(exercise).toHaveAttribute('data-portrait-style','natural',{timeout:90000});
 await expect(exercise).toHaveAttribute('data-character-body',body);
 const first=await exercise.getAttribute('data-exercise-progress');
 await expect.poll(()=>exercise.getAttribute('data-exercise-progress'),{timeout:20000}).not.toBe(first);
 await exercise.screenshot({path:info.outputPath(`${body}-natural-exercise.png`),timeout:120000});
 expect(errors).toEqual([]);
});
