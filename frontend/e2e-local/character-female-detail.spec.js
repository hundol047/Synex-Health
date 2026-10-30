import {test,expect} from '@playwright/test';

test('authored female preset persists, switches hair, and follows the exercise scene',async({page},info)=>{
 test.setTimeout(240000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/shader|WebGLProgram/.test(m.text()))errors.push(m.text());});
 await page.addInitScript(()=>{localStorage.setItem('synex-personal-onboarding-v1','done');localStorage.setItem('synex-personal-consent-v1','accepted');});
 await page.goto('/health/character');const canvas=page.locator('canvas');
 const capture=async name=>{await canvas.evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));return canvas.screenshot({path:info.outputPath(name)});};
 await expect(canvas).toHaveAttribute('data-character-style','realistic',{timeout:30000});
 const skin=await page.getByLabel('피부색',{exact:true}).inputValue();
 await page.getByRole('button',{name:'여성 캐릭터 프리셋',exact:true}).click();
 await expect(canvas).toHaveAttribute('data-character-hair','sleek');await expect(canvas).toHaveAttribute('data-character-body','female');
 await expect(page.getByLabel('피부색',{exact:true})).toHaveValue(skin);
 await page.getByRole('button',{name:'정면 운동 시범 보기',exact:true}).click();
 await canvas.evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));
 await page.screenshot({path:info.outputPath('female-app.png')});const firstPortrait=await capture('female-front.png');
 await page.getByRole('button',{name:'저장하고 운동에 적용',exact:true}).click();await page.reload();
 await expect(canvas).toHaveAttribute('data-character-hair','sleek',{timeout:30000});await expect(canvas).toHaveAttribute('data-character-body','female');
 await page.getByRole('button',{name:'얼굴 확대',exact:true}).click();await page.getByRole('button',{name:'정면 운동 시범 보기',exact:true}).click();
 const restoredPortrait=await capture('female-restored-front.png');
 // Check actual forehead pixels as well as the saved color. TextureLoader
 // eagerly uploads inactive atlases too; switching body must preserve sRGB.
 const colorDifference=await page.evaluate(async({first,restored})=>{
  const sample=async data=>{const img=new Image();img.src='data:image/png;base64,'+data;await img.decode();const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const ctx=c.getContext('2d');ctx.drawImage(img,0,0);const p=ctx.getImageData(0,0,c.width,c.height).data,mean=[0,0,0];let n=0;
   for(let y=Math.floor(c.height*.35);y<c.height*.40;y++)for(let x=Math.floor(c.width*.44);x<c.width*.56;x++){const i=(y*c.width+x)*4;for(let k=0;k<3;k++)mean[k]+=p[i+k];n++;}return mean.map(v=>v/n);};
  const a=await sample(first),b=await sample(restored);return {first:a,restored:b,max:Math.max(...a.map((v,i)=>Math.abs(v-b[i])))};
 },{first:firstPortrait.toString('base64'),restored:restoredPortrait.toString('base64')});
 await info.attach('portrait-color-after-reload',{body:JSON.stringify(colorDifference),contentType:'application/json'});
 expect(colorDifference.max).toBeLessThan(5);
 await page.getByLabel('미리보기 동작 구간').fill('777');await expect(canvas).toHaveAttribute('data-exercise-progress','0.777');await capture('female-blink.png');
 await page.getByLabel('미리보기 동작 구간').fill('0');await page.getByRole('button',{name:'얼굴·헤어',exact:true}).click();
 await page.getByRole('button',{name:'클래식 단발',exact:true}).click();await expect(canvas).toHaveAttribute('data-character-hair','bob');await capture('female-bob.png');
 await page.getByRole('button',{name:'레이어드 미디엄',exact:true}).click();await expect(canvas).toHaveAttribute('data-character-hair','sleek');
 await page.getByRole('button',{name:'전신 보기',exact:true}).click();await page.getByLabel('미리볼 운동',{exact:true}).selectOption('wall_push');
 await page.getByLabel('미리보기 동작 구간').fill('500');await expect(canvas).toHaveAttribute('data-exercise-rendered','wall_push');await expect(canvas).toHaveAttribute('data-exercise-progress','0.5');
 await page.getByRole('button',{name:'측면 운동 시범 보기',exact:true}).click();await capture('female-wall-push.png');
 expect(errors).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
