import 'fake-indexeddb/auto';
import {webcrypto} from 'node:crypto';
import {it,expect,beforeEach,afterEach,vi} from 'vitest';
import {localApi} from '../src/shared/lib/localApi.js';
import {bindOfflineAccount,clearOffline,lockOffline,loadLocalDocument} from '../src/shared/lib/offline.js';
import {LOCAL_ACCOUNT,LOCAL_NAMESPACE} from '../src/shared/lib/localMode.js';
const measurement={measurement_date:'2026-01-01',weight:60,height:165,skeletal_muscle_mass:24,body_fat_percentage:25,segments:[]};
beforeEach(async()=>{vi.stubGlobal('crypto',webcrypto);await bindOfflineAccount(LOCAL_ACCOUNT,LOCAL_NAMESPACE);});
afterEach(async()=>{await clearOffline();vi.unstubAllGlobals();});
it('works without any HTTP and persists actual entries through reopening',async()=>{
 const fetch=vi.fn(()=>{throw Error('HTTP forbidden');});vi.stubGlobal('fetch',fetch);
 await expect(localApi('/api/body-composition/latest')).rejects.toMatchObject({status:404});
 await localApi('/api/health/profile',{height:165,gender:'female'},{method:'PUT'});
 await localApi('/api/health/school',{school_id:'yonsei-mirae',share_with_center:false},{method:'PUT'});
 const m=await localApi('/api/body-composition',measurement);const r=await localApi('/api/exercise-routines/generate',{});
 expect(r.exercises.length).toBeGreaterThan(0);expect(r.input_snapshot.muscle_kg).toBe(24);
 const record={date:'2026-01-01',exercise_name:r.exercises[0].exercise_name,routine_id:r.id,routine_exercise_id:r.exercises[0].exercise_id,mutation_id:'once',pain:0,completed:true};
 await localApi('/api/workouts',record);await localApi('/api/workouts',record);
 lockOffline();await bindOfflineAccount(LOCAL_ACCOUNT,LOCAL_NAMESPACE);
 expect((await localApi('/api/health/profile')).gender).toBe('female');expect((await localApi('/api/health/profile')).school_id).toBe('yonsei-mirae');expect((await localApi('/api/body-composition/latest')).id).toBe(m.id);
 expect(await localApi('/api/workouts')).toHaveLength(1);expect(fetch).not.toHaveBeenCalled();
 const db=await new Promise(resolve=>{const q=indexedDB.open('synex-workout-outbox-v1');q.onsuccess=()=>resolve(q.result);});
 const rows=await new Promise(resolve=>{const q=db.transaction('snapshots').objectStore('snapshots').getAll();q.onsuccess=()=>resolve(q.result);});db.close();expect(JSON.stringify(rows)).not.toContain('female');
});
it('refuses unsafe input and never fabricates reference averages',async()=>{
 await expect(localApi('/api/body-composition',{...measurement,skeletal_muscle_mass:61})).rejects.toThrow('골격근량');
 await expect(localApi('/api/body-composition',{...measurement,measurement_date:'2026-02-30'})).rejects.toThrow('측정일');
 await localApi('/api/body-composition',measurement);expect((await localApi('/api/body-map/latest')).average_comparison.groups).toEqual([]);
 await localApi('/api/exercise-profile',{safety_chest_pain:true},{method:'PUT'});await expect(localApi('/api/exercise-routines/generate',{})).rejects.toMatchObject({status:409});
 await expect(localApi('/api/health/school',{school_id:'yonsei-mirae',share_with_center:true},{method:'PUT'})).rejects.toThrow('공유');
});
it('adjusts the routine to goals and equipment and flags changed conditions',async()=>{
 await localApi('/api/body-composition',measurement);
 const first=await localApi('/api/exercise-routines/generate',{});expect(first.exercises.every(e=>e.equipment.length===0)).toBe(true);
 await localApi('/api/exercise-profile',{goal:'FAT_MANAGEMENT',minutes_per_session:20},{method:'PUT'});
 expect((await localApi('/api/exercise-routines'))[0].needs_review).toBe(true);
 const next=await localApi('/api/exercise-routines/generate',{});expect(next.exercises.some(e=>e.dose_type==='duration')).toBe(true);
 await localApi('/api/workouts',{date:'2026-10-07',exercise_name:'운동',pain:5,mutation_id:'pain'});
 await expect(localApi('/api/exercise-routines/generate',{})).rejects.toMatchObject({status:409});
});
it('deletes device health data and fails visibly when storage is locked',async()=>{
 await localApi('/api/body-composition',measurement);await localApi('/api/privacy/health-data',{confirmation:'DELETE'},{method:'DELETE'});
 expect((await loadLocalDocument()).measurements).toEqual([]);lockOffline();await expect(localApi('/api/health/profile')).rejects.toThrow('저장소');
 await bindOfflineAccount(LOCAL_ACCOUNT,LOCAL_NAMESPACE);
});
it('preserves body girths, bone/mineral fields and reference eligibility through encrypted restart',async()=>{
 await expect(localApi('/api/health/profile',{birth_date:'2026-02-30'},{method:'PUT'})).rejects.toThrow('생년월일');
 await localApi('/api/health/profile',{birth_date:'1996-01-01',gender:'female'},{method:'PUT'});
 await expect(localApi('/api/body-composition',{...measurement,waist_circumference:0})).rejects.toThrow('허리둘레');
 await expect(localApi('/api/body-composition',{...measurement,body_fat_percentage:90})).rejects.toThrow('합');
 const values={...measurement,chest_circumference:90,waist_circumference:75,hip_circumference:96,bone_mass:2.4,mineral_mass:3};
 await localApi('/api/body-composition',values);lockOffline();await bindOfflineAccount(LOCAL_ACCOUNT,LOCAL_NAMESPACE);
 expect((await localApi('/api/body-map/latest')).body_profile.birth_date).toBe('1996-01-01');
 expect((await localApi('/api/privacy/export')).measurements[0]).toMatchObject(values);
});
