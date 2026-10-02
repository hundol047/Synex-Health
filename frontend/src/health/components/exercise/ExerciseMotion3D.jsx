import React,{useMemo,useEffect,useRef,useState} from 'react';
import {Canvas} from '@react-three/fiber';
import {OrbitControls,Grid,Line,ContactShadows} from '@react-three/drei';
import * as THREE from 'three';
import {avatarGeometry,MATERIALS} from '../body3d/appearance.js';
import {personalizedVertices,sportswear} from '../body3d/avatar.js';
import {morphPositions,morphParameters} from '../body3d/morph.js';
import {bindSurface,deformSurface,poseJoints,REST} from './rig.js';
import {MOTIONS} from './motions.js';
import {api} from '../../../shared/lib/api.js';
import {useApiData} from '../../lib/useApiData.js';
function Athlete({motion,progress,mirror,measurement,profile}) {
 const actor=useRef();
 const model=useMemo(()=>{
  const base=personalizedVertices(measurement,profile),scale=morphParameters(measurement,profile).heightScale;
  const neutral=personalizedVertices({height:178,weight:70,body_fat_percentage:20,skeletal_muscle_mass:32},{gender:profile?.gender});
  const weights=bindSurface(neutral),wear=sportswear(base,scale,profile?.gender);
  const flat=morphPositions(Float32Array.from(REST.flat()),measurement,profile),rest=REST.map((_,i)=>Array.from(flat.slice(i*3,i*3+3)));
  const geometry=avatarGeometry(wear,scale);
  return {base:wear.positions,weights,rest,geometry};
 },[measurement,profile]);
 const joints=useMemo(()=>poseJoints(motion,progress,model.rest),[motion,progress,model]);
 useEffect(()=>{const g=model.geometry;deformSurface(model.base,model.weights,joints,g.attributes.position.array,model.rest,false);g.attributes.position.needsUpdate=true;g.computeVertexNormals();g.computeBoundingSphere();g.computeBoundingBox();if(actor.current)actor.current.position.y=.015-g.boundingBox.min.y;},[model,joints]);
 useEffect(()=>()=>model.geometry.dispose(),[model]);
 return <group ref={actor} scale={[mirror?-1:1,1,1]}><mesh name="exercise-athlete" geometry={model.geometry} castShadow receiveShadow>{MATERIALS.map((m,i)=><meshStandardMaterial key={i} attach={`material-${i}`} vertexColors roughness={m.roughness} side={THREE.DoubleSide}/>)}</mesh><Equipment motion={motion} joints={joints}/></group>;
}
function Dumbbell({position}){return <group position={position}><mesh rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[.016,.016,.19,12]}/><meshStandardMaterial color="#8190a5"/></mesh>{[-.1,.1].map(x=><mesh key={x} position={[x,0,0]}><boxGeometry args={[.055,.11,.11]}/><meshStandardMaterial color="#27364b"/></mesh>)}</group>;}
function Equipment({motion,joints}){const prop=MOTIONS[motion]?.prop,mat=prop==='mat'||/plank|bridge|dead_bug|bird_dog|push_?up/.test(motion);return <>
 {(prop==='dumbbell'||/curl|press|raise|goblet/.test(motion)&&!/calf|wall/.test(motion))&&(motion.includes('goblet')?<Dumbbell position={joints[5].map((v,i)=>(v+joints[8][i])/2)}/>: [5,8].map(i=><Dumbbell key={i} position={joints[i]}/>))}
 {mat&&<mesh position={[0,-.01,0]}><boxGeometry args={[1.1,.025,2.3]}/><meshStandardMaterial color="#607da0"/></mesh>}
 {(prop==='chair'||prop==='seat'||prop==='support')&&<group position={[0,0,-.22]}><mesh position={[0,.44,0]}><boxGeometry args={[.55,.06,.5]}/><meshStandardMaterial color="#667789"/></mesh>{[-.22,.22].flatMap(x=>[-.2,.2].map(z=><mesh key={`${x}${z}`} position={[x,.22,z]}><boxGeometry args={[.04,.44,.04]}/><meshStandardMaterial color="#667789"/></mesh>))}</group>}
 {prop==='wall'&&<mesh position={[0,1,.9]}><boxGeometry args={[2,2,.06]}/><meshStandardMaterial color="#c6d4e4" transparent opacity={.4}/></mesh>}
 {prop==='band'&&<>{[5,8].map(i=><Line key={i} points={[[0,.9,.8],joints[i]]} color="#d38d35" lineWidth={3}/>)}<mesh position={[0,.9,.8]}><boxGeometry args={[.08,1.8,.08]}/><meshStandardMaterial color="#667789"/></mesh></>}
 </>;}
export default function ExerciseMotion3D({motion,progress,mirror,measurement,profile}){
 const twin=useApiData(()=>measurement?Promise.resolve({measurement,body_profile:profile}):api('/api/body-map/latest').catch(async e=>{if(e.status!==404)throw e;const u=await api('/api/health/profile');return {measurement:{},body_profile:{gender:u.gender,height_cm:u.height},standard:true};}),[measurement,profile]);
 const controls=useRef(),[view,setView]=useState('45');const m=twin.data?.measurement,p=twin.data?.body_profile;
 if(twin.loading)return <p role="status">나의 운동 아바타를 준비합니다.</p>;
 if(twin.error)return <div role="alert">체형 정보를 불러오지 못했습니다.<button onClick={twin.reload}>다시 시도</button></div>;
 const heightScale=morphParameters(m,p).heightScale;
 const preset=id=>{setView(id);if(id==='free')return;const c=controls.current;if(!c)return;const h=morphParameters(m,p).heightScale,d=3.8*h;const positions={front:[0,.9*h,d],side:[d,.9*h,0],back:[0,.9*h,-d],'45':[d*.7,1.5*h,d*.7]};c.object.position.set(...positions[id]);c.target.set(0,.9*h,0);c.update();};
 return <><div className="motion-controls">{[['front','정면'],['45','45°'],['side','측면'],['back','후면'],['free','자유']].map(([id,label])=><button key={id} className="btn btn-ghost" aria-pressed={view===id} onClick={()=>preset(id)}>{label}</button>)}</div><div style={{height:340,touchAction:'none'}}><Canvas shadows dpr={[1,1.5]} frameloop="demand" camera={{position:[2.5*heightScale,1.6*heightScale,3*heightScale],fov:40}} aria-label="나의 체형에 운동복을 입힌 3D 운동 시범"><hemisphereLight args={['#fff3e5','#647787',1.15]}/><directionalLight position={[-3,4,4]} intensity={2} castShadow shadow-mapSize={[1024,1024]}/><directionalLight position={[3,2,-3]} intensity={1.2}/><Athlete {...{motion,progress,mirror}} measurement={m} profile={p}/><ContactShadows position={[0,.002,0]} opacity={.32} scale={5} blur={2.5} far={2}/><Grid args={[5,5]} cellColor="#d7dde4" sectionColor="#a2b0c2"/><OrbitControls ref={controls} target={[0,.9*heightScale,0]} enablePan={false} minDistance={2} maxDistance={7}/></Canvas></div><p className="muted">{twin.data?.standard?'측정 전 표준 비율':'나의 체형 기반'} · 반팔 운동 상의 / 스포츠 하의 / 운동화</p></>;
}
