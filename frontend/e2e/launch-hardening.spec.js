import {test,expect} from '@playwright/test';

test('mobile catalog separates bodyweight/gym, filters equipment, and opens a machine guide',async({page},info)=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>localStorage.setItem('synex-onboarding-v1','done'));
 await page.setViewportSize({width:390,height:844});await page.goto('/health/library');
 await expect(page.getByRole('heading',{name:'운동 라이브러리 · 74개'})).toBeVisible();
 await page.getByRole('button',{name:'맨몸운동 42'}).click();
 await expect(page.locator('.exercise-card').first()).toContainText('맨몸운동');
 await page.getByRole('button',{name:'헬스장 운동 32'}).click();
 await page.getByLabel('이용할 기구').selectOption('leg_press_machine');
 await expect(page.locator('.exercise-card')).toHaveCount(1);
 await page.getByRole('button',{name:'레그 프레스 동작 보기'}).click();
 await expect(page.getByRole('heading',{name:'준비부터 마무리까지'})).toBeVisible();
 await expect(page.locator('canvas')).toHaveAttribute('data-exercise-rendered','leg_press');
 await expect(page.getByRole('button',{name:'동작 재생',exact:true})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:info.outputPath('gym-library-390.png'),fullPage:true});expect(errors).toEqual([]);
});

test('encrypted pending workout survives a closed page and syncs once after reconnect',async({page,context},info)=>{
 await context.addInitScript(()=>localStorage.setItem('synex-onboarding-v1','done'));
 // Clear previous test feedback through an explicit new profile/routine identity for this scenario.
 await page.goto('/health/workout');
 const routines=await(await page.request.get('/api/exercise-routines')).json();
 const routine=routines[0],ex=routine.exercises.find(e=>e.day_number===1);
 // Use a unique exercise slot in the existing routine; test server revisions are intentionally preserved.
 const logs=await(await page.request.get('/api/workouts')).json();
 for(const w of logs.filter(w=>w.routine_id===routine.id&&w.routine_exercise_id===ex.exercise_id))await page.request.delete(`/api/workouts/${w.id}`);
 await page.reload();await expect(page.getByRole('button',{name:/운동 따라하기/})).toBeVisible();
 await context.route('**/api/workouts',route=>route.request().method()==='POST'?route.abort('internetdisconnected'):route.continue());
 await page.getByRole('button',{name:/운동 따라하기/}).click();
 await page.getByLabel('이번 세트 반복 횟수',{exact:true}).fill('9');
 await page.getByLabel('이번 세트 중량 kg',{exact:true}).fill('15');
 for(let n=0;n<(ex.sets||1);n++){
  await page.getByRole('button',{name:'세트 완료',exact:true}).click();
  const skip=page.getByRole('button',{name:'휴식 건너뛰기'});if(await skip.isVisible())await skip.click();
 }
 await page.getByRole('button',{name:'완료 기록 · 다음 운동',exact:true}).click();
 await expect(page.getByRole('heading',{name:'기기 보관 기록 1건'})).toBeVisible();
 await page.close();const reopened=await context.newPage();await reopened.goto('/health/workout');
 await expect(reopened.getByRole('heading',{name:'기기 보관 기록 1건'})).toBeVisible();
 await reopened.screenshot({path:info.outputPath('pending-after-reopen.png'),fullPage:true});
 await context.unroute('**/api/workouts');await reopened.getByRole('button',{name:'기록 전송',exact:true}).click();
 await expect(reopened.getByRole('heading',{name:'기기 보관 기록 1건'})).toHaveCount(0);
 const saved=await(await reopened.request.get('/api/workouts')).json();
 const matches=saved.filter(w=>w.routine_id===routine.id&&w.routine_exercise_id===ex.exercise_id);
 expect(matches).toHaveLength(1);expect(matches[0].reps_completed).toBe('9');expect(matches[0].revision).toBe(1);expect(matches[0].set_records[0]).toMatchObject({weight_kg:15,reps:9});
});
