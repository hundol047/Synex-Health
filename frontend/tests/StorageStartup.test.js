import 'fake-indexeddb/auto';
import {webcrypto} from 'node:crypto';
import {it,expect,vi,afterEach} from 'vitest';
import * as offline from '../src/shared/lib/offline.js';

afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();vi.useRealTimers();offline.lockOffline();});

it('actually reopens storage for the same account after a failed first attempt',async()=>{
 vi.stubGlobal('crypto',webcrypto);
 const open=vi.spyOn(indexedDB,'open').mockImplementationOnce(()=>{throw Error('storage temporarily unavailable');});
 await offline.bindOfflineAccount('retry-owner');
 expect(offline.offlineState().ready).toBe(false);
 await offline.bindOfflineAccount('retry-owner');
 expect(open.mock.calls.length).toBeGreaterThan(1);
 expect(offline.offlineState().ready).toBe(true);
 await offline.saveLocalDocument({profile:{name:'복구 후 저장'}});
 offline.lockOffline();await offline.bindOfflineAccount('retry-owner');
 expect(await offline.loadLocalDocument()).toEqual({profile:{name:'복구 후 저장'}});
 await offline.clearOffline();
});

it('a blocked database open settles and a late connection closes without poisoning retry',async()=>{
 vi.stubGlobal('crypto',webcrypto);vi.useFakeTimers();
 const request={};const close=vi.fn();
 const open=vi.spyOn(indexedDB,'open').mockImplementationOnce(()=>request);
 const attempt=offline.bindOfflineAccount('blocked-owner');
 await vi.waitFor(()=>expect(open).toHaveBeenCalled());
 await vi.advanceTimersByTimeAsync(8000);
 await attempt;
 expect(offline.offlineState().ready).toBe(false);
 request.result={close};request.onsuccess();expect(close).toHaveBeenCalled();
 vi.useRealTimers();await offline.bindOfflineAccount('blocked-owner');
 expect(offline.offlineState().ready).toBe(true);
 await offline.clearOffline();
});

it('aborts an unresponsive transaction so the retry queue can continue',async()=>{
 vi.stubGlobal('crypto',webcrypto);vi.useFakeTimers({toFake:['setTimeout','clearTimeout']});
 const stalled={objectStore:()=>({get:()=>({})}),abort:vi.fn()};
 const transaction=vi.spyOn(IDBDatabase.prototype,'transaction').mockReturnValueOnce(stalled);
 const first=offline.bindOfflineAccount('transaction-timeout');
 await vi.waitFor(()=>expect(transaction).toHaveBeenCalled());
 await vi.advanceTimersByTimeAsync(8000);await first;
 expect(stalled.abort).toHaveBeenCalled();expect(offline.offlineState().ready).toBe(false);
 vi.useRealTimers();await offline.bindOfflineAccount('transaction-timeout');
 expect(offline.offlineState().ready).toBe(true);await offline.clearOffline();
});
