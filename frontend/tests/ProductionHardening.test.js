import {it,expect} from 'vitest';
import {overlayPositions,interpolatePositions} from '../src/health/components/body3d/overlayMath.js';
import {morphPositions} from '../src/health/components/body3d/morph.js';
import {LocalBodyShapeProvider,RemoteBodyShapeProvider,multiViewPhotos} from '../src/shared/lib/bodyShape.js';
import {RenderPerformance} from '../src/health/components/body3d/renderPerformance.js';
it('non-finite, extreme or missing body values never corrupt finite input geometry',()=>{
 const base=new Float32Array([.3,1.2,.2,.1,.5,.1,0,1.1,.2]);
 for(const v of [NaN,Infinity,-Infinity,undefined,null,-1,0,1e308]){
  expect(overlayPositions(base,[2,4,1],{LEFT_ARM:v,LEFT_LEG:v,TRUNK:v},v).every(Number.isFinite)).toBe(true);
  expect(morphPositions(base,{height:v,weight:v,skeletal_muscle_mass:v,segments:[{segment:'TRUNK',lean_mass_kg:v}]}).every(Number.isFinite)).toBe(true);
  expect(interpolatePositions(base,base,v).every(Number.isFinite)).toBe(true);
 }
});
it('photo providers never synthesize unavailable results or hide server retention',async()=>{
 await expect(new LocalBodyShapeProvider().estimate({}, {consent:true})).rejects.toThrow();
 const local=new LocalBodyShapeProvider(async()=>({confidence:.8,shape:{height:1}}));
 const r=await local.estimate(multiViewPhotos({front:'a',side:'b'}),{consent:true});expect(r.source).toBe('local');expect(r.photo_retained).toBe(false);expect(r.generated_at).toBeTruthy();
 const remote=new RemoteBodyShapeProvider({estimate:async()=>({confidence:.9,photo_retained:true})});
 await expect(remote.estimate({}, {consent:true})).rejects.toThrow('별도 동의');
 await expect(remote.estimate({}, {consent:true,uploadConsent:true})).rejects.toThrow('사진 삭제');
});
it('renderer ignores idle gaps and lowers power only after sustained slow rendering',()=>{
 const m=new RenderPerformance();m.sample(0,5);expect(m.sample(10000,5).renderedFPS).toBeNull();expect(m.fallback).toBe(false);
 for(let t=10060;t<=13200;t+=60)m.sample(t,30);expect(m.fallback).toBe(true);
 const fast=new RenderPerformance();for(let t=0;t<=4000;t+=16)fast.sample(t,4);expect(fast.fallback).toBe(false);
});
