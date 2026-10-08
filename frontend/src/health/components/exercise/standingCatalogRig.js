import * as THREE from 'three';

// Authored demonstrations. World support anchors and two-bone IK replace the
// old 2D-to-3D projection; these paths are not captured or personal biomechanics.
export const STANDING_CATALOG_IDS = new Set([
  'sit_stand', 'wall_push', 'scapular', 'calf', 'walk', 'march', 'step_touch',
  'standing_march', 'hip_abduction', 'chest_open', 'shoulder_roll',
  'thoracic_rotation', 'ankle_pump', 'hamstring_stretch', 'calf_stretch',
  'sumo_squat', 'split_squat', 'reverse_lunge', 'incline_push',
  'close_wall_push', 'wall_hinge', 'seated_calf', 'brisk_walk', 'wall_sit',
  'standing_knee_crunch', 'single_calf',
]);

const vec = p => new THREE.Vector3(...p);
const up = new THREE.Vector3(0, 1, 0);
const mix = (a, b, t) => a + (b - a) * t;
const ease = (a, b, value) => {
  const t = THREE.MathUtils.clamp((value - a) / (b - a), 0, 1);
  return t * t * t * (t * (t * 6 - 15) + 10);
};
const rep = t => ease(.07, .42, t) * (1 - ease(.58, .94, t));
const normalized = p => vec(p).normalize();

function solveLimb(origin, target, upper, lower, toward) {
  const direction = vec(target).sub(vec(origin));
  const requested = direction.length();
  if (requested < 1e-8) direction.set(0, -1, 0); else direction.divideScalar(requested);
  const distance = THREE.MathUtils.clamp(requested, Math.abs(upper - lower) + 1e-6, upper + lower - 1e-6);
  const along = (upper * upper + distance * distance - lower * lower) / (2 * distance);
  const height = Math.sqrt(Math.max(0, upper * upper - along * along));
  let bend = vec(toward).addScaledVector(direction, -vec(toward).dot(direction));
  if (bend.lengthSq() < 1e-8) bend = new THREE.Vector3(1, 0, 0).cross(direction);
  bend.normalize();
  return [
    vec(origin).addScaledVector(direction, along).addScaledVector(bend, height).toArray(),
    vec(origin).addScaledVector(direction, distance).toArray(),
  ];
}

export function standingCatalogPose(id, progress, rest) {
  if (!STANDING_CATALOG_IDS.has(id)) return null;
  const t = Number.isFinite(progress) ? THREE.MathUtils.clamp(progress, 0, 1) : 0;
  const h = rest[0][1] / .94;
  const length = (a, b) => vec(rest[a]).distanceTo(vec(rest[b]));
  const torso = length(0, 1), neck = length(1, 2);
  const joints = rest.map(p => p.slice());
  const bend = rep(t), alternating = ['march', 'standing_march', 'hip_abduction', 'standing_knee_crunch', 'reverse_lunge'].includes(id);
  const active = t < .5 ? 0 : 1;
  const local = alternating ? (t * 2) % 1 : t;
  const lift = alternating ? rep(local) : bend;
  let hip = vec(rest[0]), tilt = .035, yaw = 0, pelvisTilt = 0;
  let equipment = null;
  const feet = [[11, 15], [14, 16]].map(([ankle]) => rest[ankle].slice());
  const footRotations = [new THREE.Quaternion(), new THREE.Quaternion()];
  const plantedToe = (index, toe, pitch) => {
    const [ankleIndex, toeIndex] = index === 0 ? [11, 15] : [14, 16];
    footRotations[index].setFromAxisAngle(new THREE.Vector3(1, 0, 0), pitch);
    feet[index] = vec(toe).sub(vec(rest[toeIndex]).sub(vec(rest[ankleIndex])).applyQuaternion(footRotations[index])).toArray();
  };
  // Seat contact is measured against the gluteal skin envelope, which lies
  // below the hip joint. A pad at hipY minus .09 cut through the buttocks.
  const chair = (seatZ = -.06 * h) => ({ kind: 'chair', heightScale: h, seatY: .345 * h, seatCenter: [0, .345 * h, seatZ] });
  const seated = ['march', 'ankle_pump', 'hamstring_stretch', 'seated_calf'].includes(id);

  if (seated) {
    hip.set(0, .565 * h, -.08 * h);
    feet[0] = [rest[11][0], .10 * h, .44 * h];
    feet[1] = [rest[14][0], .10 * h, .44 * h];
    equipment = chair();
    if (id === 'march') {
      feet[active][1] += .14 * h * lift;
      feet[active][2] -= .08 * h * lift;
    } else if (id === 'ankle_pump') {
      feet.forEach((point, i) => {
        // Dorsiflex around a planted heel, rather than floating both feet or
        // pointing the toes below the floor. The ankle travels only with that pivot.
        footRotations[i].setFromAxisAngle(new THREE.Vector3(1, 0, 0), -.45 * bend);
        feet[i] = vec([point[0], .04 * h, .395 * h])
          .add(new THREE.Vector3(0, .06 * h, .045 * h).applyQuaternion(footRotations[i])).toArray();
      });
    } else if (id === 'hamstring_stretch') {
      feet[0][2] += .17 * h * bend;
      footRotations[0].setFromAxisAngle(new THREE.Vector3(1, 0, 0), -.34 * bend);
      tilt = .035 + .31 * bend;
    } else {
      plantedToe(0, [rest[11][0], .04 * h, .605 * h], .48 * bend);
      plantedToe(1, [rest[14][0], .04 * h, .605 * h], .48 * bend);
    }
  } else if (id === 'sit_stand') {
    hip.set(0, (.94 - .375 * bend) * h, (.36 - .46 * bend) * h);
    tilt = .08 + .38 * Math.sin(Math.PI * bend);
    feet[0][2] = feet[1][2] = .35 * h;
    equipment = chair(-.10 * h);
  } else if (id === 'sumo_squat') {
    hip.set(0, (.88 - .26 * bend) * h, (.035 - .12 * bend) * h);
    tilt = .08 + .26 * bend;
    pelvisTilt = .08 * bend;
    feet.forEach((point, index) => {
      const side = index === 0 ? 1 : -1;
      point[0] = side * .38 * h;
      footRotations[index].setFromAxisAngle(up, side * .35);
    });
  } else if (id === 'split_squat') {
    hip.set(0, (.84 - .23 * bend) * h, 0);
    tilt = .045 + .08 * bend;
    feet[0] = [rest[11][0], .10 * h, .33 * h];
    plantedToe(1, [rest[16][0], .04 * h, -.23 * h], .55);
    equipment = { kind: 'support', heightScale: h, supportCenter: [.46 * h, 1.19 * h, .23 * h], topY: 1.19 * h };
  } else if (id === 'reverse_lunge') {
    const step = ease(.07, .23, local) * (1 - ease(.77, .94, local));
    const lowering = ease(.24, .44, local) * (1 - ease(.57, .77, local));
    const travel = local < .5 ? ease(.07, .23, local) : 1 - ease(.77, .94, local);
    const toe = (active === 0 ? rest[15] : rest[16]).slice();
    toe[1] += Math.sin(Math.PI * travel) * .075 * h;
    toe[2] -= .54 * h * step;
    plantedToe(active, toe, .60 * step);
    hip.set(0, rest[0][1] - (.11 * step + .23 * lowering) * h, rest[0][2] - .065 * h * step);
    tilt = .04 + .09 * lowering;
    pelvisTilt = .04 * lowering;
  } else if (id === 'wall_push' || id === 'close_wall_push') {
    tilt = .15 + .18 * bend;
    const reach = (length(9, 10) + length(10, 11) + length(12, 13) + length(13, 14)) / 2;
    const lateral = Math.abs(rest[11][0] - rest[9][0]);
    const bodyAxis = Math.sqrt((reach * .994) ** 2 - lateral ** 2) + .04 * h;
    hip = vec([0, feet[0][1], feet[0][2]]).addScaledVector(new THREE.Vector3(0, Math.cos(tilt), Math.sin(tilt)), bodyAxis);
    pelvisTilt = tilt;
    equipment = { kind: 'wall', heightScale: h, wallZ: .61 * h };
  } else if (id === 'incline_push') {
    const rise = .73 - .10 * bend;
    const axis = new THREE.Vector3(0, rise, Math.sqrt(1 - rise * rise));
    plantedToe(0, [rest[15][0], .04 * h, -.50 * h], .40);
    plantedToe(1, [rest[16][0], .04 * h, -.50 * h], .40);
    const reach = (length(9, 10) + length(10, 11) + length(12, 13) + length(13, 14)) / 2;
    const lateral = Math.abs(rest[11][0] - rest[9][0]);
    const legAxis = Math.sqrt((reach * .996) ** 2 - lateral ** 2);
    hip = vec([0, feet[0][1], feet[0][2]]).addScaledVector(axis, legAxis);
    tilt = Math.acos(rise);
    pelvisTilt = tilt;
    equipment = { kind: 'incline', heightScale: h, topY: .69 * h, topZ: .42 * h };
  } else if (id === 'wall_hinge') {
    hip.set(0, rest[0][1] - .08 * h * bend, rest[0][2] - .22 * h * bend);
    tilt = .035 + .94 * bend;
    pelvisTilt = .15 * bend;
    equipment = { kind: 'back_wall', heightScale: h, wallZ: -.285 * h };
  } else if (id === 'wall_sit') {
    hip.set(0, .58 * h, -.06 * h);
    tilt = 0;
    feet[0] = [rest[11][0], .10 * h, .34 * h];
    feet[1] = [rest[14][0], .10 * h, .34 * h];
    equipment = { kind: 'back_wall', heightScale: h, wallZ: -.20 * h };
  } else if (id === 'calf_stretch') {
    hip.set(0, (.849 - .012 * bend) * h, (-.005 + .03 * bend) * h);
    tilt = .12;
    feet[0] = [rest[11][0], .10 * h, .15 * h];
    feet[1] = [rest[14][0], .10 * h, -.35 * h];
    equipment = { kind: 'wall', heightScale: h, wallZ: .44 * h };
  } else if (id === 'calf' || id === 'single_calf') {
    const pitch = .48 * bend;
    plantedToe(0, rest[15], pitch);
    plantedToe(1, rest[16], pitch);
    hip.y += feet[0][1] - rest[11][1];
    hip.z += feet[0][2] - rest[11][2];
    if (id === 'single_calf') {
      hip.x = .065 * h;
      feet[1] = [rest[14][0], .35 * h, -.12 * h];
      footRotations[1].identity();
      hip.y -= .009 * h;
    }
    equipment = { kind: 'support', heightScale: h, supportCenter: [.46 * h, 1.19 * h, .23 * h], topY: 1.19 * h };
  } else if (id === 'standing_march' || id === 'standing_knee_crunch' || id === 'hip_abduction') {
    const side = active === 0 ? 1 : -1;
    hip.x = -side * .03 * h * lift;
    hip.y -= .016 * h * lift;
    if (id === 'hip_abduction') {
      feet[active][0] += side * .30 * h * lift;
      const root = active === 0 ? 9 : 12, ankle = active === 0 ? 11 : 14;
      const upperOrigin = vec(rest[root]).sub(vec(rest[0])).add(hip);
      const reach = length(root, ankle);
      const lateral = feet[active][0] - upperOrigin.x;
      const sagittal = feet[active][2] - upperOrigin.z;
      feet[active][1] = upperOrigin.y - Math.sqrt(Math.max(0, reach * reach - lateral * lateral - sagittal * sagittal));
      equipment = { kind: 'support', heightScale: h, supportCenter: [.46 * h, 1.19 * h, .23 * h], topY: 1.19 * h };
    } else {
      feet[active][1] += (id === 'standing_knee_crunch' ? .30 : .25) * h * lift;
      feet[active][2] += .06 * h * lift;
      tilt += (id === 'standing_knee_crunch' ? .14 : .025) * lift;
    }
  } else if (id === 'step_touch') {
    const wrapped = t === 1 ? 0 : t;
    const stage = Math.floor(wrapped * 4), phase = ease(0, 1, (wrapped * 4) % 1);
    const right = rest[11][0], left = rest[14][0];
    const out = .28 * h, join = .46 * h;
    feet[0][0] = stage < 1 ? right + out * phase : stage < 3 ? right + out : right + out * (1 - phase);
    feet[1][0] = stage < 1 ? left : stage < 2 ? left + join * phase : stage < 3 ? left + join * (1 - phase) : left;
    feet[stage === 0 || stage === 3 ? 0 : 1][1] += Math.sin(Math.PI * phase) * .055 * h;
    hip.x = (feet[0][0] + feet[1][0]) / 2;
    hip.y = .89 * h;
  } else if (id === 'walk' || id === 'brisk_walk') {
    const stride = (id === 'brisk_walk' ? .25 : .18) * h;
    const cycle = t * Math.PI * 2;
    hip.y -= .045 * h + .006 * h * (1 - Math.cos(cycle * 2));
    hip.x = .018 * h * Math.sin(cycle);
    tilt = id === 'brisk_walk' ? .10 : .055;
    yaw = .055 * Math.sin(cycle);
    feet.forEach((point, i) => {
      const phase = cycle + i * Math.PI, swing = Math.max(0, Math.sin(phase));
      point[2] += stride * Math.cos(phase);
      point[1] += .075 * h * swing;
      footRotations[i].setFromAxisAngle(new THREE.Vector3(1, 0, 0), .24 * Math.sin(phase));
    });
    joints.locomotion = 'in_place';
  } else if (id === 'thoracic_rotation') {
    yaw = .44 * Math.sin(t * Math.PI * 2);
  }

  const axis = new THREE.Vector3(0, Math.cos(tilt), Math.sin(tilt));
  const rotation = new THREE.Quaternion().setFromAxisAngle(up, yaw).multiply(new THREE.Quaternion().setFromUnitVectors(up, axis));
  axis.applyAxisAngle(up, yaw);
  const pelvisRotation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), pelvisTilt);
  joints[0] = hip.toArray();
  joints[1] = hip.clone().addScaledVector(axis, torso).toArray();
  joints[2] = vec(joints[1]).addScaledVector(axis, neck).toArray();
  // An axial turn cannot be recovered from a spine's direction alone.
  joints.boneRotations = { 0: rotation.toArray(), 1: rotation.toArray() };
  for (const [root, parent] of [[3, 1], [6, 1], [9, 0], [12, 0]]) {
    const offset = vec(rest[root]).sub(vec(rest[parent]));
    if (parent === 1 && id === 'shoulder_roll') {
      const phase = t * Math.PI * 2, side = root === 3 ? 1 : -1;
      const clavicle = offset.length(), elevation = .035 * h * (1 - Math.cos(phase));
      offset.set(side * Math.sqrt(Math.max(0, clavicle * clavicle - elevation * elevation)), elevation, -.015 * h * Math.sin(phase));
      offset.setLength(clavicle);
    }
    if (parent === 1 && id === 'scapular') {
      const side = root === 3 ? 1 : -1, radius = offset.length();
      offset.set(side * radius * Math.cos(.14 * bend), 0, -radius * Math.sin(.14 * bend));
    }
    joints[root] = offset.applyQuaternion(parent === 0 ? pelvisRotation : rotation).add(vec(joints[parent])).toArray();
  }
  for (const [i, [root, knee, ankle, toe]] of [[9, 10, 11, 15], [12, 13, 14, 16]].entries()) {
    const side = i === 0 ? 1 : -1;
    const toward = id === 'sumo_squat' ? [side * .55, 0, 1] : seated ? [side * .22, 0, 1] : [0, 0, 1];
    [joints[knee], joints[ankle]] = solveLimb(joints[root], feet[i], length(root, knee), length(knee, ankle), toward);
    joints[toe] = vec(joints[ankle]).add(vec(rest[toe]).sub(vec(rest[ankle])).applyQuaternion(footRotations[i])).toArray();
  }

  for (const [i, [root, elbow, wrist, finger]] of [[3, 4, 5, 17], [6, 7, 8, 18]].entries()) {
    const side = i === 0 ? 1 : -1, upper = length(root, elbow), lower = length(elbow, wrist);
    let target = vec(joints[root]).add(new THREE.Vector3(side * .025 * h, -(upper + lower) * .96, .035 * h).applyQuaternion(rotation)).toArray();
    let toward = [side * .25, 0, 1], hand = null;
    if (id === 'wall_push' || id === 'close_wall_push') {
      target = [side * (id === 'close_wall_push' ? .11 : .22) * h, 1.33 * h, .57 * h];
      toward = [side * (id === 'close_wall_push' ? .16 : .45), -1, -.2];
      hand = [0, 1, 0];
    } else if (id === 'incline_push') {
      target = [side * .22 * h, .73 * h, .42 * h];
      toward = [side * .45, 0, -1];
      hand = [0, 0, 1];
    } else if (id === 'calf_stretch') {
      target = [side * .22 * h, 1.19 * h, .40 * h];
      toward = [side * .4, -1, 0];
      hand = [0, 1, 0];
    } else if (['calf', 'single_calf', 'split_squat', 'hip_abduction'].includes(id) && i === 0) {
      target = [.40 * h, 1.19 * h, .23 * h];
      hand = [1, 0, 0];
    } else if (id === 'scapular') {
      const elbowDirection = normalized([side * .08, -1, -.28 * bend]).applyQuaternion(rotation);
      const forearmDirection = normalized([side * .08, 0, 1]).applyQuaternion(rotation);
      joints[elbow] = vec(joints[root]).addScaledVector(elbowDirection, upper).toArray();
      joints[wrist] = vec(joints[elbow]).addScaledVector(forearmDirection, lower).toArray();
      joints[finger] = vec(joints[wrist]).addScaledVector(forearmDirection, length(wrist, finger)).toArray();
      continue;
    } else if (id === 'chest_open' || id === 'thoracic_rotation') {
      const opening = id === 'thoracic_rotation' ? 1 : bend;
      target = vec(joints[root]).add(new THREE.Vector3(side * mix(.06, .41, opening) * h, -.06 * h, mix(.26, -.04, opening) * h).applyQuaternion(rotation)).toArray();
      toward = [side, -.4, 0];
      hand = normalized([side, 0, .08]).applyQuaternion(rotation).toArray();
    } else if (id === 'sumo_squat' || id === 'split_squat' || id === 'reverse_lunge' || id === 'sit_stand') {
      target = [hip.x + side * .11 * h, joints[root][1] - .17 * h, joints[root][2] + .22 * h];
      toward = [side * .5, -1, -.2];
      hand = [-side * .7, 0, .7];
    } else if (seated || id === 'wall_sit') {
      target = [side * .20 * h, (.75 - (id === 'hamstring_stretch' ? .10 * bend : 0)) * h, (.23 + (id === 'hamstring_stretch' ? .13 * bend : 0)) * h];
      toward = [side * .3, -1, 0];
      hand = [0, -1, .1];
    } else if (id === 'standing_knee_crunch') {
      target = [side * .15 * h, joints[root][1] - .17 * h - .08 * h * lift, joints[root][2] + .24 * h];
      toward = [side * .5, -1, 0];
      hand = [-side * .4, -.2, .8];
    } else if (id === 'walk' || id === 'brisk_walk' || id === 'standing_march' || id === 'step_touch') {
      const swing = id === 'walk' || id === 'brisk_walk' || id === 'step_touch' ? Math.sin(t * Math.PI * 2 + i * Math.PI) : (i === active ? -1 : 1) * lift;
      const brisk = id === 'brisk_walk';
      target = [joints[root][0] + side * .02 * h, joints[root][1] - (brisk ? .30 : .39) * h, joints[root][2] + (brisk ? .18 : .13) * h * swing + (brisk ? .12 : .03) * h];
      toward = [0, -.2, 1];
    }
    [joints[elbow], joints[wrist]] = solveLimb(joints[root], target, upper, lower, toward);
    const direction = hand ? normalized(hand) : vec(joints[wrist]).sub(vec(joints[elbow])).normalize();
    joints[finger] = vec(joints[wrist]).addScaledVector(direction, length(wrist, finger)).toArray();
    if (id === 'wall_push' || id === 'close_wall_push' || id === 'calf_stretch') {
      // Rotate the calibrated floor-palm frame into a vertical support plane:
      // fingers face up and the palm faces the wall. Wrist centers remain
      // behind the wall by the palm thickness rather than inside the glass.
      const floorPalm = new THREE.Quaternion().setFromUnitVectors(vec(rest[finger]).sub(vec(rest[wrist])).normalize(), new THREE.Vector3(0, 0, 1));
      floorPalm.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), side * .9));
      joints.boneRotations[12 + i] = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2).multiply(floorPalm).toArray();
    }
  }
  if (id === 'incline_push') joints.handRoll = [.9, -.9];
  if (equipment) {
    equipment.contactPoints = equipment.kind === 'wall' || equipment.kind === 'incline' ? [joints[5].slice(), joints[8].slice()] : equipment.kind === 'support' ? [joints[5].slice()] : [];
    joints.equipment = equipment;
  }
  return joints;
}
