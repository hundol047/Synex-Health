import * as THREE from 'three';
import { orientation, scaleFor, smoothStep, vector } from './poseMath.js';

// Hand-plane calibration for the bundled CC0 human topology. Wrist joints are
// proximal to the visible palms; a tool belongs inside the curled palm, rather
// than on the nominal wrist joint. Mirrored hands keep their anatomical sides.
export function handRestFrame(rest, side) {
  const wrist = side === 0 ? 5 : 8, finger = side === 0 ? 17 : 18, sign = side === 0 ? 1 : -1;
  const along = vector(rest[finger]).sub(vector(rest[wrist])).normalize();
  const back = new THREE.Vector3(sign * .68, .71, .18);
  back.addScaledVector(along, -back.dot(along)).normalize();
  return { wrist, finger, sign, along, back, across: back.clone().cross(along).normalize() };
}

export function toolHandRotation(rest, joints, side, gripAxis = [1, 0, 0]) {
  const { wrist, finger, along, back } = handRestFrame(rest, side);
  const posedAlong = vector(joints[finger]).sub(vector(joints[wrist])).normalize();
  let posedBack = vector(gripAxis).cross(posedAlong);
  if (posedBack.lengthSq() < 1e-8) posedBack = new THREE.Vector3(side === 0 ? 1 : -1, 0, 0).addScaledVector(posedAlong, -(side === 0 ? 1 : -1) * posedAlong.x);
  posedBack.normalize();
  return orientation(posedAlong.toArray(), posedBack.toArray()).multiply(orientation(along.toArray(), back.toArray()).invert());
}

export function toolGripAnchor(rest, joints, side, rotation) {
  const { wrist, sign, along, back, across } = handRestFrame(rest, side), h = scaleFor(rest) * (rest.handGripScale?.[side] || 1);
  const offset = along.multiplyScalar(.17 * h).addScaledVector(across, -sign * .06 * h).addScaledVector(back, -.001 * h);
  return offset.applyQuaternion(rotation).add(vector(joints[wrist])).toArray();
}

export function calibrateGripScale(base, weights, rest) {
  const h = scaleFor(rest);
  return [0, 1].map(side => {
    const { wrist, along } = handRestFrame(rest, side), origin = vector(rest[wrist]);
    let maximum = 0;
    for (let i = 0; i < weights.length; i++) if (weights[i].some(([bone, influence]) => bone === 12 + side && influence > .85)) {
      maximum = Math.max(maximum, new THREE.Vector3().fromArray(base, i * 3).sub(origin).dot(along));
    }
    return maximum ? THREE.MathUtils.clamp(maximum / (.2841273 * h), .65, 1.2) : 1;
  });
}

// Close only the distal finger/thenar surface. This preserves the original
// palm/wrist volume and the individual modeled fingers rather than adding a
// separate ball-shaped hand. The rest surface is cached before skinning.
export function gripSurface(base, weights, rest, grip) {
  const output = base.slice();
  if (grip !== 'closed' && grip !== 'relaxed') return output;
  const closure = grip === 'relaxed' ? .35 : 1;
  const stature = scaleFor(rest), scales = rest.handGripScale || calibrateGripScale(base, weights, rest);
  for (let side = 0; side < 2; side++) {
    const h = stature * scales[side], hinge = .17 * h, radius = .026 * h;
    const { wrist, sign, along, back, across } = handRestFrame(rest, side), origin = vector(rest[wrist]);
    for (let i = 0; i < weights.length; i++) {
      const influence = weights[i].find(([bone]) => bone === 12 + side)?.[1] || 0;
      if (influence < .5) continue;
      const relative = new THREE.Vector3().fromArray(base, i * 3).sub(origin);
      const d = relative.dot(along), width = relative.dot(across), normal = relative.dot(back);
      const angle = THREE.MathUtils.clamp((d - hinge) / radius, 0, 2.90);
      let nextD = angle ? hinge + radius * Math.sin(angle) : d;
      let nextN = normal - radius * (1 - Math.cos(angle)), nextW = width;
      // The thumb flexes obliquely over the grip instead of remaining splayed.
      const thumb = smoothStep(.095 * h, .125 * h, -sign * width) * smoothStep(.125 * h, .165 * h, d);
      if (!angle && !thumb) continue;
      if (thumb > 0) {
        nextW = THREE.MathUtils.lerp(width, -sign * .075 * h + (width + sign * .125 * h) * .35, thumb * .90);
        nextN = THREE.MathUtils.lerp(nextN, -.015 * h + normal * .25, thumb * .90);
        nextD = THREE.MathUtils.lerp(nextD, .166 * h + (d - .17 * h) * .25, thumb * .65);
      }
      const folded = origin.clone().addScaledVector(along, nextD).addScaledVector(across, nextW).addScaledVector(back, nextN);
      const blend = closure * smoothStep(.5, .85, influence);
      new THREE.Vector3().fromArray(base, i * 3).lerp(folded, blend).toArray(output, i * 3);
    }
  }
  return output;
}
