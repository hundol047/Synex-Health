import React, { useEffect, useMemo } from 'react';
import * as THREE from 'three';

// Loft the sidewall, forefoot and raised heel as a single continuous upper.
// The color bands follow the shoe rather than the camera or the floor.
function shoeGeometry() {
  const positions=[], colors=[], indices=[];
  const color=new THREE.Color();
  const rings=36, sides=32;
  for (let i=0;i<=rings;i++) {
    const t=i/rings;
    const width=.5*Math.pow(Math.max(.0001,Math.sin(Math.PI*t)),.37)*(.85+.17*t);
    const lift=.009*Math.pow(t,5);
    const heel = .029*Math.exp(-Math.pow((t-.27)/.23,2));
    const tip = Math.pow(Math.max(0,Math.sin(Math.PI*t)),.46);
    const height=(.055+heel-.021*t)*tip;
    for(let j=0;j<=sides;j++){
      const angle=j/sides*2*Math.PI, side=Math.cos(angle), up=Math.sin(angle);
      const x=width*Math.sign(side)*Math.pow(Math.abs(side),.68);
      const y=lift + (up>0 ? -.012+height*Math.pow(up,.74) : -.012+.024*up*tip);
      positions.push(x,y,t-.5);
      const stripe=.11+.49*t;
      const upper= Math.abs(up-stripe)<.11 && t>.19 && t<.73;
      color.set(up<-.63?'#253b41':up<-.12?'#e7efdf':upper?'#a7d4bb':t<.17?'#214e50':t>.80?'#739791':'#396760');
      colors.push(color.r,color.g,color.b);
    }
  }
  for(let i=0;i<rings;i++)for(let j=0;j<sides;j++){
    const a=i*(sides+1)+j,b=a+sides+1;indices.push(a,a+1,b,a+1,b+1,b);
  }
  const g=new THREE.BufferGeometry();g.setIndex(indices);
  g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.computeVertexNormals();return g;
}

export default function RunningShoes({anchors}){
  const geometry=useMemo(shoeGeometry,[]);
  useEffect(()=>()=>geometry.dispose(),[geometry]);
  return anchors.map((shoe,i)=><group key={i} position={shoe.center} quaternion={shoe.rotation}>
    <mesh geometry={geometry} scale={[shoe.width*1.10,1,shoe.length*1.04]} castShadow receiveShadow>
      <meshStandardMaterial vertexColors roughness={.86} side={THREE.DoubleSide}/>
    </mesh>
    {[.36,.44,.52].map(t=><mesh key={t} position={[0,-.012+(.055+.029*Math.exp(-Math.pow((t-.27)/.23,2))-.021*t)*Math.pow(Math.sin(Math.PI*t),.46),(t-.5)*shoe.length]} rotation={[0,t===.44?-.19:.19,0]} scale={[shoe.width*.27,.003,.004]}>
      <sphereGeometry args={[1,8,5]}/><meshStandardMaterial color="#d0e7d6" roughness={.9}/>
    </mesh>)}
  </group>);
}
