import React,{useMemo,useEffect} from 'react';
import * as THREE from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import mesh from '../body3d/assets/human-mesh.json';
import {rigRotation} from '../exercise/rig.js';
// Original geometry generated around the actual selected head, not a downloaded likeness.
export function buildHeadDetails(base,scale,rest,character){
 const anchor=new THREE.Vector3(...rest[1]);
 const point=(x,y,z)=>new THREE.Vector3(x*scale,y*scale,z*scale).sub(anchor);
 const scalp=base.slice(),indices=[];
 const isHair=i=>{const x=base[i*3]/scale,y=base[i*3+1]/scale,z=base[i*3+2]/scale;return y>(z>.095?1.726-.013*Math.cos(x*35):1.638);};
 for(let i=0;i<mesh.indices.length;i+=3){const f=mesh.indices.slice(i,i+3);if(f.every(isHair))indices.push(...f);}
 for(let i=0;i<scalp.length;i+=3){if(isHair(i/3)){scalp[i]*=1.035;scalp[i+1]+=.0035*scale;scalp[i+2]=.025*scale+(scalp[i+2]-.025*scale)*1.04;}scalp[i]-=anchor.x;scalp[i+1]-=anchor.y;scalp[i+2]-=anchor.z;}
 const cap=new THREE.BufferGeometry();cap.setAttribute('position',new THREE.BufferAttribute(scalp,3));cap.setIndex(indices);cap.computeVertexNormals();
 const surface=(x,y)=>{let best=Infinity,z=.12;for(let i=0;i<base.length;i+=3){if(base[i+2]<.06*scale)continue;const d=(base[i]/scale-x)**2+(base[i+1]/scale-y)**2;if(d<best){best=d;z=base[i+2]/scale;}}let front=-Infinity;for(let i=0;i<base.length;i+=3)if(Math.abs(base[i]/scale-x)<.012&&Math.abs(base[i+1]/scale-y)<.010)front=Math.max(front,base[i+2]/scale);return Number.isFinite(front)?Math.max(front,z):z;};
 const eyeY=1.677,eyes=[-1,1].map(side=>{const x=side*.034;return point(x,eyeY,surface(x,eyeY)+.004);});
 const curves=[];
 const scalpPoints=[];for(let i=0;i<base.length/3;i++)if(isHair(i))scalpPoints.push(new THREE.Vector3(scalp[i*3],scalp[i*3+1],scalp[i*3+2]));
 const project=p=>{let best=scalpPoints[0],distance=Infinity;for(const v of scalpPoints){const d=v.distanceToSquared(p);if(d<distance){distance=d;best=v;}}return best.clone();};
 // Layered locks follow scalp ellipsoids and taper towards the temples.
 for(let i=0;i<26;i++){
  const a=i/26*Math.PI*2,side=Math.sin(a),front=Math.cos(a),part=character.hairStyle==='parted';
  const points=[point(side*.018,1.797,.025+front*.015),point(side*.055+(part?.008:0),1.785,.025+front*.065),point(side*.078,1.747,.025+front*.090),point(side*.077,front>0?1.728:1.66,.025+front*.088)];
  const curve=new THREE.CatmullRomCurve3(points.map(project));curves.push(new THREE.TubeGeometry(curve,12,(part?.0026:.0018)*scale,5,false));
 }
 if(character.hairStyle==='parted')for(let i=0;i<8;i++){
  const x=-.055+i*.012;curves.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([project(point(x,1.776,.08)),project(point(x+.014,1.75,.112)),point(x+.025,1.709+Math.abs(x)*.18,surface(x+.025,1.709+Math.abs(x)*.18)+.004)]),12,.003*scale,6,false));
 }
 const brows=[-1,1].map(side=>new THREE.TubeGeometry(new THREE.CatmullRomCurve3([point(side*.018,1.697,surface(side*.018,1.697)+.002),point(side*.033,1.701,surface(side*.033,1.701)+.002),point(side*.052,1.694,surface(side*.052,1.694)+.002)]),12,.0012*scale,5,false));
 const locks=mergeGeometries(curves);curves.forEach(g=>g.dispose());
 return {cap,curves:[locks],brows,eyes,bun:point(0,1.736,-.078),dispose(){[cap,locks,...brows].forEach(g=>g.dispose());}};
}
export default function HeadDetail({base,scale,rest,joints,character}){
 const detail=useMemo(()=>buildHeadDetails(base,scale,rest,character),[base,scale,rest,character.hairStyle]);
 useEffect(()=>()=>detail.dispose(),[detail]);
 const toon=character.style==='toon',hairMaterial=toon?'meshToonMaterial':'meshStandardMaterial';
 const hairProps={color:character.hair,...(!toon?{roughness:.58,metalness:0}:{})};
 return <group position={joints[1]} quaternion={rigRotation(joints,1,rest)}>
  <mesh geometry={detail.cap}>{React.createElement(hairMaterial,hairProps)}</mesh>
  {detail.curves.map((g,i)=><mesh key={i} geometry={g}>{React.createElement(hairMaterial,{...hairProps,color:new THREE.Color(character.hair).multiplyScalar(i%3===0?1.16:1)})}</mesh>)}
  {character.hairStyle==='bun'&&<mesh position={detail.bun} scale={[.029*scale,.026*scale,.023*scale]}><sphereGeometry args={[1,24,16]}/>{React.createElement(hairMaterial,hairProps)}</mesh>}
  {detail.brows.map((g,i)=><mesh key={i} geometry={g}><meshStandardMaterial color={character.hair} roughness={.9}/></mesh>)}
  {detail.eyes.map((position,i)=><group key={i} position={position}>
   <mesh scale={[.010*scale,(toon?.005:.0035)*scale,.0025*scale]}><sphereGeometry args={[1,24,16]}/><meshStandardMaterial color="#ede8e3" roughness={.35}/></mesh>
   <mesh position={[0,0,.0025*scale]} scale={[(toon?.0037:.0028)*scale,(toon?.004:.0029)*scale,.0007*scale]}><sphereGeometry args={[1,20,12]}/><meshStandardMaterial color={character.eyes} roughness={.25}/></mesh>
   <mesh position={[0,0,.0031*scale]} scale={[.0012*scale,.0016*scale,.0004*scale]}><sphereGeometry args={[1,16,10]}/><meshStandardMaterial color="#151b25" roughness={.18}/></mesh>
   <mesh position={[-.0008*scale,.001*scale,.0035*scale]}><sphereGeometry args={[.00055*scale,8,6]}/><meshBasicMaterial color="white"/></mesh>
  </group>)}
 </group>;
}
