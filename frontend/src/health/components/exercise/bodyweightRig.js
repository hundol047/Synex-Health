import * as THREE from 'three';

const v = point => new THREE.Vector3(...point);
const bodyweightMotions = new Set(['squat', 'lunge', 'side_lunge', 'full_pushup', 'push_up', 'plank', 'bridge', 'glute_bridge', 'hinge', 'hip_hinge']);
const smooth = (start, end, value) => {
  const t = THREE.MathUtils.clamp((value - start) / (end - start), 0, 1);
  return t * t * t * (t * (t * 6 - 15) + 10);
};
// A quiet setup, controlled eccentric phase, short technique hold and return.
// Zero velocity/acceleration at each boundary avoids a mechanical pendulum.
const repetition = t => smooth(.08, .43, t) * (1 - smooth(.57, .94, t));

// Two-bone inverse kinematics retains each athlete's segment lengths and plants
// support points. The authored paths are demonstrations, not motion capture.
function limb(origin, target, upperLength, lowerLength, bendToward) {
  const delta = v(target).sub(v(origin));
  const requestedDistance = delta.length();
  const direction = requestedDistance > 1e-8 ? delta.normalize() : new THREE.Vector3(0, -1, 0);
  const distance = THREE.MathUtils.clamp(requestedDistance, Math.abs(upperLength - lowerLength) + 1e-6, upperLength + lowerLength - 1e-6);
  const end = v(origin).addScaledVector(direction, distance);
  const along = (upperLength ** 2 + distance ** 2 - lowerLength ** 2) / (2 * distance);
  const height = Math.sqrt(Math.max(0, upperLength ** 2 - along ** 2));
  let bend = v(bendToward).addScaledVector(direction, -v(bendToward).dot(direction));
  if (bend.lengthSq() < 1e-8) bend = new THREE.Vector3(1, 0, 0).cross(direction);
  bend.normalize();
  return [v(origin).addScaledVector(direction, along).addScaledVector(bend, height).toArray(), end.toArray()];
}

export function bodyweightPoseJoints(id, progress, rest) {
  if (!bodyweightMotions.has(id)) return null;
  const t = Number.isFinite(progress) ? THREE.MathUtils.clamp(progress, 0, 1) : 0;
  const h = rest[0][1] / .94;
  const joints = rest.map(point => point.slice());
  const length = (a, b) => v(rest[a]).distanceTo(v(rest[b]));
  const torsoLength = length(0, 1), neckLength = length(1, 2);
  const hipY = rest[0][1], baseZ = rest[0][2];
  const push = id === 'full_pushup' || id === 'push_up';
  const plank = id === 'plank';
  const bridge = id === 'bridge' || id === 'glute_bridge';
  const hinge = id === 'hinge' || id === 'hip_hinge';
  const alternating = id === 'lunge' || id === 'side_lunge';
  const active = t < .5 ? 0 : 1;
  const local = alternating ? (t * 2) % 1 : t;
  let bend = repetition(local), axis, hip, pelvisTilt = 0, step = 0;
  let ankles = [rest[11].slice(), rest[14].slice()];
  const footRotations = [new THREE.Quaternion(), new THREE.Quaternion()];

  if (push || plank) {
    const leg = (length(9, 10) + length(10, 11) + length(12, 13) + length(13, 14)) / 2;
    const width = Math.abs(rest[11][0] - rest[9][0]);
    const bodyLength = Math.sqrt(Math.max(0, (leg * .998) ** 2 - width ** 2)) + .04 * h;
    const supportY = plank ? .05 * h : .047 * h;
    // Toe support raises the heel; the ankle is no longer a flat standing foot.
    footRotations.forEach(rotation => rotation.setFromAxisAngle(new THREE.Vector3(1, 0, 0), .8));
    ankles = [[11, 15], [14, 16]].map(([ankle, toe], index) => v([rest[ankle][0], .04 * h, -.70 * h]).sub(v(rest[toe]).sub(v(rest[ankle])).applyQuaternion(footRotations[index])).toArray());
    const ankleY = (ankles[0][1] + ankles[1][1]) / 2;
    const ankleZ = (ankles[0][2] + ankles[1][2]) / 2;
    let topRise = (supportY + (length(3, 4) + length(6, 7)) / 2 - ankleY - .005 * h) / (bodyLength + torsoLength);
    if (push) {
      // Solve reach for the actual stature/arm proportions. Support must remain
      // fixed rather than letting an unreachable IK target slide at the top.
      topRise = Math.min(...[[3, 4, 5], [6, 7, 8]].map(([root, elbow, wrist], index) => {
        const target = v([rest[root][0] + (index === 0 ? 1 : -1) * .045 * h, supportY, .58 * h]);
        const reach = (length(root, elbow) + length(elbow, wrist)) * .991;
        let low = 0, high = .6;
        for (let iteration = 0; iteration < 16; iteration++) {
          const rise = (low + high) / 2, direction = new THREE.Vector3(0, rise, Math.sqrt(1 - rise ** 2));
          const rotation = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
          const shoulder = new THREE.Vector3(0, ankleY, ankleZ).addScaledVector(direction, bodyLength + torsoLength).add(v(rest[root]).sub(v(rest[1])).applyQuaternion(rotation));
          if (shoulder.distanceTo(target) > reach) high = rise; else low = rise;
        }
        return low;
      }));
    }
    const rise = plank ? topRise + .0014 * (1 - Math.cos(t * Math.PI * 2)) : topRise - .12 * bend;
    axis = new THREE.Vector3(0, rise, Math.sqrt(1 - rise ** 2));
    hip = new THREE.Vector3(0, ankleY, ankleZ).addScaledVector(axis, bodyLength);
    pelvisTilt = Math.acos(rise);
  } else if (bridge) {
    const shoulderY = .09 * h, y = .155 * h + .175 * h * bend;
    hip = new THREE.Vector3(0, y, -.55 * h + Math.sqrt(Math.max(0, torsoLength ** 2 - (y - shoulderY) ** 2)));
    axis = new THREE.Vector3(0, shoulderY, -.55 * h).sub(hip).normalize();
    ankles = [[rest[11][0], .10 * h, .42 * h], [rest[14][0], .10 * h, .42 * h]];
    pelvisTilt = -Math.acos(axis.y);
  } else {
    let tilt = .045;
    if (id === 'squat') {
      hip = new THREE.Vector3(0, hipY - .34 * h * bend, baseZ - .205 * h * bend);
      tilt += .40 * bend;
      pelvisTilt = .13 * bend;
    } else if (hinge) {
      hip = new THREE.Vector3(0, hipY - .10 * h * bend, baseZ - .25 * h * bend);
      tilt += 1.04 * bend;
      pelvisTilt = .20 * bend;
    } else if (id === 'lunge') {
      // Lift, land, lower, rise, then step home. The supporting front foot never slides.
      step = smooth(.08, .24, local) * (1 - smooth(.76, .94, local));
      bend = smooth(.24, .45, local) * (1 - smooth(.55, .76, local));
      const travel = local < .5 ? smooth(.08, .24, local) : 1 - smooth(.76, .94, local);
      const clearance = Math.sin(travel * Math.PI) * .075 * h;
      const pitch = .60 * step;
      footRotations[active].setFromAxisAngle(new THREE.Vector3(1, 0, 0), pitch);
      const [ankle, toe] = active === 0 ? [11, 15] : [14, 16];
      const plantedToe = v(rest[toe]).add(new THREE.Vector3(0, clearance, -.50 * h * step));
      ankles[active] = plantedToe.sub(v(rest[toe]).sub(v(rest[ankle])).applyQuaternion(footRotations[active])).toArray();
      hip = new THREE.Vector3(0, hipY - .10 * h * step - .21 * h * bend, baseZ - .055 * h * step);
      tilt += .10 * bend;
      pelvisTilt = .04 * bend;
    } else {
      const side = active === 0 ? 1 : -1;
      hip = new THREE.Vector3(side * .28 * h * bend, hipY - .075 * h - .24 * h * bend, baseZ - .09 * h * bend);
      ankles = [[.44 * h, rest[11][1], rest[11][2]], [-.44 * h, rest[14][1], rest[14][2]]];
      tilt += .20 * bend;
      pelvisTilt = .08 * bend;
    }
    axis = new THREE.Vector3(0, Math.cos(tilt), Math.sin(tilt));
  }

  joints[0] = hip.toArray();
  joints[1] = hip.clone().addScaledVector(axis, torsoLength).toArray();
  // Supine neck stays supported; other movements keep the cervical spine neutral.
  joints[2] = v(joints[1]).addScaledVector(bridge ? new THREE.Vector3(0, 0, -1) : axis, neckLength).toArray();
  const torsoRotation = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis);
  const pelvisRotation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), pelvisTilt);
  for (const [root, parent] of [[3, 1], [6, 1], [9, 0], [12, 0]]) {
    joints[root] = v(rest[root]).sub(v(rest[parent])).applyQuaternion(parent === 0 ? pelvisRotation : torsoRotation).add(v(joints[parent])).toArray();
  }
  for (const [index, [root, knee, ankle, toe]] of [[9, 10, 11, 15], [12, 13, 14, 16]].entries()) {
    const toward = bridge ? [0, 1, 0] : id === 'side_lunge' ? [index === 0 ? .16 : -.16, 0, 1] : [0, 0, 1];
    [joints[knee], joints[ankle]] = limb(joints[root], ankles[index], length(root, knee), length(knee, ankle), toward);
    joints[toe] = v(joints[ankle]).add(v(rest[toe]).sub(v(rest[ankle])).applyQuaternion(footRotations[index])).toArray();
  }
  for (const [index, [root, elbow, wrist]] of [[3, 4, 5], [6, 7, 8]].entries()) {
    const side = index === 0 ? 1 : -1;
    const upper = length(root, elbow), lower = length(elbow, wrist);
    let target, toward;
    if (push) {
      target = [rest[root][0] + side * .045 * h, .047 * h, .58 * h];
      toward = [side * .55, 0, -1];
    } else if (plank) {
      // Fixed forearm support, with tiny breathing movement through the torso.
      const leg = (length(9, 10) + length(10, 11) + length(12, 13) + length(13, 14)) / 2;
      const bodyLength = Math.sqrt(Math.max(0, (leg * .998) ** 2 - (rest[11][0] - rest[9][0]) ** 2)) + .04 * h;
      const rise = (.05 * h + (length(3, 4) + length(6, 7)) / 2 - ankles[index][1] - .005 * h) / (bodyLength + torsoLength);
      const shoulderZ = ankles[index][2] + (bodyLength + torsoLength) * Math.sqrt(1 - rise ** 2);
      target = [rest[root][0], .05 * h, shoulderZ + lower];
      toward = [0, -1, 0];
    } else if (bridge) {
      target = [rest[root][0] + side * .045 * h, .047 * h, -.55 * h + (upper + lower) * .955];
      toward = [side, 0, 0];
    } else if (hinge) {
      target = [joints[root][0] + side * .015 * h, joints[root][1] - (upper + lower) * .97, joints[root][2] + .015 * h];
      toward = [0, 0, 1];
    } else {
      // Relaxed clasp in front of the sternum, rather than locked-out robot arms.
      const counterbalance = id === 'squat' ? .13 * bend : .015 * bend;
      target = [hip.x + side * .12 * h, joints[root][1] - .17 * h, joints[root][2] + .20 * h + counterbalance];
      toward = [side * .5, -1, -.1];
    }
    [joints[elbow], joints[wrist]] = limb(joints[root], target, upper, lower, toward);
    const finger = index === 0 ? 17 : 18;
    const handDirection = push || plank || bridge ? new THREE.Vector3(0, 0, 1) : hinge ? v(joints[wrist]).sub(v(joints[elbow])).normalize() : new THREE.Vector3(-side * .72, -.04, .69).normalize();
    joints[finger] = v(joints[wrist]).addScaledVector(handDirection, length(wrist, finger)).toArray();
  }
  // Palm pronation cannot be inferred from a wrist-to-finger direction alone.
  // Keep this authored roll on the pose so surface skinning matches the support.
  if (push || bridge) joints.handRoll = [.90, -.90];
  return joints;
}
