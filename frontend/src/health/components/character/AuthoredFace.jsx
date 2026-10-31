import React,{useMemo,useEffect,useLayoutEffect} from 'react';
import * as THREE from 'three';
import {useTexture} from '@react-three/drei';
import {useThree} from '@react-three/fiber';
import {buildAuthoredFace,authoredEyeMaterial} from './authoredFaceGeometry.js';
import {faceBlinkSurface} from './faceExpression.js';
import {eyeGaze} from './livingFace.js';
import eyeMap from './assets/eye-globes.webp';
import browMap from './assets/natural-brows.webp';
import lashMap from './assets/natural-lashes.webp';

export default function AuthoredFace({base,scale,rest,character,progress}){
 const atlas=useTexture([eyeMap,browMap,lashMap]);
 for(const t of atlas)if(t.colorSpace!==THREE.SRGBColorSpace){t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;t.needsUpdate=true;}
 const anchor=useMemo(()=>new THREE.Vector3(...rest[1]),[rest]);
 const parts=useMemo(()=>buildAuthoredFace(base,anchor,scale),[base,anchor,scale]);
 const material=useMemo(()=>authoredEyeMaterial(atlas[0],character.eyes),[atlas[0],character.eyes]);
 const {invalidate,gl}=useThree();
 useEffect(()=>{gl.domElement.dataset.characterFace='authored';return()=>{delete gl.domElement.dataset.characterFace;};},[gl]);
 useEffect(()=>()=>parts.dispose(),[parts]);useEffect(()=>()=>material.dispose(),[material]);
 useLayoutEffect(()=>{
  const moved=faceBlinkSurface(parts.lashRest,scale,progress,character,base);
  const p=parts.eyelash.attributes.position;
  for(let i=0;i<p.count;i++)p.setXYZ(i,moved[i*3]-anchor.x,moved[i*3+1]-anchor.y,moved[i*3+2]-anchor.z);
  p.needsUpdate=true;parts.eyelash.computeVertexNormals();parts.eyelash.computeBoundingSphere();invalidate();
 },[parts,anchor,scale,progress,character,invalidate,base]);
 const [gx,gy]=eyeGaze(progress),browColor=new THREE.Color(character.hair).lerp(new THREE.Color(character.skin),.08);
 return <>
  {parts.eyes.map(e=><group key={e.side} position={e.position} rotation={[-gy/(e.radius/scale),gx/(e.radius/scale),0]}>
   <mesh geometry={e.globe} material={material}/>
   <mesh geometry={e.cornea} renderOrder={2}><meshPhysicalMaterial color="#ffffff" transparent opacity={.045} roughness={.08} clearcoat={1} clearcoatRoughness={.08} ior={1.376} envMapIntensity={.25} depthWrite={false}/></mesh>
  </group>)}
  <mesh geometry={parts.eyebrow} renderOrder={3}><meshStandardMaterial map={atlas[1]} color={browColor} transparent opacity={.8} alphaTest={.01} depthWrite={false} side={THREE.DoubleSide} roughness={.9}/></mesh>
  <mesh geometry={parts.eyelash} renderOrder={3}><meshStandardMaterial map={atlas[2]} color={character.hair} vertexColors transparent opacity={character.body==='male'?.5:.65} alphaTest={.01} depthWrite={false} side={THREE.DoubleSide} roughness={.85}/></mesh>
 </>;
}
