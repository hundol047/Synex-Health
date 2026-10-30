import {test,expect} from '@playwright/test';
test('custom character persists and is shared with exercise demonstrations',async({page},info)=>{
 // This flow captures multiple software-WebGL outfit and portrait views.
 test.setTimeout(240000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/shader|WebGLProgram/.test(m.text()))errors.push(m.text());});
 await page.setViewportSize({width:393,height:852});
 await page.addInitScript(()=>{localStorage.setItem('synex-personal-onboarding-v1','done');localStorage.setItem('synex-personal-consent-v1','accepted');});
 await page.goto('/health/character');
 await expect(page.locator('canvas')).toHaveAttribute('data-character-style','realistic',{timeout:30000});
 await page.getByRole('button',{name:'여성형',exact:true}).click();await page.getByRole('button',{name:'애니 · 툰',exact:true}).click();
 await expect(page.locator('canvas')).toHaveAttribute('data-character-style','toon');
 await page.getByRole('button',{name:'얼굴·헤어',exact:true}).click();await page.getByLabel('직접 고른 머리색').fill('#b883c7');await page.getByRole('button',{name:'갸름한',exact:true}).click();
 await page.getByRole('button',{name:'체형',exact:true}).click();await page.getByLabel('가슴 크기',{exact:true}).fill('0.5');
 await page.getByRole('button',{name:'저장하고 운동에 적용',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'저장했습니다'})).toContainText('저장했습니다');
 await page.getByRole('button',{name:'운동복',exact:true}).click();for(const name of ['반팔 티','긴팔 탑','민소매','레깅스','조거 팬츠']){await page.getByRole('button',{name,exact:true}).click();await page.locator('canvas').screenshot({path:info.outputPath('outfit-'+name+'.png')});}await page.getByRole('button',{name:'운동 반바지',exact:true}).click();await page.getByRole('button',{name:'저장하고 운동에 적용',exact:true}).click();
 await page.reload();await expect(page.locator('canvas')).toHaveAttribute('data-character-style','toon',{timeout:30000});await expect(page.locator('canvas')).toHaveAttribute('data-character-body','female');
 await page.locator('canvas').scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath('character-studio.png')});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.getByRole('button',{name:'얼굴 확대',exact:true}).click();await page.locator('canvas').screenshot({path:info.outputPath('character-face.png')});await page.getByRole('button',{name:'입체 운동복',exact:true}).click();await page.locator('canvas').screenshot({path:info.outputPath('character-face-realistic.png')});await page.getByRole('button',{name:'애니 · 툰',exact:true}).click();
 await page.goto('/health/library');await page.getByLabel('운동·근육 검색').fill('맨몸 스쿼트');await page.getByRole('button',{name:'맨몸 스쿼트 동작 보기',exact:true}).click();
 await expect(page.getByRole('region',{name:'선택한 운동 시범'}).locator('canvas')).toHaveAttribute('data-character-style','toon',{timeout:30000});expect(errors).toEqual([]);
});
