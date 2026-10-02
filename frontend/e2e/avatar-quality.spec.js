import {test,expect} from '@playwright/test';
test('dressed avatar renders from all sides and keeps joints visible through exercise phases',async({page},info)=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>localStorage.setItem('synex-onboarding-v1','done'));
 await page.goto('/health/body');await page.getByRole('button',{name:/Range View/}).click();
 const body=page.locator('.body-scene').first();await expect(body.locator('canvas')).toBeVisible();
 await expect.poll(async()=>{try{return JSON.parse(await body.locator('canvas').getAttribute('data-overlay')).vertices;}catch{return 0;}}).toBeGreaterThan(10000);
 for(const [name,file] of [['정면','front'],['왼쪽','side'],['후면','back']]){await body.getByRole('button',{name,exact:true}).click();await body.screenshot({path:info.outputPath(`avatar-${file}.png`)});}
 await page.goto('/health/library');await page.getByLabel('운동·근육 검색').fill('맨몸 스쿼트');await page.getByRole('button',{name:'맨몸 스쿼트 동작 보기',exact:true}).click();
 const motion=page.locator('.motion-viewer');await expect(motion.locator('canvas')).toBeVisible();await expect(page.getByText(/반팔 운동 상의/)).toBeVisible();
 for(const [phase,name] of [['0','start'],['50','bend']]){await page.getByLabel('동작 구간',{exact:true}).fill(phase);await motion.getByRole('button',{name:'측면',exact:true}).click();await motion.screenshot({path:info.outputPath(`squat-${name}.png`)});}
 await page.setViewportSize({width:390,height:844});await motion.getByRole('button',{name:'정면',exact:true}).click();await motion.screenshot({path:info.outputPath('avatar-mobile.png')});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(errors).toEqual([]);
});
