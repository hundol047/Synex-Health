import HeadDetail from '../character/HeadDetail.jsx';
import {faceBlinkSurface} from '../character/faceExpression.js';
import {useCharacter} from '../character/character.js';
import React, { useMemo, useEffect, useRef, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, ContactShadows, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import maleFaceAtlas from '../character/assets/male-face.webp';
import femaleFaceAtlas from '../character/assets/female-face.webp';
import layeredHairAtlas from '../character/assets/bob01.webp';
import bobHairAtlas from '../character/assets/bob02.webp';
import pixieHairAtlas from '../character/assets/short03.webp';
import sleekHairAtlas from '../character/assets/medium-layered.webp';
import sleekHairNormal from '../character/assets/medium-layered-normal.webp';
import Footwear from '../body3d/Footwear.jsx';
import { exerciseAvatarGeometry, exerciseMaterials } from './exerciseAppearance.js';
import ExerciseEquipment from './ExerciseEquipment.jsx';
import { exerciseCameraPreset } from './exerciseCamera.js';
import {prepareAthlete,getGripSurface,exerciseShoeFloor} from './athleteModel.js';
import { exerciseHandShape } from './handPoses.js';
import { morphParameters } from '../body3d/morph.js';
import { deformSurface, poseJoints } from './rig.js';
import { MOTIONS } from './motions.js';
import {FLOOR_STRETCHES} from './stretchRig.js';
import MotionFigure from './MotionFigure.jsx';
import { applyAthleteHighlights, applyMannequinColors, mannequinGuide, mannequinMaterials } from './instructionMannequin.js';

const FLOOR_MOTIONS = /plank|bridge|dead_bug|bird_dog|push_?up|clamshell|prone_y|heel_slide|cat_cow|floor_press|bench_press/;
const PLANTED_FLOOR_MOTIONS = new Set(['full_pushup', 'push_up', 'plank', 'bridge', 'glute_bridge']);
const ORIGINAL_MOTIONS = new Set(['squat', 'lunge', 'side_lunge', 'full_pushup', 'push_up', 'plank', 'bridge', 'glute_bridge', 'hinge', 'hip_hinge']);

export { exerciseCameraPreset } from './exerciseCamera.js';

export {exerciseShoeFloor,heelContactHeights} from './athleteModel.js';

function SceneCamera({ motion, view, mirror, heightScale, controls, faceFocus }) {
  const { camera, size, invalidate } = useThree();
  useEffect(() => {
    if (view === 'free' && !faceFocus) return;
    const preset = exerciseCameraPreset(motion, view, heightScale, size.width / Math.max(1, size.height), mirror);
    if(faceFocus){const angle=view==='side'?Math.PI/2:view==='back'?Math.PI:view==='front'?0:Math.PI/6;preset.target=[0,1.67*heightScale,.055*heightScale];preset.position=[Math.sin(angle)*.56*heightScale,1.685*heightScale,(.055+Math.cos(angle)*.56)*heightScale];}
    camera.position.set(...preset.position);
    camera.lookAt(...preset.target);
    camera.updateProjectionMatrix();
    if (controls.current) { controls.current.target.set(...preset.target); controls.current.update(); }
    invalidate();
  }, [motion, view, mirror, heightScale, size.width, size.height, camera, controls, invalidate, faceFocus]);
  return null;
}

function Athlete({ motion, progress, mirror, measurement, profile, compact, appearance, onReady, character, highlight }) {
  const actor = useRef(), readyMotion = useRef();
  // Bundled and cached by the loader; no remote request or per-frame texture allocation.
  const faceAtlases=useTexture([maleFaceAtlas,femaleFaceAtlas,layeredHairAtlas,bobHairAtlas,pixieHairAtlas,sleekHairAtlas,sleekHairNormal]);
  // useTexture uploads every bundled atlas eagerly. Configure all of them
  // before upload, not just the active body/hair; a later colorSpace assignment
  // alone leaves the already-uploaded texture in its old GPU color format.
  for(const atlas of faceAtlases.slice(0,6))if(atlas.colorSpace!==THREE.SRGBColorSpace||atlas.anisotropy!==4){
    atlas.colorSpace=THREE.SRGBColorSpace;atlas.anisotropy=4;atlas.needsUpdate=true;
  }
  const normalAtlas=faceAtlases[6];
  if(normalAtlas.colorSpace!==THREE.NoColorSpace||normalAtlas.anisotropy!==4){normalAtlas.colorSpace=THREE.NoColorSpace;normalAtlas.anisotropy=4;normalAtlas.needsUpdate=true;}
  const faceAtlas=faceAtlases[character.body==='female'?1:0];
  const hairAtlas=character.hairStyle==='layered'?faceAtlases[2]:character.hairStyle==='bob'?faceAtlases[3]:character.hairStyle==='pixie'?faceAtlases[4]:character.hairStyle==='sleek'?faceAtlases[5]:null;
  const { invalidate } = useThree();
  const model = useMemo(() => {
    const prepared=prepareAthlete(measurement,profile,character);
    const {wear,scale}=prepared;
    const geometry = exerciseAvatarGeometry(wear, scale, character);
    const surface = appearance === 'mannequin' ? mannequinMaterials() : exerciseMaterials(character,faceAtlas);
    if (appearance === 'mannequin') applyMannequinColors(geometry, scale, motion);
    else if(highlight) applyAthleteHighlights(geometry, scale, motion, surface.materials);
    return { ...prepared, geometry, appearance: surface };
  }, [measurement, profile, appearance, motion, JSON.stringify(character),highlight,faceAtlas]);
  const joints = useMemo(() => {
    const posed = poseJoints(motion, progress, model.rest);
    if (posed.handRoll && !posed.boneRotations?.[12]) posed.handRoll = model.palmRoll;
    return posed;
  }, [motion, progress, model]);
  const grip = useMemo(() => exerciseHandShape(motion, joints), [motion, joints.equipment?.grip]);
  const skin = useMemo(() => getGripSurface(model,grip), [model, grip]);
  const shoes = useMemo(() => model.shoes.map((shoe, i) => {
    const [ankle, toe] = i === 0 ? [11, 15] : [14, 16];
    const origin = new THREE.Vector3(...model.rest[ankle]), destination = new THREE.Vector3(...joints[ankle]);
    const authored = joints.boneRotations?.[i === 0 ? 10 : 11];
    const rotation = authored ? new THREE.Quaternion().fromArray(authored).normalize() : new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(...model.rest[toe]).sub(origin).normalize(), new THREE.Vector3(...joints[toe]).sub(destination).normalize());
    return { ...shoe, center: new THREE.Vector3(...shoe.center).sub(origin).applyQuaternion(rotation).add(destination).toArray(), rotation };
  }), [model, joints]);
  useEffect(() => {
    const geometry = model.geometry;
    const expression=appearance==='athlete'&&character.style==='realistic'?faceBlinkSurface(skin,model.scale,progress,character):skin;
    deformSurface(expression, model.weights, joints, geometry.attributes.position.array, model.rest, false);
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    // One bounds scan; the box sphere conservatively contains the whole pose.
    geometry.boundingSphere ||= new THREE.Sphere();
    geometry.boundingBox.getBoundingSphere(geometry.boundingSphere);
    // Floor poses keep the planted shoes at a fixed height. A moving head or
    // hand vertex must never lift the entire athlete off the mat.
    const shoeFloor = Math.min(...shoes.map(exerciseShoeFloor));
    if (actor.current) actor.current.position.y = ORIGINAL_MOTIONS.has(motion)||motion.startsWith('recovery_') ? .003 - (PLANTED_FLOOR_MOTIONS.has(motion) ? shoeFloor : Math.min(geometry.boundingBox.min.y, shoeFloor)) : 0;
    invalidate();
  }, [model, skin, joints, shoes, motion, invalidate,appearance,character.style,progress]);
  useEffect(() => () => { model.geometry.dispose(); model.appearance.dispose(); }, [model]);
  return <group scale={[mirror ? -1 : 1, 1, 1]}>
    <group ref={actor}>
      <mesh name="exercise-athlete" geometry={model.geometry} material={model.appearance.materials} castShadow={!compact} receiveShadow onAfterRender={(renderer) => {
        if(readyMotion.current !== motion){readyMotion.current = motion;requestAnimationFrame(() => onReady?.());}
        renderer.domElement.dataset.exerciseRendered = motion;
        renderer.domElement.dataset.exerciseAppearance = appearance;
        renderer.domElement.dataset.characterStyle = character.style;
        renderer.domElement.dataset.characterBody = character.body;
        renderer.domElement.dataset.characterHair = character.hairStyle;
        renderer.domElement.dataset.characterEyes = character.eyes;
        renderer.domElement.dataset.characterSkinDetail = character.style==='realistic'?'atlas':'toon';
        renderer.domElement.dataset.exerciseProgress = String(progress);
        renderer.domElement.dataset.exerciseVertices = String(model.geometry.attributes.position.count);
      }}/>
      {appearance === 'athlete' && <HeadDetail hairNormal={character.hairStyle==='sleek'?normalAtlas:null} hairAtlas={hairAtlas} base={model.headBase} scale={model.scale} rest={model.rest} joints={joints} character={character} progress={progress}/>}
      <Footwear anchors={shoes}/>
    </group>
    <ExerciseEquipment motion={motion} joints={joints} rest={model.rest} progress={progress} heightScale={model.scale}/>
  </group>;
}

function SoftFloorShadow({ floor, heightScale }) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 128;
    const context = canvas.getContext('2d');
    const gradient = context.createRadialGradient(64, 64, 4, 64, 64, 64);
    gradient.addColorStop(0, 'rgba(32, 45, 48, .23)');
    gradient.addColorStop(.45, 'rgba(32, 45, 48, .11)');
    gradient.addColorStop(1, 'rgba(32, 45, 48, 0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 128, 128);
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
    <meshStandardMaterial color="#d8e5fa" roughness={.98}/>
  </mesh>;
}

function Studio({ compact, heightScale, motion, portrait=false }) {
  const floor = FLOOR_MOTIONS.test(motion) || FLOOR_STRETCHES.has(motion) || MOTIONS[motion]?.prop === 'mat';
  return <>
    <StudioEnvironment portrait={portrait}/>
    <color attach="background" args={['#f7faff']}/>
    <fog attach="fog" args={['#f7faff', 5, 11]}/>
    <hemisphereLight args={['#fffaf6', '#c4cedb', portrait?.42:.45]}/>
    <directionalLight position={portrait?[-2,3,4]:[-3,5,4]} color="#fff8f1" intensity={portrait?1.20:1.7} castShadow={!compact} shadow-mapSize={[1024, 1024]} shadow-camera-left={-2} shadow-camera-right={2} shadow-camera-top={2.6} shadow-camera-bottom={-1.3} shadow-bias={-.0003} shadow-normalBias={.012} shadow-radius={4}/>
    <directionalLight position={[3, 2, 2]} color="#e4efff" intensity={portrait?.50:.65}/>
    <directionalLight position={[1, 3, -3]} color="#edf3ff" intensity={.85}/>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -.021, 0]}><planeGeometry args={[30, 30]}/><meshStandardMaterial color="#eff4fb" roughness={.95}/></mesh>
    {floor && <TrainingMat heightScale={heightScale}/>}
    {compact ? <SoftFloorShadow floor={floor} heightScale={heightScale}/> : <ContactShadows position={[0, floor ? .001 : -.019, 0]} opacity={.29} scale={4} blur={2.3} far={2} resolution={512}/>}
  </>;
}

function StudioEnvironment({portrait=false}) {
  const { gl, scene, invalidate } = useThree();
  useEffect(() => {
    const generator = new THREE.PMREMGenerator(gl), room = new RoomEnvironment();
    const target = generator.fromScene(room, .04);
    scene.environment = target.texture;
    scene.environmentIntensity = portrait?.40:.42;
    generator.dispose(); room.dispose(); invalidate();
    return () => { if (scene.environment === target.texture) scene.environment = null; target.dispose(); };
  }, [gl, scene, invalidate,portrait]);
  return null;
}

export function ExerciseSceneFallback({children,onReady}){
  useEffect(()=>{onReady?.();},[onReady]);
  return <div className="motion-scene-fallback"><p role="status">3D를 표시할 수 없어 간단 동작 안내를 보여드립니다.</p>{children}</div>;
}

class SceneBoundary extends React.Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidUpdate(previous) {
    if (this.state.failed && previous.motion !== this.props.motion) this.setState({ failed: false });
  }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

export default function ExerciseMotion3D({ motion, progress, mirror, measurement, profile, compact = false, defaultView, fallbackContent, onReady, character: overrideCharacter, highlight=true, faceFocus=false }) {
  const controls = useRef();
  const savedCharacter = useCharacter();
  const character = overrideCharacter || savedCharacter;
  const initialView = defaultView || (FLOOR_MOTIONS.test(motion) ? 'side' : '45');
  const [view, setView] = useState(initialView);
  const [appearance, setAppearance] = useState('athlete');
  const anatomy = mannequinGuide(motion);
  useEffect(() => setView(initialView), [motion, initialView,faceFocus]);
  // The instructor has a consistent demonstration build. Personal body
  // composition remains on the separate mannequin; it must not move a
  // machine's calibrated seat or make a supported palm float off the mat.
  const m = measurement, p = useMemo(() => ({...profile,gender:character.body}), [profile,character.body]);
  const heightScale = morphParameters(m, p).heightScale;
  const fallback = <ExerciseSceneFallback onReady={onReady}>{fallbackContent||<MotionFigure exercise={{ motion_id: motion, exercise_name: '운동' }} progress={progress} mirror={mirror}/>}</ExerciseSceneFallback>;
  return <>
    {!compact && <div className="motion-appearance-controls" role="group" aria-label="시범 인체 표현">
      <button type="button" aria-pressed={appearance === 'mannequin'} onClick={() => setAppearance('mannequin')}>부위 강조 인체</button>
      <button type="button" aria-pressed={appearance === 'athlete'} onClick={() => setAppearance('athlete')}>운동복 인체</button>
    </div>}
    <div className="motion-controls motion-view-controls">{compact ? <select aria-label="운동 시범 방향" value={view} onChange={event => setView(event.target.value)}><option value="front">정면</option><option value="45">45°</option><option value="side">측면</option></select> : [['front', '정면'], ['45', '45°'], ['side', '측면'], ['back', '후면'], ['free', '자유']].map(([id, label]) => <button key={id} type="button" className="btn btn-ghost" aria-label={`${label} 운동 시범 보기`} aria-pressed={view === id} onClick={() => setView(id)}>{label}</button>)}</div>
    <div className="motion-3d-canvas" style={{ position: 'relative', height: compact ? undefined : 340, flex: compact ? '1 1 0' : undefined, minHeight: compact ? 0 : undefined, touchAction: 'none' }}>
      <SceneBoundary motion={motion} fallback={fallback}><React.Suspense fallback={<p className="motion-loading" role="status">캐릭터를 준비하고 있습니다.</p>}><Canvas shadows={!compact} dpr={[1, compact ? 1.5 : 2]} frameloop="demand" gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }} camera={{ position: [3, 1.5, 3], fov: 36 }} fallback={fallback} aria-label={appearance === 'mannequin' ? '운동 부위를 강조한 3D 운동 시범' : '운동복을 입은 3D 운동 시범'}>
        <SceneCamera motion={motion} view={view} mirror={mirror} heightScale={heightScale} controls={controls} faceFocus={faceFocus}/><Studio compact={compact} heightScale={heightScale} motion={motion} portrait={faceFocus}/>
        <Athlete {...{ motion, progress, mirror, compact, appearance, onReady, character, highlight }} measurement={m} profile={p}/>
        <OrbitControls ref={controls} enabled={view === 'free'} enablePan={false} minDistance={(faceFocus ? .38 : 1.2) * heightScale} maxDistance={(faceFocus ? .95 : 6) * heightScale} maxPolarAngle={Math.PI / 2 - .02}/>
      </Canvas></React.Suspense></SceneBoundary>
      {compact && highlight && anatomy.primary.length > 0 && <span className="motion-anatomy-badge" title={`주요 부위: ${anatomy.primaryLabel}. 운동 안내이며 실제 근육 사용량 측정이 아닙니다.`}>빨강 · 주요 운동 부위</span>}
    </div>
    {!compact && highlight && <div className="motion-anatomy-legend" aria-label="운동 부위 색상 안내">
      {anatomy.primary.length > 0 && <span><i className="primary"/>주요 부위 · {anatomy.primaryLabel}</span>}
      {!compact && anatomy.secondary.length > 0 && <span><i className="secondary"/>보조 부위 · {anatomy.secondaryLabel}</span>}
      <small>{anatomy.primary.length ? '색상은 운동 부위 안내이며 실제 근육 사용량 측정이 아닙니다.' : '이 동작은 특정 근육 색상 없이 전신 움직임을 안내합니다.'}</small>
    </div>}
    {!compact && <p className="muted">{measurement ? '나의 체형' : '표준 시범 체형'} · 자유 방향에서 드래그로 돌려 보세요.</p>}
  </>;
}
