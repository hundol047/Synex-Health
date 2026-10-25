import {test,expect} from '@playwright/test';
test('encrypted backup restores records and wrong-password import leaves records unchanged',async({page})=>{
 await page.addInitScript(()=>{localStorage.setItem('synex-personal-onboarding-v1','done');localStorage.setItem('synex-personal-consent-v1','accepted');});
 await page.goto('/health');await expect(page.getByText('내 기록은 이 기기에')).toBeVisible();
 await page.evaluate(async()=>{const {localApi}=await import('/src/shared/lib/localApi.js');await localApi('/api/body-composition',{measurement_date:'2026-01-01',weight:60,height:165,skeletal_muscle_mass:24,body_fat_percentage:25,segments:[]});});
 await page.goto('/health/privacy');await page.getByLabel('백업 암호',{exact:true}).fill('strong-backup-password');
 const downloaded=page.waitForEvent('download');await page.getByRole('button',{name:'암호화 백업 저장',exact:true}).click();const file=await downloaded;const path=await file.path();expect(file.suggestedFilename()).toContain('encrypted');
 await page.getByLabel('확인 문구 DELETE 입력').fill('DELETE');await page.getByRole('button',{name:'건강 데이터 전체 삭제',exact:true}).click();await expect(page.getByRole('button',{name:'측정 삭제',exact:true})).toHaveCount(0);
 page.on('dialog',dialog=>dialog.accept());await page.getByLabel('암호화 백업 복원',{exact:true}).setInputFiles(path);await expect(page.getByRole('status').filter({hasText:'복원이 완료되었습니다.'})).toBeVisible();await expect(page.getByRole('button',{name:'측정 삭제',exact:true})).toHaveCount(1);
 await page.getByLabel('백업 암호',{exact:true}).fill('incorrect-password');await page.getByLabel('암호화 백업 복원',{exact:true}).setInputFiles(path);await expect(page.getByText('암호가 다르거나 백업 파일이 손상되었습니다. 기존 기록은 유지됩니다.',{exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'측정 삭제',exact:true})).toHaveCount(1);
});
