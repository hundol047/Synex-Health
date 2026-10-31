import * as THREE from 'three';
import {MeshBVH} from 'three-mesh-bvh';
import {subdivideHair} from './hairSubdivision.js';
import bodyMesh from '../body3d/assets/human-mesh.json';
import eyes from './assets/eye-globes.json';
import brows from './assets/natural-brows.json';
import lashes from './assets/natural-lashes.json';

// MHCLO graphical bindings follow the actual head surface; no forward-facing
// almond is pasted over the socket. Keep the original opaque/cornea islands.
export function fitFacePoints(data,base){
 const ratios=data.scales.map(([a,b,source],axis)=>Math.abs(base[a*3+axis]-base[b*3+axis])/source);
 return data.bindings.map(([refs,weights,offset])=>offset.map((v,axis)=>v*ratios[axis]+refs.reduce((sum,index,k)=>sum+base[index*3+axis]*weights[k],0)));
}
function eyeCenters(points){
 return ['right','left'].map(side=>{
  const refs=[...new Set(eyes.groups[side+'-surface'].map(i=>eyes.vertices[i]))];
  const box=new THREE.Box3().setFromPoints(refs.map(i=>new THREE.Vector3(...points[i])));
  const center=box.getCenter(new THREE.Vector3()),radius=(box.max.x-box.min.x)/2;
  center.z=box.max.z-radius;
  return {side,center,radius,front:box.max.z};
 });
}
const layouts=new WeakMap();
export function fittedEyeLayout(base){
 if(!layouts.has(base))layouts.set(base,eyeCenters(fitFacePoints(eyes,base)));
 return layouts.get(base);
}
function geometry(data,points,indices,origin){
 const g=new THREE.BufferGeometry();
 g.setAttribute('position',new THREE.Float32BufferAttribute(data.vertices.flatMap(i=>points[i].map((v,k)=>v-origin.getComponent(k))),3));
 g.setAttribute('uv',new THREE.Float32BufferAttribute(data.uv,2));g.setIndex(indices);g.computeVertexNormals();
 return g;
}
export function buildAuthoredFace(base,anchor,scale=1){
 const points=fitFacePoints(eyes,base),layout=eyeCenters(points);
 const eyeMeshes=layout.map(e=>({...e,position:e.center.clone().sub(anchor),
  globe:geometry(eyes,points,eyes.groups[e.side+'-surface'],e.center),
  cornea:geometry(eyes,points,eyes.groups[e.side+'-cornea'],e.center)}));
 const head=new THREE.BufferGeometry();head.setAttribute('position',new THREE.BufferAttribute(base,3));head.setIndex(bodyMesh.indices);
 const tree=new MeshBVH(head),ray=new THREE.Ray();
 const surfacePart=(data,origin)=>{
  const refined=subdivideHair(data,fitFacePoints(data,base));
  for(const p of refined.points){
   ray.set(new THREE.Vector3(p[0],p[1],.4*scale),new THREE.Vector3(0,0,-1));
   const hit=tree.raycastFirst(ray,THREE.DoubleSide);
   if(hit&&hit.point.z>.08*scale)p[2]=Math.max(p[2],hit.point.z+.00045*scale);
  }
  return geometry(refined,refined.points,refined.indices,origin);
 };
 const eyebrow=surfacePart(brows,anchor),eyelash=surfacePart(lashes,new THREE.Vector3());
 head.dispose();
 const lashRest=eyelash.attributes.position.array.slice();
 // Lower lashes are shorter and sparser in appearance: fade their free ends
 // instead of showing the source's full, mascara-like fan below each eye.
 const lashColor=new Float32Array(eyelash.attributes.position.count*4);
 for(let i=0;i<lashColor.length/4;i++){
  const eye=layout[lashRest[i*3]<0?0:1];
  const lower=THREE.MathUtils.smoothstep(eye.center.y-lashRest[i*3+1],.0015*scale,.007*scale);
  lashColor.set([1,1,1,1-.85*lower],i*4);
 }
 eyelash.setAttribute('color',new THREE.BufferAttribute(lashColor,4));
 return {eyes:eyeMeshes,eyebrow,eyelash,lashRest,dispose(){
  for(const e of eyeMeshes){e.globe.dispose();e.cornea.dispose();}eyebrow.dispose();eyelash.dispose();
 }};
}

export function authoredEyeMaterial(atlas,color){
 const material=new THREE.MeshPhysicalMaterial({map:atlas,roughness:.42,specularIntensity:.25,envMapIntensity:.18});
 material.onBeforeCompile=shader=>{
  shader.uniforms.irisTint={value:new THREE.Color(color)};
  shader.fragmentShader='uniform vec3 irisTint;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
   float irisRadius=min(length(vMapUv-vec2(.25,.265625)),length(vMapUv-vec2(.75,.742188)));
   float irisMask=1.-smoothstep(.107,.121,irisRadius);
   float fibers=clamp(dot(diffuseColor.rgb,vec3(.7,.2,.1))/.065,0.,2.3);
   diffuseColor.rgb=mix(diffuseColor.rgb,irisTint*fibers,irisMask);
  `);
 };
 material.customProgramCacheKey=()=> 'synex-authored-eye-v1';
 return material;
}
