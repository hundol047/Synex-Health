import React,{useEffect,useRef} from 'react';
import {useThree} from '@react-three/fiber';
import {RectAreaLightUniformsLib} from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';

// The area-light lookup tables are loaded only when opening a portrait.
RectAreaLightUniformsLib.init();
export default function PortraitLighting(){
 const key=useRef(),fill=useRef();
 const {gl,invalidate}=useThree();
 useEffect(()=>{
  key.current?.lookAt(0,1.64,.03);fill.current?.lookAt(0,1.64,.03);
  gl.domElement.dataset.portraitLighting='softboxes';invalidate();
  return()=>{delete gl.domElement.dataset.portraitLighting;};
 },[gl,invalidate]);
 return <><rectAreaLight ref={key} position={[-1.1,2.35,1.8]} width={1.6} height={2} intensity={3.2} color="#fff6ee"/><rectAreaLight ref={fill} position={[1.3,1.8,1.8]} width={1.8} height={2.2} intensity={1.3} color="#eef4ff"/></>;
}
