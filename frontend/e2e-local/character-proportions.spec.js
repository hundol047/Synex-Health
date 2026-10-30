import {test,expect} from '@playwright/test';
test('hair, eyes and chest settings preview and persist',async({page},info)=>{
 test.setTimeout(180000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/shader|WebGLProgram/.test(m.text()))errors.push(m.text());});
 await page.setViewportSize({width:393,height:852});
 await page.addInitScript(()=>{localStorage.setItem('synex-personal-onboarding-v1','done');localStorage.setItem('synex-personal-consent-v1','accepted');});
 await page.goto('/health/character');await expect(page.locator('canvas')).toHaveAttribute('data-character-style','realistic',{timeout:30000});
 await page.getByRole('button',{name:'여성형',exact:true}).click();await page.getByRole('button',{name:'얼굴 확대',exact:true}).click();await page.getByRole('button',{name:'정면 운동 시범 보기',exact:true}).click();
 await page.getByRole('button',{name:'얼굴·헤어',exact:true}).click();await page.getByLabel('눈 크기',{exact:true}).fill('-1');await page.getByLabel('머리 볼륨',{exact:true}).fill('-1');await page.getByRole('button',{name:'숏 컷',exact:true}).click();
 await page.locator('canvas').scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath('small-eyes-short-hair.png')});
 await page.getByLabel('눈 크기',{exact:true}).fill('1');await page.getByLabel('머리 볼륨',{exact:true}).fill('1');await page.getByRole('button',{name:'묶음 머리',exact:true}).click();
 await page.locator('canvas').scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath('large-eyes-bun.png')});
 await page.getByLabel('미리보기 동작 구간').fill('777');await page.locator('canvas').scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath('large-eyes-blink.png')});
 await page.getByRole('button',{name:'체형',exact:true}).click();await page.getByLabel('가슴 크기',{exact:true}).fill('0.8');await page.getByRole('button',{name:'저장하고 운동에 적용',exact:true}).click();await page.reload();
 await page.getByRole('button',{name:'얼굴·헤어',exact:true}).click();await expect(page.getByLabel('눈 크기',{exact:true})).toHaveValue('1');await expect(page.getByLabel('머리 볼륨',{exact:true})).toHaveValue('1');await expect(page.getByRole('button',{name:'묶음 머리',exact:true})).toHaveAttribute('aria-pressed','true');
 await page.getByRole('button',{name:'체형',exact:true}).click();await expect(page.getByLabel('가슴 크기',{exact:true})).toHaveValue('0.8');expect(errors).toEqual([]);
});
