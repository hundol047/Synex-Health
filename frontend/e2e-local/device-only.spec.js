import {test,expect} from '@playwright/test';
test('first launch recovers from a temporary storage failure without erasing records',async({page})=>{
 await page.addInitScript(()=>{
  const open=indexedDB.open.bind(indexedDB);let first=true;
  indexedDB.open=(...args)=>{
   if(first){first=false;throw Error('기기 저장소가 잠시 사용 중입니다. 다시 시도하세요.');}
   return open(...args);
  };
 });
 await page.goto('/health');
 for(let i=0;i<6;i++)await page.getByRole('button',{name:'다음',exact:true}).click();
 await page.getByRole('button',{name:'시작하기',exact:true}).click();
 await expect(page.getByRole('alert')).toContainText('잠시 사용 중');
 await page.getByRole('button',{name:'기기 저장소 다시 열기'}).click();
 await expect(page.getByText('내 기록은 이 기기에')).toBeVisible();
 await expect(page.getByRole('heading',{name:'이 폰에서 사용'})).toHaveCount(0);
});
test('personal mode opens without a server and restores records on restart',async({page,context})=>{
 const requests=[],errors=[];page.on('request',r=>{if(new URL(r.url()).pathname.startsWith('/api/'))requests.push(r.url());});page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>localStorage.setItem('synex-personal-onboarding-v1','done'));
 await page.goto('/health');await expect(page.getByText('내 기록은 이 기기에')).toBeVisible();
 await page.goto('/health/profile');await expect(page.getByRole('heading',{name:'체성분 측정값 등록'})).toBeVisible();
 await page.getByLabel('체중 (kg)',{exact:true}).fill('60');await page.getByLabel('키 (cm)',{exact:true}).first().fill('165');await page.getByLabel('골격근량 (kg)',{exact:true}).fill('24');await page.getByLabel('체지방률 (%)', {exact:true}).fill('25');
 await page.getByRole('button',{name:'측정값 저장',exact:true}).click();await expect(page.getByText('측정값을 저장했습니다.')).toBeVisible();
 await page.getByLabel('소속 학교').selectOption('yonsei-mirae');await expect(page.getByRole('checkbox').first()).toBeDisabled();await page.getByRole('button',{name:'학교·공유 설정 저장'}).click();await expect(page.getByText('학교와 공유 설정을 저장했습니다.',{exact:true})).toBeVisible();
 await page.goto('/health/routine');await page.getByRole('button',{name:'오늘의 루틴 시작하기'}).click();await expect(page.getByText('이 폰에서 생성한 기본 운동 계획입니다.',{exact:false})).toBeVisible();
 await page.screenshot({path:'test-results/android-local-routine.png',fullPage:true});
 await page.goto('/health/workout');await page.getByRole('button',{name:'운동 따라하기 · 한 운동씩 시작'}).click();await page.getByLabel('이번 세트 반복 횟수').fill('8');await page.getByRole('button',{name:'세트 완료',exact:true}).click();await page.getByRole('button',{name:'휴식 건너뛰기'}).click();await page.getByRole('button',{name:'완료 기록 · 다음 운동',exact:true}).click();await expect(page.locator('.workout-mode .exercise-card-info strong')).toHaveText('벽 푸시업');
 await page.goto('/health');await page.reload();await expect(page.getByText('24kg',{exact:true}).first()).toBeVisible();await page.screenshot({path:'test-results/android-local-home.png',fullPage:true});
 await page.goto('/health/profile');await expect(page.getByLabel('소속 학교')).toHaveValue('yonsei-mirae');
 await page.goto('/health/privacy');await expect(page.getByRole('button',{name:'내 데이터 내보내기'})).toBeVisible();await expect(page.getByText('의자 앉았다 일어나기',{exact:false})).toBeVisible();
 expect(requests).toEqual([]);expect(errors).toEqual([]);
});

test('first launch completes the fixed intro without login or server setup',async({page})=>{
 await page.goto('/health');await expect(page.getByRole('heading',{name:'나의 몸, 나의 기록'})).toBeVisible();
 const before=await page.getByRole('button',{name:'다음',exact:true}).boundingBox();
 for(let i=0;i<6;i++)await page.getByRole('button',{name:'다음',exact:true}).click();
 const after=await page.getByRole('button',{name:'시작하기',exact:true}).boundingBox();expect(Math.abs(before.y-after.y)).toBeLessThan(2);
 await page.getByRole('button',{name:'시작하기',exact:true}).click();await expect(page.getByText('내 기록은 이 기기에')).toBeVisible();await expect(page.getByRole('heading',{name:'서버 연결이 필요합니다'})).toHaveCount(0);
});
