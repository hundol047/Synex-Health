import {test,expect} from '@playwright/test';
for(const [body,label] of [['female','여성 디테일 모델'],['male','남성 디테일 모델']]){
 test(`detailed ${body} model renders, blinks and persists in exercise demonstrations`,async({page},info)=>{
  test.setTimeout(240000);
  const errors=[],remote=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/shader|WebGLProgram/.test(m.text()))errors.push(m.text());});
  page.on('request',r=>{if(/^https?:/.test(r.url())&&!/^http:\/\/(localhost|127\.0\.0\.1):/.test(r.url()))remote.push(r.url());});
  await page.addInitScript(body=>{localStorage.setItem('synex-personal-onboarding-v1','done');localStorage.setItem('synex-personal-consent-v1','accepted');if(body==='female'&&!sessionStorage.getItem('synex-portrait-qa-complete'))localStorage.setItem('synex-render-quality','high');},body);
  await page.goto('/health/character');let canvas=page.locator('canvas');
  await expect(canvas).toHaveAttribute('data-character-model','custom',{timeout:60000});
  await page.getByRole('button',{name:label,exact:true}).click();
  await expect(canvas).toHaveAttribute('data-character-model','detailed',{timeout:60000});await expect(canvas).toHaveAttribute('data-character-body',body);
  await expect(page.getByLabel('피부색',{exact:true})).toHaveCount(0);await expect(page.getByRole('group',{name:'확대 화면 눈동자 색'})).toHaveCount(0);
  const capture=async name=>{await canvas.evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));await canvas.screenshot({path:info.outputPath(name)});};
  await page.getByRole('button',{name:'정면 운동 시범 보기',exact:true}).click();await capture(`${body}-front.png`);await page.screenshot({path:info.outputPath(`${body}-app.png`)});
  await page.getByLabel('미리보기 동작 구간').fill('777');await expect(canvas).toHaveAttribute('data-exercise-progress','0.777');await capture(`${body}-blink.png`);
  await page.getByRole('button',{name:'전신 보기',exact:true}).click();await page.getByLabel('미리볼 운동',{exact:true}).selectOption('wall_push');await page.getByLabel('미리보기 동작 구간').fill('500');
  await expect(canvas).toHaveAttribute('data-exercise-rendered','wall_push');await expect(canvas).toHaveAttribute('data-exercise-progress','0.5');await page.getByRole('button',{name:'측면 운동 시범 보기',exact:true}).click();await capture(`${body}-wall.png`);
  await page.getByRole('button',{name:'저장하고 운동에 적용',exact:true}).click();
  // Exercise the high-quality portrait shader, then restore automatic GPU
  // detection for the navigation flow (SwiftShader should use the low tier).
  await page.evaluate(()=>{sessionStorage.setItem('synex-portrait-qa-complete','1');localStorage.removeItem('synex-render-quality');});await page.reload();
  await expect(canvas).toHaveAttribute('data-character-model','detailed',{timeout:60000});await expect(canvas).toHaveAttribute('data-character-body',body);
  await page.goto('/health/library');await page.getByLabel('운동·근육 검색').fill('맨몸 스쿼트');await page.getByRole('button',{name:'맨몸 스쿼트 동작 보기',exact:true}).click();
  canvas=page.getByRole('region',{name:'선택한 운동 시범'}).locator('canvas');await expect(canvas).toHaveAttribute('data-character-model','detailed',{timeout:60000});await expect(canvas).toHaveAttribute('data-character-body',body);await capture(`${body}-exercise.png`);
  await page.goto('/health/character');canvas=page.locator('canvas');await expect(canvas).toHaveAttribute('data-character-model','detailed',{timeout:60000});
  await page.getByRole('button',{name:'자유 꾸미기 모델',exact:true}).click();await expect(canvas).toHaveAttribute('data-character-model','custom',{timeout:60000});await expect(page.getByLabel('피부색',{exact:true})).toBeVisible();
  expect(errors).toEqual([]);expect(remote).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 });
}
