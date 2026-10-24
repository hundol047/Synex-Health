import {test as base,expect} from '@playwright/test';
export const test=base.extend({
 demoSession:[async({page,context},use)=>{
  const access_code=process.env.DEMO_ACCESS_CODE||'test-only-demo-code';
  await context.addInitScript(code=>{sessionStorage.setItem('synex-demo-access',code);},access_code);
  const response=await page.request.post('/api/auth/demo-login',{data:{demo_user_id:'student-jimin',access_code,transport:'web'}});
  expect(response.ok()).toBeTruthy();
  await use();
 },{auto:true}]
});
export {expect};
