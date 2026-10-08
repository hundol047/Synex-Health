import React, { useMemo, useEffect, useRef, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Line, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import Footwear, { footwearAnchors } from '../body3d/Footwear.jsx';
import { avatarGeometry, MATERIALS } from '../body3d/appearance.js';
import { personalizedVertices, sportswear } from '../body3d/avatar.js';
import { morphPositions, morphParameters } from '../body3d/morph.js';
import { bindSurface, deformSurface, poseJoints, REST } from './rig.js';
import { MOTIONS } from './motions.js';
import MotionFigure from './MotionFigure.jsx';
import { api } from '../../../shared/lib/api.js';
import { useApiData } from '../../lib/useApiData.js';

const FLOOR_MOTIONS = /plank|bridge|dead_bug|bird_dog|push_?up|clamshell|prone_y|heel_slide|cat_cow/;
const PLANTED_FLOOR_MOTIONS = new Set(['full_pushup', 'push_up', 'plank', 'bridge', 'glute_bridge']);

// Fits the entire movement envelope, including hands and feet, to each pane.
export function exerciseCameraPreset(motion, view = '45', heightScale = 1, aspect = 1.5) {
  const floor = FLOOR_MOTIONS.test(motion);
  const target = [0, (floor ? .33 : .88) * heightScale, 0];
  const verticalEnvelope = floor ? Math.max(.85, 2.35 / Math.max(.5, aspect)) : 1.96;
  const distance = Math.max(floor ? 1.9 : 3.1, verticalEnvelope / (2 * Math.tan(36 * Math.PI / 360))) * heightScale;
  const angle = view === 'side' ? Math.PI / 2 : view === 'back' ? Math.PI : view === 'front' ? 0 : Math.PI / 4;
  return { target, position: [Math.sin(angle) * distance, target[1] + (floor ? .50 : .40) * heightScale, Math.cos(angle) * distance] };
}

function SceneCamera({ motion, view, heightScale, controls }) {
  const { camera, size, invalidate } = useThree();
  useEffect(() => {
    if (view === 'free') return;
    const preset = exerciseCameraPreset(motion, view, heightScale, size.width / Math.max(1, size.height));
    camera.position.set(...preset.position);
    camera.lookAt(...preset.target);
    camera.updateProjectionMatrix();
    if (controls.current) { controls.current.target.set(...preset.target); controls.current.update(); }
    invalidate();
  }, [motion, view, heightScale, size.width, size.height, camera, controls, invalidate]);
  return null;
}

function Athlete({ motion, progress, mirror, measurement, profile, compact }) {
  const actor = useRef();
  const { invalidate } = useThree();
  const model = useMemo(() => {
    const base = personalizedVertices(measurement, profile);
    const scale = morphParameters(measurement, profile).heightScale;
    const neutral = personalizedVertices({ height: 178, weight: 70, body_fat_percentage: 20, skeletal_muscle_mass: 32 }, { gender: profile?.gender });
    const weights = bindSurface(neutral), wear = sportswear(base, scale, profile?.gender);
    const flat = morphPositions(Float32Array.from(REST.flat()), measurement, profile);
    const rest = REST.map((_, i) => Array.from(flat.slice(i * 3, i * 3 + 3)));
    return { base: wear.positions, weights, rest, geometry: avatarGeometry(wear, scale), shoes: footwearAnchors(base) };
  }, [measurement, profile]);
  const joints = useMemo(() => poseJoints(motion, progress, model.rest), [motion, progress, model]);
  const shoes = useMemo(() => model.shoes.map((shoe, i) => {
    const [ankle, toe] = i === 0 ? [11, 15] : [14, 16];
    const origin = new THREE.Vector3(...model.rest[ankle]), destination = new THREE.Vector3(...joints[ankle]);
    const rotation = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(...model.rest[toe]).sub(origin).normalize(), new THREE.Vector3(...joints[toe]).sub(destination).normalize());
    return { ...shoe, center: new THREE.Vector3(...shoe.center).sub(origin).applyQuaternion(rotation).add(destination).toArray(), rotation };
  }), [model, joints]);
  useEffect(() => {
    const geometry = model.geometry;
    deformSurface(model.base, model.weights, joints, geometry.attributes.position.array, model.rest, false);
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
    geometry.computeBoundingBox();
    // Floor poses keep the planted shoes at a fixed height. A moving head or
    // hand vertex must never lift the entire athlete off the mat.
    const shoeFloor = Math.min(...shoes.map(shoe => shoe.center[1] - .04));
    if (actor.current) actor.current.position.y = .003 - (PLANTED_FLOOR_MOTIONS.has(motion) ? shoeFloor : Math.min(geometry.boundingBox.min.y, shoeFloor));
    invalidate();
  }, [model, joints, shoes, motion, invalidate]);
  useEffect(() => () => model.geometry.dispose(), [model]);
  return <group ref={actor} scale={[mirror ? -1 : 1, 1, 1]}>
    <mesh name="exercise-athlete" geometry={model.geometry} castShadow={!compact} receiveShadow>{MATERIALS.map((material, i) => <meshStandardMaterial key={i} attach={`material-${i}`} vertexColors roughness={material.roughness} side={THREE.DoubleSide}/>)}</mesh>
    <Footwear anchors={shoes}/><Equipment motion={motion} joints={joints}/>
  </group>;
}

function Dumbbell({ position }) {
  return <group position={position}><mesh rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[.016, .016, .19, 12]}/><meshStandardMaterial color="#8190a5"/></mesh>{[-.1, .1].map(x => <mesh key={x} position={[x, 0, 0]}><boxGeometry args={[.055, .11, .11]}/><meshStandardMaterial color="#27364b"/></mesh>)}</group>;
}

function Equipment({ motion, joints }) {
  const prop = MOTIONS[motion]?.prop, mat = prop === 'mat' || FLOOR_MOTIONS.test(motion);
  return <>
    {(prop === 'dumbbell' || /curl|press|raise|goblet/.test(motion) && !/calf|wall/.test(motion)) && (motion.includes('goblet') ? <Dumbbell position={joints[5].map((v, i) => (v + joints[8][i]) / 2)}/> : [5, 8].map(i => <Dumbbell key={i} position={joints[i]}/>))}
    {mat && <mesh position={[0, -.018, 0]} receiveShadow><boxGeometry args={[1.05, .025, 2.25]}/><meshStandardMaterial color="#416b7c" roughness={.98}/></mesh>}
    {(prop === 'chair' || prop === 'seat' || prop === 'support') && <group position={[0, 0, -.22]}><mesh position={[0, .44, 0]}><boxGeometry args={[.55, .06, .5]}/><meshStandardMaterial color="#667789"/></mesh>{[-.22, .22].flatMap(x => [-.2, .2].map(z => <mesh key={`${x}${z}`} position={[x, .22, z]}><boxGeometry args={[.04, .44, .04]}/><meshStandardMaterial color="#667789"/></mesh>))}</group>}
    {prop === 'wall' && <mesh position={[0, 1, .9]}><boxGeometry args={[2, 2, .06]}/><meshStandardMaterial color="#c6d4e4" transparent opacity={.4}/></mesh>}
    {prop === 'band' && <>{[5, 8].map(i => <Line key={i} points={[[0, .9, .8], joints[i]]} color="#d38d35" lineWidth={3}/>)}<mesh position={[0, .9, .8]}><boxGeometry args={[.08, 1.8, .08]}/><meshStandardMaterial color="#667789"/></mesh></>}
  </>;
}

function Studio({ compact, heightScale }) {
  return <>
    <color attach="background" args={['#eaf1f5']}/>
    <hemisphereLight args={['#fff7ed', '#7490a0', 1.6]}/>
    <directionalLight position={[-3, 4, 4]} intensity={2.1} castShadow={!compact} shadow-mapSize={[512, 512]}/>
    <directionalLight position={[3, 2, -3]} color="#d8edff" intensity={1.7}/>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -.035, 0]} receiveShadow><planeGeometry args={[200, 200]}/><meshStandardMaterial color="#e3ebef" roughness={1}/></mesh>
    {compact ? <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -.032, 0]} scale={[.8 * heightScale, 1.15 * heightScale, 1]}><circleGeometry args={[1, 48]}/><meshBasicMaterial color="#788e9a" transparent opacity={.11} depthWrite={false}/></mesh> : <ContactShadows position={[0, -.029, 0]} opacity={.27} scale={5} blur={2.5} far={2} resolution={256}/>}
  </>;
}

class SceneBoundary extends React.Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

export default function ExerciseMotion3D({ motion, progress, mirror, measurement, profile, compact = false, defaultView }) {
  const twin = useApiData(() => measurement ? Promise.resolve({ measurement, body_profile: profile }) : compact ? Promise.resolve({ measurement: {}, body_profile: {}, standard: true }) : api('/api/body-map/latest').catch(async error => {
    if (error.status !== 404) throw error;
    const user = await api('/api/health/profile');
    return { measurement: {}, body_profile: { gender: user.gender, height_cm: user.height }, standard: true };
  }), [measurement, profile, compact]);
  const controls = useRef();
  const initialView = defaultView || (FLOOR_MOTIONS.test(motion) ? 'side' : '45');
  const [view, setView] = useState(initialView);
  useEffect(() => setView(initialView), [motion, initialView]);
  if (twin.loading) return <p role="status">운동 시범을 준비합니다.</p>;
  if (twin.error) return <div role="alert">체형 정보를 불러오지 못했습니다.<button onClick={twin.reload}>다시 시도</button></div>;
  const m = twin.data?.measurement, p = twin.data?.body_profile;
  const heightScale = morphParameters(m, p).heightScale;
  const fallback = <MotionFigure exercise={{ motion_id: motion, exercise_name: '운동' }} progress={progress} mirror={mirror}/>;
  return <>
    <div className="motion-controls motion-view-controls">{(compact ? [['front', '정면'], ['45', '45°'], ['side', '측면']] : [['front', '정면'], ['45', '45°'], ['side', '측면'], ['back', '후면'], ['free', '자유']]).map(([id, label]) => <button key={id} type="button" className="btn btn-ghost" aria-label={`${label} 운동 시범 보기`} aria-pressed={view === id} onClick={() => setView(id)}>{label}</button>)}</div>
    <div className="motion-3d-canvas" style={{ height: compact ? undefined : 340, flex: compact ? '1 1 0' : undefined, minHeight: compact ? 90 : undefined, touchAction: 'none' }}>
      <SceneBoundary key={motion} fallback={fallback}><Canvas shadows={!compact} dpr={[1, compact ? 1.25 : 1.5]} frameloop="demand" gl={{ antialias: true, alpha: false, powerPreference: 'low-power' }} camera={{ position: [3, 1.5, 3], fov: 36 }} fallback={fallback} aria-label="운동복을 입은 3D 운동 시범">
        <SceneCamera motion={motion} view={view} heightScale={heightScale} controls={controls}/><Studio compact={compact} heightScale={heightScale}/>
        <Athlete {...{ motion, progress, mirror, compact }} measurement={m} profile={p}/>
        <OrbitControls ref={controls} target={[0, (FLOOR_MOTIONS.test(motion) ? .33 : .88) * heightScale, 0]} enablePan={false} minDistance={1.5 * heightScale} maxDistance={6 * heightScale} maxPolarAngle={Math.PI / 2 - .02}/>
      </Canvas></SceneBoundary>
    </div>
    {!compact && <p className="muted">{twin.data?.standard ? '표준 체형' : '나의 체형'} · 3D 동작 시범 · 자유롭게 돌려 보세요.</p>}
  </>;
}
