import {test,expect} from '@playwright/test';

test.beforeEach(async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('synex-personal-onboarding-v1','done'));
});

test('instructor follows the timer, pauses with it, and resets cleanly for another exercise',async({page},testInfo)=>{
 await page.addInitScript(()=>{
  window.__spoken=[];
  Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{cancel(){},getVoices(){return [];},speak(value){window.__spoken.push(value.text);}}});
  window.SpeechSynthesisUtterance=class{constructor(text){this.text=text;}};
 });
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/health/pose?motion=squat');
 const panel=page.getByRole('region',{name:'자동 운동 템포'});
 await expect(page.locator('.coach-example canvas')).toHaveAttribute('data-exercise-rendered','squat');
 await page.getByRole('checkbox',{name:'운동 음성 · 이름·초·횟수 읽기'}).check();
 await panel.getByRole('button',{name:'자동 따라하기 시작'}).click();
 await expect(panel).toHaveAttribute('data-stage','prepare');
 await expect(panel).toHaveAttribute('data-stage','work',{timeout:15000});
 await expect.poll(()=>page.evaluate(()=>window.__spoken)).toContain('1회');
 expect(await page.evaluate(()=>window.__spoken.some(text=>text.includes('스쿼트')))).toBe(true);
 await expect(page.getByLabel('현재 시범 안내')).not.toContainText('준비');
 await panel.getByRole('button',{name:'템포 일시정지'}).click();
 const cue=await page.getByLabel('현재 시범 안내').textContent();
 await page.waitForTimeout(1100);
 expect(await page.getByLabel('현재 시범 안내').textContent()).toBe(cue);
 await page.screenshot({path:testInfo.outputPath('tempo-mobile.png'),fullPage:true});
 await panel.getByRole('button',{name:'템포 계속하기'}).click();
 await page.getByLabel('따라 할 운동').selectOption('plank');
 await expect(panel).toHaveAttribute('data-stage','idle');
 await expect(page.getByRole('region',{name:'자세 차이와 힘 사용 안내'})).toContainText('팔뚝으로 바닥');
 for(const size of [{width:360,height:640},{width:852,height:393}]){
  await page.setViewportSize(size);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await panel.getByText('운동 속도·휴식 조절').click();
  const slider=page.getByLabel('플랭크 휴식 초');await expect(slider).toHaveAttribute('min','10');await expect(slider).toHaveAttribute('max','120');
  await panel.getByText('운동 속도·휴식 조절').click();
 }
 expect(errors).toEqual([]);
});

test('real bundled MediaPipe analyzes a captured empty scene and reports insufficient evidence, not invented form advice',async({page},testInfo)=>{
 test.setTimeout(90000);
 const requests=[],errors=[];page.on('request',r=>{if(new URL(r.url()).origin!=='http://127.0.0.1:5174')requests.push(r.url());});page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:async()=>{
   const canvas=document.createElement('canvas');canvas.width=640;canvas.height=480;
   const ctx=canvas.getContext('2d');let n=0;const paint=()=>{ctx.fillStyle='#eff6ff';ctx.fillRect(0,0,640,480);ctx.fillStyle='#2563eb';ctx.fillRect(20+(n++%100),20,20,20);};
   paint();const id=setInterval(paint,100),stream=canvas.captureStream(10),track=stream.getVideoTracks()[0],stop=track.stop.bind(track);
   track.stop=()=>{clearInterval(id);stop();};return stream;
  }}});
 });
 await page.goto('/health/pose?motion=plank');
 await page.getByRole('button',{name:'촬영·분석 함께 시작'}).click();
 await expect(page.getByRole('button',{name:'촬영 종료',exact:true})).toBeEnabled({timeout:40000});
 await expect(page.getByText('추적 불확실 · 자세 판정 보류')).toBeVisible({timeout:15000});
 await page.waitForTimeout(1800);
 await page.getByRole('button',{name:'촬영 종료',exact:true}).click();
 await expect(page.getByLabel('촬영한 운동 동영상')).toBeVisible();
 const report=page.getByRole('region',{name:'촬영 자세 분석 결과'});
 await expect(report).toContainText('분석 가능한 영상이 부족');
 await expect(report).toContainText('관찰된 완전한 반복 0회');
 await page.screenshot({path:testInfo.outputPath('recording-analysis-mobile.png'),fullPage:true});
 expect(requests).toEqual([]);expect(errors).toEqual([]);
});
