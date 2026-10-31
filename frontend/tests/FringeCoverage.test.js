import {it,expect} from 'vitest';
import * as THREE from 'three';
import {buildAuthoredHair} from '../src/health/components/character/authoredHair.js';
import {characterSurface,DEFAULT_CHARACTER,eyeCenterX} from '../src/health/components/character/character.js';
import {personalizedVertices} from '../src/health/components/body3d/avatar.js';
import mesh from '../src/health/components/body3d/assets/human-mesh.json';

it.each(['male','female'].flatMap(body=>[-1,0,1].map(hairVolume=>[body,hairVolume])))('covers the %s forehead at volume %s while leaving both irises visible',(body,hairVolume)=>{
 const c={...DEFAULT_CHARACTER,body,face:'refined',hairStyle:'sleek',eyeSize:.55,hairVolume};
 const base=characterSurface(personalizedVertices({}, {gender:body}),c);
 const hair=buildAuthoredHair(base,1,new THREE.Vector3(),c,mesh.indices);
 const skin=new THREE.BufferGeometry();skin.setAttribute('position',new THREE.BufferAttribute(base,3));skin.setIndex(mesh.indices);
 const material=new THREE.MeshBasicMaterial({side:THREE.DoubleSide}),locks=new THREE.Mesh(hair.locks,material),face=new THREE.Mesh(skin,material),ray=new THREE.Raycaster();
 try{
  for(const x of [-.025,0,.025])for(const y of [1.714,1.73]){
   ray.set(new THREE.Vector3(x,y,.4),new THREE.Vector3(0,0,-1));const a=ray.intersectObject(locks)[0],b=ray.intersectObject(face)[0];
   expect(a,`missing fringe ${x}/${y}`).toBeDefined();expect(b).toBeDefined();expect(a.distance).toBeLessThan(b.distance);
  }
  for(const side of [-1,1])for(const dx of [-.007,0,.007])for(const y of [1.662,1.666]){
   ray.set(new THREE.Vector3(side*eyeCenterX(c)+dx,y,.4),new THREE.Vector3(0,0,-1));const hits=ray.intersectObject(locks);
   // The visible eye is in front of z=.125; hair behind the head is allowed.
   expect(hits.some(h=>h.point.z>.125),`covered eye ${side}/${dx}/${y}`).toBe(false);
  }
 }finally{hair.cap.dispose();hair.locks.dispose();skin.dispose();material.dispose();}
});
