import {test,expect as baseExpect} from '@playwright/test';
const expect=baseExpect.configure({timeout:90000});
test('full orbit, return to front, portrait orbit and animated surfaces',async({page},info)=>{
 test.setTimeout(480000);page.setDefaultTimeout(90000);const errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/shader|WebGLProgram/.test(m.text()))errors.push(m.text());});
 await page.addInitScript(()=>{localStorage.setItem('synex-personal-onboarding-v1','done');localStorage.setItem('synex-personal-consent-v1','accepted');localStorage.setItem('synex-render-quality','medium');localStorage.setItem('synex-exercise-character-v1',JSON.stringify({model:'vtuber',vtuberOutfit:'crop',vtuberHair:'#a98bda',vtuberEyes:'#3d86c9',vtuberTop:'#d680a8',vtuberBottom:'#403454',vtuberChest:1,vtuberHips:1,vtuberGlutes:1}));});
 await page.goto('/health/character');const canvas=page.locator('canvas');await expect(canvas).toHaveAttribute('data-character-model','vtuber');
 await expect(canvas).toHaveAttribute('data-character-surface','smooth');
 expect(Number(await canvas.getAttribute('data-character-vertices'))).toBeLessThan(100000);
 for(const mode of ['standing','squat','portrait']){
  if(mode==='squat'){await page.getByLabel('미리볼 운동').selectOption('squat');await page.getByLabel('미리보기 동작 구간').fill('500');}
  if(mode==='portrait')await page.getByRole('button',{name:'얼굴 확대',exact:true}).click();
  await page.getByRole('button',{name:'정면 운동 시범 보기',exact:true}).click();
  await canvas.evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));
  const start=await canvas.screenshot({path:info.outputPath(mode+'-000.png')});
  for(let i=1;i<=8;i++){
   await page.getByRole('button',{name:'오른쪽 45도 회전',exact:true}).click();
   await expect(page.getByRole('button',{name:'자유 운동 시범 보기',exact:true})).toHaveAttribute('aria-pressed','true');
   const box=await canvas.boundingBox();expect(box.y).toBeGreaterThan(60);expect(box.y+box.height).toBeLessThan(780);
   const shot=await canvas.screenshot({path:info.outputPath(mode+'-'+String(i*45).padStart(3,'0')+'.png')});
   if(i===4)expect(shot.equals(start)).toBe(false);
   // Eight camera steps must return exactly to the original visible surface.
   if(i===8)expect(shot.equals(start)).toBe(true);
   expect(errors).toEqual([]);
  }
 }
});
