import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
const catalogue=JSON.parse(readFileSync(new URL('../src/shared/lib/localCatalog.json',import.meta.url),'utf8'));

test.beforeEach(async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('synex-personal-onboarding-v1','done'));
});

test('catalogue keeps static previews and one large selected 3D stage on a small phone',async({page},info)=>{
 const errors=[],apiRequests=[];
 page.on('pageerror',error=>errors.push(error.message));
 page.on('request',request=>{if(new URL(request.url()).pathname.startsWith('/api/'))apiRequests.push(request.url());});
 await page.setViewportSize({width:360,height:640});
 await page.goto('/health/library');
 await expect(page.getByRole('heading',{name:'운동 라이브러리 · 74개'})).toBeVisible();
 await expect(page.getByTestId('exercise-preview')).toHaveCount(12);
 await expect(page.getByTestId('exercise-preview').locator('img')).toHaveCount(12);
 await expect.poll(async()=>page.getByTestId('exercise-preview').first().locator('img').evaluate(image=>image.complete&&image.naturalWidth>0)).toBe(true);
 await expect(page.locator('canvas')).toHaveCount(0);
 await page.getByRole('button',{name:'헬스장 운동 32'}).click();
 await page.getByLabel('이용할 기구').selectOption('leg_press_machine');
 await expect(page.locator('.exercise-card')).toHaveCount(1);
 await page.getByRole('button',{name:'레그 프레스 동작 보기',exact:true}).click();
 const stage=page.getByRole('region',{name:'선택한 운동 시범'});
 await expect(stage.locator('canvas')).toBeVisible();
 await expect(stage.locator('canvas')).toHaveAttribute('data-exercise-rendered','leg_press');
 await expect.poll(async()=>Number(await stage.locator('canvas').getAttribute('data-exercise-vertices'))).toBeGreaterThan(10000);
 await expect(page.locator('canvas')).toHaveCount(1);
 await expect(page.locator('.health-bottom-nav')).toBeHidden();
 await expect(page.getByRole('button',{name:'운동 목록으로 돌아가기',exact:true})).toBeInViewport();
 await expect.poll(async()=>(await stage.locator('canvas').boundingBox()).height).toBeGreaterThanOrEqual(350);
 await expect(stage.getByRole('button',{name:'동작 재생',exact:true})).toBeVisible();
 await stage.getByRole('button',{name:'골반·무릎 확인 구간 보기'}).click();
 await expect(stage.getByLabel('동작 구간',{exact:true})).toHaveValue('43');
 await expect(stage.getByRole('button',{name:'골반·무릎 확인 구간 보기'})).toHaveAttribute('aria-current','step');
 await stage.getByRole('button',{name:'좌우 반전',exact:true}).click();
 await expect(stage.getByRole('button',{name:'좌우 반전',exact:true})).toHaveAttribute('aria-pressed','true');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:info.outputPath('exercise-library-machine-360.png'),fullPage:true});
 await stage.locator('.motion-note').scrollIntoViewIfNeeded();
 await expect(stage.getByRole('button',{name:'선택한 운동 시범 닫기'})).toBeInViewport();
 await stage.getByRole('button',{name:'선택한 운동 시범 닫기'}).click();
 await expect(page.locator('canvas')).toHaveCount(0);
 await expect(page.locator('.health-bottom-nav')).toBeVisible();
 expect(apiRequests).toEqual([]);
 expect(errors).toEqual([]);
});

test('Escape and route changes restore the mobile navigation after focusing a guide',async({page})=>{
 await page.goto('/health/library');
 await page.getByLabel('운동·근육 검색').fill('맨몸 스쿼트');
 await page.getByRole('button',{name:'맨몸 스쿼트 동작 보기',exact:true}).click();
 await expect(page.locator('.health-bottom-nav')).toBeHidden();
 await page.keyboard.press('Escape');
 await expect(page.locator('.health-bottom-nav')).toBeVisible();
 await expect(page.getByRole('region',{name:'선택한 운동 시범'})).toHaveCount(0);
 await page.getByRole('button',{name:'맨몸 스쿼트 동작 보기',exact:true}).click();
 await page.getByRole('link',{name:'내 운동 방식·장비 설정하기'}).click();
 await expect(page.locator('.health-bottom-nav')).toBeVisible();
 await expect(page.locator('body')).not.toHaveClass(/exercise-library-focus/);
});

test('changing the selected exercise resets the stage and keeps directions and playback available',async({page})=>{
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/health/library');
 await page.getByLabel('운동·근육 검색').fill('맨몸 스쿼트');
 await page.getByRole('button',{name:'맨몸 스쿼트 동작 보기',exact:true}).click();
 let stage=page.getByRole('region',{name:'선택한 운동 시범'});
 await expect(stage.locator('canvas')).toBeVisible();
 await stage.getByLabel('동작 구간',{exact:true}).fill('70');
 await stage.getByLabel('재생 속도').selectOption('0.5');
 await stage.getByRole('button',{name:'동작 재생',exact:true}).click();
 await expect(stage.getByRole('button',{name:'일시정지',exact:true})).toBeVisible();
 await page.getByLabel('운동·근육 검색').fill('레그 프레스');
 await expect(page.locator('canvas')).toHaveCount(0);
 await page.getByRole('button',{name:'레그 프레스 동작 보기',exact:true}).click();
 stage=page.getByRole('region',{name:'선택한 운동 시범'});
 await expect(stage.locator('canvas')).toBeVisible();
 await expect(stage.getByLabel('동작 구간',{exact:true})).toHaveValue('0');
 await expect(stage.getByRole('button',{name:'동작 재생',exact:true})).toBeVisible();
 for(const name of ['정면 운동 시범 보기','측면 운동 시범 보기','후면 운동 시범 보기']){
  await stage.getByRole('button',{name,exact:true}).click();
  await expect(stage.getByRole('button',{name,exact:true})).toHaveAttribute('aria-pressed','true');
 }
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 expect(errors).toEqual([]);
});

test('camera filter offers exactly the seven supported bodyweight variants',async({page})=>{
 await page.goto('/health/library');
 await page.getByLabel('맨몸 카메라 코칭 지원 운동만 보기').check();
 await expect(page.locator('.exercise-card')).toHaveCount(7);
 for(const id of ['squat','lunge','side_lunge','full_pushup','plank','hinge','bridge']){
  const name=catalogue.find(exercise=>exercise.motion_id===id).name;
  await expect(page.getByRole('button',{name:`${name} 동작 보기`,exact:true})).toHaveCount(1);
 }
 await expect(page.getByRole('button',{name:'무릎 푸시업 동작 보기',exact:true})).toHaveCount(0);
 await expect(page.locator('canvas')).toHaveCount(0);
});

test('supported library movement opens the matching camera guide with an explicit start',async({page})=>{
 await page.addInitScript(()=>{
  window.__cameraRequests=0;
  Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:async()=>{window.__cameraRequests++;throw new DOMException('denied','NotAllowedError');}}});
 });
 await page.goto('/health/library');
 await page.getByLabel('운동·근육 검색').fill('맨몸 힙 힌지');
 await page.getByRole('button',{name:'맨몸 힙 힌지 동작 보기',exact:true}).click();
 await page.getByRole('link',{name:'이 동작 카메라 코칭',exact:true}).click();
 await expect(page.getByRole('heading',{name:'맨몸운동 코칭'})).toBeVisible();
 await expect(page.getByLabel('따라 할 운동')).toHaveValue('hip_hinge');
 await expect(page.getByRole('button',{name:'코칭 시작',exact:true})).toBeVisible();
 expect(await page.evaluate(()=>window.__cameraRequests)).toBe(0);
 await expect(page.locator('body')).not.toHaveClass(/exercise-library-focus/);
});
