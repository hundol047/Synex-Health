import React,{useEffect,useMemo} from 'react';
import * as THREE from 'three';
import {Line} from '@react-three/drei';
import data from './assets/human-mesh.json';
import {mannequinBase,mannequinPositions} from './mannequinMath.js';

const names=[null,'TRUNK','LEFT_ARM','RIGHT_ARM','LEFT_LEG','RIGHT_LEG'];
const indices=[],groups=[];
for(let region=0;region<6;region++){
 const start=indices.length;
 for(let i=0;i<data.indices.length;i+=3){
  const ids=data.indices.slice(i,i+3),labels=ids.map(id=>data.regions[id]);
  if((labels.find(v=>labels.filter(x=>x===v).length>=2)??labels[0])===region)indices.push(...ids);
 }
 groups.push({start,count:indices.length-start,materialIndex:region});
}
const sharedIndex=new Uint32Array(indices);
export default function Mannequin({measurement,profile,referenceMeasurement,options,selectedSegment,onSelect,onHover,clippingPlanes=[]}){
 const base=useMemo(()=>mannequinBase(profile?.gender),[profile?.gender]);
 const own=useMemo(()=>mannequinPositions(base,measurement,profile),[base,measurement,profile]);
 // Keep the user's regional shape baseline, without assigning their measured
 // regional lean kg to the literature reference. Only total SMM changes.
 const reference=useMemo(()=>referenceMeasurement?mannequinPositions(base,referenceMeasurement,profile,measurement?.segments||[]):null,[base,referenceMeasurement,profile,measurement?.segments]);
 const scale=(measurement?.height||profile?.height_cm||178)/178;
 return <group name="composition-mannequin">
  {options.skeleton&&<MannequinSkeleton scale={scale}/>}
  {options.showReference&&reference&&<Surface name="reference-average" positions={reference} color="#eab578" opacity={options.referenceOpacity} wireframe={options.referenceWireframe} {...{selectedSegment,onSelect,onHover,clippingPlanes}}/>}
  {options.showMy&&<Surface name="my-muscle" positions={own} color="#42bed6" opacity={options.myOpacity} {...{selectedSegment,onSelect,onHover,clippingPlanes}}/>}
  <mesh position={[0,.002,0]} rotation={[-Math.PI/2,0,0]}><circleGeometry args={[.49*scale,64]}/><meshBasicMaterial color="#376071" transparent opacity={.24} depthWrite={false}/></mesh>
  <mesh position={[0,.003,0]} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[.49*scale,.494*scale,64]}/><meshBasicMaterial color="#7bb9c9" transparent opacity={.4} depthWrite={false}/></mesh>
 </group>;
}
function Surface({name,positions,color,opacity,wireframe=false,selectedSegment,onSelect,onHover,clippingPlanes}){
 const geometry=useMemo(()=>{
  const g=new THREE.BufferGeometry();g.setIndex(new THREE.BufferAttribute(sharedIndex,1));g.setAttribute('position',new THREE.BufferAttribute(positions,3));groups.forEach(v=>g.addGroup(v.start,v.count,v.materialIndex));g.computeVertexNormals();g.computeBoundingSphere();
  if(import.meta.env.DEV){
   const regions={};for(let i=0;i<positions.length;i+=3){const key=names[data.regions[i/3]];if(!key)continue;const r=regions[key]||(regions[key]={count:0,depth:0,center:[0,0,0]});r.count++;r.depth+=Math.abs(positions[i+2]);for(let j=0;j<3;j++)r.center[j]+=positions[i+j];}
   for(const r of Object.values(regions)){r.depth/=r.count;r.center=r.center.map(v=>v/r.count);}g.userData.regions=regions;
  }
  return g;
 },[positions]);
 useEffect(()=>()=>geometry.dispose(),[geometry]);
 const region=e=>names[data.regions[e.face?.a]];
 return <mesh name={name} geometry={geometry} renderOrder={name==='my-muscle'?2:1}
  onClick={e=>{if(e.delta>5)return;const r=region(e);if(r){e.stopPropagation();onSelect?.(r);}}}
  onPointerMove={e=>onHover?.(region(e))} onPointerOut={()=>onHover?.(null)}>
  {names.map((r,i)=><meshPhysicalMaterial key={i} attach={`material-${i}`} color={selectedSegment===r?'#e5faff':color}
   roughness={.3} metalness={.12} clearcoat={.8} clearcoatRoughness={.25} emissive={color} emissiveIntensity={.08}
   transparent opacity={opacity*(selectedSegment&&r&&selectedSegment!==r?.4:1)} depthWrite={false} side={THREE.FrontSide}
   wireframe={wireframe} clippingPlanes={clippingPlanes} polygonOffset polygonOffsetFactor={name==='my-muscle'?-1:1}/>) }
 </mesh>;
}
function Bone({a,b,radius=.011}){
 const transform=useMemo(()=>{const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b);return {position:start.clone().add(end).multiplyScalar(.5),length:start.distanceTo(end),quaternion:new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),end.sub(start).normalize())};},[a,b]);
 return <mesh position={transform.position} quaternion={transform.quaternion}><capsuleGeometry args={[radius,Math.max(.001,transform.length-2*radius),4,8]}/><meshStandardMaterial color="#d3e3e6" roughness={.5}/></mesh>;
}
function MannequinSkeleton({scale}){
 const bones=[[[0,1.48,0],[0,1.02,0]],[[0,1.42,0],[.24,1.42,0]],[[0,1.42,0],[-.24,1.42,0]]];
 const joints=[];
 for(const s of [-1,1]){
  const shoulder=[s*.24,1.42,0],elbow=[s*.365,1.17,0],wrist=[s*.47,.95,0],hip=[s*.10,.98,0],knee=[s*.11,.54,0],ankle=[s*.11,.1,0];
  bones.push([shoulder,elbow],[elbow,wrist],[hip,knee],[knee,ankle]);joints.push(shoulder,elbow,wrist,hip,knee,ankle);
 }
 return <group name="illustrative-skeleton" scale={scale}>
  {bones.map(([a,b],i)=><Bone key={i} a={a} b={b}/>)}
  {joints.map((p,i)=><mesh key={i} position={p}><sphereGeometry args={[.016,10,8]}/><meshStandardMaterial color="#d3e3e6"/></mesh>)}
  {[1.18,1.23,1.28,1.33,1.38].map((y,i)=><Line key={y} points={Array.from({length:25},(_,j)=>{const t=j/24*Math.PI*2;return [Math.cos(t)*(.12+i*.006),y+Math.sin(t)*.025,Math.sin(t)*.075];})} color="#d3e3e6" lineWidth={1.4}/>)}
  <Line points={[[.13,1.03,0],[.11,.96,.035],[0,.94,.05],[-.11,.96,.035],[-.13,1.03,0],[0,1.01,-.06],[.13,1.03,0]]} color="#d3e3e6" lineWidth={3}/>
 </group>;
}
