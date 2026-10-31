import React,{useMemo,useEffect,useRef} from 'react';
import * as THREE from 'three';
import {useTexture} from '@react-three/drei';
import {useThree} from '@react-three/fiber';
import female from './assets/detailed/female.json';
import male from './assets/detailed/male.json';
import {prepareDetailedModel,poseDetailedModel,detailedFloorOffset} from './detailedModel.js';
import ExerciseEquipment from '../exercise/ExerciseEquipment.jsx';
import {applyAthleteHighlights} from '../exercise/instructionMannequin.js';
import {morphParameters} from '../body3d/morph.js';
const textures=import.meta.glob('./assets/detailed/*.webp',{eager:true,query:'?url',import:'default'});
const url=(body,kind)=>textures[`./assets/detailed/${body}-${kind}.webp`];

export default function DetailedAthlete({motion,progress,mirror,measurement,profile,compact,onReady,character,highlight}){
 const body=character.body==='female'?'female':'male',data=body==='female'?female:male;
 const paths=['body_color','body_normal','body_roughness','head_color','head_normal','head_roughness'];
 if(body==='female')paths.push('opacity_color');
 const maps=useTexture(paths.map(k=>url(body,k)));
 maps.forEach((t,i)=>{const color=i===0||i===3||i===6,space=color?THREE.SRGBColorSpace:THREE.NoColorSpace;if(t.colorSpace!==space){t.colorSpace=space;t.needsUpdate=true;}t.anisotropy=4;});
 const scale=morphParameters(measurement,profile).heightScale;
 const model=useMemo(()=>prepareDetailedModel(data,scale),[data,scale]);
 const materials=useMemo(()=>{
  const mats=[0,3].map(i=>new THREE.MeshPhysicalMaterial({map:maps[i],normalMap:maps[i+1],normalScale:new THREE.Vector2(.65,.65),roughnessMap:maps[i+2],roughness:.95,metalness:0,specularIntensity:.28,envMapIntensity:.5}));
  if(body==='female')mats.push(new THREE.MeshPhysicalMaterial({map:maps[6],side:THREE.DoubleSide,transparent:true,depthWrite:false,alphaTest:.02,roughness:.95,metalness:0,specularIntensity:0,envMapIntensity:0}));
  if(highlight)applyAthleteHighlights(model.geometry,scale,motion,mats);
  return mats;
 },[maps,body,model,motion,highlight,scale]);
 const {invalidate}=useThree(),ready=useRef();
 const joints=useMemo(()=>poseDetailedModel(model,motion,progress),[model,motion,progress]);
 const offset=detailedFloorOffset(model,joints),wall=['wall','back_wall'].includes(joints.equipment?.kind);
 const equipment=<ExerciseEquipment motion={motion} joints={joints} rest={model.rest} progress={progress} heightScale={scale}/>;
 useEffect(()=>{invalidate();},[model,joints,invalidate]);
 useEffect(()=>()=>model.geometry.dispose(),[model]);
 useEffect(()=>()=>materials.forEach(m=>m.dispose()),[materials]);
 return <group scale={[mirror?-1:1,1,1]}><group position={[0,offset,0]}><mesh name="detailed-exercise-athlete" geometry={model.geometry} material={materials} castShadow={!compact} receiveShadow onAfterRender={renderer=>{
  const el=renderer.domElement;el.dataset.characterModel='detailed';el.dataset.characterBody=body;el.dataset.characterStyle='realistic';el.dataset.exerciseRendered=motion;el.dataset.exerciseProgress=String(progress);el.dataset.characterFace='authored-morphs';
  const key=body+':'+motion;if(ready.current!==key){ready.current=key;requestAnimationFrame(()=>onReady?.());}
 }}/>{!wall&&equipment}</group>{wall&&equipment}</group>;
}
