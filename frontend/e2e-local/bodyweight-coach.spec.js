import {test,expect} from '@playwright/test';

test.beforeEach(async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('synex-personal-onboarding-v1','done'));
});

test('bodyweight coach opens from home without a server and keeps equal phone panels',async({page})=>{
 const serverRequests=[];
 page.on('request',request=>{if(new URL(request.url()).pathname.startsWith('/api/'))serverRequests.push(request.url());});
 await page.goto('/health');
 await page.getByRole('link',{name:'맨몸운동 카메라 코치'}).click();
 await expect(page.getByRole('heading',{name:'맨몸운동 코칭'})).toBeVisible();
 await expect(page.getByLabel('따라 할 운동').locator('option')).toHaveCount(7);
 for(const viewport of [{width:393,height:852},{width:360,height:640}]){
  await page.setViewportSize(viewport);
  const upper=await page.locator('.coach-example').boundingBox(),lower=await page.locator('.coach-camera').boundingBox();
  expect(upper.y+upper.height).toBeLessThanOrEqual(lower.y+1);
  expect(Math.abs(upper.height-lower.height)).toBeLessThan(2);
  expect(lower.y+lower.height).toBeLessThan(viewport.height);
  await expect(page.getByRole('button',{name:'코칭 시작',exact:true})).toBeInViewport();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }
 for(const motion of ['squat','lunge','side_lunge','push_up','plank','hip_hinge','glute_bridge']){
  await page.getByLabel('따라 할 운동').selectOption(motion);
  await expect(page.locator('.coach-example canvas')).toBeVisible();
  await expect(page.getByLabel('현재 시범 안내')).toBeVisible();
  await expect(page.locator('.coach-camera-empty')).toBeVisible();
 }
 await page.setViewportSize({width:393,height:852});
 await page.getByLabel('따라 할 운동').selectOption('squat');
 await page.screenshot({path:'test-results/bodyweight-coach-mobile.png'});
 await page.getByRole('link',{name:'운동 홈으로 돌아가기'}).click();
 await expect(page.getByText('내 기록은 이 기기에')).toBeVisible();
 expect(serverRequests).toEqual([]);
});

test('camera permission denial explains how to recover and leaves coaching retry available',async({page})=>{
 await page.addInitScript(()=>{
  Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:async()=>{throw new DOMException('denied','NotAllowedError');}}});
 });
 await page.goto('/health/pose');
 await page.getByRole('button',{name:'코칭 시작',exact:true}).click();
 await expect(page.getByRole('alert')).toContainText('권한');
 await expect(page.getByRole('button',{name:'코칭 시작',exact:true})).toBeEnabled();
 await expect(page.getByRole('switch')).not.toBeChecked();
});

test('personal build enforces local requests and rejects equipment motion URLs',async({page})=>{
 await page.goto('/health/pose?motion=curl');
 await expect(page.getByLabel('따라 할 운동')).toHaveValue('squat');
 const boundary=await page.evaluate(async()=>{
  const policy=document.querySelector('meta[http-equiv="Content-Security-Policy"]')?.content;
  let blocked=false;
  try{await fetch('https://odml.pa.googleapis.com/v1/log',{method:'POST',body:'privacy-boundary-probe'});}catch{blocked=true;}
  return {policy,blocked};
 });
 expect(boundary).toEqual({policy:"connect-src 'self'",blocked:true});
});
