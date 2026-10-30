import {test,expect} from '@playwright/test';

test('authored female preset persists, switches hair, and follows the exercise scene',async({page},info)=>{
 test.setTimeout(240000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/shader|WebGLProgram/.test(m.text()))errors.push(m.text());});
 await page.addInitScript(()=>{localStorage.setItem('synex-personal-onboarding-v1','done');localStorage.setItem('synex-personal-consent-v1','accepted');});
 await page.goto('/health/character');const canvas=page.locator('canvas');
 const capture=async name=>{await canvas.evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));await canvas.screenshot({path:info.outputPath(name)});};
 await expect(canvas).toHaveAttribute('data-character-style','realistic',{timeout:30000});
 const skin=await page.getByLabel('피부색',{exact:true}).inputValue();
 await page.getByRole('button',{name:'여성 캐릭터 프리셋',exact:true}).click();
 await expect(canvas).toHaveAttribute('data-character-hair','pixie');await expect(canvas).toHaveAttribute('data-character-body','female');
 await expect(page.getByLabel('피부색',{exact:true})).toHaveValue(skin);
 await page.getByRole('button',{name:'정면 운동 시범 보기',exact:true}).click();
 await canvas.evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));
 await page.screenshot({path:info.outputPath('female-app.png')});await capture('female-front.png');
 await page.getByRole('button',{name:'저장하고 운동에 적용',exact:true}).click();await page.reload();
 await expect(canvas).toHaveAttribute('data-character-hair','pixie',{timeout:30000});await expect(canvas).toHaveAttribute('data-character-body','female');
 await page.getByRole('button',{name:'얼굴 확대',exact:true}).click();await page.getByRole('button',{name:'정면 운동 시범 보기',exact:true}).click();
 await page.getByLabel('미리보기 동작 구간').fill('777');await expect(canvas).toHaveAttribute('data-exercise-progress','0.777');await capture('female-blink.png');
 await page.getByLabel('미리보기 동작 구간').fill('0');await page.getByRole('button',{name:'얼굴·헤어',exact:true}).click();
 await page.getByRole('button',{name:'클래식 단발',exact:true}).click();await expect(canvas).toHaveAttribute('data-character-hair','bob');await capture('female-bob.png');
 await page.getByRole('button',{name:'사이드 뱅 숏',exact:true}).click();await expect(canvas).toHaveAttribute('data-character-hair','pixie');
 await page.getByRole('button',{name:'전신 보기',exact:true}).click();await page.getByLabel('미리볼 운동',{exact:true}).selectOption('wall_push');
 await page.getByLabel('미리보기 동작 구간').fill('500');await expect(canvas).toHaveAttribute('data-exercise-rendered','wall_push');await expect(canvas).toHaveAttribute('data-exercise-progress','0.5');
 await page.getByRole('button',{name:'측면 운동 시범 보기',exact:true}).click();await capture('female-wall-push.png');
 expect(errors).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
