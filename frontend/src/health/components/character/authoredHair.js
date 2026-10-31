import * as THREE from 'three';
import {subdivideHair,hairBoundaryVertices} from './hairSubdivision.js';
import {buildHairRoots} from './hairRoots.js';
import layered from './assets/bob01.json';
import bob from './assets/bob02.json';
import pixie from './assets/short03.json';
import sleek from './assets/medium-layered.json';
import wavy from './assets/short02.json';
const ASSETS={layered,bob,pixie,sleek,wavy};
export const hasAuthoredHair=style=>Boolean(ASSETS[style]);
// Fit local licensed hair cards to the selected cosmetic head, in meters.
export function buildAuthoredHair(base,scale,anchor,character,bodyIndices=[]){
 const data=ASSETS[character.hairStyle];
 const ratios=data.scales.map(([a,b,source],axis)=>Math.abs(base[a*3+axis]-base[b*3+axis])/source);
 const volume=THREE.MathUtils.clamp(character.hairVolume||0,-1,1),fitted=[];
 for(const [refs,weights,offset] of data.bindings){
  const p=[0,0,0];for(let axis=0;axis<3;axis++){
   for(let k=0;k<refs.length;k++)p[axis]+=base[refs[k]*3+axis]*weights[k];
   p[axis]+=offset[axis]*ratios[axis]*(1+volume*.13);
  }
  // Keep rear volume inside the support-wall clearance of the instructor head.
  const rear=-.05*scale;if(p[2]<rear)p[2]=rear+(p[2]-rear)*.32;
  // Uniform vertical shortening preserves the authored card curvature and UVs.
  // A local fringe lift folded long triangles into a hard, angular ledge.
  if(character.hairStyle==='pixie')p[1]=1.79*scale+(p[1]-1.79*scale)*.70;
  fitted.push(p);
 }
 if(character.hairStyle==='sleek'){
  // Preserve the crown and hairline; shorten only free ends below the ears.
  // Compressing the whole wig raised the hairline and exposed the scalp.
  const root=1.58*scale,length=.10*scale;
  for(const p of fitted)if(p[1]<root){
   const distance=root-p[1];
   p[1]=root-length*Math.tanh(distance/length);
  }
 }
 // Preserve the authored fringe. Pushing all front vertices sideways made a
 // wide bare forehead and split the hairline even when a scalp cap was present.
 if(character.hairStyle==='sleek')for(const p of fitted){
  // Shorten the front locks from the crown, not sideways away from the face.
  // This retains a continuous fringe while lifting its ends above both eyes.
  const front=THREE.MathUtils.smoothstep(p[2]/scale,.10,.14)*(1-THREE.MathUtils.smoothstep(Math.abs(p[0]/scale),.052,.076))*THREE.MathUtils.smoothstep(p[1]/scale,1.60,1.65);
  p[1]+=Math.max(0,1.78*scale-p[1])*.28*front;
  const fringe=THREE.MathUtils.smoothstep(p[2]/scale,.11,.14)*(1-THREE.MathUtils.smoothstep(Math.abs(p[0]/scale),.044,.060))*THREE.MathUtils.smoothstep(p[1]/scale,1.63,1.66);
  const edge=(1.696-.002*p[0]/(.05*scale))*scale;
  // Retain a little of each card's original tip length. Clamping all tips to
  // exactly one height creates a hard, ruler-straight fringe.
  const below=Math.max(0,edge-p[1]);
  p[1]+=(below-.003*scale*Math.tanh(below/(.003*scale)))*fringe;
 }
 const refined=subdivideHair(data,fitted),points=refined.points;
 const feather=character.hairStyle==='wavy',components=feather?4:3;
 const boundary=feather?hairBoundaryVertices(refined):null;
 const positions=new Float32Array(refined.vertices.length*3),colors=new Float32Array(refined.vertices.length*components).fill(1),flex=new Float32Array(refined.vertices.length);
 refined.vertices.forEach((source,i)=>{
  const p=points[source];positions.set(p.map((n,k)=>n-anchor.getComponent(k)),i*3);
  if(feather)colors[i*4+3]=boundary.has(source)?0:1;
  // Only the loose ends move; crown roots remain attached to the scalp.
  flex[i]=Math.pow(THREE.MathUtils.clamp((1.735-p[1]/scale)/.16,0,1),2)*.002;
 });
 const locks=new THREE.BufferGeometry();locks.setAttribute('position',new THREE.BufferAttribute(positions,3));locks.setAttribute('uv',new THREE.Float32BufferAttribute(refined.uv,2));locks.setAttribute('color',new THREE.BufferAttribute(colors,components));locks.setAttribute('hairFlex',new THREE.BufferAttribute(flex,1));locks.setIndex(refined.indices);
 // UV islands duplicate vertices. Compute normals on the original topology so
 // a texture seam does not become an unintended hard highlight on the hair.
 const surface=new THREE.BufferGeometry();surface.setAttribute('position',new THREE.Float32BufferAttribute(points.flat(),3));surface.setIndex(refined.indices.map(i=>refined.vertices[i]));surface.computeVertexNormals();
 const normals=new Float32Array(positions.length),sourceNormals=surface.attributes.normal.array;
 refined.vertices.forEach((source,i)=>normals.set(sourceNormals.subarray(source*3,source*3+3),i*3));
 locks.setAttribute('normal',new THREE.BufferAttribute(normals,3));locks.computeTangents();surface.dispose();
 const cap=buildHairRoots(base,scale,anchor,bodyIndices,character.hairStyle);
 return {cap,locks,tie:new THREE.Vector3(0,1.70*scale,-.05*scale).sub(anchor)};
}
