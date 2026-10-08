import {test,expect} from '@playwright/test';
const BODYWEIGHT_LABELS={squat:'스쿼트',lunge:'런지',side_lunge:'사이드 런지',push_up:'푸시업',plank:'플랭크',hip_hinge:'힙힌지',glute_bridge:'글루트 브리지'};

test.beforeEach(async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('synex-personal-onboarding-v1','done'));
});

async function expectDemonstrationContained(page){
 await expect.poll(async()=>page.evaluate(()=>{
  const nodes=['.coach-example','.coach-example canvas','.bodyweight-demo-cue'].map(selector=>document.querySelector(selector));
  if(nodes.some(node=>!node))return false;
  const [pane,canvas,cue]=nodes.map(node=>node.getBoundingClientRect());
  return canvas.height>80&&canvas.y>=pane.y&&canvas.bottom<=cue.y+1&&cue.bottom<=pane.bottom+1;
 })).toBe(true);
}

test('bodyweight coach opens from home without a server and keeps equal phone panels',async({page})=>{
 const serverRequests=[];
 page.on('request',request=>{if(new URL(request.url()).pathname.startsWith('/api/'))serverRequests.push(request.url());});
 await page.goto('/health');
 await page.getByRole('link',{name:'맨몸운동 카메라 코치'}).click();
 await expect(page.getByRole('heading',{name:'맨몸운동 코칭'})).toBeVisible();
 await expect(page.getByLabel('따라 할 운동').locator('option')).toHaveCount(42);
 for(const viewport of [{width:393,height:852},{width:360,height:640}]){
  await page.setViewportSize(viewport);
  const upper=await page.locator('.coach-example').boundingBox(),lower=await page.locator('.coach-camera').boundingBox();
  expect(upper.y+upper.height).toBeLessThanOrEqual(lower.y+1);
  expect(Math.abs(upper.height-lower.height)).toBeLessThan(2);
  if(viewport.height>700)expect(lower.y+lower.height).toBeLessThan(viewport.height);
  const start=page.getByRole('button',{name:'코칭 시작',exact:true});await start.scrollIntoViewIfNeeded();await expect(start).toBeInViewport();
  await expect(page.getByRole('button',{name:'동영상 촬영',exact:true})).toBeInViewport();
  await expectDemonstrationContained(page);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }
 const demonstrationCanvas=await page.locator('.coach-example canvas').elementHandle();
 for(const motion of ['squat','lunge','side_lunge','push_up','plank','hip_hinge','glute_bridge']){
  await page.getByLabel('따라 할 운동').selectOption(motion);
  await expect(page.locator('.coach-example')).toHaveAttribute('aria-label',`위 화면 · ${BODYWEIGHT_LABELS[motion]} 운동 시범`);
  await expect(page.locator('.coach-example canvas')).toBeVisible();
  expect(await page.locator('.coach-example canvas').evaluate((canvas,original)=>canvas===original,demonstrationCanvas)).toBe(true);
  await expect(page.getByLabel('현재 시범 안내')).toBeVisible();
  await expect(page.locator('.coach-camera-empty')).toBeVisible();
  await expectDemonstrationContained(page);
 }
 await page.setViewportSize({width:393,height:852});
 await page.getByLabel('따라 할 운동').selectOption('squat');
 await expect(page.locator('.coach-example')).toHaveAttribute('aria-label','위 화면 · 스쿼트 운동 시범');
 await page.screenshot({path:'test-results/bodyweight-coach-mobile.png'});
 await page.getByRole('link',{name:'운동 홈으로 돌아가기'}).click();
 await expect(page.getByText('내 기록은 이 기기에')).toBeVisible();
 expect(serverRequests).toEqual([]);
});

test('short phones scroll and landscape preserves both guides after a permission error',async({page})=>{
 await page.addInitScript(()=>{
  Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:async()=>{throw new DOMException('denied','NotAllowedError');}}});
 });
 await page.setViewportSize({width:360,height:480});
 await page.goto('/health/pose');
 await page.getByRole('button',{name:'코칭 시작',exact:true}).click();
 await expect(page.getByRole('alert')).toContainText('권한');
 await expectDemonstrationContained(page);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.setViewportSize({width:852,height:393});
 await expectDemonstrationContained(page);
 const upper=await page.locator('.coach-example').boundingBox(),lower=await page.locator('.coach-camera').boundingBox();
 expect(Math.abs(upper.height-lower.height)).toBeLessThan(2);
 expect(lower.x).toBeGreaterThan(upper.x+upper.width);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
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
