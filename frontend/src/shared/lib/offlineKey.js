import {secureUUID} from './uuid.js';
import {Capacitor} from '@capacitor/core';
import {storageWait} from './storageWait.js';
// A native write cannot be cancelled. Retain its completion so retry cannot
// replace a key while an earlier write may still arrive at Android Keystore.
const keyWrites=new Map();
export const offlineEncryptionStatus=()=>({provider:Capacitor.isNativePlatform()?'os_secure_storage':'indexeddb_nonexportable_key',state:'configured_not_verified'});
async function vault(options){
 const {SecureStorage,KeychainAccess}=await storageWait(()=>import('@aparajita/capacitor-secure-storage'),options);
 await storageWait(()=>SecureStorage.setSynchronize(false),options);
 await storageWait(()=>SecureStorage.setDefaultKeychainAccess(KeychainAccess.whenUnlockedThisDeviceOnly),options);
 // Capacitor proxies expose a callable property for every name, including `then`.
 // Returning a proxy from an async function makes Promise assimilation hang.
 return {store:SecureStorage};
}
export async function nativeOfflineKey(account,existing,options){
 if(!Capacitor.isNativePlatform())return null;
 // Legacy IndexedDB keys are used only to re-encrypt existing rows before activation.
 const {store}=await vault(options),name=`synex.offline-key.${account}`;
 let saved=await storageWait(()=>store.get(name),options);
 const pending=keyWrites.get(name);
 if(pending){
  // The OS may have saved the key even when its completion callback was lost.
  // A matching read is safe: any late write contains these same key bytes.
  if(!saved){await storageWait(()=>pending.promise,options);saved=await storageWait(()=>store.get(name),options);}
  if(saved?.id!==pending.value.id||saved?.bytes?.length!==32||pending.value.bytes.some((b,i)=>saved.bytes[i]!==b))throw Error('기기 암호화 키 저장을 확인할 수 없습니다. 앱을 완전히 종료한 뒤 다시 열어주세요.');
 }
 if(existing?.native&&(!saved||saved.id!==existing.id))throw Error('기기 암호화 키를 복구할 수 없습니다.');
 if(!saved){
  saved={id:secureUUID(),bytes:Array.from(crypto.getRandomValues(new Uint8Array(32)))};
  const write=store.set(name,saved);keyWrites.set(name,{promise:write,value:saved});
  write.then(()=>keyWrites.delete(name),()=>keyWrites.delete(name));
  await storageWait(()=>write,options);
 }
 const key=await crypto.subtle.importKey('raw',new Uint8Array(saved.bytes),'AES-GCM',false,['encrypt','decrypt']);
 return {key,id:saved.id,native:true,legacyKey:existing?.key};
}
export async function removeNativeOfflineKey(account){if(Capacitor.isNativePlatform()){const {store}=await vault();await store.remove(`synex.offline-key.${account}`);}}
