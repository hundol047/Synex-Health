import React,{useMemo,useEffect} from 'react';
import * as THREE from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {irisTexture,eyeLidGeometry} from './eyeSurface.js';
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
 const eyeY=1.663,eyes=[-1,1].map(side=>{const x=side*.034;return point(x,eyeY,surface(x,eyeY)+.0015);});
 const curves=[];
 const scalpPoints=[];for(let i=0;i<base.length/3;i++)if(isHair(i))scalpPoints.push(new THREE.Vector3(scalp[i*3],scalp[i*3+1],scalp[i*3+2]));
 const project=p=>{let best=scalpPoints[0],distance=Infinity;for(const v of scalpPoints){const d=v.distanceToSquared(p);if(d<distance){distance=d;best=v;}}return best.clone();};
 // Layered locks follow scalp ellipsoids and taper towards the temples.
 for(let i=0;i<96;i++){
  const a=i/96*Math.PI*2,side=Math.sin(a),front=Math.cos(a),part=character.hairStyle==='parted';
  const points=[point(side*.018,1.797,.025+front*.015),point(side*.055+(part?.008:0),1.785,.025+front*.065),point(side*.078,1.747,.025+front*.090),point(side*.077,front>0?1.728:1.66,.025+front*.088)];
  const curve=new THREE.CatmullRomCurve3(points.map(project));curves.push(new THREE.TubeGeometry(curve,12,(part?.00085:.00065)*scale,5,false));
 }
 if(character.hairStyle==='parted')for(let i=0;i<48;i++){
  const x=-.055+i*.002;curves.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([project(point(x,1.776,.08)),project(point(x+.014,1.75,.112)),point(x+.025,1.709+Math.abs(x)*.18,surface(x+.025,1.709+Math.abs(x)*.18)+.004)]),18,.00045*scale,5,false));
 }
 const brows=[-1,1].map(side=>new THREE.TubeGeometry(new THREE.CatmullRomCurve3([point(side*.018,1.687,surface(side*.018,1.687)+.002),point(side*.033,1.691,surface(side*.033,1.691)+.002),point(side*.052,1.684,surface(side*.052,1.684)+.002)]),12,.0012*scale,5,false));
 const locks=mergeGeometries(curves);curves.forEach(g=>g.dispose());
 return {cap,curves:[locks],brows,eyes,bun:point(0,1.736,-.078),dispose(){[cap,locks,...brows].forEach(g=>g.dispose());}};
}
export default function HeadDetail({base,scale,rest,joints,character}){
 const detail=useMemo(()=>buildHeadDetails(base,scale,rest,character),[base,scale,rest,character.hairStyle]);
 useEffect(()=>()=>detail.dispose(),[detail]);
 const toon=character.style==='toon',hairMaterial=toon?'meshToonMaterial':'meshPhysicalMaterial';
 const iris=useMemo(()=>irisTexture(character.eyes),[character.eyes]);
 const lids=useMemo(()=>[eyeLidGeometry(scale,true),eyeLidGeometry(scale,false)],[scale]);
 useEffect(()=>()=>{iris.dispose();},[iris]);
 useEffect(()=>()=>lids.forEach(g=>g.dispose()),[lids]);
 const hairProps={color:character.hair,...(!toon?{roughness:.68,metalness:0,anisotropy:.12,envMapIntensity:.25}:{})};
 return <group position={joints[1]} quaternion={rigRotation(joints,1,rest)}>
  <mesh geometry={detail.cap}>{toon?<meshToonMaterial color={character.hair}/>:<meshStandardMaterial color={character.hair} roughness={.72} envMapIntensity={.3}/>}</mesh>
  {detail.curves.map((g,i)=><mesh key={i} geometry={g}>{React.createElement(hairMaterial,{...hairProps,color:new THREE.Color(character.hair).multiplyScalar(i%3===0?1.16:1)})}</mesh>)}
  {character.hairStyle==='bun'&&<mesh position={detail.bun} scale={[.029*scale,.026*scale,.023*scale]}><sphereGeometry args={[1,24,16]}/>{React.createElement(hairMaterial,hairProps)}</mesh>}
  {detail.brows.map((g,i)=><mesh key={i} geometry={g}><meshStandardMaterial color={new THREE.Color(character.hair).lerp(new THREE.Color('#382a25'),.65)} roughness={.9}/></mesh>)}
  {detail.eyes.map((position,i)=><group key={i} position={position} rotation={[0,i===0?-.10:.10,0]}>
   <mesh scale={[.010*scale,(toon?.0045:.003)*scale,.0017*scale]}><sphereGeometry args={[1,32,20]}/><meshPhysicalMaterial color="#c8bfb3" roughness={.27} clearcoat={.35} clearcoatRoughness={.12}/></mesh>
   <mesh position={[0,0,.00175*scale]}><circleGeometry args={[(toon?.0036:.0028)*scale,48]}/><meshPhysicalMaterial map={iris} roughness={.30} clearcoat={.55} clearcoatRoughness={.08}/></mesh>
   <mesh position={[0,0,.0018*scale]}><circleGeometry args={[.0011*scale,32]}/><meshPhysicalMaterial color="#101218" roughness={.16} clearcoat={.6}/></mesh>
   {lids.map((g,k)=><mesh key={k} geometry={g}><meshStandardMaterial color={new THREE.Color(character.skin).lerp(new THREE.Color(k?'#b4766d':'#684e40'),k?.14:.24)} roughness={.68}/></mesh>)}
  </group>)}
 </group>;
}
