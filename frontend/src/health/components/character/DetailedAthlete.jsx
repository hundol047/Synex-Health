import React,{useMemo,useEffect,useRef} from 'react';
import * as THREE from 'three';
import {useTexture} from '@react-three/drei';
import {useThree} from '@react-three/fiber';
import female from './assets/detailed/female.json';
import male from './assets/detailed/male.json';
import portraitUrl from './assets/detailed/female-portrait.webp';
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
 const maps=useTexture([...paths.map(k=>url(body,k)),...(body==='female'?[portraitUrl]:[])]);
 maps.forEach((t,i)=>{const color=i===0||i===3||i===6||i===7,space=color?THREE.SRGBColorSpace:THREE.NoColorSpace;if(t.colorSpace!==space){t.colorSpace=space;t.needsUpdate=true;}t.anisotropy=4;});
 const scale=morphParameters(measurement,profile).heightScale;
 const model=useMemo(()=>prepareDetailedModel(data,scale),[data,scale]);
 const materials=useMemo(()=>{
  const mats=[0,3].map(i=>new THREE.MeshPhysicalMaterial({map:maps[i],normalMap:maps[i+1],normalScale:new THREE.Vector2(i===0?.5:.32,i===0?.5:.32),roughnessMap:maps[i+2],roughness:i===0?.95:.72,metalness:0,specularIntensity:i===0?.28:.45,envMapIntensity:.65,sheen:i===0?.12:0,sheenRoughness:.85}));
  // Scalp artwork shares the face atlas. Keep dark hair matte instead of
  // giving it the skin highlight that reveals the edges of overlaid hair cards.
  mats[1].onBeforeCompile=shader=>{
   if(body==='female'){
    shader.uniforms.portraitMap={value:maps[7]};
    shader.fragmentShader='uniform sampler2D portraitMap;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',THREE.ShaderChunk.map_fragment.replace('diffuseColor *= sampledDiffuseColor;',`
     vec2 faceUV = vMapUv;
     vec2 lipDelta = (faceUV - vec2(0.5, 0.595)) / vec2(0.065, 0.055);
     faceUV.y -= 0.014 * exp(-dot(lipDelta, lipDelta));
     vec3 portraitAlbedo = texture2D(portraitMap, faceUV).rgb;
     float faceMask = smoothstep(0.27, 0.36, vMapUv.x) * (1.0-smoothstep(0.64, 0.73, vMapUv.x))
       * smoothstep(0.38, 0.50, vMapUv.y) * (1.0-smoothstep(0.76, 0.82, vMapUv.y));
     // Preserve the authored eyelid artwork that follows the blink geometry.
     float leftOrbit = length((vMapUv-vec2(0.429,0.720))/vec2(0.046,0.025));
     float rightOrbit = length((vMapUv-vec2(0.572,0.720))/vec2(0.046,0.025));
     faceMask *= smoothstep(0.9,1.6,leftOrbit)*smoothstep(0.9,1.6,rightOrbit);
     sampledDiffuseColor.rgb = mix(sampledDiffuseColor.rgb, portraitAlbedo, faceMask*0.75);
     diffuseColor *= sampledDiffuseColor;`));
   }
   shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
    float scalpMask = 1.0 - smoothstep(0.018, 0.065, dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722)));
    roughnessFactor = mix(roughnessFactor, 0.98, scalpMask);`)
    .replace('float specularIntensityFactor = specularIntensity;', 'float specularIntensityFactor = specularIntensity * (1.0 - scalpMask * 0.95);');
  };
  mats[1].customProgramCacheKey=()=> 'synex-detailed-skin-scalp-v2-'+body;
  if(body==='female')mats.push(new THREE.MeshPhysicalMaterial({map:maps[6],side:THREE.DoubleSide,transparent:true,depthWrite:false,alphaTest:.02,roughness:.95,metalness:0,specularIntensity:0,envMapIntensity:0}));
  // The wet eye surface must not share the skin's roughness or normal map.
  mats.push(new THREE.MeshPhysicalMaterial({map:maps[3],roughness:.2,metalness:0,ior:1.38,clearcoat:1,clearcoatRoughness:.08,specularIntensity:.8,envMapIntensity:.7}));
  if(highlight)applyAthleteHighlights(model.geometry,scale,motion,mats);
  return mats;
 },[maps,body,model,motion,highlight,scale]);
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
 return <group scale={[mirror?-1:1,1,1]}><group position={[0,offset,0]}><mesh name="detailed-exercise-athlete" geometry={model.geometry} material={opaque} castShadow={!compact} receiveShadow onAfterRender={renderer=>{
  const el=renderer.domElement;el.dataset.characterModel='detailed';el.dataset.characterBody=body;el.dataset.characterStyle='realistic';el.dataset.exerciseRendered=motion;el.dataset.exerciseProgress=String(progress);el.dataset.characterFace='authored-morphs';
  const key=body+':'+motion;if(ready.current!==key){ready.current=key;requestAnimationFrame(()=>onReady?.());}
 }}/>{body==='female'&&<mesh name="detailed-hair" geometry={model.geometry} material={transparent}/ >}{!wall&&equipment}</group>{wall&&equipment}</group>;
}
