import {test,expect} from '@playwright/test';
test('low power preserves numeric comparison and toggles rendering fallback',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('synex-onboarding-v1','done'));
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/health/body');
 await expect(page.getByText('체성분 측정값을 기반으로 생성한 설명용 신체 모델입니다. 실제 근육의 모양이나 MRI/CT 기반 해부학적 재구성이 아닙니다.',{exact:true})).toBeVisible();
 const table=await page.getByRole('table').innerText();
 await page.getByRole('button',{name:'저전력 모드 꺼짐',exact:true}).click();
 await expect(page.getByRole('button',{name:'저전력 모드 켜짐',exact:true})).toHaveAttribute('aria-pressed','true');
 await expect.poll(async()=>JSON.parse(await page.locator('[data-overlay]').getAttribute('data-overlay')).fallbackActive).toBe(true);
 expect(await page.getByRole('table').innerText()).toBe(table);expect(errors).toEqual([]);
});
