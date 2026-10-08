import React,{useEffect,useMemo,useRef} from 'react';
import * as THREE from 'three';
import {Line} from '@react-three/drei';
import {useFrame,useThree} from '@react-three/fiber';
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
 const paired=options.layout==='side-by-side'&&options.showMy&&options.showReference&&reference;
 return <group name="composition-mannequin">
  {options.showReference&&reference&&<ComparisonBody offset={paired?.68*scale:0}>
   {options.skeleton&&(paired||!options.showMy)&&<MannequinSkeleton scale={scale}/>}
   <Surface name="reference-average" positions={reference} color="#789bcc" opacity={options.referenceOpacity} wireframe={options.referenceWireframe} {...{selectedSegment,onSelect,onHover,clippingPlanes}}/>
   {paired&&<Platform scale={scale} color="#789bcc"/>}
  </ComparisonBody>}
  {options.showMy&&<ComparisonBody offset={paired?-.68*scale:0}>
   {options.skeleton&&<MannequinSkeleton scale={scale}/>}
   <Surface name="my-muscle" positions={own} color="#2563eb" opacity={options.myOpacity} {...{selectedSegment,onSelect,onHover,clippingPlanes}}/>
   <Platform scale={scale} color="#2563eb"/>
  </ComparisonBody>}
  {!options.showMy&&reference&&<Platform scale={scale} color="#789bcc"/>}
 </group>;
}
// Offset each body along the camera's screen-right axis. They remain distinct
// when the linked view rotates to the side, instead of hiding behind each other.
function ComparisonBody({offset,children}){
 const group=useRef(),{camera}=useThree();
 useFrame(()=>{camera.updateMatrixWorld();if(group.current)group.current.position.setFromMatrixColumn(camera.matrixWorld,0).multiplyScalar(offset);},-1);
 return <group ref={group} position={[offset,0,0]}>{children}</group>;
}
function Platform({scale,color}){
 return <>
  <mesh position={[0,.002,0]} rotation={[-Math.PI/2,0,0]}><circleGeometry args={[.49*scale,64]}/><meshBasicMaterial color={color} transparent opacity={.08} depthWrite={false}/></mesh>
  <mesh position={[0,.003,0]} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[.49*scale,.494*scale,64]}/><meshBasicMaterial color={color} transparent opacity={.3} depthWrite={false}/></mesh>
 </>;
}
function Surface({name,positions,color,opacity,wireframe=false,selectedSegment,onSelect,onHover,clippingPlanes}){
 const geometry=useMemo(()=>{
  const g=new THREE.BufferGeometry();g.setIndex(new THREE.BufferAttribute(sharedIndex,1));g.setAttribute('position',new THREE.BufferAttribute(positions,3));groups.forEach(v=>g.addGroup(v.start,v.count,v.materialIndex));g.computeVertexNormals();g.computeBoundingSphere();g.computeBoundingBox();
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
  {names.map((r,i)=><meshPhysicalMaterial key={i} attach={`material-${i}`} color={selectedSegment===r?'#dbeafe':color}
   roughness={.42} metalness={0} clearcoat={.25} clearcoatRoughness={.4} emissive={color} emissiveIntensity={.04}
   transparent opacity={opacity*(selectedSegment&&r&&selectedSegment!==r?.4:1)} depthWrite={false} side={THREE.FrontSide}
   wireframe={wireframe} clippingPlanes={clippingPlanes} polygonOffset polygonOffsetFactor={name==='my-muscle'?-1:1}/>) }
 </mesh>;
}
function Bone({a,b,radius=.011}){
 const transform=useMemo(()=>{const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b);return {position:start.clone().add(end).multiplyScalar(.5),length:start.distanceTo(end),quaternion:new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),end.sub(start).normalize())};},[a,b]);
 return <mesh position={transform.position} quaternion={transform.quaternion}><capsuleGeometry args={[radius,Math.max(.001,transform.length-2*radius),4,8]}/><meshStandardMaterial color="#7895bf" roughness={.5}/></mesh>;
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
  {joints.map((p,i)=><mesh key={i} position={p}><sphereGeometry args={[.016,10,8]}/><meshStandardMaterial color="#7895bf"/></mesh>)}
  {[1.18,1.23,1.28,1.33,1.38].map((y,i)=><Line key={y} points={Array.from({length:25},(_,j)=>{const t=j/24*Math.PI*2;return [Math.cos(t)*(.12+i*.006),y+Math.sin(t)*.025,Math.sin(t)*.075];})} color="#7895bf" lineWidth={1.4}/>)}
  <Line points={[[.13,1.03,0],[.11,.96,.035],[0,.94,.05],[-.11,.96,.035],[-.13,1.03,0],[0,1.01,-.06],[.13,1.03,0]]} color="#7895bf" lineWidth={3}/>
 </group>;
}
