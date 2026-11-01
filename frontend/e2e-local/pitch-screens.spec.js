import {test,expect} from '@playwright/test';
test.use({deviceScaleFactor:2});
const expectReady = expect.configure({timeout:90000});
test('capture current product screens with explicit fictional demonstration values',async({page},info)=>{
 test.setTimeout(360000);page.setDefaultTimeout(90000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  localStorage.setItem('synex-personal-onboarding-v1','done');localStorage.setItem('synex-personal-consent-v1','accepted');localStorage.setItem('synex-render-quality','low');localStorage.setItem('synex-exercise-character-v1',JSON.stringify({model:'detailed',body:'female'}));
 });
 await page.goto('/health/profile');await page.getByLabel('이름',{exact:true}).fill('체험 사용자');await page.getByLabel('인체 모형 성별').selectOption('female');await page.getByLabel('생년월일').fill('2004-01-01');await page.getByRole('button',{name:'저장하기',exact:true}).click();await expect(page.getByText('저장되었습니다.',{exact:true})).toBeVisible();
 for(const [label,value] of [['체중 (kg)','58'],['키 (cm)','168'],['골격근량 (kg)','23'],['체지방률 (%)','25']])await page.getByLabel(label,{exact:true}).first().fill(value);
 await page.getByRole('button',{name:'측정값 저장',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'측정값을 저장했습니다.'})).toBeVisible();
 await page.goto('/health/routine');await page.getByRole('button',{name:'내 운동 계획 만들기',exact:true}).click();await page.getByRole('button',{name:'이 조건으로 루틴 생성',exact:true}).click();await expect(page.getByRole('link',{name:'1일차 루틴 시작',exact:true})).toBeVisible();await page.getByRole('link',{name:'1일차 루틴 시작',exact:true}).evaluate(el=>{scrollTo(0,el.getBoundingClientRect().top+scrollY-95);});await page.screenshot({path:info.outputPath('routine.png')});
 await page.goto('/health');await expect(page.getByRole('link',{name:'맨몸·헬스장 카메라 코치'})).toBeVisible();await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:info.outputPath('home.png')});
 await page.goto('/health/body');await expect(page.locator('[data-mannequin]')).toBeVisible();await page.waitForFunction(()=>{try{return JSON.parse(document.querySelector('[data-mannequin]').dataset.mannequin).layers.length===2;}catch{return false;}});
 await page.locator('.mannequin-scene').first().evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));await page.screenshot({path:info.outputPath('body.png')});
 await page.goto('/health/pose?motion=squat');const canvas=page.locator('.coach-example canvas');await expectReady(canvas).toHaveAttribute('data-character-source','renderpeople-sophia');await expectReady(canvas).toHaveAttribute('data-exercise-rendered','squat');await expect(page.getByRole('button',{name:'동영상 촬영',exact:true})).toBeVisible();await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:info.outputPath('coach.png')});
 await page.goto('/health/library');await page.getByLabel('운동·근육 검색').fill('맨몸 스쿼트');await page.getByRole('button',{name:'맨몸 스쿼트 동작 보기',exact:true}).click();await expectReady(page.getByRole('region',{name:'선택한 운동 시범'}).locator('canvas')).toHaveAttribute('data-character-source','renderpeople-sophia');await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:info.outputPath('library.png')});
 expect(errors).toEqual([]);
});
