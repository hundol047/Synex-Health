import React, { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import data from './assets/human-mesh.json';

export const REGION_NAMES=[null,'TRUNK','LEFT_ARM','RIGHT_ARM','LEFT_LEG','RIGHT_LEG'];
export default function HumanBody({gender='unspecified',segmentColors={},onSelect,selectedSegment,onHover}) {
  const geometry=useMemo(()=>{
    const g=new THREE.BufferGeometry();
    const p=new Float32Array(data.profiles.female.length);
    const known=data.profiles[gender];
    for(let i=0;i<p.length;i++)p[i]=(known?known[i]:(data.profiles.female[i]+data.profiles.male[i])/2)*data.scale;
    g.setAttribute('position',new THREE.BufferAttribute(p,3));g.setIndex(data.indices);g.computeVertexNormals();
    g.setAttribute('color',new THREE.BufferAttribute(new Float32Array(p.length),3));
    return g;
  },[gender]);
  useEffect(()=>()=>geometry.dispose(),[geometry]);
  useEffect(()=>{
    const base=new THREE.Color('#d8c5b5'), skin=new THREE.Color('#ddcfc1');
    const colors=geometry.attributes.color;
    data.regions.forEach((region,i)=>{
      const key=REGION_NAMES[region];const c=(key?base:skin).clone();
      if(key&&segmentColors[key])c.lerp(new THREE.Color(segmentColors[key]),selectedSegment===key ? .65 : .18);
      if(key&&selectedSegment&&selectedSegment!==key)c.lerp(new THREE.Color('#dde2e5'),.35);
      colors.setXYZ(i,c.r,c.g,c.b);
    });colors.needsUpdate=true;
  },[geometry,segmentColors,selectedSegment]);
  const regionFor=e=>REGION_NAMES[data.regions[e.face?.a]];
  return <mesh name={`human-${gender}`} geometry={geometry} castShadow receiveShadow
    onClick={e=>{if(e.delta>5)return;const region=regionFor(e);if(region){e.stopPropagation();onSelect?.(region);}}}
    onPointerMove={e=>{const region=regionFor(e);onHover?.(region||null);}}
    onPointerOut={()=>onHover?.(null)}>
    <meshStandardMaterial vertexColors roughness={.82} metalness={0}/>
  </mesh>;
}
