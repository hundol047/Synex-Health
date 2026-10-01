import {test,expect} from '@playwright/test';
test('mobile replacement, set recording and weekly progress round trip',async({page},info)=>{
 await page.addInitScript(()=>localStorage.setItem('synex-onboarding-v1','done'));
 await page.setViewportSize({width:390,height:844});await page.goto('/health/routine');
 const logs=await(await page.request.get('/api/workouts')).json();
 for(const w of logs)await page.request.delete(`/api/workouts/${w.id}`);
 const generated=await page.request.post('/api/exercise-routines/generate',{data:{}});expect(generated.ok()).toBeTruthy();
 const old=await generated.json();let selected;
 for(const e of old.exercises){const r=await page.request.get(`/api/exercise-routines/${old.id}/alternatives/${e.exercise_id}`);if((await r.json()).length){selected=e;break;}}
 expect(selected).toBeTruthy();await page.reload();
 const card=page.locator(`[id="${selected.exercise_id}"]`);
 await card.getByRole('button',{name:'이 운동 교체하기'}).click();
 const options=card.getByLabel('대체 운동');await expect(options.locator('option')).not.toHaveCount(1);
 const choice=await options.locator('option').nth(1).getAttribute('value');await options.selectOption(choice);
 await card.getByRole('button',{name:'선택한 운동으로 교체'}).click();
 await expect(page.locator(`[id="d${selected.day_number}-${choice}"]`)).toBeVisible();
 await page.goto('/health/workout');const exercise=page.locator('.exercise-card').filter({has:page.getByRole('button',{name:'세트 추가',exact:true})}).first();
 await exercise.getByRole('button',{name:'세트 추가',exact:true}).click();
 await exercise.getByLabel('1세트 중량 kg',{exact:true}).fill('20');await exercise.getByLabel('1세트 횟수',{exact:true}).fill('12');
 await exercise.getByRole('button',{name:'완료 기록',exact:true}).click();await expect(exercise.getByText('오늘 완료',{exact:true})).toBeVisible();
 await page.reload();await expect(page.getByLabel('1세트 중량 kg',{exact:true})).toHaveValue('20');
 const overflow=await page.evaluate(()=>[...document.querySelectorAll('body *')].filter(e=>e.getBoundingClientRect().right>innerWidth+1).map(e=>({tag:e.tagName,cls:e.className,right:e.getBoundingClientRect().right,text:e.textContent.slice(0,60)})).slice(-20));
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),JSON.stringify(overflow)).toBe(true);
 await page.screenshot({path:info.outputPath('sets-mobile.png'),fullPage:true});
 await page.goto('/health/progress');await expect(page.getByRole('heading',{name:'운동 성장 기록'})).toBeVisible();
 await expect(page.getByRole('table',{name:'주간 활동과 기록된 외부 중량 운동량'})).toContainText('240 kg·회');
 await page.screenshot({path:info.outputPath('training-progress-mobile.png'),fullPage:true});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
