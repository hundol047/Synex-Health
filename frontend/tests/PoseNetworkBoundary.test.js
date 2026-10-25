import {describe,it,expect,vi} from 'vitest';
import {installPoseNetworkBoundary} from '../src/health/components/exercise/poseNetworkBoundary.js';

function environment(){
 const fetch=vi.fn().mockResolvedValue({ok:true});
 const open=vi.fn();
 class XHR{open(...args){return open(...args);}}
 const sendBeacon=vi.fn().mockReturnValue(true);
 const scope={location:{origin:'https://localhost',href:'https://localhost/assets/pose-worker.js'},fetch,XMLHttpRequest:XHR,navigator:{sendBeacon}};
 installPoseNetworkBoundary(scope);
 return {scope,fetch,open,sendBeacon};
}

describe('pose worker network boundary',()=>{
 it('allows packaged model/WASM and same-origin Request objects',async()=>{
  const {scope,fetch}=environment();
  await scope.fetch('/pose/pose_landmarker_lite.task');
  await scope.fetch(new URL('https://localhost/pose/wasm/vision_wasm_internal.wasm'));
  const request=new Request('https://localhost/pose/pose_landmarker_lite.task');
  await scope.fetch(request);
  expect(fetch).toHaveBeenCalledTimes(3);
  expect(fetch.mock.calls[2][0]).toBe(request);
 });
 it('rejects telemetry and external assets before making a request',async()=>{
  const {scope,fetch}=environment();
  for(const input of ['https://odml.pa.googleapis.com/v1/log','https://localhost.evil.test/model.task','//example.com/model.task','https://localhost:8000/model.task',new Request('https://example.com/model.task')]){
   await expect(scope.fetch(input)).rejects.toMatchObject({name:'SecurityError'});
  }
  expect(fetch).not.toHaveBeenCalled();
 });
 it('blocks XMLHttpRequest and beacon alternatives while allowing local calls',()=>{
  const {scope,open,sendBeacon}=environment();
  const xhr=new scope.XMLHttpRequest();
  expect(()=>xhr.open('POST','https://odml.pa.googleapis.com/v1/log')).toThrow();
  expect(open).not.toHaveBeenCalled();
  xhr.open('GET','/pose/wasm/vision_wasm_internal.wasm',true);
  expect(open).toHaveBeenCalledOnce();
  expect(scope.navigator.sendBeacon('https://odml.pa.googleapis.com/v1/log','metadata')).toBe(false);
  expect(sendBeacon).not.toHaveBeenCalled();
  expect(scope.navigator.sendBeacon('/local-test','data')).toBe(true);
  expect(sendBeacon).toHaveBeenCalledOnce();
 });
});
