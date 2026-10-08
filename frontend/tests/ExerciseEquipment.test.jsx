import { describe, expect, it } from 'vitest';
import { equipmentDescriptor, EQUIPMENT_BY_MOTION } from '../src/health/components/exercise/ExerciseEquipment.jsx';
import { equipmentCatalogPose, EQUIPMENT_CATALOG_IDS } from '../src/health/components/exercise/equipmentCatalogRig.js';
import { REST } from '../src/health/components/exercise/rig.js';
import { equipmentBounds } from '../src/health/components/exercise/exerciseEquipmentBounds.js';

describe('authored exercise equipment contacts', () => {
  it('provides a specific equipment type for every equipment exercise', () => {
    expect(EQUIPMENT_CATALOG_IDS.size).toBe(32);
    for (const id of EQUIPMENT_CATALOG_IDS) {
      expect(EQUIPMENT_BY_MOTION[id], id).toBeTruthy();
      const pose = equipmentCatalogPose(id, .4, REST);
      const descriptor = equipmentDescriptor(id, pose, REST);
      expect(descriptor.kind, id).toBe(EQUIPMENT_BY_MOTION[id]);
      expect(descriptor.h).toBeCloseTo(1);
      expect(descriptor.handles).toEqual(pose.equipment.handles);
    }
  });

  it('keeps supported presses, calf raises and leg machines free of inferred dumbbells', () => {
    for (const id of ['machine_chest_press', 'leg_press', 'leg_extension', 'seated_leg_curl', 'machine_hip_abduction', 'calf', 'seated_calf', 'wall_push']) {
      expect(equipmentDescriptor(id, [], REST).kind).not.toBe('dumbbell');
    }
    expect(equipmentDescriptor('unknown_press', [], REST).kind).toBeUndefined();
  });

  it('preserves stationary support planes and phase-specific grip and pedal anchors', () => {
    for (const id of ['dumbbell_bench_press', 'barbell_bench_press', 'machine_chest_press', 'stationary_cycle']) {
      const start = equipmentCatalogPose(id, 0, REST);
      const middle = equipmentCatalogPose(id, .4, REST);
      const a = equipmentDescriptor(id, start, REST), b = equipmentDescriptor(id, middle, REST);
      if (start.equipment.bench) expect(a.bench).toEqual(b.bench);
      if (start.equipment.seat) expect(a.seat).toEqual(b.seat);
      expect(b.handles).toEqual(middle.equipment.handles);
      if (id === 'stationary_cycle') {
        expect(a.pedalPivot).toEqual(b.pedalPivot);
        expect(a.pedals).not.toEqual(b.pedals);
      }
    }
  });

  it('uses world-scale and exact wall/chair anchors supplied by the support rig', () => {
    const joints = REST.map(p => p.map(v => v * .9));
    joints.equipment = { kind: 'chair', heightScale: .9, seatCenter: [0, .387, -.054] };
    expect(equipmentDescriptor('march', joints, REST).seat).toEqual([0, .387, -.054]);
    expect(equipmentDescriptor('march', joints, REST).h).toBe(.9);
    joints.equipment = { kind: 'wall', heightScale: .9, wallZ: .549 };
    expect(equipmentDescriptor('wall_push', joints, REST).wallZ).toBe(.549);
  });

  it('honors palm grip anchors separately from anatomical wrist anchors', () => {
    const joints = REST.map(p => p.slice());
    joints.equipment = { type: 'curl', handles: [[.4, 1.1, .2], [-.4, 1.1, .2]], wristAnchors: [joints[5], joints[8]] };
    expect(equipmentDescriptor('curl', joints, REST).handles).toEqual(joints.equipment.handles);
    expect(equipmentDescriptor('curl', joints, REST).hands).toEqual([joints[5], joints[8]]);
  });

  it('bounds every moving equipment cycle at different statures without NaN or an unrelated generic box', () => {
    for (const scale of [.82, 1, 1.12]) for (const id of EQUIPMENT_CATALOG_IDS) for (const phase of [0, .13, .31, .5, .77, 1]) {
      const rest = REST.map(p => p.map(v => v * scale));
      const joints = equipmentCatalogPose(id, phase, rest);
      const bounds = equipmentBounds(id, joints, rest, scale);
      expect(bounds, `${id}/${phase}`).toBeTruthy();
      expect([...bounds.min, ...bounds.max].every(Number.isFinite)).toBe(true);
      for (let axis = 0; axis < 3; axis++) expect(bounds.max[axis]).toBeGreaterThan(bounds.min[axis]);
      expect(bounds.parts.length).toBeGreaterThan(0);
      for (const part of bounds.parts) for (let axis = 0; axis < 3; axis++) {
        expect(part.min[axis]).toBeGreaterThanOrEqual(bounds.min[axis] - 1e-8);
        expect(part.max[axis]).toBeLessThanOrEqual(bounds.max[axis] + 1e-8);
      }
    }
    expect(equipmentBounds('squat', REST, REST)).toBeNull();
    const dumbbells = equipmentBounds('curl', equipmentCatalogPose('curl', .2, REST), REST);
    expect(dumbbells.max[1] - dumbbells.min[1]).toBeLessThan(.6);
  });
});
