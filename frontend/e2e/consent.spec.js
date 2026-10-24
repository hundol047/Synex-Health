import {test,expect} from './fixtures.js';
test.use({viewport:{width:390,height:844}});
test('withdrawal gates health screens while export and deletion remain reachable without a router',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>localStorage.setItem('synex-onboarding-v1','done'));
 const status=await(await page.request.get('/api/consents')).json();
 const consent={version:status.version,privacy_collection:true,sensitive_health:true,age_14_or_over:true};
 try{
  expect((await page.request.post('/api/consents/withdraw',{data:{}})).ok()).toBe(true);
  await page.goto('/health/workout');
  await expect(page.getByRole('heading',{name:'건강정보 처리 동의'})).toBeVisible();
  const checks=page.getByRole('checkbox');await expect(checks).toHaveCount(3);
  for(const checkbox of await checks.all())await expect(checkbox).not.toBeChecked();
  await expect(page.getByRole('button',{name:'동의하고 계속'})).toBeDisabled();
  await page.getByRole('button',{name:'동의 없이 내보내기·삭제 관리'}).click();
  await expect(page.getByRole('button',{name:'내 데이터 내보내기'})).toBeVisible();
  await expect(page.getByRole('button',{name:'계정 삭제',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'동의 화면으로 돌아가기'}).click();
  for(const checkbox of await checks.all())await checkbox.check();
  await page.getByRole('button',{name:'동의하고 계속'}).click();
  await expect(page.locator('.health-bottom-nav')).toBeVisible();
  expect((await(await page.request.get('/api/consents')).json()).active).toBe(true);
  expect(errors).toEqual([]);
 }finally{await page.request.post('/api/consents',{data:consent});}
});
