import React, { useMemo, useEffect, useRef, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import Footwear, { footwearAnchors } from '../body3d/Footwear.jsx';
import { exerciseAvatarGeometry, exerciseMaterials } from './exerciseAppearance.js';
import ExerciseEquipment from './ExerciseEquipment.jsx';
import { exerciseCameraPreset } from './exerciseCamera.js';
import { calibrateGripScale, gripSurface } from './exerciseGrip.js';
import { personalizedVertices, sportswear } from '../body3d/avatar.js';
import { morphPositions, morphParameters } from '../body3d/morph.js';
import { bindSurface, calibratePalmRoll, deformSurface, poseJoints, REST } from './rig.js';
import { MOTIONS } from './motions.js';
import MotionFigure from './MotionFigure.jsx';

const FLOOR_MOTIONS = /plank|bridge|dead_bug|bird_dog|push_?up|clamshell|prone_y|heel_slide|cat_cow|floor_press|bench_press/;
const PLANTED_FLOOR_MOTIONS = new Set(['full_pushup', 'push_up', 'plank', 'bridge', 'glute_bridge']);
const ORIGINAL_MOTIONS = new Set(['squat', 'lunge', 'side_lunge', 'full_pushup', 'push_up', 'plank', 'bridge', 'glute_bridge', 'hinge', 'hip_hinge']);

export { exerciseCameraPreset } from './exerciseCamera.js';

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

function SceneCamera({ motion, view, mirror, heightScale, controls }) {
  const { camera, size, invalidate } = useThree();
  useEffect(() => {
    if (view === 'free') return;
    const preset = exerciseCameraPreset(motion, view, heightScale, size.width / Math.max(1, size.height), mirror);
    camera.position.set(...preset.position);
    camera.lookAt(...preset.target);
    camera.updateProjectionMatrix();
    if (controls.current) { controls.current.target.set(...preset.target); controls.current.update(); }
    invalidate();
  }, [motion, view, mirror, heightScale, size.width, size.height, camera, controls, invalidate]);
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
    rest.handGripScale = calibrateGripScale(wear.positions, weights, rest);
    return { base: wear.positions, weights, rest, scale, palmRoll: calibratePalmRoll(wear.positions, weights, rest), geometry: exerciseAvatarGeometry(wear, scale), appearance: exerciseMaterials(), shoes: footwearAnchors(base) };
  }, [measurement, profile]);
  const joints = useMemo(() => {
    const posed = poseJoints(motion, progress, model.rest);
    if (posed.handRoll && !posed.boneRotations?.[12]) posed.handRoll = model.palmRoll;
    return posed;
  }, [motion, progress, model]);
  const skin = useMemo(() => gripSurface(model.base, model.weights, model.rest, joints.equipment?.grip), [model, motion, joints.equipment?.grip]);
  const shoes = useMemo(() => model.shoes.map((shoe, i) => {
    const [ankle, toe] = i === 0 ? [11, 15] : [14, 16];
    const origin = new THREE.Vector3(...model.rest[ankle]), destination = new THREE.Vector3(...joints[ankle]);
    const authored = joints.boneRotations?.[i === 0 ? 10 : 11];
    const rotation = authored ? new THREE.Quaternion().fromArray(authored).normalize() : new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(...model.rest[toe]).sub(origin).normalize(), new THREE.Vector3(...joints[toe]).sub(destination).normalize());
    return { ...shoe, center: new THREE.Vector3(...shoe.center).sub(origin).applyQuaternion(rotation).add(destination).toArray(), rotation };
  }), [model, joints]);
  useEffect(() => {
    const geometry = model.geometry;
    deformSurface(skin, model.weights, joints, geometry.attributes.position.array, model.rest, false);
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
    geometry.computeBoundingBox();
    // Floor poses keep the planted shoes at a fixed height. A moving head or
    // hand vertex must never lift the entire athlete off the mat.
    const shoeFloor = Math.min(...shoes.map(exerciseShoeFloor));
    if (actor.current) actor.current.position.y = ORIGINAL_MOTIONS.has(motion) ? .003 - (PLANTED_FLOOR_MOTIONS.has(motion) ? shoeFloor : Math.min(geometry.boundingBox.min.y, shoeFloor)) : 0;
    invalidate();
  }, [model, skin, joints, shoes, motion, invalidate]);
  useEffect(() => () => { model.geometry.dispose(); model.appearance.dispose(); }, [model]);
  return <group scale={[mirror ? -1 : 1, 1, 1]}>
    <group ref={actor}>
      <mesh name="exercise-athlete" geometry={model.geometry} material={model.appearance.materials} castShadow={!compact} receiveShadow onAfterRender={(renderer) => {
        renderer.domElement.dataset.exerciseRendered = motion;
        renderer.domElement.dataset.exerciseProgress = String(progress);
        renderer.domElement.dataset.exerciseVertices = String(model.geometry.attributes.position.count);
      }}/>
      <Footwear anchors={shoes}/>
    </group>
    <ExerciseEquipment motion={motion} joints={joints} rest={model.rest} progress={progress} heightScale={model.scale}/>
  </group>;
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
  return <mesh geometry={geometry} rotation={[-Math.PI / 2, 0, 0]} position={[0, -.016, .035 * heightScale]}>
    <meshStandardMaterial color="#2c626d" roughness={.98}/>
  </mesh>;
}

function Studio({ compact, heightScale, motion }) {
  const floor = FLOOR_MOTIONS.test(motion) || MOTIONS[motion]?.prop === 'mat';
  return <>
    <StudioEnvironment/>
    <color attach="background" args={['#eaf2f2']}/>
    <fog attach="fog" args={['#eaf2f2', 5, 11]}/>
    <hemisphereLight args={['#fffaf2', '#afc5ca', .7]}/>
    <directionalLight position={[-3, 5, 4]} color="#fff6e9" intensity={2.1} castShadow={!compact} shadow-mapSize={[1024, 1024]} shadow-camera-left={-2} shadow-camera-right={2} shadow-camera-top={2.6} shadow-camera-bottom={-1.3} shadow-bias={-.0003} shadow-normalBias={.012} shadow-radius={4}/>
    <directionalLight position={[3, 2, 2]} color="#d6f0f1" intensity={.9}/>
    <directionalLight position={[1, 3, -3]} color="#e5f0ff" intensity={1.7}/>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -.021, 0]}><planeGeometry args={[30, 30]}/><meshStandardMaterial color="#e6eff0" roughness={.95}/></mesh>
    {floor && <TrainingMat heightScale={heightScale}/>}
    {compact ? <SoftFloorShadow floor={floor} heightScale={heightScale}/> : <ContactShadows position={[0, floor ? .001 : -.019, 0]} opacity={.32} scale={4} blur={2.8} far={2} resolution={256}/>}
  </>;
}

function StudioEnvironment() {
  const { gl, scene, invalidate } = useThree();
  useEffect(() => {
    const generator = new THREE.PMREMGenerator(gl), room = new RoomEnvironment();
    const target = generator.fromScene(room, .04);
    scene.environment = target.texture;
    scene.environmentIntensity = .4;
    generator.dispose(); room.dispose(); invalidate();
    return () => { if (scene.environment === target.texture) scene.environment = null; target.dispose(); };
  }, [gl, scene, invalidate]);
  return null;
}

class SceneBoundary extends React.Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidUpdate(previous) {
    if (this.state.failed && previous.motion !== this.props.motion) this.setState({ failed: false });
  }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

export default function ExerciseMotion3D({ motion, progress, mirror, measurement, profile, compact = false, defaultView }) {
  const controls = useRef();
  const initialView = defaultView || (FLOOR_MOTIONS.test(motion) ? 'side' : '45');
  const [view, setView] = useState(initialView);
  useEffect(() => setView(initialView), [motion, initialView]);
  // The instructor has a consistent demonstration build. Personal body
  // composition remains on the separate mannequin; it must not move a
  // machine's calibrated seat or make a supported palm float off the mat.
  const m = measurement, p = profile;
  const heightScale = morphParameters(m, p).heightScale;
  const fallback = <MotionFigure exercise={{ motion_id: motion, exercise_name: '운동' }} progress={progress} mirror={mirror}/>;
  return <>
    <div className="motion-controls motion-view-controls">{compact ? <select aria-label="운동 시범 방향" value={view} onChange={event => setView(event.target.value)}><option value="front">정면</option><option value="45">45°</option><option value="side">측면</option></select> : [['front', '정면'], ['45', '45°'], ['side', '측면'], ['back', '후면'], ['free', '자유']].map(([id, label]) => <button key={id} type="button" className="btn btn-ghost" aria-label={`${label} 운동 시범 보기`} aria-pressed={view === id} onClick={() => setView(id)}>{label}</button>)}</div>
    <div className="motion-3d-canvas" style={{ height: compact ? undefined : 340, flex: compact ? '1 1 0' : undefined, minHeight: compact ? 0 : undefined, touchAction: 'none' }}>
      <SceneBoundary motion={motion} fallback={fallback}><Canvas shadows={!compact} dpr={[1, compact ? 1.25 : 1.5]} frameloop="demand" gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }} camera={{ position: [3, 1.5, 3], fov: 36 }} fallback={fallback} aria-label="운동복을 입은 3D 운동 시범">
        <SceneCamera motion={motion} view={view} mirror={mirror} heightScale={heightScale} controls={controls}/><Studio compact={compact} heightScale={heightScale} motion={motion}/>
        <Athlete {...{ motion, progress, mirror, compact }} measurement={m} profile={p}/>
        <OrbitControls ref={controls} enabled={view === 'free'} enablePan={false} minDistance={1.2 * heightScale} maxDistance={6 * heightScale} maxPolarAngle={Math.PI / 2 - .02}/>
      </Canvas></SceneBoundary>
    </div>
    {!compact && <p className="muted">{measurement ? '나의 체형' : '표준 시범 체형'} · 자유 방향에서 드래그로 돌려 보세요.</p>}
  </>;
}
