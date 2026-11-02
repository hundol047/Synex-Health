import {test,expect as baseExpect} from '@playwright/test';
const expect=baseExpect.configure({timeout:90000});

test('VTuber colors, six outfits and independent shape controls persist into exercise',async({page},info)=>{
 test.setTimeout(480000);page.setDefaultTimeout(90000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/shader|WebGLProgram/.test(m.text()))errors.push(m.text());});
 await page.addInitScript(()=>{
  localStorage.setItem('synex-personal-onboarding-v1','done');localStorage.setItem('synex-personal-consent-v1','accepted');
  if(!localStorage.getItem('synex-exercise-character-v1'))localStorage.setItem('synex-exercise-character-v1',JSON.stringify({model:'vtuber'}));
  if(!localStorage.getItem('saved-workout-check'))localStorage.setItem('saved-workout-check','retained');
  localStorage.setItem('synex-render-quality','medium');
 });
 await page.goto('/health/character');
 const canvas=page.locator('canvas'),editor=page.getByRole('region',{name:'버튜버 꾸미기'});
 await expect(canvas).toHaveAttribute('data-character-model','vtuber');
 await page.getByRole('button',{name:'머리·눈 색',exact:true}).click();
 await page.getByRole('button',{name:'정면 운동 시범 보기',exact:true}).click();
 await page.getByRole('button',{name:'버튜버 머리색 라벤더',exact:true}).click();
 await page.getByRole('button',{name:'버튜버 눈 색 블루',exact:true}).click();
 await expect(canvas).toHaveAttribute('data-character-hair','#a98bda');await expect(canvas).toHaveAttribute('data-character-eyes','#3d86c9');
 await canvas.screenshot({path:info.outputPath('lavender-blue-face.png')});
 await editor.getByRole('button',{name:'체형',exact:true}).click();
 for(const [label,value]of [['가슴 크기','1'],['골반 너비','1'],['엉덩이 볼륨','1'],['허리 너비','-1']])await page.getByLabel('버튜버 '+label,{exact:true}).fill(value);
 await page.getByLabel('미리볼 운동').selectOption('squat');
 await editor.getByRole('button',{name:'의상',exact:true}).click();
 const outfits=[['casual','루즈 티 · 반바지'],['training','티 · 레깅스'],['tank','슬림 탱크'],['crop','크롭 트레이닝'],['bike','바이크 세트'],['long','긴팔 트레이닝']];
 for(const [id,name]of outfits){
  await editor.getByRole('button',{name:new RegExp('^'+name)}).click();await expect(canvas).toHaveAttribute('data-character-outfit',id);
  await page.getByRole('button',{name:'정면 운동 시범 보기',exact:true}).click();
  await canvas.screenshot({path:info.outputPath('outfit-'+id+'.png')});
 }
 await editor.getByRole('button',{name:/^크롭 트레이닝/}).click();
 await page.getByLabel('버튜버 상의 색',{exact:true}).fill('#d680a8');await page.getByLabel('버튜버 하의 색',{exact:true}).fill('#403454');
 const phase=page.getByLabel('미리보기 동작 구간');
 for(const [motion,time,view,file]of [['squat',500,'측면','crop-squat'],['wall_push',500,'측면','crop-wall-push'],['full_pushup',500,'측면','crop-floor-pushup']]){
  await page.getByLabel('미리볼 운동').selectOption(motion);await phase.fill(String(time));await page.getByRole('button',{name:view+' 운동 시범 보기',exact:true}).click();
  await expect(canvas).toHaveAttribute('data-exercise-rendered',motion);await expect(canvas).toHaveAttribute('data-exercise-progress',String(time/1000));
  await canvas.screenshot({path:info.outputPath(file+'.png')});
 }
 await editor.getByRole('button',{name:'체형',exact:true}).click();
 for(const [label,value]of [['가슴 크기','0.45'],['골반 너비','0.5'],['엉덩이 볼륨','0.65'],['허리 너비','-0.25']])await page.getByLabel('버튜버 '+label,{exact:true}).fill(value);
 await page.getByLabel('미리볼 운동').selectOption('squat');await phase.fill('0');await page.getByRole('button',{name:'정면 운동 시범 보기',exact:true}).click();
 await page.getByRole('button',{name:'저장하고 운동에 적용',exact:true}).click();
 const chosen={model:'vtuber',vtuberOutfit:'crop',vtuberHair:'#a98bda',vtuberEyes:'#3d86c9',vtuberTop:'#d680a8',vtuberBottom:'#403454',vtuberChest:.45,vtuberHips:.5,vtuberGlutes:.65,vtuberWaist:-.25};
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('synex-exercise-character-v1')))).toMatchObject(chosen);
 await page.reload();await expect(canvas).toHaveAttribute('data-character-outfit','crop');await expect(canvas).toHaveAttribute('data-character-hair','#a98bda');
 await canvas.screenshot({path:info.outputPath('saved-character.png')});
 await editor.getByRole('button',{name:'체형',exact:true}).click();
 for(const [label,value]of [['가슴 크기','0.45'],['골반 너비','0.5'],['엉덩이 볼륨','0.65'],['허리 너비','-0.25']])await expect(page.getByLabel('버튜버 '+label,{exact:true})).toHaveValue(value);
 expect(await page.evaluate(()=>localStorage.getItem('saved-workout-check'))).toBe('retained');
 await page.goto('/health/library');await page.getByLabel('운동·근육 검색').fill('맨몸 스쿼트');await page.getByRole('button',{name:'맨몸 스쿼트 동작 보기',exact:true}).click();
 const exercise=page.getByRole('region',{name:'선택한 운동 시범'}).locator('canvas');
 await expect(exercise).toHaveAttribute('data-character-model','vtuber');await expect(exercise).toHaveAttribute('data-character-outfit','crop');await expect(exercise).toHaveAttribute('data-character-hair','#a98bda');
 const progress=await exercise.getAttribute('data-exercise-progress');await expect.poll(()=>exercise.getAttribute('data-exercise-progress'),{timeout:30000}).not.toBe(progress);
 await exercise.screenshot({path:info.outputPath('custom-exercise.png')});expect(errors).toEqual([]);
});
