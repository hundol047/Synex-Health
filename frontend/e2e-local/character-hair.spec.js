import {test,expect} from '@playwright/test';
test('saved ponytail follows exercise phase and freezes with the paused preview',async({page},info)=>{
 test.setTimeout(180000);const errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/shader|WebGLProgram/.test(m.text()))errors.push(m.text());});
 await page.setViewportSize({width:393,height:852});await page.addInitScript(()=>{localStorage.setItem('synex-personal-onboarding-v1','done');localStorage.setItem('synex-personal-consent-v1','accepted');});
 await page.goto('/health/character');const canvas=page.locator('canvas');await expect(canvas).toHaveAttribute('data-character-style','realistic',{timeout:30000});
 await page.getByRole('button',{name:'얼굴·헤어',exact:true}).click();await page.getByRole('button',{name:'포니테일',exact:true}).click();await page.getByRole('button',{name:'저장하고 운동에 적용',exact:true}).click();
 await page.getByRole('button',{name:'얼굴 확대',exact:true}).click();await page.getByRole('button',{name:'후면 운동 시범 보기',exact:true}).click();await expect(canvas).toHaveAttribute('data-character-hair','ponytail');
 await page.getByLabel('미리보기 동작 구간').fill('250');await expect(canvas).toHaveAttribute('data-exercise-progress','0.25');await canvas.scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath('hair-swing-left.png')});
 await page.getByLabel('미리보기 동작 구간').fill('750');await expect(canvas).toHaveAttribute('data-exercise-progress','0.75');await canvas.scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath('hair-swing-right.png')});
 await page.getByRole('button',{name:'동작 미리보기',exact:true}).click();await page.getByRole('button',{name:'동작 멈추기',exact:true}).click();const paused=await canvas.getAttribute('data-exercise-progress');await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await expect(canvas).toHaveAttribute('data-exercise-progress',paused);
 await page.getByRole('button',{name:'스타일',exact:true}).click();await page.getByRole('button',{name:'애니 · 툰',exact:true}).click();await page.getByRole('button',{name:'저장하고 운동에 적용',exact:true}).click();await expect(canvas).toHaveAttribute('data-character-style','toon');
 await page.goto('/health/library');await page.getByLabel('운동·근육 검색').fill('맨몸 스쿼트');await page.getByRole('button',{name:'맨몸 스쿼트 동작 보기',exact:true}).click();const demo=page.getByRole('region',{name:'선택한 운동 시범'}).locator('canvas');await expect(demo).toHaveAttribute('data-character-hair','ponytail',{timeout:30000});await expect(demo).toHaveAttribute('data-character-style','toon');expect(errors).toEqual([]);
});
