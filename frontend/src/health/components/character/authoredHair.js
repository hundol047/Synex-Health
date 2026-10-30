import * as THREE from 'three';
import layered from './assets/bob01.json';
import bob from './assets/bob02.json';
import pixie from './assets/short03.json';
const ASSETS={layered,bob,pixie};
export const hasAuthoredHair=style=>Boolean(ASSETS[style]);
// Fit local licensed hair cards to the selected cosmetic head, in meters.
export function buildAuthoredHair(base,scale,anchor,character){
 const data=ASSETS[character.hairStyle],positions=new Float32Array(data.vertices.length*3),colors=new Float32Array(positions.length).fill(1),flex=new Float32Array(data.vertices.length);
 const ratios=data.scales.map(([a,b,source],axis)=>Math.abs(base[a*3+axis]-base[b*3+axis])/source);
 const volume=THREE.MathUtils.clamp(character.hairVolume||0,-1,1),fitted=[];
 for(const [refs,weights,offset] of data.bindings){
  const p=[0,0,0];for(let axis=0;axis<3;axis++){
   for(let k=0;k<refs.length;k++)p[axis]+=base[refs[k]*3+axis]*weights[k];
   p[axis]+=offset[axis]*ratios[axis]*(1+volume*.13);
  }
  // Keep rear volume inside the support-wall clearance of the instructor head.
  const rear=-.05*scale;if(p[2]<rear)p[2]=rear+(p[2]-rear)*.32;
  if(character.hairStyle==='pixie'){
   const front=THREE.MathUtils.smoothstep(p[2]/scale,.105,.13)*(1-THREE.MathUtils.smoothstep(Math.abs(p[0])/scale,.055,.09));
   p[1]+=.04*scale*front*(1-THREE.MathUtils.smoothstep(p[1]/scale,1.68,1.76));
  }
  fitted.push(p);
 }
 data.vertices.forEach((source,i)=>{
  const p=fitted[source];positions.set(p.map((n,k)=>n-anchor.getComponent(k)),i*3);
  // Only the loose ends move; crown roots remain attached to the scalp.
  flex[i]=Math.pow(THREE.MathUtils.clamp((1.735-p[1]/scale)/.16,0,1),2)*.002;
 });
 const locks=new THREE.BufferGeometry();locks.setAttribute('position',new THREE.BufferAttribute(positions,3));locks.setAttribute('uv',new THREE.Float32BufferAttribute(data.uv,2));locks.setAttribute('color',new THREE.BufferAttribute(colors,3));locks.setAttribute('hairFlex',new THREE.BufferAttribute(flex,1));locks.setIndex(data.indices);locks.computeVertexNormals();
 const cap=new THREE.BufferGeometry();cap.setAttribute('position',new THREE.Float32BufferAttribute([],3));
 return {cap,locks,tie:new THREE.Vector3(0,1.70*scale,-.05*scale).sub(anchor)};
}
