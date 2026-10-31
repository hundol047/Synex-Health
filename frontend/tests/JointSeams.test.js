import {it,expect} from 'vitest';
import {Quaternion,Vector3} from 'three';
import {poseJoints,REST,BONES,rigRotation} from '../src/health/components/exercise/rig.js';
import {handRestFrame} from '../src/health/components/exercise/exerciseGrip.js';

const v=p=>new Vector3(...p),DEG=180/Math.PI,cycle=[0,.125,.25,.375,.5,.625,.75,.875];
// Twist of the forearm about its own axis relative to the upper arm, as the
// dual-quaternion skin sees it at the elbow seam.
function elbowTwist(p,upper){
 const relative=rigRotation(p,upper).invert().multiply(rigRotation(p,upper+1));
 if(relative.w<0)relative.set(-relative.x,-relative.y,-relative.z,-relative.w);
 const [a,b]=BONES[upper+1],axis=v(REST[b]).sub(v(REST[a])).normalize();
 return Math.abs(2*Math.atan2(relative.x*axis.x+relative.y*axis.y+relative.z*axis.z,relative.w))*DEG;
}
const handBack=(p,side)=>handRestFrame(REST,side).back.applyQuaternion(new Quaternion().fromArray(p.boneRotations[12+side]));

it('keeps pressing elbows untwisted so their skin does not crumple',()=>{
 for(const id of ['shoulder_press','dumbbell_bench_press','dumbbell_floor_press','barbell_bench_press'])for(const t of cycle){
  const p=poseJoints(id,t);
  for(const upper of [2,4])expect(elbowTwist(p,upper),`${id} elbow ${upper} at ${t}`).toBeLessThan(35);
 }
});

it('uses overhand grips for presses, bench and hinge lifts',()=>{
 for(const t of cycle){
  for(const side of [0,1]){
   expect(handBack(poseJoints('shoulder_press',t),side).z,'press palms forward').toBeLessThan(-.5);
   for(const id of ['barbell_rdl','dumbbell_rdl'])expect(handBack(poseJoints(id,t),side).z,`${id} knuckles forward`).toBeGreaterThan(.5);
   const bench=poseJoints('barbell_bench_press',t),towardHead=v(bench[2]).sub(v(bench[0])).setY(0).normalize();
   expect(handBack(bench,side).dot(towardHead),'bench knuckles toward the head').toBeGreaterThan(.5);
  }
 }
});

it('bends side-plank knees backwards and keeps the raised bridge foot square',()=>{
 const plank=poseJoints('knee_side_plank',0);
 // The body faces +x; shins trail behind it.
 for(const [knee,ankle] of [[10,11],[13,14]])expect(plank[ankle][0]-plank[knee][0]).toBeLessThan(-.2);
 for(const t of cycle){
  const p=poseJoints('single_bridge',t);
  const angle=v(p[10]).sub(v(p[11])).angleTo(v(p[15]).sub(v(p[11])))*DEG;
  expect(angle,`raised ankle at ${t}`).toBeGreaterThan(80);
  expect(angle,`raised ankle at ${t}`).toBeLessThan(130);
 }
});

it('rests seated palms on the thighs and the side-lying hand on the mat',()=>{
 for(const id of ['ankle_pump','seated_calf','march','hamstring_stretch'])for(const t of cycle){
  const p=poseJoints(id,t);
  for(const [wrist,hip,knee] of [[5,9,10],[8,12,13]]){
   const thigh=v(p[knee]).sub(v(p[hip])),offset=v(p[wrist]).sub(v(p[hip]));
   const along=offset.dot(thigh)/thigh.lengthSq(),height=offset.y-thigh.y*along;
   expect(height,`${id} wrist above thigh at ${t}`).toBeLessThan(.16);
   expect(height,`${id} wrist above thigh at ${t}`).toBeGreaterThan(.08);
  }
 }
 for(const t of cycle){
  const p=poseJoints('clamshell',t);
  // The lower hand lies on the mat in front of the face, not over the scalp.
  expect(p[18][1]).toBeLessThan(.08);
  expect(p[8][0]-p[2][0]).toBeGreaterThan(.1);
 }
});
