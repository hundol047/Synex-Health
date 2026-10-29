import {test,expect} from '@playwright/test';
test('realistic head details render on both body profiles without shader errors',async({page},info)=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/shader|WebGLProgram/.test(m.text()))errors.push(m.text());});
 await page.setViewportSize({width:1100,height:1000});await page.addInitScript(()=>{localStorage.setItem('synex-personal-onboarding-v1','done');localStorage.setItem('synex-personal-consent-v1','accepted');});
 await page.goto('/health/character');const canvas=page.locator('canvas');await expect(canvas).toHaveAttribute('data-character-style','realistic',{timeout:30000});
 await page.getByRole('button',{name:'얼굴 확대',exact:true}).click();await page.getByRole('button',{name:'정면 운동 시범 보기',exact:true}).click();
 await canvas.screenshot({path:info.outputPath('realistic-male-front.png')});
 await page.getByRole('button',{name:'여성형',exact:true}).click();await expect(canvas).toHaveAttribute('data-character-body','female');await page.getByRole('button',{name:'얼굴·헤어',exact:true}).click();
 await page.getByLabel('직접 고른 머리색').fill('#49352b');await page.getByRole('button',{name:'부드러운',exact:true}).click();await canvas.screenshot({path:info.outputPath('realistic-female-front.png')});
 for(const name of ['숏 컷','묶음 머리','사이드 파트']){await page.getByRole('button',{name,exact:true}).click();await page.getByRole('button',{name:'45° 운동 시범 보기',exact:true}).click();await canvas.screenshot({path:info.outputPath(name+'.png')});}
 expect(errors).toEqual([]);
});
