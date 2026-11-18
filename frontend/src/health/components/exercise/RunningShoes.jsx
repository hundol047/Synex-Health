import { DoubleSide } from 'three';
import React, { useEffect, useMemo } from 'react';
import { runningShoeGeometry, shoeMeshScale } from './runningShoeGeometry.js';

export default function RunningShoes({anchors}){
  const geometry=useMemo(runningShoeGeometry,[]);
  useEffect(()=>()=>geometry.dispose(),[geometry]);
  return anchors.map((shoe,i)=><group key={i} position={shoe.center} quaternion={shoe.rotation}>
    <mesh geometry={geometry} scale={shoeMeshScale(shoe)} castShadow receiveShadow>
      <meshStandardMaterial vertexColors roughness={.86} side={DoubleSide}/>
    </mesh>
    {[.36,.44,.52].map(t=><mesh key={t} position={[0,-.012+(.055+.029*Math.exp(-Math.pow((t-.27)/.23,2))-.021*t)*Math.pow(Math.sin(Math.PI*t),.46),(t-.5)*shoe.length]} rotation={[0,t===.44?-.19:.19,0]} scale={[shoe.width*.27,.003,.004]}>
      <sphereGeometry args={[1,8,5]}/><meshStandardMaterial color="#d0e7d6" roughness={.9}/>
    </mesh>)}
  </group>);
}
