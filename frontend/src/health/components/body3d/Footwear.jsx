import React,{useMemo} from 'react';
import * as THREE from 'three';
export function footwearAnchors(base){
 return [1,-1].map(side=>{
  const box=new THREE.Box3();for(let i=0;i<base.length;i+=3)if(base[i+1]<.13&&base[i]*side>0)box.expandByPoint(new THREE.Vector3(base[i],base[i+1],base[i+2]));
  const c=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3());
  return {center:[c.x,box.min.y+.04,c.z],width:Math.max(.08,size.x+.016),length:Math.max(.23,size.z+.025)};
 });
}
export default function Footwear({anchors,clippingPlanes=[],opacity=1}){
 const upper=useMemo(()=>new THREE.CapsuleGeometry(1,2,6,16),[]);
 React.useEffect(()=>()=>upper.dispose(),[upper]);
 return <group name="training-shoes">{anchors.map((a,i)=><group key={i} position={a.center} quaternion={a.rotation}>
  <mesh geometry={upper} rotation={[Math.PI/2,0,0]} scale={[a.width/2,a.length/4,.037]} castShadow receiveShadow><meshStandardMaterial color="#d9d5ca" roughness={.82} clippingPlanes={clippingPlanes} transparent={opacity<1} opacity={opacity}/></mesh>
  <mesh geometry={upper} position={[0,-.025,0]} rotation={[Math.PI/2,0,0]} scale={[a.width*.52,a.length*.255,.012]} castShadow><meshStandardMaterial color="#536270" roughness={.95} clippingPlanes={clippingPlanes} transparent={opacity<1} opacity={opacity}/></mesh>
  {[-.025,0,.025].map(z=><mesh key={z} position={[0,.035,z]}><boxGeometry args={[a.width*.55,.004,.008]}/><meshStandardMaterial color="#f4f1e9" roughness={.9} clippingPlanes={clippingPlanes} transparent={opacity<1} opacity={opacity}/></mesh>)}
 </group>)}</group>;
}
