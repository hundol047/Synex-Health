import { describe, expect, it } from 'vitest';
import { Quaternion, Vector3 } from 'three';
import catalog from '../src/shared/lib/localCatalog.json';
import { REST, BONES, bindSurface, deformSurface } from '../src/health/components/exercise/rig.js';
import mesh from '../src/health/components/body3d/assets/human-mesh.json';
import { equipmentCatalogPose, EQUIPMENT_CATALOG_IDS } from '../src/health/components/exercise/equipmentCatalogRig.js';
import { calibrateGripScale, gripSurface, handRestFrame, toolGripAnchor } from '../src/health/components/exercise/exerciseGrip.js';

const v = p => new Vector3(...p);
const distance = (a, b) => v(a).distanceTo(v(b));
const angle = (a, b, c) => v(a).sub(v(b)).angleTo(v(c).sub(v(b))) * 180 / Math.PI;
const phases = Array.from({ length: 33 }, (_, i) => i / 32);
const pose = (id, t, rest = REST) => equipmentCatalogPose(id, t, rest);

describe('equipment catalog authored demonstrations', () => {
  it('provides a dedicated rig for every equipment catalog entry, with explicit prop identity', () => {
    const ids = catalog.filter(exercise => exercise.training_type === 'equipment').map(exercise => exercise.motion_id);
    expect(ids).toHaveLength(32);
    expect(new Set(ids)).toEqual(EQUIPMENT_CATALOG_IDS);
    for (const id of ids) {
      const joints = pose(id, .5);
      expect(joints.equipment.type).toBe(id);
      expect(joints.equipment.wristAnchors).toEqual([joints[5], joints[8]]);
      expect(joints.equipment.grip).toBe('closed');
      joints.equipment.handles.forEach((anchor, side) => expect(anchor).toEqual(toolGripAnchor(REST, joints, side, new Quaternion().fromArray(joints.boneRotations[12 + side]))));
    }
    expect(pose('squat', .5)).toBeNull();
    expect(pose('unsupported', .5)).toBeNull();
  });

  it('retains all human segment lengths at every phase and athlete stature', () => {
    for (const factor of [.78, 1, 1.2]) {
      const rest = REST.map(p => p.map(value => value * factor));
      for (const id of EQUIPMENT_CATALOG_IDS) for (const t of phases) {
        const joints = pose(id, t, rest);
        expect(joints).toHaveLength(19);
        expect(joints.flat().every(Number.isFinite), `${id} at ${t}`).toBe(true);
        for (const [a, b] of BONES) expect(distance(joints[a], joints[b]), `${id}: ${a}–${b}`).toBeCloseTo(distance(rest[a], rest[b]), 6);
      }
    }
  });

  it('returns to the same frame with no positional jump or abrupt repeated phase boundaries', () => {
    for (const id of EQUIPMENT_CATALOG_IDS) {
      const first = pose(id, 0), last = pose(id, 1);
      for (let j = 0; j < first.length; j++) expect(distance(first[j], last[j]), id).toBeLessThan(1e-6);
      for (const t of phases.slice(0, -1)) {
        const before = pose(id, t), after = pose(id, t + .00001);
        for (let j = 0; j < before.length; j++) expect(distance(before[j], after[j]), `${id} at ${t}`).toBeLessThan(.00015);
      }
    }
  });

  it('plants support feet for standing lifts, squats, hinges and stationary split squats', () => {
    const standing = [...EQUIPMENT_CATALOG_IDS].filter(id => !/machine_|leg_press|leg_extension|seated_leg_curl|lat_pulldown|cable_row|bench_press|floor_press|treadmill|stationary_cycle|elliptical/.test(id));
    for (const id of standing) {
      const initial = pose(id, 0);
      for (const t of phases) for (const index of [11, 14, 15, 16]) expect(distance(pose(id, t)[index], initial[index]), id).toBeLessThan(1e-6);
    }
  });

  it('keeps curl elbows at the side and differentiates neutral hammer grips from supination', () => {
    const curlStart = pose('curl', 0), curlTop = pose('curl', .5), hammer = pose('hammer_curl', .5);
    for (const t of phases) for (const index of [4, 7]) expect(pose('curl', t)[index]).toEqual(curlStart[index]);
    expect(angle(curlTop[3], curlTop[4], curlTop[5])).toBeLessThan(75);
    expect(angle(curlStart[3], curlStart[4], curlStart[5])).toBeGreaterThan(170);
    expect(curlTop.boneRotations[12]).not.toEqual(hammer.boneRotations[12]);
    expect(curlTop.equipment.gripAxes).toEqual([[1, 0, 0], [1, 0, 0]]);
    expect(Math.abs(hammer.equipment.gripAxes[0][0])).toBeLessThan(1e-8);
  });

  it('distinguishes shoulder flexion, lateral abduction and overhead elbow extension', () => {
    const front = pose('front_raise', .5), lateral = pose('lateral_raise', .5), press = pose('shoulder_press', .5);
    expect(front[5][2] - front[3][2]).toBeGreaterThan(.40);
    expect(Math.abs(lateral[5][0]) - Math.abs(lateral[3][0])).toBeGreaterThan(.40);
    expect(Math.abs(front[5][0] - front[3][0])).toBeLessThan(.02);
    expect(press[5][1]).toBeGreaterThan(press[2][1] + .10);
    const folded = pose('triceps_extension', 0), extended = pose('triceps_extension', .5);
    expect(folded[4]).toEqual(extended[4]);
    expect(angle(folded[3], folded[4], folded[5])).toBeLessThan(75);
    expect(angle(extended[3], extended[4], extended[5])).toBeGreaterThan(170);
  });

  it('keeps a level grip across actual barbell hands and shows a fixed hinged row torso', () => {
    for (const id of ['barbell_rdl', 'barbell_squat', 'barbell_bench_press']) for (const t of phases) {
      const joints = pose(id, t);
      expect(joints[5][1]).toBeCloseTo(joints[8][1], 6);
      expect(joints[5][2]).toBeCloseTo(joints[8][2], 6);
      expect(joints.equipment.bar).toEqual(joints.equipment.handles);
      expect(distance(joints[5], joints[8])).toBeGreaterThan(.45);
    }
    const low = pose('dumbbell_row', 0), row = pose('dumbbell_row', .5);
    expect(row[0]).toEqual(low[0]);
    expect(row[1]).toEqual(low[1]);
    expect(row[5][1]).toBeGreaterThan(low[5][1] + .15);
    expect(row[5][2]).toBeLessThan(low[5][2] - .10);
  });

  it('supports seated machine posture and moves rows toward the torso rather than lifting shoulders', () => {
    for (const id of ['machine_chest_press', 'machine_row', 'cable_row', 'lat_pulldown']) {
      const initial = pose(id, 0);
      for (const t of phases) {
        const joints = pose(id, t);
        for (const index of [0, 1, 2, 11, 14, 15, 16]) expect(joints[index]).toEqual(initial[index]);
        expect(joints.equipment.seat[1]).toBeLessThan(joints[0][1]);
      }
    }
    for (const id of ['machine_row', 'cable_row']) expect(pose(id, .5)[5][2]).toBeLessThan(pose(id, 0)[5][2] - .20);
    expect(pose('machine_chest_press', .5)[5][2]).toBeGreaterThan(pose('machine_chest_press', 0)[5][2] + .20);
    expect(pose('lat_pulldown', .5)[5][1]).toBeLessThan(pose('lat_pulldown', 0)[5][1] - .35);
  });

  it('fixes knee pivots while leg-machine pads travel with their actual contact points', () => {
    for (const id of ['leg_extension', 'seated_leg_curl']) {
      const initial = pose(id, 0);
      for (const t of phases) {
        const joints = pose(id, t);
        for (const index of [0, 10, 13]) expect(joints[index]).toEqual(initial[index]);
        expect(joints.equipment.rollers).toEqual([joints[11], joints[14]]);
      }
    }
    expect(angle(pose('leg_extension', 0)[9], pose('leg_extension', 0)[10], pose('leg_extension', 0)[11])).toBeLessThan(95);
    expect(angle(pose('leg_extension', .5)[9], pose('leg_extension', .5)[10], pose('leg_extension', .5)[11])).toBeGreaterThan(160);
    expect(pose('seated_leg_curl', .5)[11][2]).toBeLessThan(pose('seated_leg_curl', 0)[11][2] - .40);
    expect(pose('machine_hip_abduction', .5)[10][0]).toBeGreaterThan(pose('machine_hip_abduction', 0)[10][0] + .16);
  });

  it('keeps bench and floor-press heads, backs and feet supported while arms press vertically', () => {
    for (const id of ['dumbbell_bench_press', 'barbell_bench_press', 'dumbbell_floor_press']) {
      const initial = pose(id, 0);
      for (const t of phases) {
        const joints = pose(id, t);
        for (const index of [0, 1, 2, 11, 14, 15, 16]) expect(joints[index]).toEqual(initial[index]);
        expect(joints[1][1]).toBeCloseTo(joints[0][1], 6);
      }
      expect(pose(id, .5)[5][1]).toBeGreaterThan(initial[5][1] + .25);
      expect(angle(pose(id, .5)[3], pose(id, .5)[4], pose(id, .5)[5])).toBeGreaterThan(140);
    }
    expect(pose('dumbbell_floor_press', 0).equipment.bench).toBeNull();
  });

  it('places support pads beneath the real male/female skin envelope instead of through joint centers', () => {
    for (const sex of ['male', 'female']) {
      const base = Float32Array.from(mesh.profiles[sex], value => value * mesh.scale), weights = bindSurface(base);
      const skinMinimum = (surface, predicate) => weights.reduce((minimum, vertexWeights, i) => predicate(i, vertexWeights) ? Math.min(minimum, surface[i * 3 + 1]) : minimum, Infinity);
      const gluteal = i => base[i * 3 + 1] > .86 && base[i * 3 + 1] < 1.02 && Math.abs(base[i * 3]) < .18 && base[i * 3 + 2] < .045;
      for (const id of ['machine_chest_press', 'leg_extension', 'leg_press', 'stationary_cycle']) {
        const joints = pose(id, 0), surface = deformSurface(base, weights, joints, new Float32Array(base.length), REST, false);
        const seatTop = joints.equipment.seat[1] + .035;
        expect(Math.abs(seatTop - skinMinimum(surface, gluteal)), `${sex}: ${id}`).toBeLessThan(.013);
      }
      for (const id of ['dumbbell_bench_press', 'dumbbell_floor_press']) {
        const joints = pose(id, 0), surface = deformSurface(base, weights, joints, new Float32Array(base.length), REST, false);
        const top = joints.equipment.bench?.top || 0;
        const back = skinMinimum(surface, (_, vertexWeights) => vertexWeights.some(([bone, weight]) => bone === 0 && weight > .8));
        const head = skinMinimum(surface, (_, vertexWeights) => vertexWeights.some(([bone, weight]) => bone === 1 && weight > .8));
        expect(Math.abs(back - top), `${sex}: ${id} back`).toBeLessThan(.025);
        expect(Math.abs(head - top), `${sex}: ${id} head`).toBeLessThan(.025);
      }
    }
  });

  it('closes individual distal fingers and the thumb while preserving wrists, palms and non-hand vertices', () => {
    for (const sex of ['male', 'female']) {
      const base = Float32Array.from(mesh.profiles[sex], value => value * mesh.scale), weights = bindSurface(base);
      const open = gripSurface(base, weights, REST, undefined), closed = gripSurface(base, weights, REST, 'closed');
      const scales = calibrateGripScale(base, weights, REST);
      expect(open).toEqual(base);
      expect(open).not.toBe(base);
      let unchangedProximal = 0, movedFingers = 0;
      for (let i = 0; i < weights.length; i++) {
        const original = new Vector3().fromArray(base, i * 3), result = new Vector3().fromArray(closed, i * 3);
        const hand = weights[i].find(([bone, weight]) => (bone === 12 || bone === 13) && weight >= .5);
        if (!hand) { expect(result).toEqual(original); continue; }
        const side = hand[0] - 12, { wrist, along } = handRestFrame(REST, side);
        const forward = original.clone().sub(v(REST[wrist])).dot(along);
        const handScale = scales[side];
        if (forward < .12 * handScale) { expect(result).toEqual(original); unchangedProximal++; }
        if (forward > .25 * handScale && hand[1] > .85) {
          expect(result.clone().sub(v(REST[wrist])).dot(along)).toBeLessThan(.21 * handScale);
          expect(result.distanceTo(original)).toBeGreaterThan(.04 * handScale);
          movedFingers++;
        }
      }
      expect(unchangedProximal).toBeGreaterThan(5);
      expect(movedFingers).toBeGreaterThan(30);
      expect(closed.every(Number.isFinite)).toBe(true);
    }
  });

  it('keeps the leg-press back fixed and moves the support platform with both feet', () => {
    const initial = pose('leg_press', 0);
    for (const t of phases) {
      const joints = pose('leg_press', t);
      expect(joints[0]).toEqual(initial[0]);
      expect(joints[1]).toEqual(initial[1]);
      const footCenter = joints[11].map((value, i) => (value + joints[14][i] + joints[15][i] + joints[16][i]) / 4);
      const offset = v(joints.equipment.footplate.center).sub(v(footCenter));
      expect(offset.length()).toBeCloseTo(.085, 6);
      expect(offset.dot(v(joints.equipment.footplate.normal))).toBeCloseTo(-.085, 6);
    }
    expect(distance(pose('leg_press', .5)[11], pose('leg_press', .5)[9])).toBeGreaterThan(distance(initial[11], initial[9]) + .15);
  });

  it('uses actual bike pedal circles, opposite crank phases and fixed handle grips', () => {
    const first = pose('stationary_cycle', 0);
    for (const t of phases) {
      const joints = pose('stationary_cycle', t), { pedals, pedalPivot } = joints.equipment;
      for (let i = 0; i < 2; i++) {
        expect(Math.hypot(pedals[i][1] - pedalPivot[1], pedals[i][2] - pedalPivot[2])).toBeCloseTo(.18, 6);
        expect(distance(joints[i === 0 ? 11 : 14], pedals[i])).toBeCloseTo(Math.hypot(.055, .045), 6);
      }
      expect(pedals[0][1] + pedals[1][1]).toBeCloseTo(2 * pedalPivot[1], 6);
      expect(pedals[0][2] + pedals[1][2]).toBeCloseTo(2 * pedalPivot[2], 6);
      expect(joints[5]).toEqual(first[5]);
      expect(joints[8]).toEqual(first[8]);
    }
  });

  it('shows alternate treadmill swing clearance and keeps elliptical feet on their own pedals', () => {
    const treadmill = pose('treadmill_walk', .22);
    expect(treadmill[11][1]).toBeCloseTo(.16, 6);
    expect(treadmill[14][1]).toBeGreaterThan(.20);
    expect(treadmill.equipment.beltY).toBe(.06);
    for (const t of phases) {
      const joints = pose('elliptical', t);
      joints.equipment.pedals.forEach((pedal, i) => expect(distance(joints[i === 0 ? 11 : 14], pedal)).toBeCloseTo(.075, 6));
      expect(joints[11][2] + joints[14][2]).toBeCloseTo(.08, 6);
    }
  });
});
