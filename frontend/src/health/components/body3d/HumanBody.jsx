import React, { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { loftTube, loftEllipticalTube, taperProfile } from './geometry.js';
import { resolveBodyProfile } from './bodyProfiles.js';

const neutral='#c8d5e5';
function Surface({color,selected=false}) {
  return <meshStandardMaterial color={color||neutral} roughness={.66} metalness={.02}
    emissive={selected?new THREE.Color(color||neutral):'#000000'} emissiveIntensity={selected ? .22 : 0}/>;
}
function Ellipsoid({position,scale,color=neutral,rotation,selected}) {
  return <mesh position={position} scale={scale} rotation={rotation} castShadow><sphereGeometry args={[1,24,18]}/><Surface color={color} selected={selected}/></mesh>;
}
export default function HumanBody({gender='unspecified',segmentColors={},onSelect,selectedSegment,onHover}) {
  const profile=resolveBodyProfile(gender);
  const geometries=useMemo(()=>{
    const p=profile;
    const result={TRUNK:loftEllipticalTube([[0,.88,0],[0,.99,-.009],[0,1.12,-.007],[0,1.31,0],[0,1.43,0],[0,1.49,0]],
      taperProfile([[0,.085],[.17,p.hip],[.39,p.waist],[.70,p.chest],[.89,p.shoulder],[1,.074]]),
      taperProfile([[0,.075],[.19,p.depth],[.43,.077],[.70,p.depth],[.88,.078],[1,.052]]),{radialSegments:40,heightSegments:44})};
    for(const [name,sign] of [['LEFT',1],['RIGHT',-1]]) {
      const shoulder=p.shoulder*.88;
      result[`${name}_ARM`]=loftTube([[sign*(shoulder-.012),1.422,0],[sign*(shoulder+.018),1.397,0],[sign*(shoulder+.055),1.34,0],[sign*(shoulder+.093),1.18,.003],[sign*(shoulder+.104),1.065,.007],[sign*(shoulder+.116),.92,.009]],
        taperProfile([[0,p.arm*.45],[.15,p.arm],[.34,p.arm*.88],[.5,.034],[.64,p.arm*.77],[1,.022]]),{radialSegments:24,heightSegments:32});
      result[`${name}_LEG`]=loftTube([[sign*p.hip*.48,1.025,0],[sign*p.hip*.55,.92,0],[sign*p.hip*.60,.79,.005],[sign*p.hip*.58,.52,.012],[sign*p.hip*.60,.35,-.011],[sign*p.hip*.60,.085,0]],
        taperProfile([[0,p.thigh*.45],[.18,p.thigh],[.4,p.thigh*.73],[.51,.043],[.68,.059],[.85,.043],[1,.030]]),{radialSegments:28,heightSegments:40});
    }
    return result;
  },[profile]);
  useEffect(()=>()=>Object.values(geometries).forEach(g=>g.dispose()),[geometries]);
  return <group name={`human-${gender}`}>
    {Object.entries(geometries).map(([name,geometry])=>{
      const selected=selectedSegment===name,color=segmentColors[name]||neutral;
      const sign=name.startsWith('LEFT')?1:-1;
      const arm=name.endsWith('ARM'),leg=name.endsWith('LEG');
      const handX=sign*(profile.shoulder*.88+.12);
      return <group key={name} name={name}
        onClick={e=>{e.stopPropagation();onSelect?.(name);}}
        onPointerOver={e=>{e.stopPropagation();onHover?.(name);document.body.style.cursor='pointer';}}
        onPointerOut={()=>{onHover?.(null);document.body.style.cursor='auto';}}>
        <mesh geometry={geometry} castShadow receiveShadow><Surface color={color} selected={selected}/></mesh>
        {arm&&<group>
          <Ellipsoid position={[handX,.876,.012]} scale={[.030,.050,.017]} color={color} selected={selected}/>
          {[0,1,2,3].map(i=><Ellipsoid key={i} position={[handX+(i-1.5)*.012,.824+(i===0 || i===3 ? .006 : 0),.016]} scale={[.006,.029-(i===3 ? .006 : 0),.008]} color={color} selected={selected}/>)}
          <Ellipsoid position={[handX-sign*.035,.866,.021]} scale={[.009,.029,.010]} rotation={[0,0,sign*-.45]} color={color} selected={selected}/>
        </group>}
        {leg&&<Ellipsoid position={[sign*profile.hip*.60,.067,.045]} scale={[.043,.035,.098]} color={color} selected={selected}/>}
      </group>;
    })}
    <Ellipsoid position={[0,1.529,0]} scale={[.044,.070,.043]}/>
    <Ellipsoid position={[0,1.665,.004]} scale={[.077,.110,.085]}/>
    <Ellipsoid position={[0,1.61,.039]} scale={[.056,.055,.050]}/>
    <Ellipsoid position={[0,1.65,.085]} scale={[.012,.024,.014]}/>
    {[-1,1].map(sign=><group key={sign}>
      <Ellipsoid position={[sign*.077,1.665,0]} scale={[.014,.027,.016]}/>
      <Ellipsoid position={[sign*.028,1.677,.081]} scale={[.010,.005,.003]} color="#7e91a9"/>
    </group>)}
  </group>;
}
