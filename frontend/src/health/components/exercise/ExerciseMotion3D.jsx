import React, { useMemo, useEffect, useRef, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Line, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import Footwear, { footwearAnchors } from '../body3d/Footwear.jsx';
import { avatarGeometry, MATERIALS } from '../body3d/appearance.js';
import { personalizedVertices, sportswear } from '../body3d/avatar.js';
import { morphPositions, morphParameters } from '../body3d/morph.js';
import { bindSurface, calibratePalmRoll, deformSurface, poseJoints, REST } from './rig.js';
import { MOTIONS } from './motions.js';
import MotionFigure from './MotionFigure.jsx';
import { api } from '../../../shared/lib/api.js';
import { useApiData } from '../../lib/useApiData.js';

const FLOOR_MOTIONS = /plank|bridge|dead_bug|bird_dog|push_?up|clamshell|prone_y|heel_slide|cat_cow/;
const PLANTED_FLOOR_MOTIONS = new Set(['full_pushup', 'push_up', 'plank', 'bridge', 'glute_bridge']);

// Fits the entire movement envelope, including hands and feet, to each pane.
export function exerciseCameraPreset(motion, view = '45', heightScale = 1, aspect = 1.5) {
  const floor = FLOOR_MOTIONS.test(motion);
  const target = [0, (floor ? .30 : .88) * heightScale, (floor ? .08 : 0) * heightScale];
  const verticalEnvelope = floor ? Math.max(.85, 2.10 / Math.max(.5, aspect)) : Math.max(1.96, 1.12 / Math.max(.5, aspect));
  const minimumDistance = floor ? view === 'side' ? 1.4 : view === '45' ? 2.1 : 2.35 : 3.1;
  const distance = Math.max(minimumDistance, verticalEnvelope / (2 * Math.tan(36 * Math.PI / 360))) * heightScale;
  const angle = view === 'side' ? Math.PI / 2 : view === 'back' ? Math.PI : view === 'front' ? 0 : Math.PI / 4;
  const elevation = floor ? Math.min(.44 * heightScale, distance * .17) : .40 * heightScale;
  return { target, position: [Math.sin(angle) * distance, target[1] + elevation, target[2] + Math.cos(angle) * distance] };
}

// Support height of the rounded upper and sole, including a raised heel.
// The old center-minus-height estimate incorrectly sank pitched shoes into the mat.
export function exerciseShoeFloor(shoe) {
  const rotation = shoe.rotation || new THREE.Quaternion();
  const x = new THREE.Vector3(1, 0, 0).applyQuaternion(rotation).y;
  const y = new THREE.Vector3(0, 1, 0).applyQuaternion(rotation).y;
  const z = new THREE.Vector3(0, 0, 1).applyQuaternion(rotation).y;
  const capsule = (width, depth, halfLength) => Math.abs(z) * halfLength + Math.hypot(width * x, depth * y, halfLength * z);
  return Math.min(shoe.center[1] - capsule(shoe.width / 2, .037, shoe.length / 4), shoe.center[1] - .025 * y - capsule(shoe.width * .52, .012, shoe.length * .255));
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
    return { base: wear.positions, weights, rest, palmRoll: calibratePalmRoll(wear.positions, weights, rest), geometry: avatarGeometry(wear, scale), shoes: footwearAnchors(base) };
  }, [measurement, profile]);
  const joints = useMemo(() => {
    const posed = poseJoints(motion, progress, model.rest);
    if (posed.handRoll) posed.handRoll = model.palmRoll;
    return posed;
  }, [motion, progress, model]);
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
    const shoeFloor = Math.min(...shoes.map(exerciseShoeFloor));
    if (actor.current) actor.current.position.y = .003 - (PLANTED_FLOOR_MOTIONS.has(motion) ? shoeFloor : Math.min(geometry.boundingBox.min.y, shoeFloor));
    invalidate();
  }, [model, joints, shoes, motion, invalidate]);
  useEffect(() => () => model.geometry.dispose(), [model]);
  return <group ref={actor} scale={[mirror ? -1 : 1, 1, 1]}>
    <mesh name="exercise-athlete" geometry={model.geometry} castShadow={!compact} receiveShadow>{MATERIALS.map((material, i) => <meshStandardMaterial key={i} attach={`material-${i}`} vertexColors roughness={i === 0 ? .72 : material.roughness} metalness={0} side={THREE.DoubleSide}/>)}</mesh>
    <Footwear anchors={shoes}/><Equipment motion={motion} joints={joints}/>
  </group>;
}

function Dumbbell({ position }) {
  return <group position={position}><mesh rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[.016, .016, .19, 12]}/><meshStandardMaterial color="#8190a5"/></mesh>{[-.1, .1].map(x => <mesh key={x} position={[x, 0, 0]}><boxGeometry args={[.055, .11, .11]}/><meshStandardMaterial color="#27364b"/></mesh>)}</group>;
}

function Equipment({ motion, joints }) {
  const prop = MOTIONS[motion]?.prop;
  return <>
    {(prop === 'dumbbell' || /curl|press|raise|goblet/.test(motion) && !/calf|wall/.test(motion)) && (motion.includes('goblet') ? <Dumbbell position={joints[5].map((v, i) => (v + joints[8][i]) / 2)}/> : [5, 8].map(i => <Dumbbell key={i} position={joints[i]}/>))}
    {(prop === 'chair' || prop === 'seat' || prop === 'support') && <group position={[0, 0, -.22]}><mesh position={[0, .44, 0]}><boxGeometry args={[.55, .06, .5]}/><meshStandardMaterial color="#667789"/></mesh>{[-.22, .22].flatMap(x => [-.2, .2].map(z => <mesh key={`${x}${z}`} position={[x, .22, z]}><boxGeometry args={[.04, .44, .04]}/><meshStandardMaterial color="#667789"/></mesh>))}</group>}
    {prop === 'wall' && <mesh position={[0, 1, .9]}><boxGeometry args={[2, 2, .06]}/><meshStandardMaterial color="#c6d4e4" transparent opacity={.4}/></mesh>}
    {prop === 'band' && <>{[5, 8].map(i => <Line key={i} points={[[0, .9, .8], joints[i]]} color="#d38d35" lineWidth={3}/>)}<mesh position={[0, .9, .8]}><boxGeometry args={[.08, 1.8, .08]}/><meshStandardMaterial color="#667789"/></mesh></>}
  </>;
}

function SoftFloorShadow({ floor, heightScale }) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 64;
    const context = canvas.getContext('2d');
    const gradient = context.createRadialGradient(32, 32, 2, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(21, 55, 63, .25)');
    gradient.addColorStop(.45, 'rgba(21, 55, 63, .14)');
    gradient.addColorStop(1, 'rgba(21, 55, 63, 0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(canvas);
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  return <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, floor ? .001 : -.019, .035 * heightScale]}>
    <planeGeometry args={[(floor ? 1.0 : 1.15) * heightScale, (floor ? 1.95 : .9) * heightScale]}/>
    <meshBasicMaterial map={texture} transparent depthWrite={false} toneMapped={false}/>
  </mesh>;
}

function TrainingMat({ heightScale }) {
  const geometry = useMemo(() => {
    const shape = new THREE.Shape(), width = .98 * heightScale, length = 2.05 * heightScale, radius = .06 * heightScale;
    const x = -width / 2, y = -length / 2;
    shape.moveTo(x + radius, y);
    shape.lineTo(x + width - radius, y); shape.quadraticCurveTo(x + width, y, x + width, y + radius);
    shape.lineTo(x + width, y + length - radius); shape.quadraticCurveTo(x + width, y + length, x + width - radius, y + length);
    shape.lineTo(x + radius, y + length); shape.quadraticCurveTo(x, y + length, x, y + length - radius);
    shape.lineTo(x, y + radius); shape.quadraticCurveTo(x, y, x + radius, y);
    return new THREE.ExtrudeGeometry(shape, { depth: .014, bevelEnabled: true, bevelSize: .003, bevelThickness: .002, bevelSegments: 1, curveSegments: 4, steps: 1 });
  }, [heightScale]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh geometry={geometry} rotation={[-Math.PI / 2, 0, 0]} position={[0, -.016, .035 * heightScale]} receiveShadow>
    <meshStandardMaterial color="#2c626d" roughness={.98}/>
  </mesh>;
}

function Studio({ compact, heightScale, motion }) {
  const floor = FLOOR_MOTIONS.test(motion) || MOTIONS[motion]?.prop === 'mat';
  return <>
    <color attach="background" args={['#f1f7f5']}/>
    <hemisphereLight args={['#fff9f1', '#9bbcb8', 1.1]}/>
    <directionalLight position={[-3, 5, 4]} color="#fff8ed" intensity={2} castShadow={!compact} shadow-mapSize={[1024, 1024]} shadow-camera-left={-1.6} shadow-camera-right={1.6} shadow-camera-top={2.3} shadow-camera-bottom={-1} shadow-bias={-.0004}/>
    <directionalLight position={[3, 2, 2]} color="#d6efef" intensity={.65}/>
    <directionalLight position={[1, 3, -3]} color="#e5f3ff" intensity={1.2}/>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -.021, 0]} receiveShadow><planeGeometry args={[200, 200]}/><meshStandardMaterial color="#e6efeb" roughness={1}/></mesh>
    {floor && <TrainingMat heightScale={heightScale}/>}
    {compact ? <SoftFloorShadow floor={floor} heightScale={heightScale}/> : <ContactShadows position={[0, floor ? .001 : -.019, 0]} opacity={.32} scale={4} blur={2.8} far={2} resolution={256}/>}
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
    <div className="motion-controls motion-view-controls">{compact ? <select aria-label="운동 시범 방향" value={view} onChange={event => setView(event.target.value)}><option value="front">정면</option><option value="45">45°</option><option value="side">측면</option></select> : [['front', '정면'], ['45', '45°'], ['side', '측면'], ['back', '후면'], ['free', '자유']].map(([id, label]) => <button key={id} type="button" className="btn btn-ghost" aria-label={`${label} 운동 시범 보기`} aria-pressed={view === id} onClick={() => setView(id)}>{label}</button>)}</div>
    <div className="motion-3d-canvas" style={{ height: compact ? undefined : 340, flex: compact ? '1 1 0' : undefined, minHeight: compact ? 0 : undefined, touchAction: 'none' }}>
      <SceneBoundary key={motion} fallback={fallback}><Canvas shadows={!compact} dpr={[1, compact ? 1.25 : 1.5]} frameloop="demand" gl={{ antialias: true, alpha: false, powerPreference: 'low-power' }} camera={{ position: [3, 1.5, 3], fov: 36 }} fallback={fallback} aria-label="운동복을 입은 3D 운동 시범">
        <SceneCamera motion={motion} view={view} heightScale={heightScale} controls={controls}/><Studio compact={compact} heightScale={heightScale} motion={motion}/>
        <Athlete {...{ motion, progress, mirror, compact }} measurement={m} profile={p}/>
        <OrbitControls ref={controls} enabled={view === 'free'} target={[0, (FLOOR_MOTIONS.test(motion) ? .30 : .88) * heightScale, (FLOOR_MOTIONS.test(motion) ? .08 : 0) * heightScale]} enablePan={false} minDistance={1.2 * heightScale} maxDistance={6 * heightScale} maxPolarAngle={Math.PI / 2 - .02}/>
      </Canvas></SceneBoundary>
    </div>
    {!compact && <p className="muted">{twin.data?.standard ? '표준 체형' : '나의 체형'} · 3D 동작 시범 · 자유롭게 돌려 보세요.</p>}
  </>;
}
