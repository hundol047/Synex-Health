import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows } from '@react-three/drei';
import HumanBody from './HumanBody.jsx';
import { Skeleton } from '../../../shared/components/ui.jsx';

export default function BodyScene({ segmentColors, onSelect, selectedSegment, onHover, height = 420, interactive = true }) {
  return (
    <div style={{ height, borderRadius: 'var(--radius)', overflow: 'hidden', background: 'linear-gradient(180deg,#eef3ff,#f7f9fd)' }}>
      <Suspense fallback={<Skeleton height={height} />}>
        <Canvas shadows camera={{ position: [0.9, 1.15, 1.7], fov: 32 }} dpr={[1, 1.5]}>
          <ambientLight intensity={0.65} />
          <directionalLight position={[2, 3, 2]} intensity={1.1} castShadow shadow-mapSize={[1024, 1024]} />
          <directionalLight position={[-2, 1.5, -1]} intensity={0.35} />
          <group position={[0, -0.95, 0]}>
            <HumanBody segmentColors={segmentColors} onSelect={onSelect} selectedSegment={selectedSegment} onHover={onHover} />
            <ContactShadows position={[0, 0.02, 0]} opacity={0.35} scale={2.2} blur={2.2} far={1.2} />
          </group>
          {interactive && (
            <OrbitControls
              enablePan={false}
              minDistance={1.0}
              maxDistance={3.2}
              minPolarAngle={Math.PI / 4}
              maxPolarAngle={Math.PI / 1.7}
              target={[0, 0.35, 0]}
            />
          )}
        </Canvas>
      </Suspense>
    </div>
  );
}
