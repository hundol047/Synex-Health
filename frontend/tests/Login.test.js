import {describe,it,expect} from 'vitest';
import {selectLoginConfig,authorizationParameters,validateLoginRequest} from '../src/shared/lib/login.js';
const redirectUri='https://health.test/auth/callback';
const config={issuer:'https://id.test/',client_id:'web',native_client_id:'native',audience:'health-api',redirect_urls:[redirectUri,'com.synex.health://auth/callback']};
describe('login configuration',()=>{
 it('selects the web and native clients with exact callbacks',()=>{
  expect(selectLoginConfig(config,false,redirectUri).client_id).toBe('web');
  expect(selectLoginConfig(config,true,'com.synex.health://auth/callback').client_id).toBe('native');
  expect(()=>selectLoginConfig(config,false,'https://evil.test/auth/callback')).toThrow();
  expect(()=>selectLoginConfig(null,false,redirectUri)).toThrow();
 });
 it('requests an API token with PKCE, without refresh by default',()=>{
  const params=authorizationParameters(config,{state:'random',challenge:'hash',redirectUri});
  expect(params.get('audience')).toBe('health-api');
  expect(params.get('code_challenge_method')).toBe('S256');
  expect(params.get('scope')).toBe('openid profile');
  expect(params.has('client_secret')).toBe(false);
 });
 const received=new URL(redirectUri+'?state=random&code=code');
 const saved={state:'random',created:1000,verifier:'a'.repeat(43),redirect_uri:redirectUri,config};
 it('accepts only the matching recent login transaction',()=>{
  expect(validateLoginRequest(JSON.stringify(saved),received,redirectUri,2000)).toEqual(saved);
 });
 it.each([null,'broken',JSON.stringify({...saved,state:'different'}),JSON.stringify({...saved,created:NaN}),JSON.stringify({...saved,created:3000}),JSON.stringify({...saved,redirect_uri:'https://evil.test/auth/callback'})])('rejects invalid transaction %s',raw=>{
  expect(()=>validateLoginRequest(raw,received,redirectUri,2000)).toThrow();
 });
 it('rejects expired transactions',()=>expect(()=>validateLoginRequest(JSON.stringify(saved),received,redirectUri,601001)).toThrow());
});
