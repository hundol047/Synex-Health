import React, { Suspense, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import HumanBody from './HumanBody.jsx';
import { Skeleton } from '../../../shared/components/ui.jsx';

export default function BodyScene({gender='unspecified',segmentColors,onSelect,selectedSegment,onHover,height=480,interactive=true}) {
  const [view,setView]=useState('front');const controls=useRef();const canvas=useRef();
  function preset(id){
    const control=controls.current;if(!control)return;
    const positions={front:[0,.05,3.05],back:[0,.05,-3.05],left:[3.05,.05,0],right:[-3.05,.05,0]};
    const damping=control.enableDamping;control.enableDamping=false;control.update();
    control.object.position.set(...positions[id]);control.target.set(0,0,0);control.update();control.enableDamping=damping;setView(id);
  }
  return <div className="body-scene" style={{height,position:'relative',borderRadius:'var(--radius)',overflow:'hidden',background:'radial-gradient(ellipse at 50% 40%,#fff,#edf0f3)'}}>
    <div style={{position:'absolute',top:10,left:10,zIndex:1,display:'flex',gap:4,flexWrap:'wrap'}}>
      {[['front','정면'],['back','후면'],['left','왼쪽'],['right','오른쪽']].map(([id,label])=><button type="button" aria-pressed={view===id} className={`btn ${view===id?'btn-primary':'btn-ghost'}`} style={{fontSize:'.72rem',padding:'6px 9px'}} key={id} onClick={()=>preset(id)}>{label}</button>)}
    </div>
    <Suspense fallback={<Skeleton height={height}/>}>
      <Canvas ref={canvas} shadows camera={{position:[0,.05,3.05],fov:38}} dpr={[1,1.75]}
        style={{touchAction:interactive?'none':'auto',cursor:interactive?'grab':'default'}}
        aria-label="3D 인체 모형. 한 손가락으로 회전, 두 손가락으로 확대·축소할 수 있습니다."
        onPointerDown={()=>{if(canvas.current)canvas.current.style.cursor='grabbing';}}
        onPointerUp={()=>{if(canvas.current)canvas.current.style.cursor='grab';}}>
        <ambientLight intensity={.8}/>
        <directionalLight position={[-3,4,4]} intensity={2.1} castShadow shadow-mapSize={[1024,1024]}/>
        <directionalLight position={[3,1,2]} intensity={.65}/>
        <directionalLight position={[0,2,-3]} intensity={1.1}/>
        <group position={[0,-.89,0]}>
          <HumanBody gender={gender} segmentColors={segmentColors} onSelect={onSelect} selectedSegment={selectedSegment} onHover={onHover}/>
          <ContactShadows position={[0,.006,0]} opacity={.3} scale={2.4} blur={2.8} far={1}/>
        </group>
        <OrbitControls ref={controls} enabled={interactive} enablePan={false} enableRotate enableZoom
          enableDamping dampingFactor={.08} rotateSpeed={.75} zoomSpeed={.8}
          minDistance={1.3} maxDistance={4.3} minPolarAngle={Math.PI/5} maxPolarAngle={Math.PI*.78}
          touches={{ONE:THREE.TOUCH.ROTATE,TWO:THREE.TOUCH.DOLLY_PAN}}
          target={[0,0,0]} onStart={()=>setView('custom')}
          onChange={()=>{if(canvas.current&&controls.current){canvas.current.dataset.camera=controls.current.object.position.toArray().map(n=>n.toFixed(4)).join(',');}}}/>
      </Canvas>
    </Suspense>
    {interactive&&<div style={{position:'absolute',bottom:10,left:0,right:0,textAlign:'center',pointerEvents:'none',fontSize:'.73rem',color:'#536172'}}>한 손가락 드래그로 회전 · 두 손가락으로 확대·축소 · 부위 터치로 선택</div>}
  </div>;
}
