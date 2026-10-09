import React,{useEffect,useMemo,useRef} from 'react';
import * as THREE from 'three';
import {Line} from '@react-three/drei';
import {useFrame,useThree} from '@react-three/fiber';
import data from './assets/human-mesh.json';
import {mannequinBase,mannequinPositions} from './mannequinMath.js';
import {compositionAnatomicalRegions} from './mannequinAnatomy.js';

const names=[null,'TRUNK','LEFT_ARM','RIGHT_ARM','LEFT_LEG','RIGHT_LEG'];
const sharedIndex=new Uint32Array(data.indices);
function anatomicalSurfaceLayout(regions){
 const buckets=Array.from({length:6},()=>[]),groups=[],indices=[];
 for(let i=0;i<data.indices.length;i+=3){
  const a=data.indices[i],b=data.indices[i+1],c=data.indices[i+2],first=regions[a],second=regions[b],third=regions[c],region=first===second||first===third?first:second===third?second:first;
  buckets[region].push(a,b,c);
 }
 for(let region=0;region<6;region++){const start=indices.length;indices.push(...buckets[region]);groups.push({start,count:indices.length-start,materialIndex:region});}
 return {index:new Uint32Array(indices),groups};
}
export default function Mannequin({measurement,profile,referenceMeasurement,options,selectedSegment,onSelect,onHover,clippingPlanes=[]}){
 const base=useMemo(()=>mannequinBase(profile?.gender),[profile?.gender]);
 const regions=useMemo(()=>compositionAnatomicalRegions(base,data.indices),[base]);
 const layout=useMemo(()=>anatomicalSurfaceLayout(regions),[regions]);
 const own=useMemo(()=>mannequinPositions(base,measurement,profile),[base,measurement,profile]);
 // Keep the user's regional shape baseline, without assigning their measured
 // regional lean kg to the literature reference. Only total SMM changes.
 const reference=useMemo(()=>referenceMeasurement?mannequinPositions(base,referenceMeasurement,profile,measurement?.segments||[]):null,[base,referenceMeasurement,profile,measurement?.segments]);
 const scale=(measurement?.height||profile?.height_cm||178)/178;
 const paired=options.layout==='side-by-side'&&options.showMy&&options.showReference&&reference;
 return <group name="composition-mannequin">
  {options.showReference&&reference&&<ComparisonBody offset={paired?.68*scale:0}>
   {options.skeleton&&(paired||!options.showMy)&&<MannequinSkeleton scale={scale}/>}
   {/* Overlay shows the coincident head once: total-muscle comparison concerns
       the body, and duplicate facial surfaces create misleading color seams.
       Separate views retain the complete reference head and its own depth. */}
   <Surface name="reference-average" positions={reference} color="#7c8fa7" opacity={options.referenceOpacity} wireframe={options.referenceWireframe} headDepth={!!paired||!options.showMy} {...{selectedSegment,onSelect,onHover,clippingPlanes,regions,layout}}/>
   {options.referenceContour!==false&&<ReferenceContour positions={reference} color="#7c8fa7" clippingPlanes={clippingPlanes} regions={regions}/>}
   {paired&&<Platform scale={scale} color="#7c8fa7"/>}
  </ComparisonBody>}
  {options.showMy&&<ComparisonBody offset={paired?-.68*scale:0}>
   {options.skeleton&&<MannequinSkeleton scale={scale}/>}
   <Surface name="my-muscle" positions={own} color="#2563eb" opacity={options.myOpacity} {...{selectedSegment,onSelect,onHover,clippingPlanes,regions,layout}}/>
   <Platform scale={scale} color="#2563eb"/>
  </ComparisonBody>}
  {!options.showMy&&reference&&<Platform scale={scale} color="#7c8fa7"/>}
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
// An apparent contour uses edges of the actual reference surface. It never
// expands or moves that surface to make the reference appear larger.
export function buildContourTopology(index){
 let stride=0;for(const value of index)stride=Math.max(stride,value+1);
 const edges=new Map();
 for(let face=0;face<index.length/3;face++)for(let edge=0;edge<3;edge++){
  const v=index[face*3+edge],w=index[face*3+(edge+1)%3],a=Math.min(v,w),b=Math.max(v,w),key=a*stride+b;
  const existing=edges.get(key);if(existing)existing[3]=face;else edges.set(key,[a,b,face,-1]);
 }
 return Int32Array.from([...edges.values()].flat());
}
const contourTopology=buildContourTopology(sharedIndex);
export function createContourModel(positions,index=sharedIndex,topology=contourTopology,regions=null){
 const faces=index.length/3,normals=new Float32Array(faces*3),centers=new Float32Array(faces*3);
 for(let face=0;face<faces;face++){
  const a=index[face*3]*3,b=index[face*3+1]*3,c=index[face*3+2]*3;
  const ux=positions[b]-positions[a],uy=positions[b+1]-positions[a+1],uz=positions[b+2]-positions[a+2],vx=positions[c]-positions[a],vy=positions[c+1]-positions[a+1],vz=positions[c+2]-positions[a+2],j=face*3;
  normals[j]=uy*vz-uz*vy;normals[j+1]=uz*vx-ux*vz;normals[j+2]=ux*vy-uy*vx;
  for(let axis=0;axis<3;axis++)centers[j+axis]=(positions[a+axis]+positions[b+axis]+positions[c+axis])/3;
 }
 return {positions,topology,normals,centers,regions,front:new Uint8Array(faces)};
}
export function writeContourSegments(model,viewer,target){
 const {positions,topology,normals,centers,regions,front}=model;
 for(let face=0;face<front.length;face++){
  const j=face*3;front[face]=normals[j]*(viewer[0]-centers[j])+normals[j+1]*(viewer[1]-centers[j+1])+normals[j+2]*(viewer[2]-centers[j+2])>0?1:0;
 }
 let segments=0;
 for(let i=0;i<topology.length;i+=4){
  const a=topology[i]*3,b=topology[i+1]*3,left=topology[i+2],right=topology[i+3];
  // Total-muscle comparison does not change the head. Facial crease contours
  // add misleading detail through the other layer, rather than a body boundary.
  if(regions&&regions[a/3]===0&&regions[b/3]===0)continue;
  if(right<0?!front[left]:front[left]===front[right])continue;
  const j=segments++*6;for(let axis=0;axis<3;axis++){target[j+axis]=positions[a+axis];target[j+3+axis]=positions[b+axis];}
 }
 return segments;
}
function ReferenceContour({positions,color,clippingPlanes,regions}){
 const line=useRef(),{camera,invalidate}=useThree();
 const model=useMemo(()=>{
  const values=createContourModel(positions,sharedIndex,contourTopology,regions),buffer=new Float32Array(values.topology.length/4*6),geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.BufferAttribute(buffer,3).setUsage(THREE.DynamicDrawUsage));geometry.setDrawRange(0,0);
  return {...values,buffer,geometry,lastViewer:[NaN,NaN,NaN],viewer:new THREE.Vector3()};
 },[positions,regions]);
 useEffect(()=>{invalidate();return()=>model.geometry.dispose();},[model,invalidate]);
 useFrame(()=>{
  if(!line.current)return;
  camera.getWorldPosition(model.viewer);line.current.parent.worldToLocal(model.viewer);
  const {x,y,z}=model.viewer,last=model.lastViewer;
  if(Math.abs(x-last[0])<.00001&&Math.abs(y-last[1])<.00001&&Math.abs(z-last[2])<.00001)return;
  last[0]=x;last[1]=y;last[2]=z;
  const count=writeContourSegments(model,last,model.buffer),attribute=model.geometry.attributes.position;
  attribute.clearUpdateRanges();attribute.addUpdateRange(0,count*6);attribute.needsUpdate=true;model.geometry.setDrawRange(0,count*2);
  line.current.userData.segmentCount=count;
 });
 return <lineSegments name="reference-contour" ref={line} geometry={model.geometry} frustumCulled={false} renderOrder={4} raycast={()=>{}}>
  <lineBasicMaterial color={color} transparent opacity={.72} depthTest={false} depthWrite={false} toneMapped={false} clippingPlanes={clippingPlanes}/>
 </lineSegments>;
}
function Surface({name,positions,color,opacity,wireframe=false,headDepth=true,selectedSegment,onSelect,onHover,clippingPlanes,regions,layout}){
 const geometry=useMemo(()=>{
  const g=new THREE.BufferGeometry();g.setIndex(new THREE.BufferAttribute(layout.index,1));g.setAttribute('position',new THREE.BufferAttribute(positions,3));layout.groups.forEach(v=>g.addGroup(v.start,v.count,v.materialIndex));g.computeVertexNormals();g.computeBoundingSphere();g.computeBoundingBox();
  // Verify real muscle-dependent geometry without copying health input values,
  // including the case where both shapes should be exactly equal.
  let fingerprint=2166136261;for(const value of new Uint32Array(positions.buffer,positions.byteOffset,positions.length))fingerprint=Math.imul(fingerprint^value,16777619);
  g.userData.shapeFingerprint=(fingerprint>>>0).toString(16).padStart(8,'0');
  if(import.meta.env.DEV){
   const grouped={};for(let i=0;i<positions.length;i+=3){const key=names[regions[i/3]];if(!key)continue;const r=grouped[key]||(grouped[key]={count:0,depth:0,center:[0,0,0]});r.count++;r.depth+=Math.abs(positions[i+2]);for(let j=0;j<3;j++)r.center[j]+=positions[i+j];}
   for(const r of Object.values(grouped)){r.depth/=r.count;r.center=r.center.map(v=>v/r.count);}g.userData.regions=grouped;
  }
  return g;
 },[positions,regions,layout]);
 useEffect(()=>()=>geometry.dispose(),[geometry]);
 const headDepthGeometry=useMemo(()=>{
  if(!headDepth)return null;
  const head=layout.groups[0],g=new THREE.BufferGeometry();
  // The authored face contains inner eye and mouth surfaces. Establish the
  // nearest head depth before blending so those surfaces cannot paint over it.
  // Reuse the exact head triangles and positions; do not alter the shape.
  // Keep the same values with a separate GPU attribute: removing a depth pass
  // during a layout change must not dispose the visible surface's buffer.
  g.setAttribute('position',new THREE.BufferAttribute(positions,3));
  g.setIndex(new THREE.BufferAttribute(layout.index.slice(head.start,head.start+head.count),1));
  return g;
 },[positions,layout,headDepth]);
 useEffect(()=>()=>headDepthGeometry?.dispose(),[headDepthGeometry]);
 const region=e=>names[e.face?.materialIndex];
 return <group>
  {headDepthGeometry&&<mesh name={`${name}-head-depth`} geometry={headDepthGeometry} renderOrder={1} raycast={()=>{}}>
   <meshBasicMaterial colorWrite={false} depthWrite depthTest side={THREE.FrontSide} clippingPlanes={clippingPlanes}/>
  </mesh>}
  <mesh name={name} geometry={geometry} renderOrder={name==='my-muscle'?2:3} userData={{headDepthSource:headDepth?`${name}-head-depth`:'my-muscle-head-depth'}}
  onClick={e=>{if(e.delta>5)return;const r=region(e);if(r){e.stopPropagation();onSelect?.(r);}}}
  onPointerMove={e=>onHover?.(region(e))} onPointerOut={()=>onHover?.(null)}>
  {names.map((r,i)=><meshStandardMaterial key={i} attach={`material-${i}`} color={selectedSegment&&selectedSegment===r?'#dbeafe':color}
   visible={i!==0||headDepth}
   roughness={.86} metalness={0}
   transparent opacity={opacity*(selectedSegment&&r&&selectedSegment!==r?.4:1)} depthWrite={false} side={THREE.FrontSide}
   wireframe={wireframe} clippingPlanes={clippingPlanes} depthFunc={THREE.LessEqualDepth} polygonOffset={i!==0} polygonOffsetFactor={name==='my-muscle'?-1:1}/>) }
  </mesh>
 </group>;
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
