import React,{useMemo,useEffect} from 'react';
import * as THREE from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {blinkAmount,taperedStrand,lidCoverGeometry} from './livingFace.js';
import {attachHairFlex,swayingHairMaterial} from './hairMotion.js';
import {eyeProportions} from './character.js';
import {skinDetailColors} from './skinTone.js';
import {irisTexture,eyeLidGeometry} from './eyeSurface.js';
import mesh from '../body3d/assets/human-mesh.json';
import {rigRotation} from '../exercise/rig.js';
// Original geometry generated around the actual selected head, not a downloaded likeness.
export function buildHeadDetails(base,scale,rest,character){
 const anchor=new THREE.Vector3(...rest[1]);
 const point=(x,y,z)=>new THREE.Vector3(x*scale,y*scale,z*scale).sub(anchor);
 const scalp=base.slice(),indices=[];
 const volume=Number.isFinite(character.hairVolume)?Math.max(-1,Math.min(1,character.hairVolume)):0;
 const radial=1+.07*(volume+1),lift=.0015+.004*(volume+1);
 const isHair=i=>{const x=base[i*3]/scale,y=base[i*3+1]/scale,z=base[i*3+2]/scale;return y>(z>.095?1.726-.013*Math.cos(x*35):1.638);};
 for(let i=0;i<mesh.indices.length;i+=3){const f=mesh.indices.slice(i,i+3);if(f.every(isHair))indices.push(...f);}
 for(let i=0;i<scalp.length;i+=3){if(isHair(i/3)){scalp[i]*=1.02+.025*(volume+1);scalp[i+1]+=lift*scale;scalp[i+2]=.025*scale+(scalp[i+2]-.025*scale)*(1.02+.025*(volume+1));}scalp[i]-=anchor.x;scalp[i+1]-=anchor.y;scalp[i+2]-=anchor.z;}
 // Upload only referenced scalp vertices, rather than a second full body.
 const remap=new Map(),capPositions=[],capIndices=[];
 for(const index of indices){if(!remap.has(index)){remap.set(index,remap.size);capPositions.push(scalp[index*3],scalp[index*3+1],scalp[index*3+2]);}capIndices.push(remap.get(index));}
 const cap=new THREE.BufferGeometry();cap.setAttribute('position',new THREE.Float32BufferAttribute(capPositions,3));cap.setIndex(capIndices);cap.computeVertexNormals();
 // Queries are all on the face; exclude unrelated limbs before nearest lookup.
 const facePoints=[];for(let i=0;i<base.length;i+=3)if(base[i+1]>1.54*scale&&base[i+2]>.06*scale)facePoints.push([base[i]/scale,base[i+1]/scale,base[i+2]/scale]);
 const surfaceCache=new Map();
 const surface=(x,y)=>{const key=x+':'+y;if(surfaceCache.has(key))return surfaceCache.get(key);let best=Infinity,z=.12,front=-Infinity;for(const [px,py,pz] of facePoints){const dx=px-x,dy=py-y,d=dx*dx+dy*dy;if(d<best){best=d;z=pz;}if(Math.abs(dx)<.012&&Math.abs(dy)<.010)front=Math.max(front,pz);}const result=Number.isFinite(front)?Math.max(front,z):z;surfaceCache.set(key,result);return result;};
 const eyeY=1.663,eyes=[-1,1].map(side=>{const x=side*.034;return point(x,eyeY,surface(x,eyeY)+.0015);});
 const curves=[];
 const scalpPoints=[];for(let i=0;i<base.length/3;i++)if(isHair(i))scalpPoints.push(new THREE.Vector3(scalp[i*3],scalp[i*3+1],scalp[i*3+2]));
 const project=p=>{let best=scalpPoints[0],distance=Infinity;for(const v of scalpPoints){const d=v.distanceToSquared(p);if(d<distance){distance=d;best=v;}}return best.clone();};
 // Layered locks follow scalp ellipsoids and taper towards the temples.
 for(let i=0;i<96;i++){
  const a=i/96*Math.PI*2,side=Math.sin(a),front=Math.cos(a),part=character.hairStyle==='parted';
  const points=[point(side*.018,1.797,.025+front*.015),point(side*.055+(part?.008:0),1.785,.025+front*.065),point(side*.078,1.747,.025+front*.090),point(side*.077,front>0?1.728:1.66,.025+front*.088)];
  const curve=new THREE.CatmullRomCurve3(points.map(project));curves.push(attachHairFlex(taperedStrand(curve,(part?.00085:.00065)*scale,18),part?.0015:.0006));
 }
 if(character.hairStyle==='parted')for(let i=0;i<48;i++){
  const x=-.055+i*.002;curves.push(attachHairFlex(taperedStrand(new THREE.CatmullRomCurve3([project(point(x,1.776,.08)),project(point(x+.014,1.75,.112)),point(x+.025,1.709+Math.abs(x)*.18,surface(x+.025,1.709+Math.abs(x)*.18)+.004)]),.00045*scale,18),.003));
 }
 // A short athletic ponytail stays behind the neck and above the shoulders.
 // Each root is fixed; only free ends receive the larger secondary sway.
 if(character.hairStyle==='ponytail')for(let i=0;i<72;i++){
  const angle=i/72*Math.PI*2,r=.004+.011*(i%9)/8;
  const dx=Math.sin(angle)*r,dz=Math.cos(angle)*r;
  const curve=new THREE.CatmullRomCurve3([point(dx*.5,1.731,-.079+dz*.5),point(dx,1.702,-.112+dz),point(dx*.85,1.647,-.132+dz),point(dx*.45,1.588,-.117+dz*.4)]);
  curves.push(attachHairFlex(taperedStrand(curve,.0017*scale,24),.018));
 }
 const brows=[-1,1].map(side=>{
  const hairs=[];
  for(let i=0;i<36;i++){
   const t=i/35,x=side*(.017+.036*t),y=1.684+.006*Math.sin(Math.PI*(t*.87+.08));
   const tipX=x+side*(.001+.0014*t),tipY=y+.0014+.0011*(1-t);
   hairs.push(taperedStrand(new THREE.CatmullRomCurve3([point(x,y,surface(x,y)+.0015),point((x+tipX)/2,tipY,surface(x,y)+.0019),point(tipX,tipY,surface(tipX,tipY)+.0015)]),.00023*scale,6));
  }
  const merged=mergeGeometries(hairs);hairs.forEach(g=>g.dispose());return merged;
 });
 const locks=mergeGeometries(curves);curves.forEach(g=>g.dispose());
 return {cap,curves:[locks],brows,eyes,bun:point(0,1.736+lift,-.078-.004*volume),bunScale:radial,dispose(){[cap,locks,...brows].forEach(g=>g.dispose());}};
}
// Keep immutable CPU templates per prepared body. Every mounted scene owns
// clones, so disposing one viewer cannot invalidate another viewer's buffers.
const headTemplates=new WeakMap();
export function acquireHeadDetails(base,scale,rest,character){
 let templates=headTemplates.get(base);if(!templates){templates=new Map();headTemplates.set(base,templates);}
 const key=JSON.stringify([scale,rest[1],character.hairStyle,character.hairVolume]);
 if(!templates.has(key)){
  templates.set(key,buildHeadDetails(base,scale,rest,character));
  if(templates.size>2){const first=templates.keys().next().value;templates.get(first).dispose();templates.delete(first);}
 }
 const source=templates.get(key),cap=source.cap.clone(),curves=source.curves.map(g=>g.clone()),brows=source.brows.map(g=>g.clone());
 return {...source,cap,curves,brows,eyes:source.eyes.map(v=>v.clone()),bun:source.bun.clone(),dispose(){[cap,...curves,...brows].forEach(g=>g.dispose());}};
}
export default function HeadDetail({base,scale,rest,joints,character,progress=0}){
 const detail=useMemo(()=>acquireHeadDetails(base,scale,rest,character),[base,scale,rest,character.hairStyle,character.hairVolume]);
 useEffect(()=>()=>detail.dispose(),[detail]);
 const toon=character.style==='toon',hairMaterial=toon?'meshToonMaterial':'meshStandardMaterial';
 const blink=blinkAmount(progress);
 const skinColors=useMemo(()=>skinDetailColors(character.skin),[character.skin]);
 const cover=useMemo(()=>lidCoverGeometry(scale),[scale]);
 useEffect(()=>()=>cover.dispose(),[cover]);
 const iris=useMemo(()=>irisTexture(character.eyes),[character.eyes]);
 const lids=useMemo(()=>[eyeLidGeometry(scale,true),eyeLidGeometry(scale,false)],[scale]);
 useEffect(()=>()=>{iris.dispose();},[iris]);
 useEffect(()=>()=>lids.forEach(g=>g.dispose()),[lids]);
 const locksMaterial=useMemo(()=>swayingHairMaterial(character,scale),[character.style,character.hair,scale]);
 locksMaterial.setProgress(progress);
 useEffect(()=>()=>locksMaterial.dispose(),[locksMaterial]);
 const hairProps={color:character.hair,...(!toon?{roughness:.64,metalness:0,envMapIntensity:.3}:{})};
 return <group position={joints[1]} quaternion={rigRotation(joints,1,rest)}>
  <mesh geometry={detail.cap}>{toon?<meshToonMaterial color={character.hair}/>:<meshStandardMaterial color={character.hair} roughness={.72} envMapIntensity={.3}/>}</mesh>
  {detail.curves.map((g,i)=><mesh key={i} geometry={g} material={locksMaterial.material}/>)}
  {character.hairStyle==='ponytail'&&<mesh position={[0,1.731*scale-rest[1][1],-.079*scale-rest[1][2]]} rotation={[Math.PI/2,0,0]}><torusGeometry args={[.012*scale,.002*scale,8,24]}/><meshStandardMaterial color={character.top} roughness={.8}/></mesh>}
  {character.hairStyle==='bun'&&<mesh position={detail.bun} scale={[.029*scale*detail.bunScale,.026*scale*detail.bunScale,.023*scale*detail.bunScale]}><sphereGeometry args={[1,24,16]}/>{React.createElement(hairMaterial,hairProps)}</mesh>}
  {detail.brows.map((g,i)=><mesh key={i} geometry={g}><meshStandardMaterial color={new THREE.Color(character.hair).lerp(new THREE.Color('#382a25'),.65)} vertexColors roughness={.9}/></mesh>)}
  {detail.eyes.map((position,i)=><group key={i} position={position} scale={eyeProportions(character.eyeSize)} rotation={[0,i===0?-.10:.10,0]}>
   <mesh scale={[.010*scale,(toon?.0045:.003)*scale,.0017*scale]}><sphereGeometry args={[1,32,20]}/><meshPhysicalMaterial color="#c8bfb3" roughness={.27} clearcoat={.35} clearcoatRoughness={.12}/></mesh>
   <mesh position={[Math.sin(progress*Math.PI*2)*.00025*scale,0,.00175*scale]}><circleGeometry args={[(toon?.0036:.0028)*scale,48]}/><meshPhysicalMaterial map={iris} roughness={.30} clearcoat={.55} clearcoatRoughness={.08}/></mesh>
   <mesh position={[Math.sin(progress*Math.PI*2)*.00025*scale,0,.0018*scale]}><circleGeometry args={[.0011*scale,32]}/><meshPhysicalMaterial color="#101218" roughness={.16} clearcoat={.6}/></mesh>
   {blink>0&&<mesh geometry={cover} scale={[1,blink,1]} position={[0,(1-blink)*.0038*scale,0]}><meshStandardMaterial color={character.skin} roughness={.68} side={THREE.DoubleSide}/></mesh>}
   {lids.map((g,k)=><mesh key={k} geometry={g} position={[0,(k? .0026:-.0034)*blink*scale,0]}><meshStandardMaterial color={k?skinColors.lowerLid:skinColors.upperLid} roughness={.68}/></mesh>)}
  </group>)}
 </group>;
}
