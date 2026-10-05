import {test,expect} from '@playwright/test';
test('intro next button stays at the bottom through every step on mobile',async({page})=>{
 await page.addInitScript(()=>{localStorage.removeItem('synex-onboarding-v1');Object.defineProperty(AbortSignal,'timeout',{value:undefined,configurable:true});});
 await page.setViewportSize({width:390,height:844});await page.goto('/health');
 let anchor;
 for(let i=0;i<7;i++){
  const button=page.getByRole('button',{name:i===6?'시작하기':'다음',exact:true});
  await expect(button).toBeVisible();const box=await button.boundingBox();
  if(!anchor)anchor=box;
  expect(Math.abs(box.y-anchor.y)).toBeLessThan(1);expect(Math.abs(box.x-anchor.x)).toBeLessThan(1);
  expect(box.y+box.height).toBeGreaterThan(800);expect(box.y+box.height).toBeLessThanOrEqual(844);
  if(i===5){await page.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));expect((await button.boundingBox()).y).toBe(anchor.y);}
  await button.click();
 }
 await expect(page.getByRole('heading',{name:'화면을 다시 불러와 주세요.'})).toHaveCount(0);
 await expect(page.locator('.health-shell')).toBeVisible();
});
