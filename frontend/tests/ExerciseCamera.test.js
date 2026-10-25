import { describe, expect, it } from 'vitest';
import { PerspectiveCamera, Vector3 } from 'three';
import catalog from '../src/shared/lib/localCatalog.json';
import { BODYWEIGHT_EXERCISES } from '../src/health/components/exercise/bodyweightGuide.js';
import { exerciseCameraPreset, exerciseEnvelope } from '../src/health/components/exercise/exerciseCamera.js';
import { REST, poseJoints } from '../src/health/components/exercise/rig.js';
import { equipmentBounds } from '../src/health/components/exercise/exerciseEquipmentBounds.js';

const cameraFor = (motion, view, aspect, scale = 1, mirror = false) => {
  const preset = exerciseCameraPreset(motion, view, scale, aspect, mirror);
  const camera = new PerspectiveCamera(36, aspect, .05, 100);
  camera.position.set(...preset.position);
  camera.lookAt(...preset.target);
  camera.updateMatrixWorld();
  return camera;
};
const corners = bounds => {
  const points = [];
  if (bounds) for (const x of [bounds.min[0], bounds.max[0]]) for (const y of [bounds.min[1], bounds.max[1]]) for (const z of [bounds.min[2], bounds.max[2]]) points.push([x, y, z]);
  return points;
};

describe('complete exercise-camera framing', () => {
  it('projects all 74 movement and prop envelopes inside each phone view', () => {
    const ids = new Set(catalog.map(exercise => exercise.motion_id));
    expect(ids.size).toBe(74);
    const projected = new Vector3();
    for (const id of ids) {
      const envelope = exerciseEnvelope(id);
      expect(envelope.size.every(value => Number.isFinite(value) && value > 0)).toBe(true);
      for (const aspect of [.8, 1.5, 2, 3.5]) for (const view of ['front', '45', 'side', 'back']) {
        const camera = cameraFor(id, view, aspect);
        let maxX = 0, maxY = 0, nearX = Infinity, farX = -Infinity, nearY = Infinity, farY = -Infinity, maxZ = 0;
        for (let i = 0; i < envelope.points.length; i += 3) {
          projected.fromArray(envelope.points, i).project(camera);
          maxX = Math.max(maxX, Math.abs(projected.x)); maxY = Math.max(maxY, Math.abs(projected.y));
          nearX = Math.min(nearX, projected.x); farX = Math.max(farX, projected.x);
          nearY = Math.min(nearY, projected.y); farY = Math.max(farY, projected.y);
          maxZ = Math.max(maxZ, projected.z);
        }
        expect(maxX, `${id}/${view}/${aspect} horizontal crop`).toBeLessThan(.901);
        expect(maxY, `${id}/${view}/${aspect} vertical crop`).toBeLessThan(.901);
        expect(maxZ, `${id}/${view}/${aspect} camera depth`).toBeLessThan(1);
        expect(Math.max((farX - nearX) / 2, (farY - nearY) / 2), `${id}/${view}/${aspect} excessive blank frame`).toBeGreaterThan(.88);
      }
    }
  });

  it('encloses separately sampled limbs and attachments between cached cycle frames', () => {
    for (const exercise of catalog) {
      const id = exercise.motion_id, envelope = exerciseEnvelope(id);
      const camera = cameraFor(id, '45', .8);
      let outsideMin = 0, outsideMax = 0, maxX = 0, maxY = 0;
      const projected = new Vector3();
      for (let frame = 0; frame < 79; frame++) {
        const joints = poseJoints(id, (frame + .37) / 79, REST);
        const props = equipmentBounds(id, joints, REST, 1);
        for (const point of [...joints, ...(props?.parts || (props ? [props] : [])).flatMap(corners)]) {
          for (let axis = 0; axis < 3; axis++) {
            outsideMin = Math.max(outsideMin, envelope.min[axis] - point[axis]);
            outsideMax = Math.max(outsideMax, point[axis] - envelope.max[axis]);
          }
          projected.fromArray(point).project(camera);
          maxX = Math.max(maxX, Math.abs(projected.x));
          maxY = Math.max(maxY, Math.abs(projected.y));
        }
      }
      expect(outsideMin, `${id} intermediate prop/limb envelope minimum`).toBeLessThanOrEqual(.015);
      expect(outsideMax, `${id} intermediate prop/limb envelope maximum`).toBeLessThanOrEqual(.015);
      expect(maxX, `${id} intermediate prop/limb horizontal`).toBeLessThan(.94);
      expect(maxY, `${id} intermediate prop/limb vertical`).toBeLessThan(.94);
    }
  }, 15000);

  it('retains every existing camera-coaching view and scales with athlete stature', () => {
    for (const guide of Object.values(BODYWEIGHT_EXERCISES)) {
      for (const aspect of [.8, 1.5, 2, 3.5]) for (const view of ['front', '45', 'side']) {
        const camera = cameraFor(guide.motionId, view, aspect);
        for (const phase of [0, .08, .125, .25, .5, .75]) for (const joint of poseJoints(guide.motionId, phase)) {
          const projected = new Vector3(...joint).project(camera);
          expect(Math.abs(projected.x)).toBeLessThan(1);
          expect(Math.abs(projected.y)).toBeLessThan(1);
        }
      }
    }
    const small = exerciseCameraPreset('lat_pulldown', '45', .8, .8), large = exerciseCameraPreset('lat_pulldown', '45', 1.2, .8);
    for (let axis = 0; axis < 3; axis++) {
      expect(large.position[axis]).toBeCloseTo(small.position[axis] * 1.5, 6);
      expect(large.target[axis]).toBeCloseTo(small.target[axis] * 1.5, 6);
    }
  });

  it('includes the real wall, rail, tall tower, and bench extents', () => {
    expect(exerciseEnvelope('wall_push').max[1]).toBeGreaterThanOrEqual(1.8);
    expect(exerciseEnvelope('calf').max[0]).toBeGreaterThan(.58);
    expect(exerciseEnvelope('lat_pulldown').max[1]).toBeGreaterThanOrEqual(2.05);
    expect(exerciseEnvelope('leg_press').max[2]).toBeGreaterThanOrEqual(1.10);
    expect(exerciseEnvelope('barbell_bench_press').min[2]).toBeLessThan(-.63);
  });

  it('fits mirrored side supports and floor poses with the same camera angle', () => {
    const point = new Vector3();
    for (const id of ['clamshell', 'knee_side_plank', 'single_bridge', 'calf', 'single_calf', 'cable_pallof']) {
      for (const view of ['front', '45', 'side', 'back']) {
        const camera = cameraFor(id, view, .8, 1, true), envelope = exerciseEnvelope(id);
        let maxX = 0, maxY = 0;
        for (let index = 0; index < envelope.points.length; index += 3) {
          point.fromArray(envelope.points, index); point.x *= -1; point.project(camera);
          maxX = Math.max(maxX, Math.abs(point.x)); maxY = Math.max(maxY, Math.abs(point.y));
        }
        expect(maxX, `${id}/${view} mirrored crop`).toBeLessThan(.901);
        expect(maxY, `${id}/${view} mirrored crop`).toBeLessThan(.901);
      }
    }
    const low = exerciseCameraPreset('bridge', '45'), overhead = exerciseCameraPreset('prone_y', '45');
    const pitch = preset => Math.atan2(preset.position[1] - preset.target[1], Math.hypot(preset.position[0] - preset.target[0], preset.position[2] - preset.target[2]));
    expect(pitch(overhead)).toBeGreaterThan(pitch(low) + .20);
  });
});
