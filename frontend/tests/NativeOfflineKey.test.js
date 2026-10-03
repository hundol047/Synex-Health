import {vi,it,expect,beforeEach} from 'vitest';
import {webcrypto} from 'node:crypto';
vi.mock('@capacitor/core',()=>({Capacitor:{isNativePlatform:()=>true}}));
const {values}=vi.hoisted(()=>({values:new Map()}));
vi.mock('@aparajita/capacitor-secure-storage',()=>({KeychainAccess:{whenUnlockedThisDeviceOnly:'device'},SecureStorage:{setSynchronize:vi.fn(),setDefaultKeychainAccess:vi.fn(),get:async key=>values.get(key),set:async(k,v)=>values.set(k,v),remove:async k=>values.delete(k)}}));
beforeEach(()=>{values.clear();vi.stubGlobal('crypto',webcrypto);});
it('keeps native key bytes in secure storage and restores a nonexportable AES key',async()=>{
 const {nativeOfflineKey,removeNativeOfflineKey,offlineEncryptionStatus}=await import('../src/shared/lib/offlineKey.js');
 const a=await nativeOfflineKey('account');expect(a.native).toBe(true);expect(a.key.extractable).toBe(false);
 const iv=crypto.getRandomValues(new Uint8Array(12)),plain=new TextEncoder().encode('private');
 const ciphertext=await crypto.subtle.encrypt({name:'AES-GCM',iv},a.key,plain);
 const b=await nativeOfflineKey('account',{id:a.id,native:true});expect(new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv},b.key,ciphertext))).toBe('private');
 expect(offlineEncryptionStatus().state).toBe('configured_not_verified');await removeNativeOfflineKey('account');
 await expect(nativeOfflineKey('account',{id:a.id,native:true})).rejects.toThrow('복구');
});
it('returns the legacy key only for explicit atomic migration',async()=>{
 const {nativeOfflineKey}=await import('../src/shared/lib/offlineKey.js');
 const legacy={};const next=await nativeOfflineKey('legacy',{key:legacy,id:'old'});expect(next.legacyKey).toBe(legacy);expect(next.key).not.toBe(legacy);expect(next.id).not.toBe('old');
});
it('atomically migrates encrypted legacy drafts and outbox into the secure key',async()=>{
 await import('fake-indexeddb/auto');
 const account=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode('|legacy-owner'))),b=>b.toString(16).padStart(2,'0')).join('');
 const key=await crypto.subtle.generateKey({name:'AES-GCM',length:256},false,['encrypt','decrypt']);
 const iv=crypto.getRandomValues(new Uint8Array(12)),id=account+':old-record';
 const value={id,body:{mutation_id:'old'},status:'PENDING'};
 const data=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:new TextEncoder().encode(id)},key,new TextEncoder().encode(JSON.stringify(value)));
 const db=await new Promise(resolve=>{const q=indexedDB.open('synex-workout-outbox-v1',3);q.onupgradeneeded=()=>{q.result.createObjectStore('keys');for(const n of ['records','drafts','snapshots'])q.result.createObjectStore(n,{keyPath:'id'}).createIndex('account','account');};q.onsuccess=()=>resolve(q.result);});
 await new Promise(resolve=>{const tx=db.transaction(['keys','records'],'readwrite');tx.objectStore('keys').put({key,id:'legacy-id'},account);tx.objectStore('records').put({id,account,mutation:'old',iv,data});tx.oncomplete=resolve;});db.close();
 const offline=await import('../src/shared/lib/offline.js');await offline.bindOfflineAccount('legacy-owner');expect(offline.offlineState().ready).toBe(true);expect(offline.offlineState().entries[0].body.mutation_id).toBe('old');
 offline.lockOffline();await offline.bindOfflineAccount('legacy-owner');expect(offline.offlineState().entries[0].body.mutation_id).toBe('old');await offline.clearOffline();
});
