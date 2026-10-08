import * as THREE from 'three';
import { REST, poseJoints } from './rig.js';
import { equipmentBounds } from './exerciseEquipmentBounds.js';

const cache = new Map();
const FLOOR = /plank|bridge|dead_bug|bird_dog|push_?up|clamshell|prone_y|heel_slide|cat_cow|floor_press|bench_press/;
const FOV = 36 * Math.PI / 180;
const SAFE_FRAME = .90;
const CONTENT_PITCH = {
  prone_y: .42, bird_dog: .28, clamshell: .30, knee_side_plank: .30,
  dead_bug: .30, heel_slide: .25, cat_cow: .25,
};
// Joint-local surface margins include the skull, clothing, hands, and rounded
// shoe geometry. Retaining these smaller boxes avoids fitting empty corners of
// a single oversized human/machine box when the athlete raises both arms.
const MARGINS = [
  [.20, .13, .18], [.20, .11, .16], [.145, .15, .145],
  [.105, .10, .105], [.075, .075, .075], [.055, .055, .055],
  [.105, .10, .105], [.075, .075, .075], [.055, .055, .055],
  [.12, .115, .12], [.095, .095, .095], [.09, .08, .145],
  [.12, .115, .12], [.095, .095, .095], [.09, .08, .145],
  [.10, .06, .115], [.10, .06, .115], [.15, .15, .15], [.15, .15, .15],
];

function addBox(points, min, max) {
  for (const x of [min[0], max[0]]) for (const y of [min[1], max[1]]) for (const z of [min[2], max[2]]) points.push(x, y, z);
}

function canonicalEnvelope(motion) {
  if (cache.has(motion)) return cache.get(motion);
  const values = [], min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  // A fixed camera encloses the whole authored cycle, including both sides of
  // an alternating movement. No breathing/repetition-driven camera pumping.
  for (let frame = 0; frame <= 64; frame++) {
    const joints = poseJoints(motion, frame / 64, REST);
    joints.forEach((joint, index) => {
      const margin = MARGINS[index];
      addBox(values, joint.map((value, axis) => value - margin[axis]), joint.map((value, axis) => value + margin[axis]));
    });
    const equipment = equipmentBounds(motion, joints, REST, 1);
    if (equipment) for (const part of equipment.parts || [equipment]) addBox(values, part.min, part.max);
  }
  for (let index = 0; index < values.length; index += 3) for (let axis = 0; axis < 3; axis++) {
    min[axis] = Math.min(min[axis], values[index + axis]);
    max[axis] = Math.max(max[axis], values[index + axis]);
  }
  const envelope = {
    min, max,
    center: min.map((value, axis) => (value + max[axis]) / 2),
    size: min.map((value, axis) => max[axis] - value),
    points: Float32Array.from(values),
  };
  cache.set(motion, envelope);
  return envelope;
}

/** The athlete, shoes, and actual attachments over one complete repetition. */
export function exerciseEnvelope(motion, heightScale = 1) {
  const scale = Number.isFinite(heightScale) && heightScale > 0 ? heightScale : 1;
  const base = canonicalEnvelope(motion);
  if (scale === 1) return base;
  return {
    min: base.min.map(value => value * scale), max: base.max.map(value => value * scale),
    center: base.center.map(value => value * scale), size: base.size.map(value => value * scale),
    points: base.points.map(value => value * scale),
  };
}

/** Perspective fit for each fixed angle; FOV must match the scene's 36 degrees. */
export function exerciseCameraPreset(motion, view = '45', heightScale = 1, aspect = 1.5, mirror = false) {
  const envelope = canonicalEnvelope(motion);
  const scale = Number.isFinite(heightScale) && heightScale > 0 ? heightScale : 1;
  const ratio = Number.isFinite(aspect) && aspect > 0 ? Math.max(.25, aspect) : 1.5;
  const angle = view === 'side' ? Math.PI / 2 : view === 'back' ? Math.PI : view === 'front' ? 0 : Math.PI / 4;
  const pitch = CONTENT_PITCH[motion] ?? (FLOOR.test(motion) ? .16 : .11);
  const direction = new THREE.Vector3(Math.sin(angle) * Math.cos(pitch), Math.sin(pitch), Math.cos(angle) * Math.cos(pitch));
  const right = new THREE.Vector3(Math.cos(angle), 0, -Math.sin(angle));
  const vertical = direction.clone().cross(right).normalize();
  const center = new THREE.Vector3(...envelope.center), point = new THREE.Vector3();
  if (mirror) center.x *= -1;
  const tangentY = Math.tan(FOV / 2) * SAFE_FRAME, tangentX = tangentY * ratio;
  let lowerX = -Infinity, upperX = Infinity, lowerY = -Infinity, upperY = Infinity, nearest = -Infinity;
  for (let index = 0; index < envelope.points.length; index += 3) {
    point.fromArray(envelope.points, index);
    if (mirror) point.x *= -1;
    point.sub(center);
    const depth = point.dot(direction), x = point.dot(right), y = point.dot(vertical);
    // Perspective bounds are linear in camera distance: x + k*depth - k*D
    // and x - k*depth + k*D. Their intersection gives an exact tight fit and
    // aim point without iterative searches or empty world-box corners.
    lowerX = Math.max(lowerX, x + tangentX * depth);
    upperX = Math.min(upperX, x - tangentX * depth);
    lowerY = Math.max(lowerY, y + tangentY * depth);
    upperY = Math.min(upperY, y - tangentY * depth);
    nearest = Math.max(nearest, depth);
  }
  const distance = Math.max(.6, (lowerX - upperX) / (2 * tangentX), (lowerY - upperY) / (2 * tangentY), nearest + .16);
  const target = center.addScaledVector(right, (lowerX + upperX) / 2).addScaledVector(vertical, (lowerY + upperY) / 2).multiplyScalar(scale);
  const position = target.clone().addScaledVector(direction, distance * scale);
  return { target: target.toArray(), position: position.toArray() };
}
