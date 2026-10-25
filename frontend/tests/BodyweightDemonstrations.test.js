import { describe, expect, it } from 'vitest';
import { CapsuleGeometry, PerspectiveCamera, Quaternion, Vector3 } from 'three';
import mesh from '../src/health/components/body3d/assets/human-mesh.json';
import { BODYWEIGHT_EXERCISES, getBodyweightGuide, getBodyweightDemoPhase } from '../src/health/components/exercise/bodyweightGuide.js';
import { POSE_EXERCISES } from '../src/health/components/exercise/poseThresholds.js';
import { exerciseCameraPreset, exerciseShoeFloor } from '../src/health/components/exercise/ExerciseMotion3D.jsx';
import { REST, BONES, bindSurface, calibratePalmRoll, deformSurface, poseJoints } from '../src/health/components/exercise/rig.js';
import { morphPositions } from '../src/health/components/body3d/morph.js';

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
        if (id === 'bridge') for (const index of [1, 2, 5, 8, 17, 18]) expect(vector(joints[index]).distanceTo(vector(start[index]))).toBeLessThan(1e-6);
      }
    }
    const pushTop = poseJoints('full_pushup', 0), pushBottom = poseJoints('full_pushup', .5);
    expect(angle(pushTop[3], pushTop[4], pushTop[5])).toBeGreaterThan(155);
    expect(angle(pushBottom[3], pushBottom[4], pushBottom[5])).toBeLessThan(100);
    const bridgeBottom = poseJoints('bridge', 0), bridgeTop = poseJoints('bridge', .5);
    expect(angle(bridgeBottom[3], bridgeBottom[9], bridgeBottom[10])).toBeLessThan(140);
    expect(angle(bridgeTop[3], bridgeTop[9], bridgeTop[10])).toBeGreaterThan(155);
  });

  it('steps the rear foot clear of the floor, plants it before lowering and keeps front support stationary', () => {
    const start = poseJoints('lunge', 0), swing = poseJoints('lunge', .08), landed = poseJoints('lunge', .125);
    expect(swing[15][1]).toBeGreaterThan(.09);
    expect(landed[15][1]).toBeCloseTo(start[15][1], 6);
    expect(landed[11][1] - landed[15][1]).toBeGreaterThan(.10);
    for (const phase of [.08, .125, .2, .25, .3, .375, .43]) {
      const joints = poseJoints('lunge', phase);
      for (const index of [14, 16]) expect(vector(joints[index]).distanceTo(vector(start[index]))).toBeLessThan(1e-6);
      if (phase >= .125 && phase <= .375) for (const index of [11, 15]) expect(vector(joints[index]).distanceTo(vector(landed[index]))).toBeLessThan(1e-6);
      const otherSide = poseJoints('lunge', phase + .5);
      expect(otherSide[16][1]).toBeCloseTo(joints[15][1], 6);
      expect(otherSide[16][2]).toBeCloseTo(joints[15][2], 6);
    }
    expect(poseJoints('lunge', .25)[0][1]).toBeLessThan(landed[0][1] - .18);
  });

  it('keeps palms fixed, forearms grounded and plank breathing small enough to retain alignment', () => {
    const base = Float32Array.from(mesh.profiles.male, value => value * mesh.scale), weights = bindSurface(base);
    const minimum = (surface, bone) => weights.reduce((height, vertexWeights, index) => vertexWeights.some(([b, weight]) => b === bone && weight > .8) ? Math.min(height, surface[index * 3 + 1]) : height, Infinity);
    for (const id of ['full_pushup', 'plank', 'bridge']) {
      const start = poseJoints(id, 0);
      for (const phase of [0, .125, .25, .5, .75, 1]) {
        const joints = poseJoints(id, phase), surface = deformSurface(base, weights, joints, new Float32Array(base.length), REST, false);
        for (const index of [5, 8, 17, 18]) expect(vector(joints[index]).distanceTo(vector(start[index]))).toBeLessThan(1e-6);
        for (const bone of id === 'plank' ? [3, 5] : [12, 13]) {
          expect(minimum(surface, bone)).toBeGreaterThan(-.015);
          expect(minimum(surface, bone)).toBeLessThan(.02);
        }
        if (id === 'bridge') expect(minimum(surface, 1)).toBeLessThan(.015);
        if (id === 'plank') {
          expect(vector(joints[0]).distanceTo(vector(start[0]))).toBeLessThan(.004);
          const sagittal = index => [0, joints[index][1], joints[index][2]];
          expect(angle(sagittal(1), sagittal(0), sagittal(11))).toBeGreaterThan(175);
        }
      }
    }
    expect(poseJoints('plank', .5)[0][1]).toBeGreaterThan(poseJoints('plank', 0)[0][1]);
  });

  it('calibrates palm contact and fixed wrist reach across male/female stature', () => {
    for (const gender of ['male', 'female']) for (const height of [158, 178, 198]) {
      const measurement = { height, weight: 70, body_fat_percentage: 20, skeletal_muscle_mass: 32 }, profile = { gender };
      const neutral = Float32Array.from(mesh.profiles[gender], value => value * mesh.scale);
      const base = morphPositions(neutral, measurement, profile), weights = bindSurface(neutral);
      const flat = morphPositions(Float32Array.from(REST.flat()), measurement, profile);
      const rest = REST.map((_, index) => Array.from(flat.slice(index * 3, index * 3 + 3)));
      const palmRoll = calibratePalmRoll(base, weights, rest), start = poseJoints('full_pushup', 0, rest);
      for (const phase of [0, .25, .5, .75]) {
        const joints = poseJoints('full_pushup', phase, rest);
        joints.handRoll = palmRoll;
        const surface = deformSurface(base, weights, joints, new Float32Array(base.length), rest, false);
        for (const index of [5, 8]) expect(vector(joints[index]).distanceTo(vector(start[index]))).toBeLessThan(1e-6);
        for (const bone of [12, 13]) {
          let minimum = Infinity;
          for (let index = 0; index < weights.length; index++) if (weights[index].some(([b, weight]) => b === bone && weight > .8)) minimum = Math.min(minimum, surface[index * 3 + 1]);
          expect(minimum, `${gender} ${height} palm penetration`).toBeGreaterThan(-.015);
          expect(minimum, `${gender} ${height} palm lift`).toBeLessThan(.025);
        }
      }
    }
  });

  it('keeps pelvic pitch modest during the deep hip hinge and joins every motion loop smoothly', () => {
    const hinge = poseJoints('hinge', .5);
    const pelvis = vector(hinge[9]).sub(vector(hinge[0])), restingPelvis = vector(REST[9]).sub(vector(REST[0]));
    expect(pelvis.angleTo(restingPelvis)).toBeLessThan(.25);
    expect(vector(hinge[1]).sub(vector(hinge[0])).angleTo(new Vector3(0, 1, 0))).toBeGreaterThan(1);
    for (const guide of Object.values(BODYWEIGHT_EXERCISES)) {
      const first = poseJoints(guide.motionId, 0), last = poseJoints(guide.motionId, 1);
      for (let index = 0; index < first.length; index++) expect(vector(first[index]).distanceTo(vector(last[index]))).toBeLessThan(1e-6);
      for (const phase of [.49999, .99999]) {
        const before = poseJoints(guide.motionId, phase), after = poseJoints(guide.motionId, phase + .00001);
        for (let index = 0; index < before.length; index++) expect(vector(before[index]).distanceTo(vector(after[index]))).toBeLessThan(.001);
      }
    }
  });

  it('grounds actual rounded shoe upper/sole geometry after heel pitch', () => {
    const geometry = new CapsuleGeometry(1, 2, 6, 16);
    for (const pitch of [0, .6, .8]) {
      const shoe = { center: [.19, .18, -.7], width: .105, length: .285, rotation: new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), pitch) };
      let minimum = Infinity;
      for (const [scale, offset] of [[[shoe.width / 2, shoe.length / 4, .037], 0], [[shoe.width * .52, shoe.length * .255, .012], -.025]]) {
        for (let index = 0; index < geometry.attributes.position.count; index++) {
          const point = new Vector3().fromBufferAttribute(geometry.attributes.position, index).multiply(new Vector3(...scale)).applyAxisAngle(new Vector3(1, 0, 0), Math.PI / 2);
          point.y += offset;
          point.applyQuaternion(shoe.rotation).add(vector(shoe.center));
          minimum = Math.min(minimum, point.y);
        }
      }
      expect(Math.abs(exerciseShoeFloor(shoe) - minimum)).toBeLessThan(.002);
    }
    geometry.dispose();
  });

  it('fits the entire skeleton into both phone standing and floor demonstration panes', () => {
    for (const guide of Object.values(BODYWEIGHT_EXERCISES)) for (const aspect of [.8, 1.5, 2, 3.5]) for (const view of ['front', '45', 'side']) {
      const preset = exerciseCameraPreset(guide.motionId, view, 1, aspect);
      const camera = new PerspectiveCamera(36, aspect, .1, 100);
      camera.position.set(...preset.position); camera.lookAt(...preset.target); camera.updateMatrixWorld();
      for (const phase of [0, .08, .125, .25, .5, .75]) for (const joint of poseJoints(guide.motionId, phase)) {
        const projected = vector(joint).project(camera);
        expect(Math.abs(projected.x), `${guide.motionId} horizontal crop`).toBeLessThan(1);
        expect(Math.abs(projected.y), `${guide.motionId} vertical crop`).toBeLessThan(1);
      }
    }
  });
});
