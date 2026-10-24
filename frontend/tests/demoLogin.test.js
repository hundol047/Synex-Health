import {beforeEach,it,expect,vi} from 'vitest';
import {mockFetch} from './helpers.js';
vi.mock('@capacitor/core',()=>({Capacitor:{isNativePlatform:vi.fn(()=>false)}}));
vi.mock('../src/shared/lib/offline.js',()=>({clearOffline:vi.fn(),bindOfflineAccount:vi.fn(),offlineEpoch:()=>0,cacheResponse:vi.fn(),cachedResponse:vi.fn(),queueWorkout:vi.fn(),syncWorkouts:vi.fn(),prepareWorkout:x=>x,acknowledgeWorkout:vi.fn()}));
import {Capacitor} from '@capacitor/core';
import {setDemoUser,api,getDemoUser} from '../src/shared/lib/api.js';
import {setAccessToken} from '../src/shared/lib/session.js';
beforeEach(()=>{localStorage.clear();setAccessToken('');});
it.each([false,true])('switches with one login and uses the session for later requests (native=%s)',async native=>{
 Capacitor.isNativePlatform.mockReturnValue(native);
 const fetch=mockFetch({'/api/auth/demo-login':native?{session_token:'opaque',id:'counselor-demo'}:{id:'counselor-demo'},'/api/health/profile':{id:'counselor-demo'}});
 await setDemoUser('counselor-demo');await api('/api/health/profile');await api('/api/health/profile');
 expect(getDemoUser()).toBe('counselor-demo');
 expect(fetch.mock.calls.filter(([path])=>path==='/api/auth/demo-login')).toHaveLength(1);
 expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({demo_user_id:'counselor-demo',transport:native?'native':'web'});
 for(const [,options] of fetch.mock.calls.slice(1)){
  expect(options.headers['X-Synex-Demo-User']).toBeUndefined();expect(options.credentials).toBe('include');
  expect(options.headers.Authorization).toBe(native?'Bearer opaque':undefined);
 }
});
it('does not select the new role when login fails',async()=>{
 mockFetch({'/api/auth/demo-login':{status:422,body:{detail:'Unknown demo account'}}});
 await expect(setDemoUser('invalid')).rejects.toThrow('Unknown demo account');expect(getDemoUser()).toBe('student-jimin');
});
