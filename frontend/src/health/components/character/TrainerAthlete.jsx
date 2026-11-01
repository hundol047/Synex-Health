import React,{useMemo,useEffect,useRef} from 'react';
import * as THREE from 'three';
import {useTexture} from '@react-three/drei';
import {useThree} from '@react-three/fiber';
import {prepareDetailedModel,poseDetailedModel,detailedFloorOffset} from './detailedModel.js';
import ExerciseEquipment from '../exercise/ExerciseEquipment.jsx';
import {applyAthleteHighlights} from '../exercise/instructionMannequin.js';
import {morphParameters} from '../body3d/morph.js';
import {createTrainerSkinMaterial} from './trainerSkin.js';
const textures=import.meta.glob('./assets/trainer/*.webp',{eager:true,query:'?url',import:'default'});

export default function TrainerAthlete({data,body,motion,progress,mirror,measurement,profile,compact,onReady,highlight}){
 const slots=useMemo(()=>data.surfaceMaterials.flatMap((s,i)=>['map','normalMap','bumpMap'].filter(k=>s[k]).map(k=>({i,k,url:textures[`./assets/trainer/${s[k]}`]}))),[data]);
 const maps=useTexture(slots.map(s=>s.url));
 maps.forEach((t,i)=>{const space=slots[i].k==='map'?THREE.SRGBColorSpace:THREE.NoColorSpace;if(t.colorSpace!==space){t.colorSpace=space;t.needsUpdate=true;}t.anisotropy=4;});
 const scale=morphParameters(measurement,profile).heightScale;
 const model=useMemo(()=>prepareDetailedModel(data,scale),[data,scale]);
 const materials=useMemo(()=>{
  const mats=data.surfaceMaterials.map((s,i)=>{
   const skin=s.kind==='Skin',eye=s.kind==='Eyes',hair=s.kind==='Hair',alpha=['Hair','Eyebrows','Eyelashes'].includes(s.kind);
   const options={roughness:eye?.2:skin?.65:hair?.7:.9,metalness:0,specularIntensity:eye?.8:skin?.35:hair?.35:.2,envMapIntensity:.6,normalScale:new THREE.Vector2(.22,.22),bumpScale:.0004};
   for(let j=0;j<slots.length;j++)if(slots[j].i===i)options[slots[j].k]=maps[j];
   if(alpha)Object.assign(options,{transparent:true,depthWrite:false,side:THREE.DoubleSide,alphaTest:.12});
   if(s.kind==='Eyelashes')Object.assign(options,{opacity:body==='female'?.85:.55,specularIntensity:0,roughness:1});
   if(hair)options.color='#74665c';
   if(s.color)options.color=s.color;
   if(eye)Object.assign(options,{color:'#f0ece5',roughness:.28,specularIntensity:.45,clearcoat:.35,clearcoatRoughness:.18,ior:1.38});
   if(s.kind==='Clothes')Object.assign(options,{sheen:.2,sheenRoughness:.9});
   return skin?createTrainerSkinMaterial(options):new THREE.MeshPhysicalMaterial(options);
  });
  if(highlight)applyAthleteHighlights(model.geometry,scale,motion,mats.filter((_,i)=>data.surfaceMaterials[i].muscleGuide));
  return mats;
 },[maps,slots,data,body,model,scale,motion,highlight]);
 const hidden=useMemo(()=>new THREE.MeshBasicMaterial({visible:false}),[]);
 const opaque=useMemo(()=>materials.map(m=>m.transparent?hidden:m),[materials,hidden]);
 const transparent=useMemo(()=>materials.map(m=>m.transparent?m:hidden),[materials,hidden]);
 const {invalidate}=useThree(),ready=useRef();
 const joints=useMemo(()=>poseDetailedModel(model,motion,progress),[model,motion,progress]);
 const offset=detailedFloorOffset(model,joints),wall=['wall','back_wall'].includes(joints.equipment?.kind);
 const equipment=<ExerciseEquipment motion={motion} joints={joints} rest={model.rest} progress={progress} heightScale={scale}/>;
 useEffect(()=>{invalidate();},[model,joints,invalidate]);
 useEffect(()=>()=>model.geometry.dispose(),[model]);
 useEffect(()=>()=>materials.forEach(m=>m.dispose()),[materials]);
 useEffect(()=>()=>hidden.dispose(),[hidden]);
 return <group scale={[mirror?-1:1,1,1]}><group position={[0,offset,0]}><mesh geometry={model.geometry} material={opaque} castShadow={!compact} receiveShadow onAfterRender={renderer=>{
  const el=renderer.domElement;el.dataset.characterModel='detailed';el.dataset.characterBody=body;el.dataset.characterStyle='realistic';el.dataset.exerciseRendered=motion;el.dataset.exerciseProgress=String(progress);el.dataset.characterFace='authored-trainer';
  const key=body+':'+motion;if(ready.current!==key){ready.current=key;requestAnimationFrame(()=>onReady?.());}
 }}/><mesh geometry={model.geometry} material={transparent}/>{!wall&&equipment}</group>{wall&&equipment}</group>;
}
