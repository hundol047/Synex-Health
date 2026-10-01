import 'fake-indexeddb/auto';
import {webcrypto} from 'node:crypto';
import {beforeAll,afterEach,it,expect,vi} from 'vitest';
import * as offline from '../src/shared/lib/offline.js';
beforeAll(()=>vi.stubGlobal('crypto',webcrypto));
afterEach(async()=>{await offline.clearOffline();});
const body=(change={})=>({routine_id:'r',date:'2026-10-01',day_number:1,routine_exercise_id:'d1-squat',exercise_name:'스쿼트',mutation_id:crypto.randomUUID(),expected_revision:0,...change});
it('encrypts a pending record and restores after module reload only for the verified account',async()=>{
 await offline.bindOfflineAccount('account-A','server'); const workout=body(); await offline.queueWorkout(workout);
 const db=await new Promise(resolve=>{const r=indexedDB.open('synex-workout-outbox-v1');r.onsuccess=()=>resolve(r.result);});
 const rows=await new Promise(resolve=>{const r=db.transaction('records').objectStore('records').getAll();r.onsuccess=()=>resolve(r.result);});db.close();
 expect(JSON.stringify(rows)).not.toContain('스쿼트');expect(rows[0].data.byteLength).toBeGreaterThan(0);
 offline.lockOffline();vi.resetModules();const fresh=await import('../src/shared/lib/offline.js');
 await fresh.bindOfflineAccount('account-B','server');expect(fresh.offlineState().pending).toBe(0);await fresh.clearOffline();
 await fresh.bindOfflineAccount('account-A','server');expect(fresh.offlineState().entries[0].body).toEqual(workout);
 const send=vi.fn().mockRejectedValueOnce(Error('offline')).mockResolvedValueOnce({revision:1});
 await expect(fresh.syncWorkouts(send)).rejects.toThrow('offline');expect(fresh.offlineState().pending).toBe(1);
 await fresh.syncWorkouts(send);expect(fresh.offlineState().pending).toBe(0);await fresh.clearOffline();
});
it('keeps conflicts until explicit resolution and never silently overwrites a pending edit',async()=>{
 await offline.bindOfflineAccount('conflict');const a=body();await offline.queueWorkout(a);
 await expect(offline.queueWorkout(body({pain:4}))).rejects.toThrow('미전송');
 const send=vi.fn().mockRejectedValue(Object.assign(Error('conflict'),{status:409,data:{detail:{current:{revision:3,sets_completed:2}}}}));
 await expect(offline.syncWorkouts(send)).rejects.toThrow();const item=offline.offlineState().entries[0];
 expect(item.conflict.revision).toBe(3);await expect(offline.syncWorkouts(send)).rejects.toThrow();expect(send).toHaveBeenCalledTimes(1);
 await offline.resolvePending(item.id,3);expect(offline.offlineState().entries[0].body.expected_revision).toBe(3);
 expect(offline.offlineState().entries[0].body.mutation_id).not.toBe(a.mutation_id);
 await offline.syncWorkouts(vi.fn().mockResolvedValue({revision:4}));expect(offline.offlineState().pending).toBe(0);
});
it('logout deletes ciphertext and key and late requests cannot recreate the account queue',async()=>{
 await offline.bindOfflineAccount('logout');await offline.queueWorkout(body());await offline.clearOffline();
 await expect(offline.queueWorkout(body())).rejects.toThrow();await offline.bindOfflineAccount('logout');expect(offline.offlineState().pending).toBe(0);
});
it('an expired session locks pending records without discarding them',async()=>{
 await offline.bindOfflineAccount('expired');await offline.queueWorkout(body());window.dispatchEvent(new Event('synex-session-expired'));
 expect(offline.offlineState().pending).toBe(0);await offline.bindOfflineAccount('expired');expect(offline.offlineState().pending).toBe(1);
});
it('storage refusal never reports an unsaved workout as pending',async()=>{
 await offline.clearOffline();await expect(offline.queueWorkout(body())).rejects.toThrow('로그인');expect(offline.offlineState().pending).toBe(0);
});
