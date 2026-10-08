import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { personalizedVertices, sportswear } from '../src/health/components/body3d/avatar.js';
import { footwearAnchors } from '../src/health/components/body3d/Footwear.jsx';
import { morphPositions } from '../src/health/components/body3d/morph.js';
import { bindSurface, deformSurface, REST } from '../src/health/components/exercise/rig.js';
import { standingCatalogPose } from '../src/health/components/exercise/standingCatalogRig.js';
import { equipmentBounds } from '../src/health/components/exercise/exerciseEquipmentBounds.js';
import { calibrateWallSupport, WALL_SUPPORTED_MOTIONS } from '../src/health/components/exercise/wallSupportCalibration.js';

function avatar(gender, scale = 1) {
  const profile = gender ? { gender } : {}, measurement = { height: 178 * scale };
  const neutral = personalizedVertices({ height: 178, weight: 70, body_fat_percentage: 20, skeletal_muscle_mass: 32 }, { gender });
  const base = personalizedVertices(measurement, profile), weights = bindSurface(neutral);
  const clothing = sportswear(base, scale, gender).positions;
  const flat = morphPositions(Float32Array.from(REST.flat()), measurement, profile);
  const rest = REST.map((_, index) => Array.from(flat.slice(index * 3, index * 3 + 3)));
  rest.wallSupport = calibrateWallSupport(clothing, weights, rest);
  return { base: clothing, weights, rest, shoes: footwearAnchors(base) };
}

describe('stationary walls fitted to the actual clothed skin', () => {
  for (const gender of ['male', 'female', undefined]) {
    it(`keeps every skin, hair, clothing, and foot vertex on the body side for ${gender || 'mixed'} avatars`, () => {
      for (const scale of [.82, 1, 1.14]) {
        const { base, weights, rest, shoes } = avatar(gender, scale), target = new Float32Array(base.length);
        for (const motion of WALL_SUPPORTED_MOTIONS) {
          const rear = motion === 'wall_hinge' || motion === 'wall_sit';
          let fixedPlane, closestContact = Infinity, maximumGap = 0;
          for (let frame = 0; frame <= 80; frame++) {
            const progress = frame / 80, pose = standingCatalogPose(motion, progress, rest);
            const plane = pose.equipment.wallZ;
            if (fixedPlane != null) expect(plane).toBe(fixedPlane);
            fixedPlane = plane;
            deformSurface(base, weights, pose, target, rest, false);
            let minimumClearance = Infinity, headClearance = Infinity;
            for (let vertex = 0; vertex < weights.length; vertex++) {
              const clearance = rear ? target[vertex * 3 + 2] - plane : plane - target[vertex * 3 + 2];
              minimumClearance = Math.min(minimumClearance, clearance);
              if (weights[vertex].some(([bone, weight]) => bone === 1 && weight > .8)) headClearance = Math.min(headClearance, clearance);
            }
            expect(minimumClearance, `${motion}/${scale}/${progress} entire surface clears wall`).toBeGreaterThan(.0008);
            shoes.forEach((shoe, index) => {
              const [ankle, toe] = index === 0 ? [11, 15] : [14, 16];
              const source = new THREE.Vector3(...rest[ankle]), destination = new THREE.Vector3(...pose[ankle]);
              const rotation = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(...rest[toe]).sub(source).normalize(), new THREE.Vector3(...pose[toe]).sub(destination).normalize());
              const center = new THREE.Vector3(...shoe.center).sub(source).applyQuaternion(rotation).add(destination);
              const x = new THREE.Vector3(1, 0, 0).applyQuaternion(rotation).z;
              const y = new THREE.Vector3(0, 1, 0).applyQuaternion(rotation).z;
              const z = new THREE.Vector3(0, 0, 1).applyQuaternion(rotation).z;
              const upper = Math.abs(z) * shoe.length / 4 + Math.hypot(x * shoe.width / 2, y * .037, z * shoe.length / 4);
              const sole = Math.abs(z) * shoe.length * .255 + Math.hypot(x * shoe.width * .52, y * .012, z * shoe.length * .255);
              const edge = rear ? Math.min(center.z - upper, center.z - .025 * y - sole) : Math.max(center.z + upper, center.z - .025 * y + sole);
              expect(rear ? edge - plane : plane - edge, `${motion}/${scale}/${progress} actual rounded shoe clears wall`).toBeGreaterThan(.01);
            });
            closestContact = Math.min(closestContact, minimumClearance);
            maximumGap = Math.max(maximumGap, minimumClearance);
            if (motion === 'wall_push' || motion === 'close_wall_push') {
              expect(headClearance, `${motion}/${scale}/${progress} forehead stays behind palms`).toBeGreaterThan(.015);
            }
          }
          expect(closestContact, `${motion}/${scale} touches its support`).toBeLessThan(.0012);
          if (!rear) expect(maximumGap, `${motion}/${scale} hands retain contact throughout`).toBeLessThan(.027);
        }
      }
    }, 60000);
  }

  it('places the entire glass slab beyond the fitted contact face for both wall directions', () => {
    const { rest } = avatar();
    for (const motion of WALL_SUPPORTED_MOTIONS) {
      const pose = standingCatalogPose(motion, .5, rest), part = equipmentBounds(motion, pose, rest).parts[0];
      const rear = motion === 'wall_hinge' || motion === 'wall_sit';
      expect(rear ? part.max[2] : part.min[2]).toBeCloseTo(pose.equipment.wallZ, 8);
      expect(part.max[2] - part.min[2]).toBeCloseTo(.028, 8);
    }
  });

  it('fits each support lazily once and retains its result without mutating source anatomy', () => {
    const { base, weights, rest } = avatar(), positions = base.slice(), joints = rest.map(point => point.slice());
    const getter = Object.getOwnPropertyDescriptor(rest.wallSupport, 'wall_push').get;
    const first = getter(), second = getter();
    expect(first).toBe(second);
    expect(base).toEqual(positions);
    expect(rest.map(point => point.slice())).toEqual(joints);
    expect(rest.wallSupport.wall_sit.surfaceZ).not.toBe(first.surfaceZ);
  });
});
