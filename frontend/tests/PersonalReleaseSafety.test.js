import 'fake-indexeddb/auto';
import {webcrypto} from 'node:crypto';
import {it,expect,beforeEach,afterEach,vi} from 'vitest';
import {localApi} from '../src/shared/lib/localApi.js';
import {bindOfflineAccount,clearOffline} from '../src/shared/lib/offline.js';
import {LOCAL_ACCOUNT,LOCAL_NAMESPACE} from '../src/shared/lib/localMode.js';
import {encryptBackup,decryptBackup} from '../src/shared/lib/personalBackup.js';
import {validateRelease} from '../scripts/release-config.mjs';
const measurement={measurement_date:'2026-01-01',weight:60,height:165,skeletal_muscle_mass:24,body_fat_percentage:25,segments:[]};
beforeEach(async()=>{vi.stubGlobal('crypto',webcrypto);await bindOfflineAccount(LOCAL_ACCOUNT,LOCAL_NAMESPACE);});
afterEach(async()=>{await clearOffline();vi.unstubAllGlobals();});
it('erases sensitive health answers and profile fields, keeping only display name',async()=>{
 await localApi('/api/health/profile',{name:'사용자',birth_date:'1990-01-01',height:170},{method:'PUT'});
 await localApi('/api/exercise-profile',{safety_chest_pain:true,limitations:['무릎 통증']},{method:'PUT'});
 await localApi('/api/privacy/health-data',{confirmation:'DELETE'},{method:'DELETE'});
 const data=await localApi('/api/privacy/export');expect(data.exercise_profile.safety_chest_pain).toBe(false);expect(data.exercise_profile.limitations).toEqual([]);expect(data.profile.birth_date).toBeUndefined();expect(data.profile.height).toBeNull();expect(data.profile.name).toBe('사용자');
});
it('rejects impossible or future workout dates, fractional reps, and under-14 profiles',async()=>{
 for(const date of ['2026-99-99','2026-02-30','2099-01-01'])await expect(localApi('/api/workouts',{exercise_name:'스쿼트',date})).rejects.toThrow('날짜');
 await expect(localApi('/api/workouts',{exercise_name:'스쿼트',date:'2026-01-01',set_records:[{reps:1.5}]})).rejects.toThrow('정수');
 await expect(localApi('/api/health/profile',{birth_date:'2020-01-01'},{method:'PUT'})).rejects.toThrow('14세');
});
it('round trips encrypted records and rejects wrong passwords and tampering',async()=>{
 await localApi('/api/body-composition',measurement);const backup=await localApi('/api/privacy/backup');
 const text=await encryptBackup(backup,'long-password-123');expect(text).not.toContain('skeletal_muscle_mass');
 await expect(decryptBackup(text,'wrong-password-123')).rejects.toThrow('기존 기록');
 const tampered=JSON.parse(text);tampered.data=(tampered.data[0]==='A'?'B':'A')+tampered.data.slice(1);await expect(decryptBackup(JSON.stringify(tampered),'long-password-123')).rejects.toThrow();
 await localApi('/api/privacy/health-data',{confirmation:'DELETE'},{method:'DELETE'});
 await localApi('/api/privacy/restore',{confirmation:'RESTORE',backup:await decryptBackup(text,'long-password-123')});
 expect((await localApi('/api/privacy/export')).measurements[0]).toMatchObject(measurement);
 const duplicate=structuredClone(backup);duplicate.document.measurements.push(duplicate.document.measurements[0]);await expect(localApi('/api/privacy/restore',{confirmation:'RESTORE',backup:duplicate})).rejects.toThrow('중복');
 const broken=structuredClone(backup);broken.document.measurements[0].weight=-1;
 await expect(localApi('/api/privacy/restore',{confirmation:'RESTORE',backup:broken})).rejects.toThrow();expect((await localApi('/api/privacy/export')).measurements).toHaveLength(1);
});
it('blocks a personal release until real-device and real-video acceptance is recorded',()=>{
 const e={VITE_LOCAL_ONLY:'true',VITE_RELEASE_BUILD:'true',VITE_LAUNCH_MODE:'free',SYNEX_APPLICATION_ID:'com.synex.health.personal',SYNEX_VERSION_CODE:'122'};
 expect(validateRelease(e)).toHaveLength(2);
 expect(validateRelease({...e,PERSONAL_DEVICE_QA_VERIFIED:'true',PERSONAL_POSE_QA_VERIFIED:'true'})).toEqual([]);
 expect(validateRelease({...e,VITE_API_BASE:'https://server.invalid'}).join(' ')).toContain('local data');
});
