import {expect,it} from 'vitest';
import * as THREE from 'three';
import data from '../src/health/components/body3d/assets/human-mesh.json';
import {mannequinBase,mannequinPositions} from '../src/health/components/body3d/mannequinMath.js';
import {compositionAnatomicalRegions} from '../src/health/components/body3d/mannequinAnatomy.js';
import {BODY_FOCUS_AREAS,mannequinFocusBounds,focusCameraFrame} from '../src/health/components/body3d/mannequinFocus.js';

it('finds distinct nonempty anatomical areas on both real gender meshes at different heights',()=>{
 for(const gender of ['male','female'])for(const height of [150,195]){
  const base=mannequinBase(gender),regions=compositionAnatomicalRegions(base,data.indices);
  const positions=mannequinPositions(base,{height,weight:75,body_fat_percentage:25,skeletal_muscle_mass:30},{gender});
  const boxes=mannequinFocusBounds(positions,regions,height/178);
  for(const area of BODY_FOCUS_AREAS.filter(a=>a.id!=='whole')){
   const box=boxes[area.id];expect(box.isEmpty()).toBe(false);
   expect(box.getSize(new THREE.Vector3()).length()).toBeGreaterThan(.1);
  }
  expect(boxes.left_arm.min.x).toBeGreaterThan(0);expect(boxes.right_arm.max.x).toBeLessThan(0);
  expect(boxes.left_leg.min.x).toBeGreaterThan(0);expect(boxes.right_leg.max.x).toBeLessThan(0);
  expect(boxes.chest.min.y).toBeGreaterThan(boxes.abdomen.min.y);
  expect(boxes.abdomen.min.y).toBeGreaterThan(boxes.hips.min.y);
 }
});

it('fits every corner of a union of differently sized bodies from all four directions on narrow phones',()=>{
 const own=new THREE.Box3(new THREE.Vector3(.22,-.23,-.18),new THREE.Vector3(.60,.50,.22));
 const average=new THREE.Box3(new THREE.Vector3(.18,-.24,-.21),new THREE.Vector3(.65,.51,.24));
 const bounds=own.clone().union(average);
 for(const aspect of [.55,.85,1.5])for(const direction of [[0,0,1],[0,0,-1],[1,0,0],[-1,0,0]]){
  const frame=focusCameraFrame(bounds,new THREE.Vector3(...direction),aspect),camera=new THREE.PerspectiveCamera(38,aspect,.1,100);
  camera.position.copy(frame.position);camera.lookAt(frame.target);camera.updateMatrixWorld();
  for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){
   const point=new THREE.Vector3(x,y,z).project(camera);
   expect(Math.abs(point.x)).toBeLessThan(.83);expect(Math.abs(point.y)).toBeLessThan(.83);expect(point.z).toBeGreaterThan(-1);expect(point.z).toBeLessThan(1);
  }
  expect(frame.target.toArray()).toEqual(bounds.getCenter(new THREE.Vector3()).toArray());
 }
});
