import {it,expect} from 'vitest';
import * as THREE from 'three';
import {characterSurface,DEFAULT_CHARACTER} from '../src/health/components/character/character.js';
import {personalizedVertices} from '../src/health/components/body3d/avatar.js';
import {faceBlinkSurface} from '../src/health/components/character/faceExpression.js';
import {scleraGeometry,visibleIrisGeometry} from '../src/health/components/character/eyeSurface.js';
it('changes the portrait face while preserving the body, supports and input mesh',()=>{
 const base=personalizedVertices({}, {gender:'female'}),original=base.slice();
 const portrait=characterSurface(base,{...DEFAULT_CHARACTER,body:'female',face:'refined'});
 expect(base).toEqual(original);let changed=0;
 for(let i=0;i<base.length;i+=3){
  if(base[i+1]<1.54)expect(portrait.slice(i,i+3)).toEqual(base.slice(i,i+3));
  else for(let k=0;k<3;k++){expect(Number.isFinite(portrait[i+k])).toBe(true);expect(Math.abs(portrait[i+k]-base[i+k])).toBeLessThan(.025);if(portrait[i+k]!==base[i+k])changed++;}
 }
 expect(changed).toBeGreaterThan(1000);
});
it('blinks the actual lid skin without changing the mouth, limbs or cached source',()=>{
 const base=personalizedVertices({}, {gender:'female'}),original=base.slice(),closed=faceBlinkSurface(base,1,.777);
 expect(faceBlinkSurface(base,1,0)).toBe(base);expect(base).toEqual(original);let changed=0;
 for(let i=0;i<base.length;i+=3){
  if(base[i+1]<1.64||base[i+1]>1.687||base[i+2]<.095)expect(closed.slice(i,i+3)).toEqual(base.slice(i,i+3));
  for(let k=0;k<3;k++){expect(Number.isFinite(closed[i+k])).toBe(true);expect(Math.abs(closed[i+k]-base[i+k])).toBeLessThan(.01);}
  if(closed[i+1]!==base[i+1])changed++;
 }
 expect(changed).toBeGreaterThan(50);
});
it('curves the visible eye and clips the iris as lids close instead of painting over it',()=>{
 const open=scleraGeometry(),closed=scleraGeometry(1,1),iris=visibleIrisGeometry(1,.0057,.5);
 try{
  open.computeBoundingBox();closed.computeBoundingBox();
  expect(open.boundingBox.max.z-open.boundingBox.min.z).toBeGreaterThan(.002);
  expect(closed.boundingBox.max.y-closed.boundingBox.min.y).toBeLessThan(.0005);
  expect(iris.attributes.position.array.every(Number.isFinite)).toBe(true);
  expect(iris.attributes.uv.array.every(v=>v>=0&&v<=1)).toBe(true);
 }finally{open.dispose();closed.dispose();iris.dispose();}
});

it('keeps the iris ahead of the white eye surface across the visible opening',()=>{
 for(const closure of [0,.5]){
  const white=scleraGeometry(1,closure),iris=visibleIrisGeometry(1,.0057,closure);
  const material=new THREE.MeshBasicMaterial({side:THREE.DoubleSide}),whiteMesh=new THREE.Mesh(white,material),irisMesh=new THREE.Mesh(iris,material);
  const ray=new THREE.Raycaster();
  try{
   for(const x of [-.004,-.002,0,.002,.004])for(const y of [-.0007,0,.001]){
    ray.set(new THREE.Vector3(x,y,.03),new THREE.Vector3(0,0,-1));
    const a=ray.intersectObject(whiteMesh)[0],b=ray.intersectObject(irisMesh)[0];
    expect(a).toBeDefined();expect(b).toBeDefined();expect(b.distance).toBeLessThan(a.distance-.00007);
   }
  }finally{white.dispose();iris.dispose();material.dispose();}
 }
});
