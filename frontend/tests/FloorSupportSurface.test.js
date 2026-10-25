import {it,expect} from 'vitest';
import {Quaternion,Vector3} from 'three';
import {personalizedVertices,sportswear} from '../src/health/components/body3d/avatar.js';
import {footwearAnchors} from '../src/health/components/body3d/Footwear.jsx';
import {exerciseShoeFloor,heelContactHeights} from '../src/health/components/exercise/ExerciseMotion3D.jsx';
import {bindSurface,deformSurface,poseJoints,REST,calibratePalmRoll} from '../src/health/components/exercise/rig.js';
import {calibrateGripScale,gripSurface} from '../src/health/components/exercise/exerciseGrip.js';
import {exerciseHandShape} from '../src/health/components/exercise/handPoses.js';
const v=p=>new Vector3(...p);
const motions=['pushup','dead_bug','bridge','single_bridge','knee_side_plank','clamshell','prone_y','dumbbell_floor_press','seated_leg_curl','recovery_child','recovery_child_side'];

for(const gender of ['male','female',undefined])it(`fits corrected floor contacts to actual clothing, fingers and rounded shoes (${gender||'mixed'})`,()=>{
 const neutral=personalizedVertices({height:178,weight:70,body_fat_percentage:20,skeletal_muscle_mass:32},{gender});
 const base=sportswear(neutral,1,gender).positions,weights=bindSurface(neutral),shoes=footwearAnchors(neutral),rest=REST.map(p=>p.slice());
 rest.handGripScale=calibrateGripScale(base,weights,rest);
 rest.heelContactHeights=heelContactHeights(shoes,rest);
 const palm=calibratePalmRoll(base,weights,rest);
 for(const id of motions)for(let f=0;f<=20;f++){
  const pose=poseJoints(id,f/20,rest);
  if(pose.handRoll&&!pose.boneRotations?.[12])pose.handRoll=palm;
  const skin=deformSurface(gripSurface(base,weights,rest,exerciseHandShape(id,pose)),weights,pose,new Float32Array(base.length),rest,false);
  let skinMin=Infinity;for(let i=1;i<skin.length;i+=3)skinMin=Math.min(skinMin,skin[i]);
  const feet=shoes.map((shoe,side)=>{
   const [ankle,toe]=side?[14,16]:[11,15];
   const rotation=pose.boneRotations?.[10+side]?new Quaternion().fromArray(pose.boneRotations[10+side]):new Quaternion().setFromUnitVectors(v(rest[toe]).sub(v(rest[ankle])).normalize(),v(pose[toe]).sub(v(pose[ankle])).normalize());
   return exerciseShoeFloor({...shoe,rotation,center:v(shoe.center).sub(v(rest[ankle])).applyQuaternion(rotation).add(v(pose[ankle])).toArray()});
  });
  // Allow at most 15 mm of soft-surface overlap across anatomical variants.
  // This fails the former sunk shoulders/glutes and curled fingertips.
  expect(skinMin,`${id}/${f} skin contact`).toBeGreaterThan(-.015);
  expect(Math.min(...feet),`${id}/${f} shoe clearance`).toBeGreaterThan(0);
  if(id==='seated_leg_curl')expect(Math.min(...feet)).toBeGreaterThan(.005);
  if(id==='dead_bug'&&(f===5||f===15))expect(Math.min(...feet)).toBeCloseTo(.003,6);
  if(id.startsWith('recovery_child')){
   // Auto-grounding must not mask a submerged knee by lifting every support.
   const offset=.003-Math.min(skinMin,...feet);
   expect(Math.abs(offset),`${id} whole-body correction`).toBeLessThan(.012);
   for(const foot of feet)expect(foot+offset,`${id} grounded shoes`).toBeLessThan(.018);
   for(const knee of [10,13])expect(pose[knee][1]).toBeGreaterThan(.07);
  }
 }
},30000);
