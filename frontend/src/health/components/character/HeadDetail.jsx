import React,{useMemo,useEffect} from 'react';
import * as THREE from 'three';
import {MeshBVH} from 'three-mesh-bvh';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {blinkAmount,eyeGaze,taperedStrand,lidCoverGeometry,closedLidCreaseGeometry} from './livingFace.js';
import {swayingHairMaterial} from './hairMotion.js';
import {eyeProportions,eyeCenterX} from './character.js';
import {skinDetailColors} from './skinTone.js';
import {irisTexture,eyeLidGeometry,visibleIrisGeometry,eyelashGeometry,upperLashLineGeometry,scleraGeometry,eyeSurfaceZ} from './eyeSurface.js';
import mesh from '../body3d/assets/human-mesh.json';
import {buildScalpHair} from './scalpHair.js';
import {rigRotation} from '../exercise/rig.js';
// Facial details and licensed hair are fitted to the selected generic head.
export function buildHeadDetails(base,scale,rest,character){
 const anchor=new THREE.Vector3(...rest[1]);
 const point=(x,y,z)=>new THREE.Vector3(x*scale,y*scale,z*scale).sub(anchor);
 const volume=Number.isFinite(character.hairVolume)?Math.max(-1,Math.min(1,character.hairVolume)):0;
 const radial=1+.07*(volume+1);
 const {cap,locks,tie}=buildScalpHair(base,scale,anchor,character,mesh.indices);
 // Project details onto actual triangles, avoiding the stepped nearest-vertex
 // depths that made eyebrow hairs float and pushed the eyes out of their sockets.
 const faceGeometry=new THREE.BufferGeometry();faceGeometry.setAttribute('position',new THREE.BufferAttribute(base,3));
 const faces=[];for(let i=0;i<mesh.indices.length;i+=3){const tri=mesh.indices.slice(i,i+3);if(tri.every(v=>base[v*3+1]>1.54*scale))faces.push(...tri);}
 faceGeometry.setIndex(faces);const tree=new MeshBVH(faceGeometry,{maxLeafTris:12}),ray=new THREE.Ray(),surfaceCache=new Map();
 const surface=(x,y)=>{const key=x+':'+y;if(surfaceCache.has(key))return surfaceCache.get(key);
  ray.set(new THREE.Vector3(x*scale,y*scale,.4*scale),new THREE.Vector3(0,0,-1));const hit=tree.raycastFirst(ray,THREE.DoubleSide);
  const result=hit?hit.point.z/scale:.13;surfaceCache.set(key,result);return result;
 };
 const eyeY=1.663,eyes=[-1,1].map(side=>{const x=side*eyeCenterX(character);
  // Probe outside the socket opening. Interior rays hit the back of the
  // eye cavity, placing the iris centimeters behind the visible eyelid.
  const rim=(surface(x,eyeY+.010)+surface(x,eyeY-.010))/2;
  return point(x,eyeY,rim-.0014);
 });
 const brows=[-1,1].map(side=>{
  const hairs=[];
  for(let i=0;i<240;i++){
   const t=i/239,x=side*(eyeCenterX(character)-.018+.038*t),y=1.680+.003*Math.sin(Math.PI*(t*.87+.08))+Math.sin(i*2.399)*.00055;
   const tipX=x+side*(.0025+.001*t),tipY=y+.0015-.0007*t;
   hairs.push(taperedStrand(new THREE.CatmullRomCurve3([point(x,y,surface(x,y)+.00035),point((x+tipX)/2,(y+tipY)/2+.0001,surface((x+tipX)/2,(y+tipY)/2)+.00055),point(tipX,tipY,surface(tipX,tipY)+.00035)]),.00010*scale*(1-.6*t),6));
  }
  const merged=mergeGeometries(hairs);hairs.forEach(g=>g.dispose());return merged;
 });
 faceGeometry.dispose();
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
export default function HeadDetail({base,scale,rest,joints,character,progress=0,hairAtlas=null,hairNormal=null}){
 const detail=useMemo(()=>acquireHeadDetails(base,scale,rest,character),[base,scale,rest,character.hairStyle,character.hairVolume]);
 useEffect(()=>()=>detail.dispose(),[detail]);
 const toon=character.style==='toon',hairMaterial=toon?'meshToonMaterial':'meshStandardMaterial';
 const blink=blinkAmount(progress);
 const closure=blink;
 const [gazeX,gazeY]=eyeGaze(progress);
 const skinColors=useMemo(()=>skinDetailColors(character.skin),[character.skin]);
 const crease=useMemo(()=>closedLidCreaseGeometry(scale),[scale]);
 useEffect(()=>()=>crease.dispose(),[crease]);
 const cover=useMemo(()=>lidCoverGeometry(scale,toon),[scale,toon]);
 useEffect(()=>()=>cover.dispose(),[cover]);
 const iris=useMemo(()=>irisTexture(character.eyes),[character.eyes]);
 const irisShape=useMemo(()=>visibleIrisGeometry(scale,toon?.0055:.0057,closure,.00012,[gazeX,gazeY]),[scale,toon,closure,gazeX,gazeY]);
 const sclera=useMemo(()=>scleraGeometry(scale,closure),[scale,closure]);
 const pupil=useMemo(()=>visibleIrisGeometry(scale,.0020,closure,.00018,[gazeX,gazeY]),[scale,closure,gazeX,gazeY]);
 useEffect(()=>()=>{sclera.dispose();pupil.dispose();},[sclera,pupil]);
 useEffect(()=>()=>irisShape.dispose(),[irisShape]);
 const lashLine=useMemo(()=>upperLashLineGeometry(scale),[scale]);
 useEffect(()=>()=>lashLine.dispose(),[lashLine]);
 const lashes=useMemo(()=>eyelashGeometry(scale),[scale]);
 useEffect(()=>()=>lashes.dispose(),[lashes]);
 const lids=useMemo(()=>[eyeLidGeometry(scale,true,toon?.0008:.00012),eyeLidGeometry(scale,false,toon?.00055:.00012)],[scale,toon]);
 useEffect(()=>()=>{iris.dispose();},[iris]);
 useEffect(()=>()=>lids.forEach(g=>g.dispose()),[lids]);
 const locksMaterial=useMemo(()=>swayingHairMaterial(character,scale,hairAtlas,hairNormal),[character.style,character.hair,scale,hairAtlas,hairNormal]);
 locksMaterial.setProgress(progress);
 useEffect(()=>()=>locksMaterial.dispose(),[locksMaterial]);
 const hairProps={color:character.hair,...(!toon?{roughness:.48,metalness:0,envMapIntensity:.65}:{})};
 return <group position={joints[1]} quaternion={rigRotation(joints,1,rest)}>
  <mesh geometry={detail.cap}>{toon?<meshToonMaterial color={new THREE.Color(character.hair).multiplyScalar(detail.cap.attributes.color?.3:1)} vertexColors={Boolean(detail.cap.attributes.color)} alphaTest={.05} alphaToCoverage/>:<meshStandardMaterial color={new THREE.Color(character.hair).multiplyScalar(detail.cap.attributes.color?.3:1)} vertexColors={Boolean(detail.cap.attributes.color)} alphaTest={.05} alphaToCoverage roughness={.85} envMapIntensity={.1}/>}</mesh>
  {detail.curves.map((g,i)=><mesh key={i} geometry={g} material={locksMaterial.material}/>)}
  {character.hairStyle==='ponytail'&&<mesh position={[0,1.731*scale-rest[1][1],-.052*scale-rest[1][2]]} rotation={[Math.PI/2,0,0]}><torusGeometry args={[.012*scale,.002*scale,8,24]}/><meshStandardMaterial color={character.top} roughness={.8}/></mesh>}
  {character.hairStyle==='bun'&&<mesh position={detail.bun} scale={[.029*scale*detail.bunScale,.026*scale*detail.bunScale,.023*scale*detail.bunScale]}><sphereGeometry args={[1,24,16]}/>{React.createElement(hairMaterial,hairProps)}</mesh>}
  {detail.brows.map((g,i)=><mesh key={i} geometry={g} position={[0,Math.sin(progress*Math.PI*2)*.00015*scale,0]}><meshStandardMaterial color={new THREE.Color(character.hair).lerp(new THREE.Color(character.skin),.12)} vertexColors roughness={.9}/></mesh>)}
  {detail.eyes.map((position,i)=><group key={i} position={position} scale={eyeProportions(character.eyeSize,character)} rotation={[0,i===0?-.10:.10,0]}>
   <group visible={blink<.995}>
    <mesh geometry={sclera}><meshPhysicalMaterial vertexColors roughness={.32} clearcoat={.18} clearcoatRoughness={.1}/></mesh>
    <mesh geometry={irisShape}><meshPhysicalMaterial map={iris} roughness={.35} clearcoat={.4} clearcoatRoughness={.08} specularIntensity={.15} envMapIntensity={.18}/></mesh>
    <mesh geometry={pupil}><meshBasicMaterial color="#101218"/></mesh>
    {blink<.25&&<mesh position={[-.0014*scale,.0011*scale,(eyeSurfaceZ(-.0014,.0011)+.00024)*scale]}><circleGeometry args={[.0003*scale,12]}/><meshBasicMaterial color="#fffaf1" toneMapped={false}/></mesh>}
   </group>
   {toon&&closure>0&&<mesh geometry={cover} scale={[1,closure,1]} position={[0,(1-closure)*.0038*scale,0]}><meshStandardMaterial color={skinColors.lowerLid} roughness={.8} side={THREE.DoubleSide}/></mesh>}
   {blink>.5&&<mesh geometry={crease}><meshStandardMaterial color={skinColors.upperLid} roughness={.85} transparent opacity={(blink-.5)*2}/></mesh>}
   <mesh geometry={lashLine} scale={[1,1-.9*closure,1]} position={[0,-.00045*closure*scale,.0012*closure*scale]}><meshStandardMaterial color="#49362f" roughness={.85}/></mesh>
   <mesh geometry={lashes} scale={[1,1-.9*closure,1]} position={[0,-.00045*closure*scale,.0012*closure*scale]}><meshStandardMaterial color="#30221c" vertexColors roughness={.85}/></mesh>
   {lids.map((g,k)=><mesh key={k} geometry={g} scale={[1,1-.9*closure,1]} position={[0,-.00045*closure*scale,.0012*closure*scale]}><meshStandardMaterial color={k?skinColors.lowerLid:skinColors.upperLid} roughness={.68}/></mesh>)}
  </group>)}
 </group>;
}
