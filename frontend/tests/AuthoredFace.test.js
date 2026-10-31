import {it,expect,vi} from 'vitest';
import * as THREE from 'three';
import {MeshBVH} from 'three-mesh-bvh';
import mesh from '../src/health/components/body3d/assets/human-mesh.json';
import {personalizedVertices} from '../src/health/components/body3d/avatar.js';
import {characterSurface,DEFAULT_CHARACTER} from '../src/health/components/character/character.js';
import {buildAuthoredFace,fittedEyeLayout,authoredEyeMaterial} from '../src/health/components/character/authoredFaceGeometry.js';
import {faceBlinkSurface} from '../src/health/components/character/faceExpression.js';

function skinTree(base){
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.BufferAttribute(base,3));geometry.setIndex(mesh.indices);
 return {geometry,tree:new MeshBVH(geometry)};
}

it.each(['male','female'].flatMap(body=>['refined','studio'].flatMap(face=>[-1,0,1].map(eyeSize=>[body,face,eyeSize]))))('fits %s %s eyes at size %s inside the actual eyelid openings',(body,face,eyeSize)=>{
 const character={...DEFAULT_CHARACTER,body,face,eyeSize};
 const base=characterSurface(personalizedVertices({}, {gender:body}),character),original=base.slice();
 const parts=buildAuthoredFace(base,new THREE.Vector3()),open=skinTree(base);
 const closed=skinTree(faceBlinkSurface(base,1,.777,character)),ray=new THREE.Ray();
 try{
  for(const eye of parts.eyes){
   expect(eye.radius).toBeGreaterThan(.009);expect(eye.radius).toBeLessThan(.018);
   expect(Math.abs(eye.center.x)).toBeGreaterThan(.025);expect(Math.abs(eye.center.x)).toBeLessThan(.04);
   const globeTree=new MeshBVH(eye.globe);
   for(const dx of [-.002,0,.002]){
    const origin=new THREE.Vector3(eye.center.x+dx,eye.center.y,.4);
    ray.set(origin.clone().sub(eye.center),new THREE.Vector3(0,0,-1));
    const globe=globeTree.raycastFirst(ray,THREE.DoubleSide);expect(globe).not.toBeNull();
    ray.set(origin,new THREE.Vector3(0,0,-1));
    const uncovered=open.tree.raycastFirst(ray,THREE.DoubleSide),covered=closed.tree.raycastFirst(ray,THREE.DoubleSide);
    expect(uncovered?.distance??Infinity,'open iris must be visible through the lid').toBeGreaterThan(globe.distance);
    expect(covered,'closed lid must cover the eye').not.toBeNull();
    expect(covered.distance,'skin must occlude the closed eye').toBeLessThan(globe.distance);
   }
  }
  const geometries=parts.eyes.flatMap(e=>[e.globe,e.cornea]).concat([parts.eyebrow,parts.eyelash]);
  expect(geometries.reduce((n,g)=>n+g.index.count/3,0)).toBeLessThan(7000);
  for(const g of geometries){
   expect(g.attributes.position.array.every(Number.isFinite)).toBe(true);
   expect(g.attributes.normal.array.every(Number.isFinite)).toBe(true);
  }
  expect(base).toEqual(original);
 }finally{parts.dispose();open.geometry.dispose();closed.geometry.dispose();}
});

it('scales fitted eyes with stature and never shares disposable viewer geometry',()=>{
 const base=personalizedVertices({}, {gender:'female'}),scaled=base.map(v=>v*.85);
 const a=fittedEyeLayout(base),b=fittedEyeLayout(scaled);
 for(let i=0;i<2;i++){
  expect(b[i].radius).toBeCloseTo(a[i].radius*.85,6);
  expect(b[i].center.distanceTo(a[i].center.clone().multiplyScalar(.85))).toBeLessThan(.000001);
 }
 const first=buildAuthoredFace(base,new THREE.Vector3()),second=buildAuthoredFace(base,new THREE.Vector3());
 try{
  const disposed=vi.fn();second.eyes[0].globe.addEventListener('dispose',disposed);
  expect(first.eyes[0].globe).not.toBe(second.eyes[0].globe);first.dispose();expect(disposed).not.toHaveBeenCalled();
  expect(second.eyes[0].globe.attributes.position.count).toBeGreaterThan(500);
 }finally{second.dispose();}
});

it('changes iris tint independently while keeping the shared atlas alive',()=>{
 const atlas=new THREE.Texture(),disposed=vi.fn();atlas.addEventListener('dispose',disposed);
 const brown=authoredEyeMaterial(atlas,'#543a29'),blue=authoredEyeMaterial(atlas,'#356ba5');
 try{
  const compile=material=>{const shader={uniforms:{},fragmentShader:'#include <map_fragment>'};material.onBeforeCompile(shader);return shader;};
  const a=compile(brown),b=compile(blue);
  expect(a.uniforms.irisTint.value.equals(b.uniforms.irisTint.value)).toBe(false);
  expect(a.fragmentShader).toContain('irisMask');expect(brown.map).toBe(atlas);
  brown.dispose();blue.dispose();expect(disposed).not.toHaveBeenCalled();
 }finally{atlas.dispose();}
});
