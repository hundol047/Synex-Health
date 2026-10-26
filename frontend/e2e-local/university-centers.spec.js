import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
const centers=JSON.parse(readFileSync(new URL('../src/health/data/universityCenters.json',import.meta.url),'utf8')).centers;

test.beforeEach(async({page})=>{
  await page.addInitScript(()=>(localStorage.setItem('synex-personal-onboarding-v1','done'),localStorage.setItem('synex-personal-consent-v1','accepted')));
});
test('reviewed Korean centers are searchable offline at 360px with qualified measurement claims',async({page,context},info)=>{
  await page.setViewportSize({width:360,height:740});
  await page.goto('/health/connections#university-centers');
  const directory=page.locator('#university-centers');
  await expect(directory).toBeInViewport();
  await expect(directory.getByRole('article')).toHaveCount(centers.length);
  await expect(directory).toContainText('대한민국 전체 대학 목록이나 데이터 연동 제휴 목록은 아닙니다');
  await context.setOffline(true);
  const search=page.getByRole('searchbox',{name:'대학·캠퍼스·지역 검색'});
  await search.fill('연세 원주');
  await expect(directory.getByRole('article')).toHaveCount(1);
  await expect(directory).toContainText('검사 여부 문의');
  await search.fill('');
  await page.getByRole('checkbox',{name:'체성분 검사 안내가 있는 곳만'}).check();
  await expect(directory.getByRole('article')).toHaveCount(centers.filter(c=>c.kind==='measurement').length);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.getByRole('heading',{name:'국내 대학 센터 찾기'}).scrollIntoViewIfNeeded();
  await page.screenshot({path:info.outputPath('university-centers-360.png')});
  await search.fill('전남');await expect(directory.getByRole('article')).toHaveCount(0);
  await page.getByRole('button',{name:'전체 확인 목록 보기'}).click();
  await expect(directory.getByRole('article',{name:'전남대학교 광주캠퍼스'})).toContainText('과거 공지');
  await context.setOffline(false);
});
test('official browser navigation sends no health details and does not set school affiliation',async({page,context})=>{
  const requests=[];const official='https://spolex.snu.ac.kr/program/program05.php';
  await context.route('https://spolex.snu.ac.kr/**',async route=>{
    requests.push({url:route.request().url(),method:route.request().method(),postData:route.request().postData(),headers:route.request().headers()});
    await route.fulfill({contentType:'text/html',body:'<h1>Official link navigation test</h1>'});
  });
  await page.goto('/health/connections');
  const popupPromise=page.waitForEvent('popup');
  await page.getByRole('link',{name:'서울대학교 관악캠퍼스 서울대·포스코 스포츠센터 공식 안내 열기'}).click();
  const popup=await popupPromise;await popup.waitForLoadState();
  expect(requests).toHaveLength(1);expect(requests[0].url).toBe(official);
  expect(requests[0].method).toBe('GET');expect(requests[0].postData).toBeNull();
  expect(requests[0].headers.authorization).toBeUndefined();expect(requests[0].headers.referer).toBeUndefined();
  await popup.close();
  await expect(page.getByRole('button',{name:'측정 기록 가져오기'})).toBeDisabled();
  await page.goto('/health/profile');await expect(page.getByLabel('소속 학교')).toHaveValue('');
});
test('a saved school shows its matching official center and result entry remains accessible',async({page})=>{
  await page.goto('/health/profile');
  await page.getByLabel('소속 학교').selectOption('korea-seoul');
  await page.getByRole('button',{name:'학교·공유 설정 저장'}).click();
  await expect(page.getByText('학교 소속을 이 기기에 저장했습니다. 자동 연동은 설정되지 않았습니다.')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('link',{name:'고려대학교 서울캠퍼스 건강센터 공식 안내 열기'})).toHaveAttribute('href','https://www.korea.ac.kr/ko/520/subview.do');
  await page.getByRole('link',{name:'국내 대학 센터 찾기'}).click();
  await expect(page.locator('#university-centers')).toBeInViewport();
  await page.getByRole('link',{name:'내 결과지 입력하기'}).click();
  await expect(page.locator('#segment-measurements')).toHaveAttribute('open','');
  await expect(page.getByLabel('소속 학교')).toHaveValue('korea-seoul');
});

test('new schools can be filtered, selected and retained offline',async({page,context})=>{
 await page.goto('/health/profile');
 await expect(page.getByLabel('소속 학교').getByRole('option',{name:'한림대학교',exact:true})).toBeAttached();
 await context.setOffline(true);
 await page.getByRole('combobox',{name:/^학교 지역/}).selectOption('강원');
 await page.getByLabel('학교 검색',{exact:true}).fill('한림대');
 await page.getByLabel('소속 학교').selectOption('hallym');
 await page.getByRole('button',{name:'학교·공유 설정 저장'}).click();
 await expect(page.getByText('학교 소속을 이 기기에 저장했습니다. 자동 연동은 설정되지 않았습니다.')).toBeVisible();
 await page.getByRole('button',{name:'전체 학교 보기',exact:true}).click();
 await expect(page.getByLabel('소속 학교').getByRole('option',{name:'경남대학교',exact:true})).toBeAttached();
 await context.setOffline(false); await page.reload();
 await expect(page.getByLabel('소속 학교')).toHaveValue('hallym');
 await expect(page.getByRole('link',{name:'한림대학교 본교 보건진료소 공식 안내 열기'})).toBeVisible();
});
