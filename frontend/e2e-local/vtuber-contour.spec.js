import {test,expect} from '@playwright/test';
test('refined shoulders, legs and garment panels in standing and squat views',async({page},info)=>{
 test.setTimeout(300000);page.setDefaultTimeout(90000);const errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/shader|WebGLProgram/.test(m.text()))errors.push(m.text());});
 await page.addInitScript(()=>{localStorage.setItem('synex-personal-onboarding-v1','done');localStorage.setItem('synex-personal-consent-v1','accepted');localStorage.setItem('synex-render-quality','medium');localStorage.setItem('synex-exercise-character-v1',JSON.stringify({model:'vtuber',vtuberOutfit:'crop',vtuberHair:'#a98bda',vtuberEyes:'#3d86c9',vtuberTop:'#d680a8',vtuberBottom:'#403454',vtuberChest:1,vtuberHips:1,vtuberGlutes:1}));});
 await page.goto('/health/character');const canvas=page.locator('canvas');await expect(canvas).toHaveAttribute('data-character-surface','smooth',{timeout:90000});
 for(const mode of ['standing','squat']){
  if(mode==='squat'){await page.getByLabel('미리볼 운동').selectOption('squat');await page.getByLabel('미리보기 동작 구간').fill('500');}
  for(const [label,name]of [['정면','front'],['측면','side'],['후면','back']]){
   await page.getByRole('button',{name:label+' 운동 시범 보기',exact:true}).click();await canvas.evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));
   await canvas.screenshot({path:info.outputPath(mode+'-'+name+'.png')});expect(errors).toEqual([]);
  }
 }
});
