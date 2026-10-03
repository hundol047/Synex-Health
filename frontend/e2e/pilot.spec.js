import {test,expect} from '@playwright/test';
test('diagnostics exposes honest readiness and device inspection without claiming physical QA',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('synex-onboarding-v1','done'));
 await page.goto('/health/diagnostics');
 await expect(page.getByText('Pilot readiness · EXTERNAL SETUP REQUIRED')).toBeVisible();
 await page.getByRole('button',{name:'기기 상태 확인'}).click();
 await expect(page.getByText('Device model',{exact:true})).toBeVisible();
 await expect(page.getByText('Pose inference latency ms',{exact:true})).toBeVisible();
 await expect(page.getByText('NOT TESTED',{exact:true}).first()).toBeVisible();
});
