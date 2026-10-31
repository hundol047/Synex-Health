import {it,expect} from 'vitest';
import * as THREE from 'three';
import {buildHairRoots} from '../src/health/components/character/hairRoots.js';
import {characterSurface,DEFAULT_CHARACTER} from '../src/health/components/character/character.js';
import {personalizedVertices} from '../src/health/components/body3d/avatar.js';
import mesh from '../src/health/components/body3d/assets/human-mesh.json';

it.each(['male','female'])('covers the %s central parting without painting the forehead',body=>{
 const base=characterSurface(personalizedVertices({}, {gender:body}),{...DEFAULT_CHARACTER,body,face:'refined'});
 const geometry=buildHairRoots(base,1,new THREE.Vector3(),mesh.indices,'sleek');
 const skinGeometry=new THREE.BufferGeometry();skinGeometry.setAttribute('position',new THREE.BufferAttribute(base,3));skinGeometry.setIndex(mesh.indices);
 const material=new THREE.MeshBasicMaterial({side:THREE.DoubleSide}),roots=new THREE.Mesh(geometry,material),skin=new THREE.Mesh(skinGeometry,material),ray=new THREE.Raycaster();
 const alphaAt=hit=>{const pos=geometry.attributes.position,c=geometry.attributes.color,f=hit.face;
  const bary=THREE.Triangle.getBarycoord(hit.point,new THREE.Vector3().fromBufferAttribute(pos,f.a),new THREE.Vector3().fromBufferAttribute(pos,f.b),new THREE.Vector3().fromBufferAttribute(pos,f.c),new THREE.Vector3());
  return bary.x*c.getW(f.a)+bary.y*c.getW(f.b)+bary.z*c.getW(f.c);
 };
 try{
  for(const x of [-.003,0,.003])for(const y of [1.757,1.762,1.767]){
   ray.set(new THREE.Vector3(x,y,.4),new THREE.Vector3(0,0,-1));const a=ray.intersectObject(roots)[0],b=ray.intersectObject(skin)[0];
   expect(a).toBeDefined();expect(b).toBeDefined();expect(a.distance).toBeLessThan(b.distance-.0001);expect(alphaAt(a)).toBeGreaterThan(.97);
  }
  for(const x of [-.03,0,.03]){
   ray.set(new THREE.Vector3(x,1.747,.4),new THREE.Vector3(0,0,-1));const a=ray.intersectObject(roots)[0],b=ray.intersectObject(skin)[0];
   expect(b).toBeDefined();if(a&&a.distance<b.distance)expect(alphaAt(a)).toBeLessThan(.05);
  }
  expect(geometry.attributes.position.array.every(Number.isFinite)).toBe(true);
 }finally{geometry.dispose();skinGeometry.dispose();material.dispose();}
});
