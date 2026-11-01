import {test,expect} from '@playwright/test';
import catalog from '../src/shared/lib/localCatalog.json' with {type:'json'};

for(const body of ['female','male'])test(`${body} trainer plays the same character in bodyweight and gym demonstrations`,async({page},info)=>{
 test.setTimeout(240000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error'&&/shader|WebGLProgram/.test(m.text()))errors.push(m.text());});
 await page.addInitScript(body=>{
  localStorage.setItem('synex-personal-onboarding-v1','done');localStorage.setItem('synex-personal-consent-v1','accepted');
  localStorage.setItem('synex-exercise-character-v1',JSON.stringify({model:'detailed',body}));
 },body);
 await page.goto('/health/character');
 const canvas=page.locator('canvas'),select=page.getByLabel('미리볼 운동',{exact:true});
 await expect(canvas).toHaveAttribute('data-character-face','authored-trainer',{timeout:60000});
 await expect(select.locator('option')).toHaveCount(catalog.length);
 // Running playback must update the rendered frame, not only the slider/label.
 await select.selectOption('squat');await page.getByRole('button',{name:'동작 미리보기',exact:true}).click();
 const first=await canvas.getAttribute('data-exercise-progress');
 await expect.poll(()=>canvas.getAttribute('data-exercise-progress')).not.toBe(first);
 await page.getByRole('button',{name:'동작 멈추기',exact:true}).click();
 for(const motion of ['squat','full_pushup','curl','dumbbell_bench_press','lat_pulldown']){
  await select.selectOption(motion);
  await page.getByLabel('미리보기 동작 구간').fill('500');
  await page.getByRole('button',{name:motion==='full_pushup'?'측면 운동 시범 보기':'45° 운동 시범 보기',exact:true}).click();
  await expect(canvas).toHaveAttribute('data-exercise-rendered',motion);await expect(canvas).toHaveAttribute('data-exercise-progress','0.5');
  await expect(canvas).toHaveAttribute('data-character-body',body);
  await canvas.scrollIntoViewIfNeeded();await canvas.screenshot({path:info.outputPath(`${body}-${motion}.png`)});
 }
 await page.getByRole('button',{name:'얼굴 확대',exact:true}).click();
 await page.getByRole('button',{name:'정면 운동 시범 보기',exact:true}).click();
 await expect(canvas).toHaveAttribute('data-character-face','authored-trainer');
 await canvas.screenshot({path:info.outputPath(`${body}-front.png`)});
 expect(errors).toEqual([]);
});
