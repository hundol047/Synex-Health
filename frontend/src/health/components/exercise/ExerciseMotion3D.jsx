import React,{useMemo,useEffect} from 'react';
import { Canvas,useFrame } from '@react-three/fiber';
import { OrbitControls,Grid } from '@react-three/drei';
import * as THREE from 'three';
import data from '../body3d/assets/human-mesh.json';
import {bindSurface,deformSurface,poseJoints} from './rig.js';
function AnimatedPerson({motion,progress,mirror}){
 const {geometry,base,weights}=useMemo(()=>{const base=Float32Array.from(data.profiles.female,n=>n*data.scale);const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(base.slice(),3));geometry.setIndex(data.indices);geometry.computeVertexNormals();return {geometry,base,weights:bindSurface(base)};},[]);
 useEffect(()=>()=>geometry.dispose(),[geometry]);
 useEffect(()=>{deformSurface(base,weights,poseJoints(motion,progress),geometry.attributes.position.array);geometry.attributes.position.needsUpdate=true;geometry.computeVertexNormals();geometry.computeBoundingSphere();},[geometry,base,weights,motion,progress]);
 return <mesh geometry={geometry} scale={[mirror?-1:1,1,1]}><meshStandardMaterial color="#b8cad6" roughness={.8} side={THREE.DoubleSide}/></mesh>;
}
export default function ExerciseMotion3D({motion,progress,mirror}){return <div style={{height:340,touchAction:'none'}}><Canvas camera={{position:[2.5,1.6,3],fov:40}} aria-label="사람형 3D 운동 시범, 드래그로 회전"><ambientLight intensity={1.5}/><directionalLight position={[2,4,3]} intensity={2}/><AnimatedPerson {...{motion,progress,mirror}}/><Grid args={[5,5]} cellColor="#d7dde4" sectionColor="#a2b0c2"/><OrbitControls target={[0,.9,0]} enablePan={false} minDistance={2} maxDistance={6} touches={{ONE:THREE.TOUCH.ROTATE,TWO:THREE.TOUCH.DOLLY_PAN}}/></Canvas></div>;}
