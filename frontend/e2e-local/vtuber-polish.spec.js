import {test,expect as baseExpect} from '@playwright/test';
const expect=baseExpect.configure({timeout:90000});
test('refined VTuber surfaces keep colors, expressions and muscle guidance in the real renderer',async({page},info)=>{
 test.setTimeout(360000);page.setDefaultTimeout(90000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/shader|WebGLProgram/.test(m.text()))errors.push(m.text());});
 await page.addInitScript(()=>{
  localStorage.setItem('synex-personal-onboarding-v1','done');localStorage.setItem('synex-personal-consent-v1','accepted');localStorage.setItem('synex-render-quality','medium');
  if(!localStorage.getItem('synex-exercise-character-v1'))localStorage.setItem('synex-exercise-character-v1',JSON.stringify({model:'vtuber',vtuberOutfit:'crop',vtuberHair:'#a98bda',vtuberEyes:'#3d86c9',vtuberTop:'#d680a8',vtuberBottom:'#403454',vtuberChest:.45,vtuberHips:.5,vtuberGlutes:.65,vtuberWaist:-.25}));
 });
 await page.goto('/health/character');const canvas=page.locator('canvas');
 await expect(canvas).toHaveAttribute('data-character-outfit','crop');
 await page.getByRole('button',{name:'얼굴 확대',exact:true}).click();await page.getByRole('button',{name:'정면 운동 시범 보기',exact:true}).click();
 const capture=async name=>{await canvas.screenshot({path:info.outputPath(name+'.png')});expect(errors).toEqual([]);};
 await capture('face-lavender');
 await page.getByRole('button',{name:'버튜버 머리색 체스트넛',exact:true}).click();await page.getByRole('button',{name:'버튜버 눈 색 브라운',exact:true}).click();await expect(canvas).toHaveAttribute('data-character-eyes','#95652b');await capture('face-default');
 await page.getByRole('button',{name:'버튜버 눈 색 블루',exact:true}).click();
 await page.getByRole('button',{name:'버튜버 머리색 블랙',exact:true}).click();await expect(canvas).toHaveAttribute('data-character-hair','#292332');await capture('face-black');
 await page.getByRole('button',{name:'버튜버 머리색 실버',exact:true}).click();await expect(canvas).toHaveAttribute('data-character-hair','#ece5dc');await capture('face-silver');
 await page.getByRole('button',{name:'버튜버 머리색 라벤더',exact:true}).click();
 const phase=page.getByLabel('미리보기 동작 구간');await phase.fill('777');await expect(canvas).toHaveAttribute('data-exercise-progress','0.777');await capture('face-blink');
 await page.getByRole('button',{name:'전신 보기',exact:true}).click();
 for(const [motion,time,view,file]of [['squat',0,'45°','standing'],['squat',0,'정면','front'],['squat',500,'측면','squat'],['wall_push',500,'측면','wall-push']]){
  await page.getByLabel('미리볼 운동').selectOption(motion);await phase.fill(String(time));await page.getByRole('button',{name:view+' 운동 시범 보기',exact:true}).click();
  await expect(canvas).toHaveAttribute('data-exercise-rendered',motion);await expect(canvas).toHaveAttribute('data-exercise-progress',String(time/1000));await capture(file);
 }
 await page.goto('/health/library');await page.getByLabel('운동·근육 검색').fill('맨몸 스쿼트');await page.getByRole('button',{name:'맨몸 스쿼트 동작 보기',exact:true}).click();
 const exercise=page.getByRole('region',{name:'선택한 운동 시범'}).locator('canvas');await expect(exercise).toHaveAttribute('data-character-outfit','crop');
 const progress=await exercise.getAttribute('data-exercise-progress');await expect.poll(()=>exercise.getAttribute('data-exercise-progress')).not.toBe(progress);
 await exercise.screenshot({path:info.outputPath('exercise.png')});expect(errors).toEqual([]);
});
