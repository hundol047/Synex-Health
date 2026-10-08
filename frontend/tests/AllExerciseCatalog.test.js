import { describe, expect, it, vi } from 'vitest';
import { Quaternion, Vector3 } from 'three';
import catalog from '../src/shared/lib/localCatalog.json';
import mesh from '../src/health/components/body3d/assets/human-mesh.json';
import { personalizedVertices, sportswear } from '../src/health/components/body3d/avatar.js';
import { BODYWEIGHT_EXERCISES } from '../src/health/components/exercise/bodyweightGuide.js';
import { STANDING_CATALOG_IDS } from '../src/health/components/exercise/standingCatalogRig.js';
import { FLOOR_CATALOG_IDS } from '../src/health/components/exercise/floorCatalogRig.js';
import { EQUIPMENT_CATALOG_IDS } from '../src/health/components/exercise/equipmentCatalogRig.js';
import { BONES, REST, bindSurface, deformSurface, poseJoints } from '../src/health/components/exercise/rig.js';
import { MOTIONS, samplePose } from '../src/health/components/exercise/motions.js';
import { MOTION_GUIDES, getMotionGuide, motionPhase } from '../src/health/components/exercise/motionGuide.js';
import { exerciseAvatarGeometry, exerciseMaterials } from '../src/health/components/exercise/exerciseAppearance.js';
import { gripSurface, handRestFrame } from '../src/health/components/exercise/exerciseGrip.js';

vi.mock('../src/health/components/exercise/motions.js', async importOriginal => {
  const actual = await importOriginal();
  return { ...actual, samplePose: vi.fn(actual.samplePose) };
});

const v = point => new Vector3(...point);
const ids = catalog.map(exercise => exercise.motion_id);
const originalIds = Object.values(BODYWEIGHT_EXERCISES).map(guide => guide.motionId);
const phases = [0, .04, .08, .16, .25, .43, .5, .57, .75, .84, .94, .99, 1];
const distance = (a, b) => v(a).distanceTo(v(b));

describe('complete authored exercise catalog', () => {
  it('covers exactly 74 distinct exercises without overlapping controller families or 2D-only entries', () => {
    const families = [originalIds, [...STANDING_CATALOG_IDS], [...FLOOR_CATALOG_IDS], [...EQUIPMENT_CATALOG_IDS]];
    expect(families.map(family => family.length)).toEqual([7, 26, 9, 32]);
    const authored = families.flat();
    expect(ids).toHaveLength(74);
    expect(new Set(ids).size).toBe(74);
    expect(new Set(authored).size).toBe(authored.length);
    expect(authored.slice().sort()).toEqual(ids.slice().sort());
    expect(Object.keys(MOTIONS).sort()).toEqual(ids.slice().sort());
    for (const id of ids) expect(MOTIONS[id].twoDimensionalOnly, `${id} must open in 3D`).not.toBe(true);
    expect(catalog.filter(exercise => exercise.training_type === 'equipment').map(exercise => exercise.motion_id).sort()).toEqual([...EQUIPMENT_CATALOG_IDS].sort());
  });

  it('keeps all 19 joints finite, anatomical segment lengths constant and repetition boundaries continuous', () => {
    samplePose.mockClear();
    for (const id of ids) {
      for (const phase of phases) {
        const joints = poseJoints(id, phase);
        expect(joints, `${id} at ${phase}`).toHaveLength(19);
        expect(joints.every(point => point.length === 3 && point.every(Number.isFinite)), `${id} finite joints at ${phase}`).toBe(true);
        for (const [a, b] of BONES) expect(distance(joints[a], joints[b]), `${id} ${a}→${b} at ${phase}`).toBeCloseTo(distance(REST[a], REST[b]), 6);
        for (const [bone, rotation] of Object.entries(joints.boneRotations || {})) {
          expect(Number(bone), `${id} bone index`).toBeGreaterThanOrEqual(0);
          expect(Number(bone), `${id} bone index`).toBeLessThan(BONES.length);
          expect(rotation, `${id} quaternion`).toHaveLength(4);
          expect(rotation.every(Number.isFinite), `${id} finite quaternion`).toBe(true);
          expect(Math.hypot(...rotation), `${id} normalized quaternion`).toBeCloseTo(1, 6);
          const [root, end] = BONES[bone];
          const restDirection = Number(bone) < 2 ? new Vector3(0, 1, 0) : v(REST[end]).sub(v(REST[root])).normalize();
          const posedDirection = v(joints[end]).sub(v(joints[root])).normalize();
          expect(restDirection.applyQuaternion(new Quaternion().fromArray(rotation)).distanceTo(posedDirection), `${id} skin orientation follows bone ${bone}`).toBeLessThan(.025);
        }
      }
      const first = poseJoints(id, 0), last = poseJoints(id, 1);
      for (let joint = 0; joint < 19; joint++) expect(distance(first[joint], last[joint]), `${id} loop joint ${joint}`).toBeLessThan(1e-6);
      for (const boundary of [.08, .25, .43, .5, .57, .75, .94, 1]) {
        const before = poseJoints(id, boundary - .00001), after = poseJoints(id, boundary);
        for (let joint = 0; joint < 19; joint++) expect(distance(before[joint], after[joint]), `${id} continuity at ${boundary}, joint ${joint}`).toBeLessThan(.001);
      }
    }
    // The legacy 2D retarget must never silently become a catalog controller.
    expect(samplePose).not.toHaveBeenCalled();
  });

  it('retains axial body orientation through skinning rather than turning only the arms', () => {
    const source = new Float32Array([0, REST[0][1] + .25, REST[0][2] + .12]);
    const turned = poseJoints('thoracic_rotation', .25);
    const expected = v(Array.from(source)).sub(v(REST[0])).applyQuaternion(new Quaternion().fromArray(turned.boneRotations[0])).add(v(turned[0]));
    const surface = deformSurface(source, [[[0, 1]]], turned, new Float32Array(3), REST, false);
    expect(distance(Array.from(surface), expected.toArray())).toBeLessThan(1e-6);
    expect(surface[0]).toBeGreaterThan(.04);
    for (const id of ['clamshell', 'knee_side_plank']) {
      const joints = poseJoints(id, .5);
      const forward = new Vector3(0, 0, 1).applyQuaternion(new Quaternion().fromArray(joints.boneRotations[0]));
      expect(forward.x, `${id} faces sideways`).toBeGreaterThan(.99);
      expect(Math.abs(forward.y), `${id} must not lie face up`).toBeLessThan(.025);
    }
  });

  it('provides matching live equipment anchors for all 32 equipment exercises', () => {
    for (const id of EQUIPMENT_CATALOG_IDS) {
      const localGrips = [];
      for (const phase of [0, .25, .5, .75, 1]) {
        const joints = poseJoints(id, phase), equipment = joints.equipment;
        expect(equipment?.type, `${id} equipment controller`).toBe(id);
        expect(equipment.scale, `${id} equipment scale`).toBeGreaterThan(0);
        expect(equipment.handles, `${id} handles`).toHaveLength(2);
        for (const handle of equipment.handles) {
          expect(handle).toHaveLength(3);
          expect(handle.every(Number.isFinite), `${id} finite palm grip`).toBe(true);
        }
        expect(equipment.grip).toBe('closed');
        expect(equipment.wristAnchors).toEqual([joints[5], joints[8]]);
        for (let side = 0; side < 2; side++) {
          const wrist = side === 0 ? 5 : 8, finger = side === 0 ? 17 : 18;
          const rotation = new Quaternion().fromArray(joints.boneRotations[12 + side]);
          const offset = v(equipment.handles[side]).sub(v(joints[wrist]));
          // Tools belong within the palm, farther down the modeled hand than
          // the proximal rig wrist, and cannot drift as the arm rotates.
          expect(offset.length(), `${id} grip is distal to wrist`).toBeGreaterThan(distance(REST[wrist], REST[finger]) * .65);
          expect(offset.length(), `${id} grip stays inside hand reach`).toBeLessThan(distance(REST[wrist], REST[finger]));
          const local = offset.applyQuaternion(rotation.invert()).toArray();
          if (phase === 0) localGrips[side] = local;
          else expect(distance(local, localGrips[side]), `${id} rigid palm grip at ${phase}`).toBeLessThan(1e-6);
        }
        expect(equipment.gripAxes).toHaveLength(2);
        for (const axis of equipment.gripAxes) {
          expect(axis.every(Number.isFinite)).toBe(true);
          expect(Math.hypot(...axis)).toBeCloseTo(1, 6);
        }
        if (id.startsWith('barbell_') || id === 'lat_pulldown') expect(equipment.bar).toEqual(equipment.handles);
      }
    }
  });

  it('uses unique catalog names and concrete movement guidance instead of generic filler', () => {
    expect(Object.keys(MOTION_GUIDES).sort()).toEqual(ids.slice().sort());
    expect(new Set(Object.values(MOTION_GUIDES).map(guide => guide.name)).size).toBe(74);
    for (const exercise of catalog) {
      const guide = getMotionGuide(exercise.motion_id);
      expect(guide.name).toBe(exercise.name);
      expect(guide.durationMs).toBeGreaterThanOrEqual(2000);
      expect(Number.isFinite(guide.durationMs)).toBe(true);
      expect(['hold', 'cyclic', 'alternating', 'reps']).toContain(guide.kind);
      for (const phase of guide.phases) {
        expect(phase.label.trim()).toBeTruthy();
        expect(phase.cue.trim()).toBeTruthy();
        expect(phase.label).not.toBe('천천히 움직이기');
      }
    }
    const actions = { squat: '앉기', reverse_lunge: '뒤로 딛고', wall_push: '벽 쪽', bird_dog: '반대 팔·다리', clamshell: '무릎 열기', curl: '팔꿈치 굽히기', front_raise: '앞으로', lateral_raise: '옆으로', leg_press: '발판', leg_extension: '무릎 펴기', stationary_cycle: '페달' };
    for (const [id, action] of Object.entries(actions)) expect(motionPhase(id, .2).label, `${id} action`).toContain(action);
    for (const id of ['plank', 'wall_sit', 'knee_side_plank']) {
      expect(getMotionGuide(id).kind).toBe('hold');
      expect(motionPhase(id, .05).label).toBe(motionPhase(id, .95).label);
      expect(motionPhase(id, .05).cue).toBe(motionPhase(id, .95).cue);
    }
    expect(catalog.find(exercise => exercise.motion_id === 'calf').category).toBe('Legs');
  });
});

describe('offline exercise appearance', () => {
  it('gives unsupported hands a gentle finger curl while preserving wrists, palms and the rest of the body', () => {
    const base = Float32Array.from(mesh.profiles.male, value => value * mesh.scale), saved = base.slice();
    const weights = bindSurface(base), relaxed = gripSurface(base, weights, REST, 'relaxed'), closed = gripSurface(base, weights, REST, 'closed');
    const changes = [0, 0], extents = [[0, 0, 0], [0, 0, 0]];
    const frames = [0, 1].map(side => ({ ...handRestFrame(REST, side), origin: v(REST[side === 0 ? 5 : 8]) }));
    let movedSupports = 0;
    for (let index = 0; index < weights.length; index++) {
      const point = v(Array.from(base.slice(index * 3, index * 3 + 3))), next = v(Array.from(relaxed.slice(index * 3, index * 3 + 3)));
      const hand = weights[index].find(([bone, influence]) => (bone === 12 || bone === 13) && influence >= .5);
      if (!hand) { if (point.distanceTo(next) > 1e-8) movedSupports++; continue; }
      const side = hand[0] - 12, frame = frames[side], along = point.clone().sub(frame.origin).dot(frame.along);
      if (along <= .125 && point.distanceTo(next) > 1e-8) movedSupports++;
      if (point.distanceTo(next) > .005) changes[side]++;
      [base, relaxed, closed].forEach((surface, state) => {
        extents[side][state] = Math.max(extents[side][state], v(Array.from(surface.slice(index * 3, index * 3 + 3))).sub(frame.origin).dot(frame.along));
      });
    }
    expect(movedSupports).toBe(0);
    expect(base).toEqual(saved);
    for (let side = 0; side < 2; side++) {
      expect(changes[side]).toBeGreaterThan(10);
      expect(extents[side][1]).toBeLessThan(extents[side][0] - .005);
      expect(extents[side][1]).toBeGreaterThan(extents[side][2] + .005);
    }
  });

  it('closes modeled equipment fingers while preserving open support palms and every non-hand vertex', () => {
    const base = Float32Array.from(mesh.profiles.male, value => value * mesh.scale), saved = base.slice();
    const weights = bindSurface(base), closed = gripSurface(base, weights, REST, 'closed');
    expect(closed).toHaveLength(base.length);
    expect(Array.from(closed).every(Number.isFinite)).toBe(true);
    expect(base).toEqual(saved);
    expect(gripSurface(base, weights, REST, undefined)).toEqual(base);
    const changed = [0, 0];
    for (let index = 0; index < weights.length; index++) {
      const point = Array.from(base.slice(index * 3, index * 3 + 3)), next = Array.from(closed.slice(index * 3, index * 3 + 3));
      const hand = weights[index].find(([bone, influence]) => (bone === 12 || bone === 13) && influence >= .5);
      if (!hand) expect(next).toEqual(point);
      else if (distance(point, next) > .03) changed[hand[0] - 12]++;
    }
    expect(changed[0], 'right modeled fingers visibly close').toBeGreaterThan(10);
    expect(changed[1], 'left modeled fingers visibly close').toBeGreaterThan(10);
  });

  it('retains the full human topology, finite UVs and separate matte hair across body profiles', () => {
    const originalFaces = [];
    for (let index = 0; index < mesh.indices.length; index += 3) originalFaces.push(mesh.indices.slice(index, index + 3).join(','));
    originalFaces.sort();
    for (const gender of ['male', 'female']) {
      const measurement = { height: 178, weight: 70, body_fat_percentage: 20, skeletal_muscle_mass: 32 };
      const wear = sportswear(personalizedVertices(measurement, { gender }), 1, gender);
      const geometry = exerciseAvatarGeometry(wear);
      try {
        expect(geometry.attributes.position.count).toBe(mesh.profiles[gender].length / 3);
        expect(geometry.index.count).toBe(mesh.indices.length);
        const rendered = Array.from(geometry.index.array);
        const faces = [];
        for (let index = 0; index < rendered.length; index += 3) faces.push(rendered.slice(index, index + 3).join(','));
        expect(faces.sort()).toEqual(originalFaces);
        expect(geometry.attributes.uv.count).toBe(geometry.attributes.position.count);
        for (const attribute of ['position', 'normal', 'color', 'uv']) expect(Array.from(geometry.attributes[attribute].array).every(Number.isFinite), `${gender} ${attribute}`).toBe(true);
        expect(geometry.groups.map(group => group.materialIndex)).toEqual([0, 1, 2, 3, 4]);
        expect(geometry.groups[4].count, `${gender} hair material`).toBeGreaterThan(0);
        let start = 0;
        for (const group of geometry.groups) {
          expect(group.start).toBe(start);
          expect(group.count % 3).toBe(0);
          start += group.count;
        }
        expect(start).toBe(geometry.index.count);
      } finally { geometry.dispose(); }
    }
  });

  it('shares one local fabric texture per athlete and disposes without invalidating another athlete', () => {
    const first = exerciseMaterials(), second = exerciseMaterials();
    const firstFabric = first.materials[1].normalMap, secondFabric = second.materials[1].normalMap;
    expect(first.materials).toHaveLength(5);
    expect(first.materials[2].normalMap).toBe(firstFabric);
    expect(firstFabric.isDataTexture).toBe(true);
    expect(firstFabric.image.data).toBeInstanceOf(Uint8Array);
    expect(firstFabric.image.data.length).toBe(firstFabric.image.width * firstFabric.image.height * 4);
    expect(firstFabric).not.toBe(secondFabric);
    expect(first.materials[4].roughness).toBeGreaterThan(first.materials[0].roughness);
    const materialDisposals = first.materials.map(() => vi.fn()), firstTextureDisposal = vi.fn(), secondTextureDisposal = vi.fn();
    first.materials.forEach((material, index) => material.addEventListener('dispose', materialDisposals[index]));
    firstFabric.addEventListener('dispose', firstTextureDisposal);
    secondFabric.addEventListener('dispose', secondTextureDisposal);
    first.dispose();
    materialDisposals.forEach(disposal => expect(disposal).toHaveBeenCalledTimes(1));
    expect(firstTextureDisposal).toHaveBeenCalledTimes(1);
    expect(secondTextureDisposal).not.toHaveBeenCalled();
    second.dispose();
    expect(secondTextureDisposal).toHaveBeenCalledTimes(1);
  });
});
