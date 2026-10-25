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

// Separate MCP/PIP/DIP flexion for the four modeled fingers. Coordinates are
// calibrated in the CC0 palm plane, mirrored and scaled for each avatar.
const DIGITS = [
  { w: -.096, d: .174, tipW: -.134, tipD: .254 },
  { w: -.071, d: .178, tipW: -.093, tipD: .282 },
  { w: -.046, d: .177, tipW: -.054, tipD: .280 },
  { w: -.023, d: .163, tipW: -.025, tipD: .246 },
];

function fingerArc(distance, length, flexion) {
  // Integrating smoothly changing joint angles avoids collapsing the entire
  // finger onto one circular hinge. Rotate its cross-section with the tangent.
  const angleAt = s => flexion * (.92 * smoothStep(0, .13, s / length)
    + 1.12 * smoothStep(.38, .52, s / length) + .65 * smoothStep(.69, .81, s / length));
  let forward = 0, normal = 0;
  const steps = 16, step = distance / steps;
  for (let i = 0; i < steps; i++) {
    const angle = angleAt((i + .5) * step);
    forward += step * Math.cos(angle); normal -= step * Math.sin(angle);
  }
  return { forward, normal, angle: angleAt(distance) };
}

// Unsupported hands curl gently; support palms retain the calibrated flat
// surface. Arrays allow one hand to support while the other holds or relaxes.
export function gripSurface(base, weights, rest, grip) {
  const output = base.slice();
  const stature = scaleFor(rest), scales = rest.handGripScale || calibrateGripScale(base, weights, rest);
  for (let side = 0; side < 2; side++) {
    const shape = Array.isArray(grip) ? grip[side] : grip;
    if (!['closed', 'relaxed', 'clasp'].includes(shape)) continue;
    const closure = shape === 'relaxed' ? .32 : shape === 'clasp' ? .70 : 1;
    const h = stature * scales[side];
    const { wrist, sign, along, back, across } = handRestFrame(rest, side), origin = vector(rest[wrist]);
    for (let i = 0; i < weights.length; i++) {
      const influence = weights[i].find(([bone]) => bone === 12 + side)?.[1] || 0;
      if (influence < .5) continue;
      const relative = new THREE.Vector3().fromArray(base, i * 3).sub(origin);
      const d = relative.dot(along) / h, width = sign * relative.dot(across) / h, normal = relative.dot(back) / h;
      if (d <= .125) continue;
      let nextD = d, nextN = normal, nextW = width;
      const thumb = width < -.105 && d < .191;
      if (thumb) {
        const blend = smoothStep(.102, .123, -width) * smoothStep(.125, .145, d);
        const angle = -1.03 * closure * blend, dw = width + .102, dd = d - .133;
        nextW = -.102 + dw * Math.cos(angle) - dd * Math.sin(angle);
        nextD = .133 + dw * Math.sin(angle) + dd * Math.cos(angle);
        nextN = normal - .027 * closure * blend;
      } else {
        let digit, distance = Infinity;
        for (const candidate of DIGITS) {
          const slope = (candidate.tipW - candidate.w) / (candidate.tipD - candidate.d);
          const separation = Math.abs(width - (candidate.w + slope * Math.max(0, d - candidate.d)));
          if (separation < distance) { digit = candidate; distance = separation; }
        }
        const length = Math.hypot(digit.tipW - digit.w, digit.tipD - digit.d);
        const aw = (digit.tipW - digit.w) / length, ad = (digit.tipD - digit.d) / length;
        const dw = width - digit.w, dd = d - digit.d;
        const forward = dw * aw + dd * ad, lateral = dw * ad - dd * aw;
        if (forward <= 0) continue;
        const arc = fingerArc(forward, length, closure);
        const spread = Math.atan2(aw, ad) * (1 - closure * .55);
        const crossSection = normal - .021;
        const bentForward = arc.forward + crossSection * Math.sin(arc.angle);
        nextW = digit.w + Math.sin(spread) * bentForward + Math.cos(spread) * lateral;
        nextD = digit.d + Math.cos(spread) * bentForward - Math.sin(spread) * lateral;
        nextN = .021 + arc.normal + crossSection * Math.cos(arc.angle);
        const web = smoothStep(0, .012, forward);
        nextW = THREE.MathUtils.lerp(width, nextW, web);
        nextD = THREE.MathUtils.lerp(d, nextD, web);
        nextN = THREE.MathUtils.lerp(normal, nextN, web);
      }
      const folded = origin.clone().addScaledVector(along, nextD * h).addScaledVector(across, sign * nextW * h).addScaledVector(back, nextN * h);
      const blend = smoothStep(.5, .85, influence);
      new THREE.Vector3().fromArray(base, i * 3).lerp(folded, blend).toArray(output, i * 3);
    }
  }
  return output;
}
