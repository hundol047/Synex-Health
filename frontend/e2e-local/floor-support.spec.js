import {test,expect} from '@playwright/test';
test('cat cow and bird dog render corrected support arms through their motion cycle',async({page},info)=>{
 await page.addInitScript(()=>{localStorage.setItem('synex-personal-onboarding-v1','done');localStorage.setItem('synex-personal-consent-v1','accepted');});
 await page.goto('/health/library');
 const catalog=await page.evaluate(async()=>{const {default:rows}=await import('/src/shared/lib/localCatalog.json');return rows.filter(x=>['cat_cow','bird_dog'].includes(x.motion_id));});
 for(const ex of catalog){
  await page.getByLabel('운동·근육 검색').fill(ex.name);await page.getByRole('button',{name:`${ex.name} 동작 보기`,exact:true}).click();
  const stage=page.getByRole('region',{name:'선택한 운동 시범'}),canvas=stage.locator('canvas');
  await expect(canvas).toHaveAttribute('data-exercise-rendered',ex.motion_id,{timeout:20000});
  await stage.getByRole('button',{name:'처음 자세로',exact:true}).click();
  for(const phase of [0,25,50]){await stage.getByLabel('동작 구간',{exact:true}).fill(String(phase));await expect(canvas).toHaveAttribute('data-exercise-progress',String(phase/100));await expect(canvas).toHaveAttribute('data-exercise-rendered',ex.motion_id);await canvas.evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));expect(await canvas.evaluate(el=>{const r=el.getBoundingClientRect();return [r.top+2,r.bottom-2].every(y=>el.contains(document.elementFromPoint(r.left+r.width/2,y)));})).toBe(true);await canvas.screenshot({path:info.outputPath(`${ex.motion_id}-${phase}.png`)});}
  await stage.getByRole('button',{name:'선택한 운동 시범 닫기'}).click();
 }
});
