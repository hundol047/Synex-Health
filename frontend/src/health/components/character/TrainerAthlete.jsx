import React,{useMemo,useEffect,useRef} from 'react';
import * as THREE from 'three';
import {useTexture} from '@react-three/drei';
import {useThree} from '@react-three/fiber';
import {prepareDetailedModel,poseDetailedModel,detailedFloorOffset} from './detailedModel.js';
import ExerciseEquipment from '../exercise/ExerciseEquipment.jsx';
import {applyAthleteHighlights} from '../exercise/instructionMannequin.js';
import {morphParameters} from '../body3d/morph.js';
import {createTrainerSurfaceMaterial} from './trainerMaterials.js';
import {naturalTrainerData} from './naturalTrainer.js';
import {studioTrainerData} from './studioTrainer.js';
import {createVtuberSmoothing} from './vtuberSmoothing.js';
import {createVtuberOutline} from './vtuberMaterials.js';
const textures=import.meta.glob(['./assets/trainer/*.webp','./assets/scanned/*.webp','./assets/authored/*.webp','./assets/vtuber/*.webp'],{eager:true,query:'?url',import:'default'});

export default function TrainerAthlete({data:source,character,body,motion,progress,mirror,measurement,profile,compact,onReady,highlight}){
 const vtuber=source.sourceFamily==='vrm-toon',studio=!vtuber&&character?.detailedStyle==='studio',natural=!vtuber&&!studio&&character?.detailedStyle!=='original';
 const data=useMemo(()=>studio?studioTrainerData(source):natural?naturalTrainerData(source):source,[source,natural,studio]);
 const scanned=data.sourceFamily==='scanned-gltf',authored=data.sourceFamily==='authored-usd';
 const slots=useMemo(()=>data.surfaceMaterials.flatMap((s,i)=>(data.groups[i]?.length||data.rigidHead?.groups[i]?.length)?['map','normalMap','bumpMap'].filter(k=>s[k]).map(k=>({i,k,url:textures[`./assets/${s.assetFolder||(authored?'authored':scanned?'scanned':'trainer')}/${s[k]}`]})):[]),[data,authored,scanned]);
 const maps=useTexture(slots.map(s=>s.url));
 maps.forEach((t,i)=>{const space=slots[i].k==='map'?THREE.SRGBColorSpace:THREE.NoColorSpace;if(t.colorSpace!==space){t.colorSpace=space;t.needsUpdate=true;}t.anisotropy=4;});
 const scale=morphParameters(measurement,profile).heightScale;
 const model=useMemo(()=>prepareDetailedModel(data,scale),[data,scale]);
 const smoothing=useMemo(()=>vtuber?createVtuberSmoothing(model):null,[model,vtuber]);
 const surface=smoothing?.geometry||model.geometry;
 const guideMotion=highlight?motion:null;
 const materials=useMemo(()=>{
  const mats=data.surfaceMaterials.map((s,i)=>{
   const options={};
   for(let j=0;j<slots.length;j++)if(slots[j].i===i)options[slots[j].k]=maps[j];
   return createTrainerSurfaceMaterial(s,options,{scanned,authored,body,natural,studio,character});
  });
  if(highlight)applyAthleteHighlights(surface,scale,guideMotion,mats.filter((_,i)=>data.surfaceMaterials[i].muscleGuide),smoothing?.guide||model.guideBase);
  return mats;
 },[maps,slots,data,body,authored,scanned,natural,studio,model,smoothing,surface,scale,guideMotion,highlight,character?.vtuberHair,character?.vtuberEyes,character?.vtuberTop,character?.vtuberBottom]);
 const hidden=useMemo(()=>new THREE.MeshBasicMaterial({visible:false}),[]);
 const opaque=useMemo(()=>materials.map(m=>m.transparent?hidden:m),[materials,hidden]);
 const transparent=useMemo(()=>materials.map(m=>m.transparent?m:hidden),[materials,hidden]);
 const outlines=useMemo(()=>vtuber?materials.map((m,i)=>createVtuberOutline(m,data.surfaceMaterials[i])):null,[vtuber,materials,data]);
 // Opaque strand cores fill color as well as depth. A depth-only prepass
 // exposed the white background through partially transparent front strands.
 // The blended pass retains soft edges around each colored core.
 const hairCore=useMemo(()=>data.rigidHead?materials.map((m,i)=>data.surfaceMaterials[i].kind==='Hair'?Object.assign(m.clone(),{transparent:false,alphaTest:.65,depthWrite:true}):hidden):null,[data,materials,hidden]);
 const {invalidate}=useThree(),ready=useRef();
 const joints=useMemo(()=>{const joints=poseDetailedModel(model,motion,progress);smoothing?.update();return joints;},[model,smoothing,motion,progress]);
 const offset=detailedFloorOffset(model,joints),wall=['wall','back_wall'].includes(joints.equipment?.kind);
 const equipment=<ExerciseEquipment motion={motion} joints={joints} rest={model.rest} progress={progress} heightScale={scale}/>;
 useEffect(()=>{invalidate();},[model,joints,invalidate]);
 useEffect(()=>()=>{model.geometry.dispose();model.rigidHeadGeometry?.dispose();},[model]);
 useEffect(()=>()=>smoothing?.dispose(),[smoothing]);
 useEffect(()=>()=>materials.forEach(m=>m.dispose()),[materials]);
 useEffect(()=>()=>hidden.dispose(),[hidden]);
 useEffect(()=>()=>outlines?.forEach(m=>m.dispose()),[outlines]);
 useEffect(()=>()=>hairCore?.forEach(m=>{if(m!==hidden)m.dispose();}),[hairCore,hidden]);
 return <group scale={[mirror?-1:1,1,1]}><group position={[0,offset,0]}><mesh geometry={surface} material={opaque} userData={{noAO:vtuber}} castShadow={!compact} receiveShadow={!vtuber} onAfterRender={renderer=>{
  const el=renderer.domElement;el.dataset.characterModel=vtuber?'vtuber':'detailed';el.dataset.characterBody=body;el.dataset.characterStyle=vtuber?'toon':'realistic';el.dataset.exerciseRendered=motion;el.dataset.exerciseProgress=String(progress);el.dataset.characterFace=vtuber?'vrm-expressions':'authored-trainer';el.dataset.characterSource=vtuber?'pixiv-vrm':authored?'jungle-jim-alina':scanned?'renderpeople-sophia':'mpfb-trainer';el.dataset.portraitStyle=vtuber?'vtuber':studio?'studio':natural?'natural':'original';
  if(vtuber){el.dataset.characterSurface='smooth';el.dataset.characterVertices=String(surface.attributes.position.count);el.dataset.characterOutfit=data.wardrobe||'casual';el.dataset.characterHair=character?.vtuberHair||'#9b714e';el.dataset.characterEyes=character?.vtuberEyes||'#95652b';}
  const key=body+':'+motion;if(ready.current!==key){ready.current=key;requestAnimationFrame(()=>onReady?.());}
 }}/><mesh geometry={surface} material={transparent} userData={{noAO:vtuber}}/>{outlines&&<mesh geometry={surface} material={outlines} userData={{noAO:true}}/>} {model.rigidHeadGeometry&&<group position={model.rigidHeadPosition.toArray()} quaternion={model.rigidHeadRotation.toArray()}><mesh geometry={model.rigidHeadGeometry} material={hairCore}/><mesh geometry={model.rigidHeadGeometry} material={materials}/></group>} {!wall&&equipment}</group>{wall&&equipment}</group>;
}
