import 'fake-indexeddb/auto';
import {webcrypto} from 'node:crypto';
import {it,expect,vi,beforeEach,afterEach} from 'vitest';
const {values,get,set,configured}=vi.hoisted(()=>({values:new Map(),get:vi.fn(),set:vi.fn(),configured:vi.fn()}));
vi.mock('@capacitor/core',()=>({Capacitor:{isNativePlatform:()=>true}}));
vi.mock('@aparajita/capacitor-secure-storage',()=>({KeychainAccess:{whenUnlockedThisDeviceOnly:'device'},SecureStorage:{setSynchronize:async()=>{},setDefaultKeychainAccess:configured,get,set,remove:async k=>values.delete(k)}}));
import * as offline from '../src/shared/lib/offline.js';
beforeEach(()=>{
 vi.stubGlobal('crypto',webcrypto);
 get.mockReset().mockImplementation(async k=>values.get(k));
 set.mockReset().mockImplementation(async(k,v)=>values.set(k,v));
 configured.mockReset().mockResolvedValue();
});
afterEach(()=>{offline.lockOffline();vi.useRealTimers();vi.unstubAllGlobals();});

it('releases the initialization queue when the native bridge never answers a read',async()=>{
 vi.useFakeTimers({toFake:['setTimeout','clearTimeout']});
 get.mockImplementationOnce(()=>new Promise(()=>{}));
 const first=offline.bindOfflineAccount('native-read-timeout');
 await vi.waitFor(()=>expect(get).toHaveBeenCalled());
 await vi.advanceTimersByTimeAsync(8000);await first;
 expect(offline.offlineState().ready).toBe(false);
 expect(offline.offlineState().storageError).toContain('응답이 늦어지고');
 vi.useRealTimers();await offline.bindOfflineAccount('native-read-timeout');
 expect(offline.offlineState().ready).toBe(true);
 await offline.saveLocalDocument({saved:true});
 offline.lockOffline();await offline.bindOfflineAccount('native-read-timeout');
 expect(await offline.loadLocalDocument()).toEqual({saved:true});await offline.clearOffline();
});

it('never replaces a native key when a timed-out write is still in flight',async()=>{
 vi.useFakeTimers({toFake:['setTimeout','clearTimeout']});let finish;
 set.mockImplementationOnce((k,v)=>new Promise(resolve=>{finish=()=>{values.set(k,v);resolve();};}));
 const first=offline.bindOfflineAccount('native-write-timeout');
 await vi.waitFor(()=>expect(set).toHaveBeenCalledTimes(1));
 await vi.advanceTimersByTimeAsync(8000);await first;
 const original=set.mock.calls[0][1];
 const second=offline.bindOfflineAccount('native-write-timeout');
 // Wait until retry has passed IndexedDB and entered the secure storage bridge.
 await vi.waitFor(()=>expect(configured).toHaveBeenCalledTimes(2));
 await vi.advanceTimersByTimeAsync(8000);await second;
 expect(offline.offlineState().ready).toBe(false);expect(set).toHaveBeenCalledTimes(1);
 finish();vi.useRealTimers();await offline.bindOfflineAccount('native-write-timeout');
 expect(offline.offlineState().ready).toBe(true);
 expect(set).toHaveBeenCalledTimes(1);expect([...values.values()]).toContainEqual(original);
 await offline.clearOffline();
});

it('cancels startup work and ignores a late native response after retry',async()=>{
 let late;get.mockImplementationOnce(()=>new Promise(resolve=>{late=resolve;}));
 const controller=new AbortController();
 const first=offline.bindOfflineAccount('native-cancel','',{signal:controller.signal});
 await vi.waitFor(()=>expect(get).toHaveBeenCalled());controller.abort();await first;
 expect(offline.offlineState().ready).toBe(false);
 await offline.bindOfflineAccount('native-cancel');expect(offline.offlineState().ready).toBe(true);
 const calls=set.mock.calls.length;late(null);await Promise.resolve();
 expect(set).toHaveBeenCalledTimes(calls);
 await offline.saveLocalDocument({afterRetry:true});await offline.clearOffline();
});

it('recovers the persisted key when Android saves it but loses the write callback',async()=>{
 vi.useFakeTimers({toFake:['setTimeout','clearTimeout']});
 set.mockImplementationOnce((k,v)=>{values.set(k,v);return new Promise(()=>{});});
 const first=offline.bindOfflineAccount('native-lost-write-callback');
 await vi.waitFor(()=>expect(set).toHaveBeenCalledTimes(1));
 await vi.advanceTimersByTimeAsync(8000);await first;
 expect(offline.offlineState().ready).toBe(false);
 vi.useRealTimers();await offline.bindOfflineAccount('native-lost-write-callback');
 expect(offline.offlineState().ready).toBe(true);expect(set).toHaveBeenCalledTimes(1);
 await offline.saveLocalDocument({preserved:true});
 offline.lockOffline();await offline.bindOfflineAccount('native-lost-write-callback');
 expect(await offline.loadLocalDocument()).toEqual({preserved:true});await offline.clearOffline();
});
