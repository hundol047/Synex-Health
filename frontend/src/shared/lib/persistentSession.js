import {Capacitor} from '@capacitor/core';
import {setAccessToken} from './session.js';
const KEY='synex.login-session.v1';
let generation=0,operations=Promise.resolve();
function serialized(fn){const next=operations.then(fn);operations=next.catch(()=>{});return next;}
async function storage(){
 const {SecureStorage,KeychainAccess}=await import('@aparajita/capacitor-secure-storage');
 await SecureStorage.setSynchronize(false);
 await SecureStorage.setDefaultKeychainAccess(KeychainAccess.whenUnlockedThisDeviceOnly);
 // Do not return a Capacitor proxy directly: its synthetic `then` is a thenable.
 return {store:SecureStorage};
}
export async function clearRememberedSession(){
 generation++;
 if(!Capacitor.isNativePlatform())return;
 await serialized(async()=>{const {store}=await storage();await store.remove(KEY);});
}
export async function rememberNativeSession(session,apiBase){
 if(!Capacitor.isNativePlatform())throw Error('Native secure storage required');
 if(!session.session_token?.startsWith('synex-session.')||!(session.expires_in>0&&session.expires_in<=28800))throw Error('Invalid session');
 const version=generation;
 await serialized(async()=>{
  const {store}=await storage();
  if(version!==generation)return;
  await store.set(KEY,{token:session.session_token,apiBase,expires:Date.now()+session.expires_in*1000});
 });
 if(version===generation)setAccessToken(session.session_token);
}
export async function restoreRememberedSession(apiBase){
 if(!Capacitor.isNativePlatform())return;
 const version=generation;
 await serialized(async()=>{
  const {store}=await storage(),saved=await store.get(KEY);
  if(version!==generation)return;
  if(saved&&saved.apiBase===apiBase&&Number.isFinite(saved.expires)&&saved.expires>Date.now()&&saved.expires<=Date.now()+28800000&&saved.token?.startsWith('synex-session.'))setAccessToken(saved.token);
  else if(saved)await store.remove(KEY);
 });
}
