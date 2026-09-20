import React, { Suspense, useEffect, useRef, useState } from 'react';
import { useThree } from '@react-three/fiber';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows } from '@react-three/drei';
import HumanBody from './HumanBody.jsx';
import { Skeleton } from '../../../shared/components/ui.jsx';

function CameraPreset({view}) {
  const {camera}=useThree();
  useEffect(()=>{
    const positions={front:[0,.18,3],back:[0,.18,-3],left:[3,.18,0],right:[-3,.18,0]};
    camera.position.set(...positions[view]); camera.lookAt(0,-.02,0);camera.updateProjectionMatrix();
  },[view,camera]);
  return null;
}

export default function BodyScene({ gender='unspecified', segmentColors, onSelect, selectedSegment, onHover, height = 420, interactive = true }) {
  const [view,setView]=useState('front');
  return (
    <div style={{ height, position:'relative', borderRadius: 'var(--radius)', overflow: 'hidden', background: 'linear-gradient(180deg,#eef3ff,#f7f9fd)' }}>
      <div style={{position:'absolute',top:10,left:10,zIndex:1,display:'flex',gap:4}}>
        {[['front','정면'],['back','후면'],['left','왼쪽'],['right','오른쪽']].map(([id,label])=><button type="button" className={`btn ${view===id?'btn-primary':'btn-ghost'}`} style={{fontSize:'.72rem',padding:'6px 9px'}} key={id} onClick={()=>setView(id)}>{label}</button>)}
      </div>
      <Suspense fallback={<Skeleton height={height} />}>
        <Canvas shadows camera={{ position: [0, .18, 3], fov: 38 }} dpr={[1, 1.5]}>
          <CameraPreset view={view}/><ambientLight intensity={0.85} />
          <directionalLight position={[2, 3, 2]} intensity={1.1} castShadow shadow-mapSize={[1024, 1024]} />
          <directionalLight position={[-2, 1.5, -1]} intensity={0.35} />
          <group position={[0, -0.89, 0]}>
            <HumanBody gender={gender} segmentColors={segmentColors} onSelect={onSelect} selectedSegment={selectedSegment} onHover={onHover} />
            <ContactShadows position={[0, 0.02, 0]} opacity={0.35} scale={2.2} blur={2.2} far={1.2} />
          </group>
          {interactive && (
            <OrbitControls
              enablePan={false}
              minDistance={1.0}
              maxDistance={4}
              minPolarAngle={Math.PI / 4}
              maxPolarAngle={Math.PI / 1.7}
              target={[0, -.02, 0]}
            />
          )}
        </Canvas>
      </Suspense>
    </div>
  );
}
