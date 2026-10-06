import {secureUUID} from './uuid.js';
import {Capacitor} from '@capacitor/core';
export const offlineEncryptionStatus=()=>({provider:Capacitor.isNativePlatform()?'os_secure_storage':'indexeddb_nonexportable_key',state:'configured_not_verified'});
async function vault(){
 const {SecureStorage,KeychainAccess}=await import('@aparajita/capacitor-secure-storage');
 await SecureStorage.setSynchronize(false);
 await SecureStorage.setDefaultKeychainAccess(KeychainAccess.whenUnlockedThisDeviceOnly);
 return SecureStorage;
}
export async function nativeOfflineKey(account,existing){
 if(!Capacitor.isNativePlatform())return null;
 // Legacy IndexedDB keys are used only to re-encrypt existing rows before activation.
 const store=await vault(),name=`synex.offline-key.${account}`;
 let saved=await store.get(name);
 if(existing?.native&&(!saved||saved.id!==existing.id))throw Error('기기 암호화 키를 복구할 수 없습니다.');
 if(!saved){saved={id:secureUUID(),bytes:Array.from(crypto.getRandomValues(new Uint8Array(32)))};await store.set(name,saved);}
 const key=await crypto.subtle.importKey('raw',new Uint8Array(saved.bytes),'AES-GCM',false,['encrypt','decrypt']);
 return {key,id:saved.id,native:true,legacyKey:existing?.key};
}
export async function removeNativeOfflineKey(account){if(Capacitor.isNativePlatform())await (await vault()).remove(`synex.offline-key.${account}`);}
