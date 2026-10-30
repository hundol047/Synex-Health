import React,{useMemo,useEffect} from 'react';
import * as THREE from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {blinkAmount,taperedStrand,lidCoverGeometry} from './livingFace.js';
import {swayingHairMaterial} from './hairMotion.js';
import {eyeProportions} from './character.js';
import {skinDetailColors} from './skinTone.js';
import {irisTexture,eyeLidGeometry,visibleIrisGeometry} from './eyeSurface.js';
import mesh from '../body3d/assets/human-mesh.json';
import {buildScalpHair} from './scalpHair.js';
import {rigRotation} from '../exercise/rig.js';
// Original geometry generated around the actual selected head, not a downloaded likeness.
export function buildHeadDetails(base,scale,rest,character){
 const anchor=new THREE.Vector3(...rest[1]);
 const point=(x,y,z)=>new THREE.Vector3(x*scale,y*scale,z*scale).sub(anchor);
 const volume=Number.isFinite(character.hairVolume)?Math.max(-1,Math.min(1,character.hairVolume)):0;
 const radial=1+.07*(volume+1);
 const {cap,locks,tie}=buildScalpHair(base,scale,anchor,character,mesh.indices);
 // Queries are all on the face; exclude unrelated limbs before nearest lookup.
 const facePoints=[];for(let i=0;i<base.length;i+=3)if(base[i+1]>1.54*scale&&base[i+2]>.06*scale)facePoints.push([base[i]/scale,base[i+1]/scale,base[i+2]/scale]);
 const surfaceCache=new Map();
 const surface=(x,y)=>{const key=x+':'+y;if(surfaceCache.has(key))return surfaceCache.get(key);let best=Infinity,z=.12,front=-Infinity;for(const [px,py,pz] of facePoints){const dx=px-x,dy=py-y,d=dx*dx+dy*dy;if(d<best){best=d;z=pz;}if(Math.abs(dx)<.012&&Math.abs(dy)<.010)front=Math.max(front,pz);}const result=Number.isFinite(front)?Math.max(front,z):z;surfaceCache.set(key,result);return result;};
 const eyeY=1.663,eyes=[-1,1].map(side=>{const x=side*.034;return point(x,eyeY,surface(x,eyeY)+.0015);});
 const brows=[-1,1].map(side=>{
  const hairs=[];
  for(let i=0;i<84;i++){
   const t=i/83,x=side*(.016+.038*t),y=1.684+.005*Math.sin(Math.PI*(t*.87+.08))+(i%3-1)*.0008;
   const tipX=x+side*(.001+.0014*t),tipY=y+.0014+.0011*(1-t);
   hairs.push(taperedStrand(new THREE.CatmullRomCurve3([point(x,y,surface(x,y)+.0015),point((x+tipX)/2,tipY,surface(x,y)+.0019),point(tipX,tipY,surface(tipX,tipY)+.0015)]),.00030*scale*(1-.5*t),6));
  }
  const merged=mergeGeometries(hairs);hairs.forEach(g=>g.dispose());return merged;
 });
 return {cap,curves:[locks],brows,eyes,bun:tie.clone().add(new THREE.Vector3(0,.004*scale,-.014*scale)),bunScale:radial,dispose(){[cap,locks,...brows].forEach(g=>g.dispose());}};
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
 const irisShape=useMemo(()=>visibleIrisGeometry(scale,toon?.0045:.0044),[scale,toon]);
 useEffect(()=>()=>irisShape.dispose(),[irisShape]);
 const lids=useMemo(()=>[eyeLidGeometry(scale,true),eyeLidGeometry(scale,false)],[scale]);
 useEffect(()=>()=>{iris.dispose();},[iris]);
 useEffect(()=>()=>lids.forEach(g=>g.dispose()),[lids]);
 const locksMaterial=useMemo(()=>swayingHairMaterial(character,scale),[character.style,character.hair,scale]);
 locksMaterial.setProgress(progress);
 useEffect(()=>()=>locksMaterial.dispose(),[locksMaterial]);
 const hairProps={color:character.hair,...(!toon?{roughness:.48,metalness:0,envMapIntensity:.65}:{})};
 return <group position={joints[1]} quaternion={rigRotation(joints,1,rest)}>
  <mesh geometry={detail.cap}>{toon?<meshToonMaterial color={character.hair}/>:<meshStandardMaterial color={character.hair} roughness={.48} envMapIntensity={.65}/>}</mesh>
  {detail.curves.map((g,i)=><mesh key={i} geometry={g} material={locksMaterial.material}/>)}
  {character.hairStyle==='ponytail'&&<mesh position={[0,1.731*scale-rest[1][1],-.052*scale-rest[1][2]]} rotation={[Math.PI/2,0,0]}><torusGeometry args={[.012*scale,.002*scale,8,24]}/><meshStandardMaterial color={character.top} roughness={.8}/></mesh>}
  {character.hairStyle==='bun'&&<mesh position={detail.bun} scale={[.029*scale*detail.bunScale,.026*scale*detail.bunScale,.023*scale*detail.bunScale]}><sphereGeometry args={[1,24,16]}/>{React.createElement(hairMaterial,hairProps)}</mesh>}
  {detail.brows.map((g,i)=><mesh key={i} geometry={g}><meshStandardMaterial color={new THREE.Color(character.hair).multiplyScalar(.8)} vertexColors roughness={.9}/></mesh>)}
  {detail.eyes.map((position,i)=><group key={i} position={position} scale={eyeProportions(character.eyeSize)} rotation={[0,i===0?-.10:.10,0]}>
   <mesh scale={[.010*scale,(toon?.0045:.003)*scale,.0017*scale]}><sphereGeometry args={[1,32,20]}/><meshPhysicalMaterial color="#d8cec2" roughness={.27} clearcoat={.35} clearcoatRoughness={.12}/></mesh>
   <mesh geometry={irisShape} position={[Math.sin(progress*Math.PI*2)*.00025*scale,0,.00175*scale]}><meshPhysicalMaterial map={iris} roughness={.30} clearcoat={.55} clearcoatRoughness={.08}/></mesh>
   <mesh position={[Math.sin(progress*Math.PI*2)*.00025*scale,0,.0018*scale]}><circleGeometry args={[.0016*scale,32]}/><meshPhysicalMaterial color="#101218" roughness={.16} clearcoat={.6}/></mesh>
   {blink>0&&<mesh geometry={cover} scale={[1,blink,1]} position={[0,(1-blink)*.0038*scale,0]}><meshStandardMaterial color={character.skin} roughness={.68} side={THREE.DoubleSide}/></mesh>}
   {lids.map((g,k)=><mesh key={k} geometry={g} position={[0,(k? .0026:-.0034)*blink*scale,0]}><meshStandardMaterial color={k?skinColors.lowerLid:skinColors.upperLid} roughness={.68}/></mesh>)}
  </group>)}
 </group>;
}
