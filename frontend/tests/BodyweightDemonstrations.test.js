import { describe, expect, it } from 'vitest';
import { PerspectiveCamera, Vector3 } from 'three';
import mesh from '../src/health/components/body3d/assets/human-mesh.json';
import { BODYWEIGHT_EXERCISES, getBodyweightGuide, getBodyweightDemoPhase } from '../src/health/components/exercise/bodyweightGuide.js';
import { POSE_EXERCISES } from '../src/health/components/exercise/poseThresholds.js';
import { exerciseCameraPreset } from '../src/health/components/exercise/ExerciseMotion3D.jsx';
import { REST, BONES, bindSurface, deformSurface, poseJoints } from '../src/health/components/exercise/rig.js';

const vector = point => new Vector3(...point);
const angle = (a, b, c) => vector(a).sub(vector(b)).angleTo(vector(c).sub(vector(b))) * 180 / Math.PI;

describe('authored bodyweight demonstrations', () => {
  it('provides instructions and distinct motion guidance for all seven supported bodyweight movements', () => {
    expect(Object.keys(BODYWEIGHT_EXERCISES)).toEqual(['squat', 'lunge', 'side_lunge', 'push_up', 'plank', 'hip_hinge', 'glute_bridge']);
    for (const [id, guide] of Object.entries(BODYWEIGHT_EXERCISES)) {
      expect(guide.label).toBe(POSE_EXERCISES[id].label);
      expect(guide.steps).toHaveLength(3);
      expect(guide.cues).toHaveLength(3);
      expect(getBodyweightGuide(id)).toBe(guide);
      expect(getBodyweightDemoPhase(id, .3).cue).toBeTruthy();
    }
    expect(getBodyweightGuide('shoulder_press')).toBeNull();
    expect(getBodyweightDemoPhase('unknown')).toBeNull();
    expect(getBodyweightDemoPhase('plank', .1)).toEqual(getBodyweightDemoPhase('plank', .8));
  });

  it('preserves human segment lengths through every demonstration, including hand articulation', () => {
    for (const guide of Object.values(BODYWEIGHT_EXERCISES)) for (const phase of [0, .125, .25, .375, .5, .625, .75, 1]) {
      const joints = poseJoints(guide.motionId, phase);
      expect(joints.flat().every(Number.isFinite)).toBe(true);
      for (const [a, b] of BONES) expect(vector(joints[a]).distanceTo(vector(joints[b]))).toBeCloseTo(vector(REST[a]).distanceTo(vector(REST[b])), 6);
    }
  });

  it('plants squat feet and demonstrates actual bent-knee range instead of translating the whole athlete', () => {
    const standing = poseJoints('squat', 0), low = poseJoints('squat', .5);
    expect(angle(standing[9], standing[10], standing[11])).toBeGreaterThan(155);
    expect(angle(low[9], low[10], low[11])).toBeLessThan(110);
    for (const phase of [.125, .25, .375, .5, .75]) {
      const joints = poseJoints('squat', phase);
      for (const index of [11, 14, 15, 16]) expect(vector(joints[index]).distanceTo(vector(standing[index]))).toBeLessThan(1e-6);
    }
    const sideStart = poseJoints('side_lunge', 0), sideLow = poseJoints('side_lunge', .25);
    expect(angle(sideStart[9], sideStart[10], sideStart[11])).toBeGreaterThan(155);
    expect(angle(sideLow[9], sideLow[10], sideLow[11])).toBeLessThan(115);
    expect(angle(sideLow[12], sideLow[13], sideLow[14])).toBeGreaterThan(150);
  });

  it('keeps floor support points stable, palms above the mat and the supine head independent of hip lift', () => {
    const base = Float32Array.from(mesh.profiles.male, value => value * mesh.scale), weights = bindSurface(base);
    for (const id of ['full_pushup', 'plank', 'bridge']) {
      const start = poseJoints(id, 0);
      for (const phase of [0, .25, .5, .75, 1]) {
        const joints = poseJoints(id, phase);
        for (const index of [11, 14, 15, 16]) expect(vector(joints[index]).distanceTo(vector(start[index]))).toBeLessThan(1e-6);
        const surface = deformSurface(base, weights, joints, new Float32Array(base.length), REST, false);
        let minY = Infinity;
        for (let i = 1; i < surface.length; i += 3) minY = Math.min(minY, surface[i]);
        // Small body/mat compression is allowed; wrist-driven penetration is not.
        expect(minY).toBeGreaterThan(-.025);
        if (id === 'bridge') expect(joints[2][1]).toBeCloseTo(start[2][1], 6);
      }
    }
    const pushTop = poseJoints('full_pushup', 0), pushBottom = poseJoints('full_pushup', .5);
    expect(angle(pushTop[3], pushTop[4], pushTop[5])).toBeGreaterThan(155);
    expect(angle(pushBottom[3], pushBottom[4], pushBottom[5])).toBeLessThan(100);
    const bridgeBottom = poseJoints('bridge', 0), bridgeTop = poseJoints('bridge', .5);
    expect(angle(bridgeBottom[3], bridgeBottom[9], bridgeBottom[10])).toBeLessThan(140);
    expect(angle(bridgeTop[3], bridgeTop[9], bridgeTop[10])).toBeGreaterThan(155);
  });

  it('fits the entire skeleton into both phone standing and floor demonstration panes', () => {
    for (const guide of Object.values(BODYWEIGHT_EXERCISES)) for (const aspect of [.8, 1.5, 2]) {
      const preset = exerciseCameraPreset(guide.motionId, guide.defaultView, 1, aspect);
      const camera = new PerspectiveCamera(36, aspect, .1, 100);
      camera.position.set(...preset.position); camera.lookAt(...preset.target); camera.updateMatrixWorld();
      for (const phase of [0, .25, .5, .75]) for (const joint of poseJoints(guide.motionId, phase)) {
        const projected = vector(joint).project(camera);
        expect(Math.abs(projected.x), `${guide.motionId} horizontal crop`).toBeLessThan(1);
        expect(Math.abs(projected.y), `${guide.motionId} vertical crop`).toBeLessThan(1);
      }
    }
  });
});
