import * as THREE from 'three';

const v = point => new THREE.Vector3(...point);
const bodyweightMotions = new Set(['squat', 'lunge', 'side_lunge', 'full_pushup', 'push_up', 'plank', 'bridge', 'glute_bridge', 'hinge', 'hip_hinge']);
const cycle = t => (1 - Math.cos(Math.PI * 2 * t)) / 2;

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
  let bend = cycle(t), axis, hip;
  let ankles = [rest[11].slice(), rest[14].slice()];
  const push = id === 'full_pushup' || id === 'push_up';
  const plank = id === 'plank';
  const bridge = id === 'bridge' || id === 'glute_bridge';
  const hinge = id === 'hinge' || id === 'hip_hinge';
  const alternating = id === 'lunge' || id === 'side_lunge';
  const active = t < .5 ? 0 : 1;
  if (alternating) bend = cycle((t * 2) % 1);

  if (push || plank) {
    const rise = plank ? .165 : .29 - .13 * bend;
    axis = new THREE.Vector3(0, rise, Math.sqrt(1 - rise ** 2));
    ankles = [[rest[11][0], .10 * h, -.70 * h], [rest[14][0], .10 * h, -.70 * h]];
    const leg = (length(9, 10) + length(10, 11) + length(12, 13) + length(13, 14)) / 2;
    const width = Math.abs(rest[11][0] - rest[9][0]);
    const bodyLength = Math.sqrt(Math.max(0, (leg * .998) ** 2 - width ** 2)) + .04 * h;
    hip = new THREE.Vector3(0, .10 * h, -.70 * h).addScaledVector(axis, bodyLength);
  } else if (bridge) {
    const y = .14 * h + .19 * h * bend;
    const shoulderY = .14 * h;
    hip = new THREE.Vector3(0, y, -.55 * h + Math.sqrt(Math.max(0, torsoLength ** 2 - (y - shoulderY) ** 2)));
    axis = new THREE.Vector3(0, shoulderY, -.55 * h).sub(hip).normalize();
    ankles = [[rest[11][0], .10 * h, .42 * h], [rest[14][0], .10 * h, .42 * h]];
  } else {
    let tilt = .06;
    if (id === 'squat') {
      hip = new THREE.Vector3(0, hipY - .34 * h * bend, baseZ - .22 * h * bend);
      tilt += .40 * bend;
    } else if (hinge) {
      hip = new THREE.Vector3(0, hipY - .10 * h * bend, baseZ - .25 * h * bend);
      tilt += 1.04 * bend;
    } else if (id === 'lunge') {
      hip = new THREE.Vector3(0, hipY - .26 * h * bend, baseZ - .18 * h * bend);
      ankles[active][2] -= .57 * h * bend;
      ankles[1 - active][2] += .15 * h * bend;
      tilt += .10 * bend;
    } else {
      const side = active === 0 ? 1 : -1;
      hip = new THREE.Vector3(side * .28 * h * bend, hipY - .075 * h - .24 * h * bend, baseZ - .08 * h * bend);
      ankles = [[.44 * h, rest[11][1], rest[11][2]], [-.44 * h, rest[14][1], rest[14][2]]];
      tilt += .18 * bend;
    }
    axis = new THREE.Vector3(0, Math.cos(tilt), Math.sin(tilt));
  }

  joints[0] = hip.toArray();
  joints[1] = hip.clone().addScaledVector(axis, torsoLength).toArray();
  joints[2] = v(joints[1]).addScaledVector(bridge ? new THREE.Vector3(0, 0, -1) : axis, neckLength).toArray();
  const torsoRotation = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis);
  for (const [root, parent] of [[3, 1], [6, 1], [9, 0], [12, 0]]) {
    joints[root] = v(rest[root]).sub(v(rest[parent])).applyQuaternion(torsoRotation).add(v(joints[parent])).toArray();
  }
  for (const [index, [root, knee, ankle, toe]] of [[9, 10, 11, 15], [12, 13, 14, 16]].entries()) {
    [joints[knee], joints[ankle]] = limb(joints[root], ankles[index], length(root, knee), length(knee, ankle), bridge ? [0, 1, 0] : [0, 0, 1]);
    joints[toe] = v(joints[ankle]).add(v(rest[toe]).sub(v(rest[ankle]))).toArray();
  }
  for (const [index, [root, elbow, wrist]] of [[3, 4, 5], [6, 7, 8]].entries()) {
    const side = index === 0 ? 1 : -1;
    const upper = length(root, elbow), lower = length(elbow, wrist);
    if (plank) {
      joints[elbow] = v(joints[root]).add(new THREE.Vector3(0, -upper, 0)).toArray();
      joints[wrist] = v(joints[elbow]).add(new THREE.Vector3(0, 0, lower)).toArray();
    } else {
      let target, toward;
      if (push) {
        target = [joints[root][0] + side * .07 * h, .06 * h, .58 * h]; toward = [side * .7, 0, -1];
      } else if (bridge) {
        target = [joints[root][0] + side * .04 * h, .10 * h, joints[root][2] + (upper + lower) * .985]; toward = [side, 0, 0];
      } else if (hinge) {
        target = [joints[root][0] + side * .025 * h, joints[root][1] - (upper + lower) * .96, joints[root][2] + .04 * h]; toward = [0, 0, 1];
      } else {
        target = [side * .17 * h, joints[root][1] - .08 * h, joints[root][2] + (upper + lower) * .85]; toward = [side * .3, -1, 0];
      }
      [joints[elbow], joints[wrist]] = limb(joints[root], target, upper, lower, toward);
    }
    const finger = index === 0 ? 17 : 18;
    const handDirection = push || plank || bridge ? new THREE.Vector3(0, 0, 1) : v(joints[wrist]).sub(v(joints[elbow])).normalize();
    joints[finger] = v(joints[wrist]).addScaledVector(handDirection, length(wrist, finger)).toArray();
  }
  return joints;
}
