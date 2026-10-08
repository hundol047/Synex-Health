import { describe, expect, it } from 'vitest';
import { Quaternion, Vector3 } from 'three';
import mesh from '../src/health/components/body3d/assets/human-mesh.json';
import { FLOOR_CATALOG_IDS, floorCatalogPose } from '../src/health/components/exercise/floorCatalogRig.js';
import { BONES, REST, bindSurface, deformSurface } from '../src/health/components/exercise/rig.js';
import { morphPositions } from '../src/health/components/body3d/morph.js';
import { footwearAnchors } from '../src/health/components/body3d/Footwear.jsx';
import { exerciseShoeFloor } from '../src/health/components/exercise/ExerciseMotion3D.jsx';

const v = point => new Vector3(...point);
const angle = (a, b, c) => v(a).sub(v(b)).angleTo(v(c).sub(v(b))) * 180 / Math.PI;
const base = Float32Array.from(mesh.profiles.male, value => value * mesh.scale);
const weights = bindSurface(base);
const surface = joints => deformSurface(base, weights, joints, new Float32Array(base.length), REST, false);
const boneMinimum = (positions, bone) => weights.reduce((minimum, vertexWeights, index) => vertexWeights.some(([id, weight]) => id === bone && weight > .8) ? Math.min(minimum, positions[index * 3 + 1]) : minimum, Infinity);
const stationary = (a, b, indices) => {
  for (const index of indices) expect(v(a[index]).distanceTo(v(b[index]))).toBeLessThan(1e-6);
};

describe('anatomical floor catalog demonstrations', () => {
  it('retains segment lengths and continuous loops for every supported floor motion and both statures', () => {
    expect(FLOOR_CATALOG_IDS.size).toBe(9);
    expect(floorCatalogPose('unknown', .5, REST)).toBeNull();
    for (const gender of ['male', 'female']) for (const height of [158, 178, 198]) {
      const flat = morphPositions(Float32Array.from(REST.flat()), { height, weight: 70, body_fat_percentage: 20, skeletal_muscle_mass: 32 }, { gender });
      const rest = REST.map((_, index) => Array.from(flat.slice(index * 3, index * 3 + 3)));
      for (const id of FLOOR_CATALOG_IDS) {
        for (const phase of [0, .08, .125, .25, .375, .5, .625, .75, .875, 1]) {
          const joints = floorCatalogPose(id, phase, rest);
          expect(joints.flat().every(Number.isFinite), `${gender} ${height} ${id} finite pose`).toBe(true);
          for (const [a, b] of BONES) expect(v(joints[a]).distanceTo(v(joints[b])), `${id} ${a}→${b} bone length`).toBeCloseTo(v(rest[a]).distanceTo(v(rest[b])), 6);
        }
        stationary(floorCatalogPose(id, 0, rest), floorCatalogPose(id, 1, rest), REST.map((_, index) => index));
        for (const boundary of [.5, 1]) {
          const previous = floorCatalogPose(id, boundary - .00001, rest), current = floorCatalogPose(id, boundary, rest);
          for (let index = 0; index < REST.length; index++) expect(v(previous[index]).distanceTo(v(current[index]))).toBeLessThan(.001);
        }
      }
    }
  });

  it('performs a knee pushup through the elbows, keeping the palms and knees fixed', () => {
    const top = floorCatalogPose('pushup', 0, REST), bottom = floorCatalogPose('pushup', .5, REST);
    expect(angle(top[3], top[4], top[5])).toBeGreaterThan(155);
    expect(angle(bottom[3], bottom[4], bottom[5])).toBeLessThan(100);
    expect(angle(bottom[3], bottom[4], bottom[5])).toBeGreaterThan(75);
    expect(bottom[1][1]).toBeLessThan(top[1][1] - .12);
    for (const phase of [0, .125, .25, .5, .75, 1]) {
      const joints = floorCatalogPose('pushup', phase, REST);
      stationary(top, joints, [5, 8, 10, 11, 13, 14, 15, 16, 17, 18]);
      const positions = surface(joints);
      for (const palm of [12, 13]) {
        expect(boneMinimum(positions, palm)).toBeGreaterThan(-.015);
        expect(boneMinimum(positions, palm)).toBeLessThan(.02);
      }
      expect(joints[11][1]).toBeGreaterThan(.20);
      expect(joints[14][1]).toBeGreaterThan(.20);
    }
  });

  it('extends opposite limbs in bird dog while retaining the other palm and knee as support', () => {
    const start = floorCatalogPose('bird_dog', 0, REST);
    const rightArm = floorCatalogPose('bird_dog', .25, REST), leftArm = floorCatalogPose('bird_dog', .75, REST);
    stationary(start, rightArm, [0, 1, 2, 7, 8, 9, 10, 11, 15, 18]);
    stationary(start, leftArm, [0, 1, 2, 4, 5, 12, 13, 14, 16, 17]);
    expect(rightArm[5][1]).toBeGreaterThan(start[5][1] + .30);
    expect(rightArm[5][2]).toBeGreaterThan(start[5][2] + .30);
    expect(rightArm[14][1]).toBeGreaterThan(start[14][1] + .30);
    expect(rightArm[14][2]).toBeLessThan(start[14][2] - .20);
    expect(angle(rightArm[12], rightArm[13], rightArm[14])).toBeGreaterThan(160);
    expect(rightArm[5][1]).toBeCloseTo(leftArm[8][1], 5);
    expect(rightArm[14][1]).toBeCloseTo(leftArm[11][1], 5);
  });

  it('alternates heel touch without lifting the back, head, arms or the other tabletop leg', () => {
    const start = floorCatalogPose('dead_bug', 0, REST), first = floorCatalogPose('dead_bug', .25, REST), second = floorCatalogPose('dead_bug', .75, REST);
    for (const touched of [first, second]) stationary(start, touched, [0, 1, 2, 3, 4, 5, 6, 7, 8, 17, 18]);
    stationary(start, first, [12, 13, 14, 16]);
    stationary(start, second, [9, 10, 11, 15]);
    expect(start[11][1]).toBeGreaterThan(.50);
    expect(first[11][1]).toBeCloseTo(.083, 6);
    expect(second[14][1]).toBeCloseTo(.083, 6);
    expect(angle(start[9], start[10], start[11])).toBeGreaterThan(80);
    expect(angle(start[9], start[10], start[11])).toBeLessThan(100);
    for (const phase of [0, .125, .25, .375, .5, .75]) {
      const positions = surface(floorCatalogPose('dead_bug', phase, REST));
      expect(boneMinimum(positions, 0)).toBeGreaterThan(-.015);
      expect(boneMinimum(positions, 1)).toBeGreaterThan(-.015);
      expect(boneMinimum(positions, 1)).toBeLessThan(.025);
    }
  });

  it('slides heels on the mat while opening the active knee and preserving the inactive side', () => {
    const start = floorCatalogPose('heel_slide', 0, REST), straight = floorCatalogPose('heel_slide', .25, REST);
    stationary(start, straight, [0, 1, 2, 3, 4, 5, 6, 7, 8, 12, 13, 14, 16, 17, 18]);
    expect(straight[11][2] - start[11][2]).toBeGreaterThan(.28);
    expect(angle(start[9], start[10], start[11])).toBeLessThan(90);
    expect(angle(straight[9], straight[10], straight[11])).toBeGreaterThan(145);
    for (const phase of [0, .08, .125, .25, .375, .5, .75, 1]) {
      const joints = floorCatalogPose('heel_slide', phase, REST), positions = surface(joints);
      for (const foot of [10, 11]) expect(Math.abs(boneMinimum(positions, foot))).toBeLessThan(.012);
      for (const ankle of [11, 14]) expect(joints[ankle][1]).toBeCloseTo(.10, 6);
    }
  });

  it('lands the actual rounded shoe heel at the mat instead of leaving a hovering ankle target', () => {
    const standard = Float32Array.from(mesh.profiles.male, (value, index) => (value + mesh.profiles.female[index]) * mesh.scale / 2);
    const shoes = footwearAnchors(standard);
    for (const [side, phase] of [[0, .25], [1, .75]]) {
      const joints = floorCatalogPose('dead_bug', phase, REST), ankle = side === 0 ? 11 : 14;
      const rotation = new Quaternion().fromArray(joints.boneRotations[side + 10]);
      const center = v(shoes[side].center).sub(v(REST[ankle])).applyQuaternion(rotation).add(v(joints[ankle])).toArray();
      const actualFloor = exerciseShoeFloor({ ...shoes[side], center, rotation });
      expect(actualFloor).toBeGreaterThan(0);
      expect(actualFloor).toBeLessThan(.006);
    }
  });

  it('rounds the cat-cow trunk surface with a supported neck and four stationary contacts', () => {
    const neutral = floorCatalogPose('cat_cow', 0, REST), rounded = floorCatalogPose('cat_cow', .5, REST);
    stationary(neutral, rounded, [0, 1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]);
    expect(rounded[2][1]).toBeLessThan(neutral[2][1] - .05);
    const before = surface(neutral), after = surface(rounded);
    let dorsalRise = 0;
    weights.forEach((vertexWeights, index) => {
      if (vertexWeights.some(([bone, weight]) => bone === 0 && weight > .8)) dorsalRise = Math.max(dorsalRise, after[index * 3 + 1] - before[index * 3 + 1]);
    });
    expect(dorsalRise).toBeGreaterThan(.055);
    expect(dorsalRise).toBeLessThan(.065);
  });

  it('uses a single planted bridge foot and keeps head, shoulders and palms quiet', () => {
    const start = floorCatalogPose('single_bridge', 0, REST), raised = floorCatalogPose('single_bridge', .5, REST);
    stationary(start, raised, [1, 2, 5, 8, 14, 16, 17, 18]);
    expect(raised[0][1] - start[0][1]).toBeGreaterThan(.16);
    expect(raised[11][1]).toBeGreaterThan(.50);
    expect(raised[14][1]).toBeCloseTo(.10, 6);
    expect(angle(raised[9], raised[10], raised[11])).toBeGreaterThan(170);
  });

  it('holds a true sideways knee plank with the supporting elbow directly below the shoulder', () => {
    const joints = floorCatalogPose('knee_side_plank', 0, REST);
    stationary(joints, floorCatalogPose('knee_side_plank', .75, REST), REST.map((_, index) => index));
    expect(joints[7][0]).toBeCloseTo(joints[6][0], 6);
    expect(joints[7][2]).toBeCloseTo(joints[6][2], 6);
    expect(joints[7][1]).toBeCloseTo(.060, 6);
    expect(joints[8][1]).toBeCloseTo(.047, 6);
    expect(joints[8][0] - joints[7][0]).toBeGreaterThan(.20);
    expect(angle(joints[6], joints[7], joints[8])).toBeGreaterThan(85);
    expect(angle(joints[6], joints[7], joints[8])).toBeLessThan(100);
    expect(joints[13][1]).toBeCloseTo(.062, 6);
    expect(joints[10][1] - joints[13][1]).toBeCloseTo(.075, 6);
    const bodyFront = new Vector3(0, 0, 1).applyQuaternion(new Quaternion().fromArray(joints.boneRotations[0]));
    expect(bodyFront.x).toBeGreaterThan(.99);
    const positions = surface(joints);
    expect(boneMinimum(positions, 5)).toBeGreaterThan(-.015);
    expect(boneMinimum(positions, 5)).toBeLessThan(.02);
    expect(boneMinimum(positions, 0)).toBeGreaterThan(.15);
  });

  it('opens the clamshell upper knee without rolling the pelvis or separating the feet', () => {
    const closed = floorCatalogPose('clamshell', 0, REST), open = floorCatalogPose('clamshell', .5, REST);
    stationary(closed, open, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 13, 14, 15, 16, 17, 18]);
    expect(open[10][1] - closed[10][1]).toBeGreaterThan(.09);
    expect(v(open[11]).distanceTo(v(open[14]))).toBeLessThan(.04);
    expect(open.equipment.neckSupport).toBeTruthy();
    const footUp = new Vector3(0, 1, 0).applyQuaternion(new Quaternion().fromArray(open.boneRotations[10]));
    expect(footUp.z).toBeGreaterThan(.99);
  });

  it('lifts prone Y arms gently without lifting the head, torso or legs', () => {
    const rest = floorCatalogPose('prone_y', 0, REST), lifted = floorCatalogPose('prone_y', .5, REST);
    stationary(rest, lifted, [0, 1, 2, 9, 10, 11, 12, 13, 14, 15, 16]);
    for (const hand of [5, 8]) {
      expect(lifted[hand][1] - rest[hand][1]).toBeGreaterThan(.075);
      expect(lifted[hand][1] - rest[hand][1]).toBeLessThan(.10);
      expect(lifted[hand][2]).toBeGreaterThan(lifted[1][2] + .30);
    }
    expect(lifted[5][0]).toBeGreaterThan(lifted[3][0] + .20);
    expect(lifted[8][0]).toBeLessThan(lifted[6][0] - .20);
    const positions = surface(rest);
    expect(boneMinimum(positions, 0)).toBeGreaterThan(.005);
    expect(boneMinimum(positions, 1)).toBeGreaterThan(.005);
    expect(boneMinimum(positions, 1)).toBeLessThan(.04);
    for (const palm of [12, 13]) expect(boneMinimum(positions, palm)).toBeGreaterThan(-.02);
  });
});
