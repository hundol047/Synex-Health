import {test, expect} from '@playwright/test';

async function prepareRoutine(page) {
 await page.addInitScript(()=>localStorage.setItem('synex-personal-onboarding-v1','done'));
 await page.goto('/health');
 await expect(page.getByText('내 기록은 이 기기에')).toBeVisible();
 await page.goto('/health/profile');
 await page.getByLabel('체중 (kg)',{exact:true}).fill('60');
 await page.getByLabel('키 (cm)',{exact:true}).first().fill('165');
 await page.getByLabel('골격근량 (kg)',{exact:true}).fill('24');
 await page.getByLabel('체지방률 (%)',{exact:true}).fill('25');
 await page.getByRole('button',{name:'측정값 저장',exact:true}).click();
 await expect(page.getByText('측정값을 저장했습니다.')).toBeVisible();
 await page.goto('/health/routine');
 await page.getByRole('button',{name:'오늘의 루틴 시작하기'}).click();
 await expect(page.getByText('이 폰에서 생성한 기본 운동 계획입니다.',{exact:false})).toBeVisible();
 await page.goto('/health/workout');
}

async function expectAlignedFeedback(scope) {
 const rpe=scope.getByLabel('운동 힘듦 (RPE 1–10)',{exact:true});
 const pain=scope.getByLabel('통증 (0–10)',{exact:true});
 await expect(rpe).toBeVisible();
 await expect(pain).toBeVisible();
 const [effortBox,painBox]=await Promise.all([rpe.boundingBox(),pain.boundingBox()]);
 expect(effortBox.x).toBeLessThan(painBox.x);
 expect(Math.abs(effortBox.y-painBox.y)).toBeLessThan(1);
 expect(Math.abs(effortBox.width-painBox.width)).toBeLessThan(1);
 expect(Math.abs(effortBox.height-painBox.height)).toBeLessThan(1);
 expect(effortBox.height).toBeGreaterThanOrEqual(44);
 return {rpe,pain};
}

for(const width of [360,393])test(`${width}px effort and pain stay aligned and persist in manual/guided records`,async({page},testInfo)=>{
 await page.setViewportSize({width,height:852});
 const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await prepareRoutine(page);
 const form=page.locator('.workout-record-form').first();
 await expect(form.getByRole('button',{name:'세트 추가',exact:true})).toBeEnabled();
 const manual=await expectAlignedFeedback(form);
 await expect(form.locator('.record-extra')).not.toHaveAttribute('open');
 await form.screenshot({path:testInfo.outputPath(`manual-feedback-${width}.png`)});
 await form.getByRole('button',{name:'세트 추가',exact:true}).click();
 const weight=form.getByLabel('1세트 중량 kg'),reps=form.getByLabel('1세트 횟수');
 const [weightBox,repsBox]=await Promise.all([weight.boundingBox(),reps.boundingBox()]);
 expect(weightBox.x).toBeLessThan(repsBox.x);
 expect(Math.abs(weightBox.y-repsBox.y)).toBeLessThan(1);
 expect(Math.abs(weightBox.width-repsBox.width)).toBeLessThan(1);
 expect(weightBox.height).toBeGreaterThanOrEqual(44);
 await weight.fill('10');await reps.fill('8');await manual.rpe.fill('6');
 await form.getByRole('button',{name:'완료 기록',exact:true}).click();
 await expect(form.getByText('완료 기록을 저장했습니다.',{exact:true})).toBeVisible();
 await page.reload();
 await expect(form.getByLabel('운동 힘듦 (RPE 1–10)',{exact:true})).toHaveValue('6');
 await expect(form.getByLabel('통증 (0–10)',{exact:true})).toHaveValue('0');
 await expect(form.getByLabel('1세트 중량 kg')).toHaveValue('10');
 await page.getByRole('button',{name:'운동 따라하기 · 한 운동씩 시작'}).click();
 const guided=page.locator('#guided-workout-feedback');
 const feedback=await expectAlignedFeedback(guided);
 await guided.screenshot({path:testInfo.outputPath(`guided-feedback-${width}.png`)});
 await page.getByLabel('이번 세트 반복 횟수').fill('10');
 await page.getByLabel('이번 세트 중량 kg').fill('12.5');
 await page.getByRole('button',{name:'세트 완료',exact:true}).click();
 await page.getByRole('button',{name:'RPE 7',exact:true}).click();
 await expect(feedback.rpe).toHaveValue('7');
 await feedback.pain.fill('3');
 await page.getByRole('button',{name:'통증 기록 · 운동 중단',exact:true}).click();
 await expect(page.getByRole('heading',{name:'오늘의 운동 요약'})).toBeVisible();
 await expect(page.getByRole('alert')).toContainText('진행을 중단');
 await expect(page.getByText('운동 따라하기 · 2 / 5',{exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'목록으로',exact:true}).click();
 await page.reload();
 await expect(form.getByLabel('운동 힘듦 (RPE 1–10)',{exact:true})).toHaveValue('7');
 await expect(form.getByLabel('통증 (0–10)',{exact:true})).toHaveValue('3');
 await expect(form.getByLabel('1세트 중량 kg')).toHaveValue('12.5');
 await expect(form.getByLabel('1세트 횟수')).toHaveValue('10');
 await expect(form.getByText('이번 기록: 통증 중단',{exact:true})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 expect(errors).toEqual([]);
});
