import React,{useMemo,useEffect,useRef} from 'react';
import * as THREE from 'three';
import {useTexture} from '@react-three/drei';
import {useThree} from '@react-three/fiber';
import {prepareDetailedModel,poseDetailedModel,detailedFloorOffset} from './detailedModel.js';
import ExerciseEquipment from '../exercise/ExerciseEquipment.jsx';
import {applyAthleteHighlights} from '../exercise/instructionMannequin.js';
import {morphParameters} from '../body3d/morph.js';
import {createTrainerSurfaceMaterial} from './trainerMaterials.js';
const textures=import.meta.glob(['./assets/trainer/*.webp','./assets/scanned/*.webp'],{eager:true,query:'?url',import:'default'});

export default function TrainerAthlete({data,body,motion,progress,mirror,measurement,profile,compact,onReady,highlight}){
 const authored=data.sourceFamily==='scanned-gltf';
 const slots=useMemo(()=>data.surfaceMaterials.flatMap((s,i)=>['map','normalMap','bumpMap'].filter(k=>s[k]).map(k=>({i,k,url:textures[`./assets/${authored?'scanned':'trainer'}/${s[k]}`]}))),[data,authored]);
 const maps=useTexture(slots.map(s=>s.url));
 maps.forEach((t,i)=>{const space=slots[i].k==='map'?THREE.SRGBColorSpace:THREE.NoColorSpace;if(t.colorSpace!==space){t.colorSpace=space;t.needsUpdate=true;}t.anisotropy=4;});
 const scale=morphParameters(measurement,profile).heightScale;
 const model=useMemo(()=>prepareDetailedModel(data,scale),[data,scale]);
 const guideMotion=highlight?motion:null;
 const materials=useMemo(()=>{
  const mats=data.surfaceMaterials.map((s,i)=>{
   const options={};
   for(let j=0;j<slots.length;j++)if(slots[j].i===i)options[slots[j].k]=maps[j];
   return createTrainerSurfaceMaterial(s,options,{scanned:authored,body});
  });
  if(highlight)applyAthleteHighlights(model.geometry,scale,guideMotion,mats.filter((_,i)=>data.surfaceMaterials[i].muscleGuide),model.base);
  return mats;
 },[maps,slots,data,body,authored,model,scale,guideMotion,highlight]);
 const hidden=useMemo(()=>new THREE.MeshBasicMaterial({visible:false}),[]);
 const opaque=useMemo(()=>materials.map(m=>m.transparent?hidden:m),[materials,hidden]);
 const transparent=useMemo(()=>materials.map(m=>m.transparent?m:hidden),[materials,hidden]);
 const {invalidate}=useThree(),ready=useRef();
 const joints=useMemo(()=>poseDetailedModel(model,motion,progress),[model,motion,progress]);
 const offset=detailedFloorOffset(model,joints),wall=['wall','back_wall'].includes(joints.equipment?.kind);
 const equipment=<ExerciseEquipment motion={motion} joints={joints} rest={model.rest} progress={progress} heightScale={scale}/>;
 useEffect(()=>{invalidate();},[model,joints,invalidate]);
 useEffect(()=>()=>{model.geometry.dispose();model.rigidHeadGeometry?.dispose();},[model]);
 useEffect(()=>()=>materials.forEach(m=>m.dispose()),[materials]);
 useEffect(()=>()=>hidden.dispose(),[hidden]);
 return <group scale={[mirror?-1:1,1,1]}><group position={[0,offset,0]}><mesh geometry={model.geometry} material={opaque} castShadow={!compact} receiveShadow onAfterRender={renderer=>{
  const el=renderer.domElement;el.dataset.characterModel='detailed';el.dataset.characterBody=body;el.dataset.characterStyle='realistic';el.dataset.exerciseRendered=motion;el.dataset.exerciseProgress=String(progress);el.dataset.characterFace='authored-trainer';el.dataset.characterSource=authored?'renderpeople-sophia':'mpfb-trainer';
  const key=body+':'+motion;if(ready.current!==key){ready.current=key;requestAnimationFrame(()=>onReady?.());}
 }}/><mesh geometry={model.geometry} material={transparent}/>{model.rigidHeadGeometry&&<mesh geometry={model.rigidHeadGeometry} material={materials} position={model.rigidHeadPosition.toArray()} quaternion={model.rigidHeadRotation.toArray()}/>} {!wall&&equipment}</group>{wall&&equipment}</group>;
}
