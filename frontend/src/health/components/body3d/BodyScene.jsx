import React, { Suspense, useRef, useState, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { Line } from '@react-three/drei';
import HumanBody from './HumanBody.jsx';
import MuscleOverlay from './MuscleOverlay.jsx';
import {MODEL_NOTICE} from './overlayMath.js';
import {RenderPerformance} from './renderPerformance.js';
import {recordRenderer} from './rendererStats.js';
import { Skeleton } from '../../../shared/components/ui.jsx';

export default function BodyScene({gender='unspecified',segmentColors,onSelect,selectedSegment,onHover,height=480,interactive=true,measurement,profile,layer='body',slice,sharedCamera,sceneId='body',performanceMode='my_body',overlay}) {
  const planes=useMemo(()=>!slice?.enabled?[]:[new THREE.Plane(new THREE.Vector3(...({horizontal:[0,-1,0],sagittal:[-1,0,0],coronal:[0,0,-1]}[slice.axis])),slice.position)], [slice?.enabled,slice?.axis,slice?.position]);
  const [visible,setVisible]=useState(true),[quality,setQuality]=useState('Balanced');
  const lowPower=quality==='Low Power',setLowPower=v=>setQuality(typeof v==='function'?(v(lowPower)?'Low Power':'Balanced'):(v?'Low Power':'Balanced'));
  const effectiveOverlay=overlay&&lowPower?{...overlay,options:{...overlay.options,referenceStyle:'wireframe',interpolate:false}}:overlay;
  const lastTap=useRef(0);
  useEffect(()=>{const changed=()=>setVisible(!document.hidden);document.addEventListener('visibilitychange',changed);return()=>document.removeEventListener('visibilitychange',changed);},[]);
  const [view,setView]=useState('front');const controls=useRef();const canvas=useRef();
  function nudge(angle=0,zoom=1){const c=controls.current;if(!c)return;if(sharedCamera)sharedCamera.current.owner=sceneId;const damping=c.enableDamping;c.enableDamping=false;c.update();c.object.position.applyAxisAngle(new THREE.Vector3(0,1,0),angle);c.object.position.multiplyScalar(zoom).clampLength(1.3,8);c.update();c.enableDamping=damping;}
  function preset(id){
    const control=controls.current;if(!control)return;
    const d=fitDistance(control.object.aspect,(measurement?.height||profile?.height_cm||178)/178);
    const positions={front:[0,.05,d],back:[0,.05,-d],left:[d,.05,0],right:[-d,.05,0]};
    const damping=control.enableDamping;control.enableDamping=false;control.update();
    if(sharedCamera)sharedCamera.current.owner=sceneId;control.object.position.set(...positions[id]);control.target.set(0,0,0);control.update();control.enableDamping=damping;setView(id);
  }
  return <div className="body-scene" style={{height,position:'relative',borderRadius:'var(--radius)',overflow:'hidden',background:'radial-gradient(ellipse at 50% 40%,#fff,#edf0f3)'}}>
    <div style={{position:'absolute',top:10,left:10,zIndex:1,display:'flex',gap:4,flexWrap:'wrap'}}>
      {[['front','정면'],['back','후면'],['left','왼쪽'],['right','오른쪽']].map(([id,label])=><button type="button" aria-pressed={view===id} className={`btn ${view===id?'btn-primary':'btn-ghost'}`} style={{fontSize:'.72rem',padding:'6px 9px'}} key={id} onClick={()=>preset(id)}>{label}</button>)}
      <button className="btn btn-ghost" onClick={()=>preset('front')}>초기화</button><label>품질 <select aria-label="3D 품질" value={quality} onChange={e=>setQuality(e.target.value)}>{['High','Balanced','Low Power'].map(q=><option key={q}>{q}</option>)}</select></label><button className="btn btn-ghost" aria-pressed={lowPower} onClick={()=>setLowPower(v=>!v)}>저전력 모드 {lowPower?'켜짐':'꺼짐'}</button>
    </div>
    {interactive&&<div className="body-zoom-controls"><button className="btn btn-ghost" aria-label="3D 확대" onClick={()=>nudge(0,.85)}>＋</button><button className="btn btn-ghost" aria-label="3D 축소" onClick={()=>nudge(0,1.15)}>−</button></div>}
    <Suspense fallback={<Skeleton height={height}/>}>
      <Canvas frameloop={visible?'demand':'never'} fallback={<p role="status">3D를 지원하지 않는 환경입니다. 아래 수치 비교를 이용하세요.</p>} tabIndex={interactive?0:-1} onKeyDown={e=>{if(!interactive)return;if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();nudge(e.key==='ArrowLeft'?.2:-.2);}if(e.key==='+'||e.key==='-'){e.preventDefault();nudge(0,e.key==='+'?.85:1.15);}}} ref={canvas} onCreated={({gl})=>{gl.localClippingEnabled=true;}} shadows={!lowPower} camera={{position:[0,.05,3.05],fov:38}} dpr={lowPower?.75:quality==='Balanced'?[1,1.25]:[1,2]}
        style={{touchAction:interactive?'none':'auto',cursor:interactive?'grab':'default'}}
        title={MODEL_NOTICE} aria-label="3D 인체 모형. 한 손가락으로 회전, 두 손가락으로 확대·축소할 수 있습니다."
        onPointerDown={()=>{if(canvas.current)canvas.current.style.cursor='grabbing';}}
        onPointerUp={e=>{if(canvas.current)canvas.current.style.cursor='grab';if(e.pointerType==='touch'){const t=performance.now();if(t-lastTap.current<300)preset('front');lastTap.current=t;}}} onDoubleClick={()=>preset('front')}>
        <ambientLight intensity={.8}/>
        <directionalLight position={[-3,4,4]} intensity={2.1} castShadow={!lowPower} shadow-mapSize={quality==='High'?[1024,1024]:[512,512]}/>
        <directionalLight position={[3,1,2]} intensity={.65}/>
        <directionalLight position={[0,2,-3]} intensity={1.1}/>
        <group position={[0,-.89*Math.max(.6,Math.min(1.4,(measurement?.height||profile?.height_cm||178)/178)),0]}>
          <OverlayGuard key={overlay?'overlay':'body'} fallback={<HumanBody measurement={measurement} profile={profile} gender={gender} segmentColors={{}}/>}>{overlay?<MuscleOverlay {...effectiveOverlay} gender={gender} height={measurement?.height||profile?.height_cm||178} clippingPlanes={planes} selectedSegment={selectedSegment} onSelect={onSelect} onHover={onHover}/>:<HumanBody measurement={measurement} profile={profile} layer={layer} clippingPlanes={planes} gender={gender} segmentColors={segmentColors} onSelect={onSelect} selectedSegment={selectedSegment} onHover={onHover}/>}</OverlayGuard>
          {layer==='skeleton'&&<IllustrativeSkeleton scale={(measurement?.height||profile?.height_cm||178)/178}/>}
          {!overlay&&!lowPower&&<ContactShadows position={[0,.006,0]} opacity={.3} scale={2.4} blur={2.8} far={1}/>}
        </group>
        <RendererMonitor performanceMode={performanceMode} quality={quality} overlay={overlay} canvas={canvas} lowPower={lowPower} onSlow={()=>setLowPower(true)}/>
        <FitCamera scale={(measurement?.height||profile?.height_cm||178)/178}/>
        <CameraSync controls={controls} canvas={canvas} shared={sharedCamera} id={sceneId}/>
        <OrbitControls ref={controls} enabled={interactive} enablePan={false} enableRotate enableZoom
          enableDamping dampingFactor={.08} rotateSpeed={.75} zoomSpeed={.8}
          minDistance={1.3} maxDistance={8} minPolarAngle={Math.PI/5} maxPolarAngle={Math.PI*.78}
          touches={{ONE:THREE.TOUCH.ROTATE,TWO:THREE.TOUCH.DOLLY_PAN}}
          target={[0,0,0]} onStart={()=>{setView('custom');if(sharedCamera)sharedCamera.current.owner=sceneId;}}
          onChange={()=>{if(canvas.current&&controls.current){if(sharedCamera&&sharedCamera.current.owner===sceneId)sharedCamera.current.position=controls.current.object.position.toArray();canvas.current.dataset.camera=controls.current.object.position.toArray().map(n=>n.toFixed(4)).join(',');}}}/>
      </Canvas>
    </Suspense>
    {interactive&&<div style={{position:'absolute',bottom:10,left:0,right:0,textAlign:'center',pointerEvents:'none',fontSize:'.73rem',color:'#536172'}}>한 손가락 드래그로 회전 · 두 손가락으로 확대·축소 · 부위 터치로 선택</div>}
  </div>;
}

function CameraSync({controls,canvas,shared,id}){useFrame(()=>{const c=controls.current;if(!c)return;if(shared?.current.position&&shared.current.owner!==id){const damping=c.enableDamping;c.enableDamping=false;c.update();c.object.position.fromArray(shared.current.position);c.target.set(0,0,0);c.update();c.enableDamping=damping;}if(canvas.current)canvas.current.dataset.camera=c.object.position.toArray().map(n=>n.toFixed(4)).join(',');});return null;}
function IllustrativeSkeleton({scale=1}){const paths=[[[0,1.68,0],[0,1.4,0],[0,1,0]],[[.25,1.42,0],[0,1.42,0],[-.25,1.42,0]],[[.25,1.42,0],[.37,1.17,0],[.48,.95,0]], [[-.25,1.42,0],[-.37,1.17,0],[-.48,.95,0]], [[.1,1,0],[.1,.53,0],[.1,.08,0]], [[-.1,1,0],[-.1,.53,0],[-.1,.08,0]]];return <group scale={scale}>{paths.map((points,i)=><Line key={i} points={points} color="#54647d" lineWidth={4}/>)}</group>;}

const fitDistance=(aspect,scale)=>Math.max(3.05,2.9*scale,1.45*scale/Math.max(.25,aspect)/(2*Math.tan(19*Math.PI/180)));
function FitCamera({scale}){const {camera,size}=useThree();useEffect(()=>{camera.position.normalize().multiplyScalar(fitDistance(size.width/size.height,scale));camera.updateProjectionMatrix();},[camera,size.width,size.height,scale]);return null;}

class OverlayGuard extends React.Component {
 constructor(props){super(props);this.state={failed:false};}
 static getDerivedStateFromError(){return {failed:true};}
 render(){return this.state.failed?this.props.fallback:this.props.children;}
}
function RendererMonitor({performanceMode,quality,overlay,canvas,lowPower,onSlow}){
 const {gl,scene,camera,size}=useThree();const monitor=useRef(new RenderPerformance());
 useEffect(()=>{if(!lowPower)monitor.current=new RenderPerformance();},[lowPower,performanceMode,quality]);
 useFrame(()=>{const start=performance.now();gl.render(scene,camera);const t=performance.now();const perf=monitor.current.sample(t,t-start);
  if(perf.fallbackActive&&!lowPower)onSlow();
  let meshes=0,vertices=0;const layers=[];scene.traverse(o=>{if(o.isMesh){meshes++;vertices+=o.geometry?.attributes.position?.count||0;if(o.name==='my-muscle'||o.name==='reference-average')layers.push({name:o.name,opacity:o.material[1]?.opacity,wireframe:o.material[1]?.wireframe,regions:o.geometry.userData.regions,regionPixels:import.meta.env.DEV?Object.fromEntries(Object.entries(o.geometry.userData.regions||{}).map(([key,r])=>{const v=o.localToWorld(new THREE.Vector3(...r.center)).project(camera);return [key,[(v.x+1)*size.width/2,(1-v.y)*size.height/2]];})):undefined});}});
  const stats={performanceMode,quality,renderer:gl.getContext().getParameter(gl.getContext().RENDERER),webgl:gl.capabilities.isWebGL2?'WebGL 2':'WebGL 1',overlayAvailable:!!overlay,meshCount:meshes,vertices,...perf,fallbackActive:lowPower,overlayEnabled:!!overlay,mode:'contiguous demand frames; CPU render submission ms, not GPU time',geometryBuffers:gl.info.memory.geometries,layers};
  if(import.meta.env.DEV){stats.renderer=gl.getContext().getParameter(gl.getContext().RENDERER);if(canvas.current)canvas.current.dataset.overlay=JSON.stringify(stats);}
  recordRenderer(stats);
 },1);return null;
}
