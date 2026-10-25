import {it,expect,vi} from 'vitest';
import {webcrypto} from 'node:crypto';

// Use the actual Capacitor and SecureStorage proxies; plain object mocks conceal
// Promise assimilation of the proxy's synthetic `then` method.
it('opens and restores native encrypted storage through the real Capacitor proxy',async()=>{
 vi.resetModules();vi.stubGlobal('crypto',webcrypto);
 const values=new Map(),calls=[];
 window.androidBridge={};
 window.Capacitor={PluginHeaders:[{name:'SecureStorage',methods:['internalGetItem','internalSetItem','internalRemoveItem'].map(name=>({name,rtype:'promise'}))}],nativePromise:async(plugin,method,options)=>{
  calls.push(method);const key=options.prefixedKey;
  if(method==='internalGetItem')return {data:values.get(key)??null};
  if(method==='internalSetItem'){values.set(key,options.data);return {};}
  if(method==='internalRemoveItem'){values.delete(key);return {success:true};}
  throw Error(`Unexpected native method: ${method}`);
 }};
 try{
  const {nativeOfflineKey,removeNativeOfflineKey}=await import('../src/shared/lib/offlineKey.js');
  const first=await nativeOfflineKey('real-bridge');
  expect(first.native).toBe(true);expect(first.key.extractable).toBe(false);
  const restored=await nativeOfflineKey('real-bridge',{native:true,id:first.id});
  expect(restored.id).toBe(first.id);expect(calls).not.toContain('then');
  const session=await import('../src/shared/lib/persistentSession.js');
  await session.rememberNativeSession({session_token:'synex-session.bridge',expires_in:60},'https://api.test');
  await session.restoreRememberedSession('https://api.test');
  const {getAccessToken}=await import('../src/shared/lib/session.js');
  expect(getAccessToken()).toBe('synex-session.bridge');
  await session.clearRememberedSession();await removeNativeOfflineKey('real-bridge');
  expect(values.size).toBe(0);
 }finally{delete window.androidBridge;delete window.Capacitor;vi.unstubAllGlobals();vi.resetModules();}
},10000);
