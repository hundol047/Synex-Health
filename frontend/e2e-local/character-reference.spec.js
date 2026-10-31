import {test,expect} from '@playwright/test';
for(const [body,label,hair] of [['female','여성 · 포니테일','ponytail'],['male','남성 · 내추럴 쇼트','wavy']]){
 test(`studio ${body} preset renders, persists and moves`,async({page},info)=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/shader|WebGLProgram/.test(m.text()))errors.push(m.text());});
  await page.addInitScript(()=>{localStorage.setItem('synex-personal-onboarding-v1','done');localStorage.setItem('synex-personal-consent-v1','accepted');});
  await page.goto('/health/character');const canvas=page.locator('canvas');
  await expect(canvas).toHaveAttribute('data-character-style','realistic',{timeout:60000});
  await page.getByRole('button',{name:label,exact:true}).click();
  await expect(canvas).toHaveAttribute('data-character-body',body);await expect(canvas).toHaveAttribute('data-character-hair',hair);
  await expect(canvas).toHaveAttribute('data-exercise-rendered','shoulder_roll');
  const capture=async name=>{await canvas.evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));await canvas.screenshot({path:info.outputPath(name)});};
  await page.getByRole('button',{name:'정면 운동 시범 보기',exact:true}).click();await capture(`${body}-full.png`);
  await page.getByRole('button',{name:'얼굴 확대',exact:true}).click();await capture(`${body}-portrait.png`);
  await page.getByRole('button',{name:'45° 운동 시범 보기',exact:true}).click();await capture(`${body}-oblique.png`);
  await page.getByRole('button',{name:'저장하고 운동에 적용',exact:true}).click();
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('synex-exercise-character-v1')));
  expect(saved.face).toBe('studio');expect(saved.body).toBe(body);expect(saved.hairStyle).toBe(hair);
  await page.reload();await expect(canvas).toHaveAttribute('data-character-body',body,{timeout:60000});await expect(canvas).toHaveAttribute('data-character-hair',hair);
  await page.getByRole('button',{name:'얼굴 확대',exact:true}).click();await page.getByLabel('미리보기 동작 구간').fill('777');
  await expect(canvas).toHaveAttribute('data-exercise-progress','0.777');await capture(`${body}-blink.png`);
  await page.getByRole('button',{name:'전신 보기',exact:true}).click();await page.getByLabel('미리볼 운동',{exact:true}).selectOption('wall_push');
  await page.getByLabel('미리보기 동작 구간').fill('500');await expect(canvas).toHaveAttribute('data-exercise-rendered','wall_push');await expect(canvas).toHaveAttribute('data-exercise-progress','0.5');
  await page.getByRole('button',{name:'측면 운동 시범 보기',exact:true}).click();await capture(`${body}-wall.png`);
  expect(errors).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 });
}
