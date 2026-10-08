import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { BONES, REST } from '../src/health/components/exercise/rig.js';
import { bindSurface, deformSurface } from '../src/health/components/exercise/rig.js';
import mesh from '../src/health/components/body3d/assets/human-mesh.json';
import { personalizedVertices, sportswear } from '../src/health/components/body3d/avatar.js';
import { morphPositions } from '../src/health/components/body3d/morph.js';
import { standingCatalogPose as pose, STANDING_CATALOG_IDS } from '../src/health/components/exercise/standingCatalogRig.js';

const distance = (a, b) => Math.hypot(...a.map((value, index) => value - b[index]));
const frames = Array.from({ length: 81 }, (_, i) => i / 80);
const expectFixed = (id, indices) => {
  const first = pose(id, 0, REST);
  for (const t of frames) {
    const current = pose(id, t, REST);
    for (const index of indices) expect(distance(first[index], current[index]), `${id} joint ${index} at ${t}`).toBeLessThan(1e-8);
  }
};

describe('standing and chair catalog anatomy', () => {
  it('retains every segment length and a closed loop across different statures', () => {
    expect(STANDING_CATALOG_IDS.size).toBe(26);
    for (const scale of [.82, 1, 1.14]) {
      const rest = REST.map(p => p.map(value => value * scale));
      for (const id of STANDING_CATALOG_IDS) {
        for (const t of frames) {
          const joints = pose(id, t, rest);
          expect(joints).toHaveLength(19);
          for (const [a, b] of BONES) {
            expect(Math.abs(distance(joints[a], joints[b]) - distance(rest[a], rest[b])), `${id} bone ${a}:${b} at ${t}`).toBeLessThan(1e-8);
          }
          expect(Math.min(...[11, 14, 15, 16].map(index => joints[index][1])), `${id} foot-floor at ${t}`).toBeGreaterThan(.015 * scale);
        }
        const first = pose(id, 0, rest), last = pose(id, 1, rest);
        expect(Math.max(...first.map((p, i) => distance(p, last[i]))), `${id} loop`).toBeLessThan(1e-8);
      }
    }
    expect(pose('not_in_catalog', .5, REST)).toBeNull();
  });

  it('plants hand and foot supports throughout wall, bench, and stretch motion', () => {
    for (const id of ['wall_push', 'close_wall_push', 'incline_push', 'calf_stretch']) {
      expectFixed(id, [5, 8, 11, 14, 15, 16, 17, 18]);
      const start = pose(id, 0, REST), bottom = pose(id, .5, REST);
      expect(distance(start[1], bottom[1])).toBeGreaterThan(id === 'calf_stretch' ? .02 : .035);
      const contacts = bottom.equipment.contactPoints;
      expect(distance(contacts[0], bottom[5])).toBeLessThan(1e-8);
      expect(distance(contacts[1], bottom[8])).toBeLessThan(1e-8);
    }
  });

  it('faces actual hand surfaces toward the wall while keeping fingertips upright', () => {
    for (const gender of ['male', 'female']) {
      const base = Float32Array.from(mesh.profiles[gender], value => value * mesh.scale), weights = bindSurface(base);
      for (const id of ['wall_push', 'close_wall_push', 'calf_stretch']) for (const t of [0, .5]) {
        const current = pose(id, t, REST), surface = deformSurface(base, weights, current, new Float32Array(base.length), REST, false);
        for (const [bone, wrist, finger] of [[12, 5, 17], [13, 8, 18]]) {
          let closest = -Infinity;
          for (let index = 0; index < weights.length; index++) if (weights[index].some(([b, weight]) => b === bone && weight > .8)) closest = Math.max(closest, surface[index * 3 + 2]);
          expect(closest - current.equipment.wallZ, `${gender}/${id} palm penetration`).toBeLessThan(.025);
          expect(current.equipment.wallZ - closest, `${gender}/${id} palm gap`).toBeLessThan(.025);
          expect(current[finger][1] - current[wrist][1]).toBeGreaterThan(.2);
          const handDirection = new THREE.Vector3(...REST[finger]).sub(new THREE.Vector3(...REST[wrist])).normalize().applyQuaternion(new THREE.Quaternion().fromArray(current.boneRotations[bone]));
          expect(handDirection.angleTo(new THREE.Vector3(0, 1, 0))).toBeLessThan(1e-6);
        }
      }
    }
  });

  it('keeps step-touch arms continuous through every foot-gather boundary', () => {
    for (const boundary of [.25, .5, .75]) {
      const before = pose('step_touch', boundary - .00001, REST), after = pose('step_touch', boundary + .00001, REST);
      expect(Math.max(...before.map((point, index) => distance(point, after[index])))).toBeLessThan(.001);
    }
  });

  it('counter-swings each walking hand against its leg throughout the full stride', () => {
    for (const scale of [.82, 1, 1.14]) {
      const rest = REST.map(point => point.map(value => value * scale));
      for (const id of ['walk', 'brisk_walk']) for (let frame = 0; frame <= 120; frame++) {
        const current = pose(id, frame / 120, rest);
        const neutralHand = (id === 'brisk_walk' ? .12 : .03) * scale;
        for (const [shoulder, wrist, ankle] of [[3, 5, 11], [6, 8, 14]]) {
          const stride = current[ankle][2] - rest[ankle][2];
          const counterSwing = current[wrist][2] - current[shoulder][2] - neutralHand;
          expect(stride * counterSwing, `${id}/${scale}/${frame} arm-leg opposition`).toBeLessThanOrEqual(1e-10);
          if (Math.abs(stride) > .05 * scale) expect(Math.abs(counterSwing), `${id} visible counter-swing`).toBeGreaterThan(.02 * scale);
        }
      }
    }
  });

  it('lands and lifts walking ankles smoothly while preserving the full swing clearance', () => {
    const epsilon = .00001;
    const wrap = phase => ((phase % 1) + 1) % 1;
    for (const id of ['walk', 'brisk_walk']) {
      for (const [ankle, peak] of [[11, .25], [14, .75]]) {
        expect(pose(id, peak, REST)[ankle][1] - REST[ankle][1], `${id} peak foot clearance`).toBeCloseTo(.075, 8);
        for (const contact of [0, .5, 1]) {
          const middle = pose(id, wrap(contact), REST)[ankle][1];
          const before = pose(id, wrap(contact - epsilon), REST)[ankle][1];
          const after = pose(id, wrap(contact + epsilon), REST)[ankle][1];
          expect(Math.abs(middle - before) / epsilon, `${id}/${ankle} smooth contact approach`).toBeLessThan(.0001);
          expect(Math.abs(after - middle) / epsilon, `${id}/${ankle} smooth contact departure`).toBeLessThan(.0001);
        }
      }
    }
  });

  it('keeps the shoulder, hip, and ankles aligned during supported presses', () => {
    for (const id of ['wall_push', 'close_wall_push', 'incline_push']) {
      for (const t of frames) {
        const joints = pose(id, t, REST);
        const ankles = new THREE.Vector3(...joints[11]).add(new THREE.Vector3(...joints[14])).multiplyScalar(.5);
        const lower = new THREE.Vector3(...joints[0]).sub(ankles).normalize();
        const torso = new THREE.Vector3(...joints[1]).sub(new THREE.Vector3(...joints[0])).normalize();
        expect(lower.angleTo(torso), `${id} sagittal alignment at ${t}`).toBeLessThan(.001);
      }
    }
  });

  it('raises the heels around fixed toes and retains a fixed hand support', () => {
    for (const id of ['calf', 'single_calf', 'seated_calf']) {
      expectFixed(id, id === 'single_calf' ? [15] : [15, 16]);
      const initial = pose(id, 0, REST), top = pose(id, .5, REST);
      expect(top[11][1] - initial[11][1]).toBeGreaterThan(.06);
      if (id !== 'seated_calf') expectFixed(id, [5]);
      if (id === 'single_calf') expect(top[14][1]).toBeGreaterThan(.3);
      if (id === 'seated_calf') expectFixed(id, [0, 1, 2]);
    }
  });

  it('uses actual chair height while standing up and does not drag either foot', () => {
    expectFixed('sit_stand', [11, 14, 15, 16]);
    const standing = pose('sit_stand', 0, REST), sitting = pose('sit_stand', .5, REST);
    expect(standing[0][1] - sitting[0][1]).toBeCloseTo(.375, 6);
    expect(sitting[0][1]).toBeGreaterThan(sitting.equipment.seatY + .035);
    expect(distance(standing.equipment.seatCenter, sitting.equipment.seatCenter)).toBe(0);
  });

  it('supports real male, female, and mixed clothed gluteal skin on all five chairs', () => {
    const standard = { height: 178, weight: 70, body_fat_percentage: 20, skeletal_muscle_mass: 32 };
    for (const gender of ['male', 'female', undefined]) {
      const profile = gender ? { gender } : {};
      const neutral = personalizedVertices(standard, profile), base = personalizedVertices({}, profile);
      const weights = bindSurface(neutral), clothing = sportswear(base, 1, gender).positions;
      const flat = morphPositions(Float32Array.from(REST.flat()), {}, profile);
      const rest = REST.map((_, index) => Array.from(flat.slice(index * 3, index * 3 + 3)));
      for (const id of ['sit_stand', 'march', 'ankle_pump', 'hamstring_stretch', 'seated_calf']) {
        let seatPosition;
        for (const t of id === 'sit_stand' ? [.45, .5, .55] : [0, .125, .25, .5, .75]) {
          const current = pose(id, t, rest), surface = deformSurface(clothing, weights, current, new Float32Array(base.length), rest, false);
          let minimum = Infinity, samples = 0;
          for (let vertex = 0; vertex < weights.length; vertex++) {
            const x = base[vertex * 3], y = base[vertex * 3 + 1], z = base[vertex * 3 + 2];
            const insideSeat = Math.abs(surface[vertex * 3]) < .20 && Math.abs(surface[vertex * 3 + 2] - current.equipment.seatCenter[2]) < .20;
            if (y > .86 && y < 1.02 && Math.abs(x) < .18 && z < .045 && insideSeat) {
              minimum = Math.min(minimum, surface[vertex * 3 + 1]); samples++;
            }
          }
          const padTop = current.equipment.seatY + .035;
          expect(samples, `${gender || 'mixed'}/${id} gluteal vertices`).toBeGreaterThan(50);
          expect(Math.abs(padTop - minimum), `${gender || 'mixed'}/${id}/${t} real skin-seat contact`).toBeLessThan(.015);
          if (seatPosition) expect(current.equipment.seatCenter).toEqual(seatPosition);
          seatPosition = current.equipment.seatCenter;
        }
      }
    }
  });

  it('marches alternately from a stable chair without moving the supporting foot', () => {
    expectFixed('march', [0, 1, 2]);
    const right = pose('march', .25, REST), left = pose('march', .75, REST), neutral = pose('march', 0, REST);
    expect(right[11][1] - neutral[11][1]).toBeGreaterThan(.13);
    expect(left[14][1] - neutral[14][1]).toBeGreaterThan(.13);
    expect(right[10][0]).toBeGreaterThan(.05);
    expect(left[13][0]).toBeLessThan(-.05);
    expect(distance(right[14], neutral[14])).toBeLessThan(1e-8);
    expect(distance(left[11], neutral[11])).toBeLessThan(1e-8);
  });

  it('turns the upper body independently of planted hips and feet', () => {
    expectFixed('thoracic_rotation', [0, 9, 10, 11, 12, 13, 14, 15, 16]);
    const turned = pose('thoracic_rotation', .25, REST);
    const front = new THREE.Vector3(0, 0, 1).applyQuaternion(new THREE.Quaternion().fromArray(turned.boneRotations[0]));
    expect(front.x).toBeGreaterThan(.4);
    expect(Math.abs(turned[3][2] - turned[6][2])).toBeGreaterThan(.15);
  });

  it('distinguishes planted split squats, wide squats, and a real reverse step', () => {
    expectFixed('split_squat', [11, 14, 15, 16]);
    expectFixed('split_squat', [5]);
    expectFixed('hip_abduction', [5]);
    expectFixed('sumo_squat', [11, 14, 15, 16]);
    const wide = pose('sumo_squat', .5, REST);
    expect(wide[11][0] - wide[14][0]).toBeGreaterThan(.7);
    expect(wide[10][0]).toBeGreaterThan(wide[9][0]);
    const stepping = pose('reverse_lunge', .075, REST), neutral = pose('reverse_lunge', 0, REST);
    expect(stepping[15][1] - neutral[15][1]).toBeGreaterThan(.025);
    expect(distance(stepping[14], neutral[14])).toBeLessThan(1e-8);
    const landed = pose('reverse_lunge', .2, REST), low = pose('reverse_lunge', .25, REST);
    expect(distance(landed[15], low[15])).toBeLessThan(1e-8);
    expect(landed[15][2]).toBeLessThan(-.25);
  });

  it('steps outward and gathers the trailing foot with floor clearance', () => {
    const initial = pose('step_touch', 0, REST), out = pose('step_touch', .25, REST), gathered = pose('step_touch', .5, REST);
    expect(distance(initial[14], out[14])).toBeLessThan(1e-8);
    expect(out[11][0] - initial[11][0]).toBeGreaterThan(.25);
    expect(gathered[14][0] - initial[14][0]).toBeGreaterThan(.4);
    expect(pose('step_touch', .125, REST)[11][1] - initial[11][1]).toBeGreaterThan(.05);
  });

  it('raises a nearly straight leg to the side without hiking the pelvis', () => {
    const lifted = pose('hip_abduction', .25, REST);
    const thigh = new THREE.Vector3(...lifted[10]).sub(new THREE.Vector3(...lifted[9])).normalize();
    const calf = new THREE.Vector3(...lifted[11]).sub(new THREE.Vector3(...lifted[10])).normalize();
    expect(thigh.angleTo(calf)).toBeLessThan(.12);
    expect(lifted[9][1]).toBeCloseTo(lifted[12][1], 6);
    expect(lifted[11][0] - lifted[9][0]).toBeGreaterThan(.4);
    expect(lifted[11][1]).toBeGreaterThan(.18);
  });

  it('stretches the calf with a nearly straight rear knee and grounded heel', () => {
    for (const t of frames) {
      const current = pose('calf_stretch', t, REST);
      const thigh = new THREE.Vector3(...current[13]).sub(new THREE.Vector3(...current[12])).normalize();
      const calf = new THREE.Vector3(...current[14]).sub(new THREE.Vector3(...current[13])).normalize();
      expect(thigh.angleTo(calf)).toBeLessThan(.36);
      expect(current[14][1]).toBeCloseTo(.10, 6);
    }
  });

  it('keeps wall holds still and makes ankle flexion different from calf raising', () => {
    expectFixed('wall_sit', Array.from({ length: 19 }, (_, i) => i));
    expectFixed('ankle_pump', [0, 1, 2]);
    const ankleStart = pose('ankle_pump', 0, REST), ankleEnd = pose('ankle_pump', .5, REST);
    expect(ankleEnd[15][1] - ankleStart[15][1]).toBeGreaterThan(.08);
    for (const t of frames) {
      const current = pose('ankle_pump', t, REST);
      const rotation = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(...REST[15]).sub(new THREE.Vector3(...REST[11])).normalize(),
        new THREE.Vector3(...current[15]).sub(new THREE.Vector3(...current[11])).normalize(),
      );
      const heel = new THREE.Vector3(0, -.06, -.045).applyQuaternion(rotation).add(new THREE.Vector3(...current[11]));
      expect(distance(heel.toArray(), [.19, .04, .395])).toBeLessThan(1e-8);
    }
    const shoulderStart = pose('shoulder_roll', 0, REST), shoulderTop = pose('shoulder_roll', .5, REST);
    expect(shoulderTop[3][1] - shoulderStart[3][1]).toBeGreaterThan(.06);
    expect(distance(shoulderStart[2], shoulderTop[2])).toBeLessThan(1e-8);
  });
});
