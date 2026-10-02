import {it,expect,vi,beforeEach} from 'vitest';
const mocks=vi.hoisted(()=>({native:true,saved:null,store:{setSynchronize:vi.fn(),setDefaultKeychainAccess:vi.fn(),get:vi.fn(),set:vi.fn(),remove:vi.fn()}}));
vi.mock('@capacitor/core',()=>({Capacitor:{isNativePlatform:()=>mocks.native}}));
vi.mock('@aparajita/capacitor-secure-storage',()=>({SecureStorage:mocks.store,KeychainAccess:{whenUnlockedThisDeviceOnly:1}}));
import {clearRememberedSession,rememberNativeSession,restoreRememberedSession} from '../src/shared/lib/persistentSession.js';
import {setAccessToken,getAccessToken} from '../src/shared/lib/session.js';
beforeEach(async()=>{
 mocks.native=true;mocks.saved=null;setAccessToken('');
 mocks.store.get.mockImplementation(async()=>mocks.saved);
 mocks.store.set.mockImplementation(async(key,value)=>{mocks.saved=value;});
 mocks.store.remove.mockImplementation(async()=>{mocks.saved=null;});
 await clearRememberedSession();vi.clearAllMocks();
});
it('restores a bounded native session with device-only storage and clears it on logout',async()=>{
 await rememberNativeSession({session_token:'synex-session.secret',expires_in:28800},'https://api.test');
 expect(mocks.store.setSynchronize).toHaveBeenCalledWith(false);
 expect(mocks.store.setDefaultKeychainAccess).toHaveBeenCalledWith(1);
 expect(localStorage.getItem('synex.login-session.v1')).toBeNull();
 setAccessToken('');await restoreRememberedSession('https://api.test');expect(getAccessToken()).toBe('synex-session.secret');
 await clearRememberedSession();expect(mocks.saved).toBeNull();
});
it('never restores an expired session or a session for another API',async()=>{
 for(const saved of [{token:'synex-session.secret',expires:Date.now()-1,apiBase:'https://api.test'},{token:'synex-session.secret',expires:Date.now()+10000,apiBase:'https://other.test'}]){
  mocks.saved=saved;await restoreRememberedSession('https://api.test');expect(getAccessToken()).toBe('');expect(mocks.saved).toBeNull();
 }
});
it('logout wins over a pending secure-store restore',async()=>{
 let resolve;const waiting=new Promise(r=>{resolve=r;});mocks.store.get.mockReturnValueOnce(waiting);
 const restore=restoreRememberedSession('https://api.test');
 const clear=clearRememberedSession();
 resolve({token:'synex-session.old',expires:Date.now()+10000,apiBase:'https://api.test'});
 await Promise.all([restore,clear]);expect(getAccessToken()).toBe('');expect(mocks.saved).toBeNull();
});
it('does not fall back to browser storage when secure storage fails',async()=>{
 mocks.store.set.mockRejectedValueOnce(Error('keychain locked'));
 await expect(rememberNativeSession({session_token:'synex-session.secret',expires_in:28800},'https://api.test')).rejects.toThrow('keychain locked');
 expect(getAccessToken()).toBe('');
 mocks.native=false;await restoreRememberedSession('https://api.test');expect(mocks.store.get).not.toHaveBeenCalled();
});
