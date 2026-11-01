import {test,expect} from '@playwright/test';

test.use({deviceScaleFactor:2});
test('scanned female portrait keeps its original face and saves the same trainer for exercise',async({page},info)=>{
 test.setTimeout(420000);page.setDefaultTimeout(120000);
 const errors=[],external=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error'&&/shader|WebGLProgram/.test(m.text()))errors.push(m.text());});
 page.on('request',r=>{if(/^https?:/.test(r.url())&&!/^http:\/\/(127\.0\.0\.1|localhost):/.test(r.url()))external.push(r.url());});
 await page.addInitScript(()=>{
  localStorage.setItem('synex-personal-onboarding-v1','done');localStorage.setItem('synex-personal-consent-v1','accepted');
  localStorage.setItem('synex-exercise-character-v1',JSON.stringify({model:'detailed',body:'female'}));
  localStorage.setItem('synex-render-quality',sessionStorage.getItem('authored-portrait-done')?'low':'medium');
 });
 await page.goto('/health/character');const portrait=page.locator('canvas');
 await expect(portrait).toHaveAttribute('data-character-source','renderpeople-sophia',{timeout:90000});
 await page.getByRole('button',{name:'얼굴 확대',exact:true}).click();
 await expect(portrait).toHaveAttribute('data-portrait-lighting','softboxes',{timeout:90000});
 for(const [name,file] of [['정면','front'],['45°','45']]){
  await page.getByRole('button',{name:`${name} 운동 시범 보기`,exact:true}).click();
  await portrait.evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));
  await portrait.screenshot({path:info.outputPath(`female-${file}.png`),timeout:120000});
  // The screenshot waits for the presented frame. Query resolution after that
  // fence rather than polling through a long software-GPU command queue.
  expect(await portrait.evaluate(c=>c.width/c.clientWidth)).toBeGreaterThanOrEqual(1.99);
 }
 await page.getByRole('button',{name:'정면 운동 시범 보기',exact:true}).click();
 await page.getByLabel('미리보기 동작 구간').fill('777');
 await portrait.screenshot({path:info.outputPath('female-blink.png'),timeout:120000});
 await page.getByLabel('미리보기 동작 구간').fill('0');
 await page.getByRole('button',{name:'저장하고 운동에 적용',exact:true}).click();
 await expect(page.locator('.character-save').getByRole('status')).toContainText('저장했습니다');
 await page.getByText('캐릭터 에셋 출처',{exact:true}).click();
 await expect(page.getByRole('link',{name:'원본 작품',exact:true})).toHaveAttribute('href',/dc448c3be0e74f96a55fb475a13433cf/);
 await page.evaluate(()=>sessionStorage.setItem('authored-portrait-done','1'));
 await page.goto('/health/library');await page.getByLabel('운동·근육 검색').fill('맨몸 스쿼트');
 await page.getByRole('button',{name:'맨몸 스쿼트 동작 보기',exact:true}).click();
 const canvas=page.getByRole('region',{name:'선택한 운동 시범'}).locator('canvas');
 await expect(canvas).toHaveAttribute('data-character-source','renderpeople-sophia',{timeout:90000});
 await expect(canvas).toHaveAttribute('data-exercise-rendered','squat');
 const first=await canvas.getAttribute('data-exercise-progress');
 await expect.poll(()=>canvas.getAttribute('data-exercise-progress'),{timeout:20000}).not.toBe(first);
 await canvas.evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));
 await canvas.screenshot({path:info.outputPath('female-squat-highlight.png'),timeout:120000});
 expect(errors).toEqual([]);expect(external).toEqual([]);
});
