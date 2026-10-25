import { describe, it, expect } from 'vitest';
import { Vector3, Quaternion } from 'three';
import mesh from '../src/health/components/body3d/assets/human-mesh.json';
import catalog from '../src/shared/lib/localCatalog.json';
import { STRETCHES } from '../src/health/components/exercise/stretchCatalog.js';
import { REST, bindSurface, poseJoints, deformSurface } from '../src/health/components/exercise/rig.js';
import { calibrateGripScale, gripSurface } from '../src/health/components/exercise/exerciseGrip.js';
import { CLASP_MOTIONS, exerciseHandShape } from '../src/health/components/exercise/handPoses.js';

const v = point => new Vector3(...point);
describe('articulated demonstration hands', () => {
  it('preserves round wrist cross-sections through wall presses instead of pinching one side', () => {
    for (const [elbow,wrist,finger] of [[4,5,17],[7,8,18]]) {
      const axis=v(REST[wrist]).sub(v(REST[elbow])).normalize().add(v(REST[finger]).sub(v(REST[wrist])).normalize()).normalize();
      const across=axis.clone().cross(new Vector3(0,1,0)).normalize(),back=axis.clone().cross(across);
      for (const distance of [-.03,0,.03]) {
        const ring=Float32Array.from(Array.from({length:32},(_,i)=>v(REST[wrist]).addScaledVector(axis,distance).addScaledVector(across,.018*Math.cos(i*Math.PI/16)).addScaledVector(back,.018*Math.sin(i*Math.PI/16)).toArray()).flat());
        const weights=bindSurface(ring);
        for (const motion of ['wall_push','close_wall_push','calf_stretch']) for (const phase of [0,.25,.5,.75]) {
          const positions=deformSurface(ring,weights,poseJoints(motion,phase),new Float32Array(ring.length),REST,false);
          const points=Array.from({length:32},(_,i)=>v(positions.slice(i*3,i*3+3)));
          const center=points.reduce((sum,p)=>sum.add(p),new Vector3()).divideScalar(points.length);
          for (const point of points) expect(point.distanceTo(center),`${motion} wrist ${wrist} ring ${distance}`).toBeCloseTo(.018,5);
        }
      }
    }
  });

  it('keeps both clasped hands in one stable contact frame through each complete repetition', () => {
    for (const motion of CLASP_MOTIONS) {
      const initial = poseJoints(motion, 0), separation = v(initial[5]).sub(v(initial[8]));
      for (let frame = 0; frame <= 120; frame++) {
        const joints = poseJoints(motion, frame / 120);
        expect(v(joints[5]).sub(v(joints[8])).distanceTo(separation), motion).toBeLessThan(1e-6);
        for (const [elbow, wrist, finger] of [[4, 5, 17], [7, 8, 18]]) {
          const forearm = v(joints[wrist]).sub(v(joints[elbow]));
          expect(forearm.length(), motion).toBeCloseTo(v(REST[wrist]).distanceTo(v(REST[elbow])), 7);
          expect(forearm.angleTo(v(joints[finger]).sub(v(joints[wrist]))), motion).toBeLessThan(Math.PI / 3);
        }
        for (const bone of [12, 13]) expect(new Quaternion().fromArray(joints.boneRotations[bone]).angleTo(new Quaternion().fromArray(initial.boneRotations[bone])), motion).toBeLessThan(1e-6);
      }
    }
  });

  it('preserves calibrated support palms and permits a different shape for each hand', () => {
    const base = Float32Array.from(mesh.profiles.male, value => value * mesh.scale), weights = bindSurface(base);
    const mixed = gripSurface(base, weights, REST, ['open', 'relaxed']);
    let movedFree = 0;
    for (let i = 0; i < weights.length; i++) {
      if (weights[i].some(([bone, weight]) => bone === 12 && weight > .5)) expect(Array.from(mixed.slice(i * 3, i * 3 + 3))).toEqual(Array.from(base.slice(i * 3, i * 3 + 3)));
      if (weights[i].some(([bone, weight]) => bone === 13 && weight > .5) && v(mixed.slice(i * 3, i * 3 + 3)).distanceTo(v(base.slice(i * 3, i * 3 + 3))) > .005) movedFree++;
    }
    expect(movedFree).toBeGreaterThan(10);
    for (const motion of ['full_pushup', 'wall_push', 'close_wall_push', 'bird_dog', 'cat_cow', 'recovery_child']) expect(gripSurface(base, weights, REST, exerciseHandShape(motion, poseJoints(motion, .5)))).toEqual(base);
  });

  it('renders finite articulated surfaces for every exercise and stretch in both body profiles', () => {
    for (const gender of ['male', 'female']) {
      const base = Float32Array.from(mesh.profiles[gender], value => value * mesh.scale), weights = bindSurface(base);
      const rest = REST.map(point => point.slice());rest.handGripScale = calibrateGripScale(base, weights, rest);
      for (const { motion_id: motion } of [...catalog, ...STRETCHES]) {
        const pose = poseJoints(motion, .5, rest), shape = exerciseHandShape(motion, pose);
        expect(shape, motion).toBeTruthy();
        const surface = gripSurface(base, weights, rest, shape);
        expect(deformSurface(surface, weights, pose, new Float32Array(base.length), rest, false).every(Number.isFinite), `${gender} ${motion}`).toBe(true);
      }
    }
  });
});
