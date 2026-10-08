import * as THREE from 'three';
import { bodyweightPoseJoints } from './bodyweightRig.js';
import { makeFrame, orientation, repetition, scaleFor, segmentLength, setFoot, setHand, solveLimb, vector } from './poseMath.js';

export const FLOOR_CATALOG_IDS = new Set([
  'pushup', 'bird_dog', 'dead_bug', 'heel_slide', 'cat_cow',
  'single_bridge', 'knee_side_plank', 'clamshell', 'prone_y',
]);

const up = new THREE.Vector3(0, 1, 0);
const armIndices = [[3, 4, 5], [6, 7, 8]];
const legIndices = [[9, 10, 11], [12, 13, 14]];
const pitch = radians => new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), radians);
const backwardFoot = new THREE.Quaternion().setFromAxisAngle(up, Math.PI);
const length = segmentLength;

function floorFoot(joints, rest, side, rotation = new THREE.Quaternion()) {
  setFoot(joints, rest, side, rotation);
  // A toe direction alone cannot encode the roll of a side-lying shoe/foot.
  joints.boneRotations ||= {};
  joints.boneRotations[side === 0 ? 10 : 11] = rotation.toArray();
}

function orientLimbs(joints, rest, frame, includeHands = false) {
  const bones = [[3, 4], [4, 5], [6, 7], [7, 8], [9, 10], [10, 11], [12, 13], [13, 14]];
  joints.boneRotations ||= {};
  bones.forEach(([a, b], index) => {
    const previous = vector(rest[b]).sub(vector(rest[a])).applyQuaternion(frame).normalize();
    const next = vector(joints[b]).sub(vector(joints[a])).normalize();
    joints.boneRotations[index + 2] = new THREE.Quaternion().setFromUnitVectors(previous, next).multiply(frame).toArray();
  });
  if (includeHands) for (const [side, [a, b]] of [[5, 17], [8, 18]].entries()) {
    const previous = vector(rest[b]).sub(vector(rest[a])).applyQuaternion(frame).normalize();
    const next = vector(joints[b]).sub(vector(joints[a])).normalize();
    joints.boneRotations[side + 12] = new THREE.Quaternion().setFromUnitVectors(previous, next).multiply(frame).toArray();
  }
}

function downwardPalm(joints, rest, side, direction) {
  const [wrist, finger] = side === 0 ? [5, 17] : [8, 18];
  setHand(joints, rest, side, direction);
  const authored = new THREE.Quaternion().setFromUnitVectors(vector(rest[finger]).sub(vector(rest[wrist])).normalize(), new THREE.Vector3(0, 0, 1));
  authored.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), side === 0 ? .90 : -.90));
  authored.premultiply(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), vector(direction).normalize()));
  joints.boneRotations ||= {};
  joints.boneRotations[side + 12] = authored.toArray();
}

function supportedNeck(joints, rest, direction, front) {
  const axis = vector(direction).normalize();
  joints[2] = vector(joints[1]).addScaledVector(axis, length(rest, 1, 2)).toArray();
  joints.boneRotations ||= {};
  joints.boneRotations[1] = orientation(axis.toArray(), front).toArray();
}

function floorArms(joints, rest, h) {
  // These world anchors do not follow a moving hip or knee. The hands are
  // relaxed beside the trunk, not supporting a fabricated abdominal crunch.
  for (const [side, [shoulder, elbow, wrist]] of armIndices.entries()) {
    const sign = side === 0 ? 1 : -1;
    const reach = length(rest, shoulder, elbow) + length(rest, elbow, wrist);
    solveLimb(joints, rest, side, 'arm', [rest[shoulder][0] + sign * .045 * h, .047 * h, joints[shoulder][2] + reach * .955], [sign, 0, 0]);
    setHand(joints, rest, side, [0, 0, 1], sign * .90);
  }
}

function supineFrame(rest, h) {
  const rise = -.135;
  const joints = makeFrame(rest, [0, .185 * h, -.075 * h], [0, rise, -Math.sqrt(1 - rise * rise)], [0, 1, 0]);
  supportedNeck(joints, rest, [0, -.125, -Math.sqrt(1 - .125 ** 2)], [0, 1, 0]);
  floorArms(joints, rest, h);
  return joints;
}

function quadrupedFrame(rest, h) {
  const thigh = (length(rest, 9, 10) + length(rest, 12, 13)) / 2;
  // Knees directly below the hips and palms directly below the shoulders.
  // Anatomical lengths determine the table height rather than scaling a 2D pose.
  const joints = makeFrame(rest, [0, .062 * h + thigh, -.26 * h], [0, 0, 1], [0, -1, 0]);
  supportedNeck(joints, rest, [0, -.12, Math.sqrt(1 - .12 ** 2)], [0, -1, 0]);
  for (const [side, [hip, knee, ankle]] of legIndices.entries()) {
    joints[knee] = vector(joints[hip]).add(new THREE.Vector3(0, -length(rest, hip, knee), 0)).toArray();
    const shin = length(rest, knee, ankle), lift = .038 * h;
    joints[ankle] = vector(joints[knee]).add(new THREE.Vector3(0, lift, -Math.sqrt(shin * shin - lift * lift))).toArray();
    floorFoot(joints, rest, side, backwardFoot);
  }
  for (const [side, [shoulder]] of armIndices.entries()) {
    const sign = side === 0 ? 1 : -1;
    solveLimb(joints, rest, side, 'arm', [joints[shoulder][0] + sign * .02 * h, .047 * h, joints[shoulder][2] + .03 * h], [sign * .15, 0, -1]);
    setHand(joints, rest, side, [0, 0, 1], sign * .90);
  }
  return joints;
}

function kneePushup(rest, t, h) {
  const thigh = (length(rest, 9, 10) + length(rest, 12, 13)) / 2;
  const kneeY = .062 * h, kneeZ = -.34 * h;
  const palms = armIndices.map(([root], side) => [rest[root][0] + (side === 0 ? 1 : -1) * .035 * h, .047 * h, .50 * h]);
  // Solve the supported body's top angle once for the actual athlete's arm
  // lengths; palms stay on the mat throughout the lowering/pressing phase.
  const frame = rise => {
    const axis = new THREE.Vector3(0, rise, Math.sqrt(1 - rise * rise));
    const rotation = orientation(axis.toArray(), [0, -1, 0]);
    const hipOffset = vector(rest[9]).sub(vector(rest[0])).applyQuaternion(rotation);
    const hip = new THREE.Vector3(rest[9][0], kneeY, kneeZ).addScaledVector(axis, thigh).sub(hipOffset);
    return makeFrame(rest, hip.toArray(), axis.toArray(), [0, -1, 0]);
  };
  let low = .1, high = .65;
  for (let iteration = 0; iteration < 18; iteration++) {
    const candidate = (low + high) / 2, joints = frame(candidate);
    const reachable = armIndices.every(([root, elbow, wrist], side) => vector(joints[root]).distanceTo(vector(palms[side])) <= (length(rest, root, elbow) + length(rest, elbow, wrist)) * .992);
    if (reachable) low = candidate; else high = candidate;
  }
  const rise = low - .160 * repetition(t), joints = frame(rise);
  for (const [side, [hip, knee, ankle]] of legIndices.entries()) {
    joints[knee] = [rest[hip][0], kneeY, kneeZ];
    const lower = length(rest, knee, ankle), lift = .205 * h;
    joints[ankle] = vector(joints[knee]).add(new THREE.Vector3(0, lift, -Math.sqrt(lower * lower - lift * lift))).toArray();
    floorFoot(joints, rest, side, backwardFoot);
  }
  for (const [side] of armIndices.entries()) {
    const sign = side === 0 ? 1 : -1;
    solveLimb(joints, rest, side, 'arm', palms[side], [sign * .5, 0, -1]);
    setHand(joints, rest, side, [0, 0, 1], sign * .90);
  }
  return joints;
}

function birdDog(rest, t, h) {
  const joints = quadrupedFrame(rest, h), activeArm = t < .5 ? 0 : 1, activeLeg = 1 - activeArm;
  const amount = repetition((t * 2) % 1), [shoulder, elbow, wrist] = armIndices[activeArm];
  const sign = activeArm === 0 ? 1 : -1;
  const reach = (length(rest, shoulder, elbow) + length(rest, elbow, wrist)) * .985;
  const angle = amount * Math.PI / 2;
  const target = [joints[shoulder][0] + sign * .02 * h, joints[shoulder][1] - (joints[shoulder][1] - .047 * h) * Math.cos(angle), joints[shoulder][2] + .03 * h * Math.cos(angle) + reach * Math.sin(angle)];
  solveLimb(joints, rest, activeArm, 'arm', target, [sign * .15, 0, -1]);
  setHand(joints, rest, activeArm, [0, .02 * Math.sin(angle), 1], sign * .90);
  const [hip, knee, ankle] = legIndices[activeLeg];
  const legReach = (length(rest, hip, knee) + length(rest, knee, ankle)) * .992;
  const planted = vector(joints[ankle]);
  const extended = vector(joints[hip]).add(new THREE.Vector3(0, 0, -legReach));
  solveLimb(joints, rest, activeLeg, 'leg', planted.lerp(extended, amount).toArray(), [0, -1, 0]);
  floorFoot(joints, rest, activeLeg, backwardFoot);
  return joints;
}

function heelTouch(rest, t, h) {
  const joints = supineFrame(rest, h), active = t < .5 ? 0 : 1;
  const amount = repetition((t * 2) % 1);
  for (const [side, [hip, knee, ankle]] of legIndices.entries()) {
    const upper = length(rest, hip, knee), lower = length(rest, knee, ankle);
    const target = vector(joints[hip]).add(new THREE.Vector3(0, upper * .985, lower * .96));
    // The rounded shoe's heel, rather than its ankle center, touches the mat.
    if (side === active) target.lerp(new THREE.Vector3(joints[hip][0], .083 * h, joints[hip][2] + .57 * h), amount);
    solveLimb(joints, rest, side, 'leg', target.toArray(), [0, 1, 0]);
    floorFoot(joints, rest, side, pitch(-Math.PI / 2));
  }
  return joints;
}

function heelSlide(rest, t, h) {
  const joints = supineFrame(rest, h), active = t < .5 ? 0 : 1;
  const amount = repetition((t * 2) % 1);
  for (const [side, [hip, knee, ankle]] of legIndices.entries()) {
    const reach = length(rest, hip, knee) + length(rest, knee, ankle);
    // Heel contact is deliberate here: the heel slides along the mat, while
    // shoulders, head and the other bent leg stay quiet.
    const travel = side === active ? amount : 0;
    const z = joints[hip][2] + .48 * h + (reach * .965 - .48 * h) * travel;
    solveLimb(joints, rest, side, 'leg', [joints[hip][0], .10 * h, z], [0, 1, 0]);
    floorFoot(joints, rest, side);
  }
  return joints;
}

function catCow(rest, t, h) {
  const joints = quadrupedFrame(rest, h), amount = repetition(t);
  // The rendering rig bends only the trunk skin between the fixed hip and
  // shoulder frames. It must not relocate planted hands or lengthen limbs.
  joints.spineFlex = .060 * h * amount;
  const angle = .12 + .28 * amount;
  supportedNeck(joints, rest, [0, -Math.sin(angle), Math.cos(angle)], [0, -1, 0]);
  return joints;
}

function singleBridge(rest, t, h) {
  const joints = bodyweightPoseJoints('bridge', t, rest);
  // A single stance foot supports the lift; the other thigh/knee extends along
  // the body's diagonal without borrowing a second planted bridge foot.
  const [hip, knee, ankle] = legIndices[0];
  const axis = new THREE.Vector3(0, .44, Math.sqrt(1 - .44 ** 2));
  joints[knee] = vector(joints[hip]).addScaledVector(axis, length(rest, hip, knee)).toArray();
  const shinAxis = axis.clone().applyAxisAngle(new THREE.Vector3(1, 0, 0), -.07);
  joints[ankle] = vector(joints[knee]).addScaledVector(shinAxis, length(rest, knee, ankle)).toArray();
  floorFoot(joints, rest, 0, pitch(-.40));
  return joints;
}

function kneeSidePlank(rest, h) {
  const torso = length(rest, 0, 1), axis = new THREE.Vector3(0, .25, Math.sqrt(1 - .25 ** 2));
  const rotation = orientation(axis.toArray(), [1, 0, 0]);
  const offset = vector(rest[6]).sub(vector(rest[1])).applyQuaternion(rotation);
  const elbowY = .060 * h;
  const hipY = elbowY + length(rest, 6, 7) - axis.y * torso - offset.y;
  const joints = makeFrame(rest, [0, hipY, -.18 * h], axis.toArray(), [1, 0, 0]);
  for (const [side, [hip, knee, ankle]] of legIndices.entries()) {
    const thigh = length(rest, hip, knee);
    // Adduct the upper thigh so the bent knees are stacked, rather than
    // leaving the entire free leg suspended a full pelvis width above support.
    const kneeHeight = (.062 + (side === 0 ? .075 : 0)) * h;
    const drop = THREE.MathUtils.clamp(joints[hip][1] - kneeHeight, -thigh * .97, thigh * .97);
    joints[knee] = vector(joints[hip]).add(new THREE.Vector3(0, -drop, -Math.sqrt(thigh * thigh - drop * drop))).toArray();
    const shin = new THREE.Vector3(.945, .18, -.27).normalize();
    joints[ankle] = vector(joints[knee]).addScaledVector(shin, length(rest, knee, ankle)).toArray();
    floorFoot(joints, rest, side, rotation);
  }
  // The bottom elbow is under the shoulder; the entire forearm is on the mat.
  joints[7] = vector(joints[6]).add(new THREE.Vector3(0, -length(rest, 6, 7), 0)).toArray();
  const forearm = length(rest, 7, 8), wristDrop = .013 * h;
  joints[8] = vector(joints[7]).add(new THREE.Vector3(Math.sqrt(forearm * forearm - wristDrop * wristDrop), -wristDrop, 0)).toArray();
  downwardPalm(joints, rest, 1, [1, 0, 0]);
  // The free hand rests near the hip rather than hovering in a T pose.
  solveLimb(joints, rest, 0, 'arm', [joints[0][0] + .05 * h, joints[0][1] + .14 * h, joints[0][2] + .06 * h], [1, 1, 0]);
  setHand(joints, rest, 0, [0, -.7, -.7]);
  orientLimbs(joints, rest, rotation);
  return joints;
}

function clamshell(rest, t, h) {
  const axis = new THREE.Vector3(0, .015, Math.sqrt(1 - .015 ** 2));
  const joints = makeFrame(rest, [0, .220 * h, -.21 * h], axis.toArray(), [1, 0, 0]);
  supportedNeck(joints, rest, [0, -.28, Math.sqrt(1 - .28 ** 2)], [1, 0, 0]);
  for (const [side, [hip, knee, ankle]] of legIndices.entries()) {
    const target = [joints[hip][0] + .34 * h, .090 * h + (side === 0 ? .026 * h : 0), joints[hip][2] - .51 * h];
    // The upper knee rotates out of the common flexion plane. The pelvis,
    // lower leg and paired feet remain still throughout the opening/return.
    const pole = side === 0 ? [1, .05 + .92 * repetition(t), .32] : [1, .02, .32];
    solveLimb(joints, rest, side, 'leg', target, pole);
    floorFoot(joints, rest, side, orientation(axis.toArray(), [1, 0, 0]));
  }
  // A folded lower arm and a small pad support the resting head/neck.
  solveLimb(joints, rest, 1, 'arm', [.035 * h, .092 * h, joints[1][2] + .21 * h], [1, .25, -.1]);
  setHand(joints, rest, 1, [0, .1, 1]);
  solveLimb(joints, rest, 0, 'arm', [.07 * h, .23 * h, joints[1][2] - .18 * h], [1, 0, 0]);
  setHand(joints, rest, 0, [0, -.3, -.95]);
  orientLimbs(joints, rest, orientation(axis.toArray(), [1, 0, 0]), true);
  joints.equipment = { kind: 'mat', neckSupport: { position: [0, .037 * h, joints[2][2] + .035 * h], size: [.26 * h, .075 * h, .22 * h] } };
  return joints;
}

function proneY(rest, t, h) {
  const rise = -.032;
  const joints = makeFrame(rest, [0, .145 * h, -.10 * h], [0, rise, Math.sqrt(1 - rise * rise)], [0, -1, 0]);
  supportedNeck(joints, rest, [0, .16, Math.sqrt(1 - .16 ** 2)], [0, -1, 0]);
  for (const [side, [hip, knee, ankle]] of legIndices.entries()) {
    const direction = new THREE.Vector3(0, -.04, -Math.sqrt(1 - .04 ** 2));
    joints[knee] = vector(joints[hip]).addScaledVector(direction, length(rest, hip, knee)).toArray();
    joints[ankle] = vector(joints[knee]).addScaledVector(direction, length(rest, knee, ankle)).toArray();
    floorFoot(joints, rest, side, backwardFoot);
  }
  const lift = repetition(t);
  for (const [side, [shoulder, elbow, wrist]] of armIndices.entries()) {
    const sign = side === 0 ? 1 : -1;
    const direction = new THREE.Vector3(sign * .60, -.15 + .19 * lift, .79).normalize();
    joints[elbow] = vector(joints[shoulder]).addScaledVector(direction, length(rest, shoulder, elbow)).toArray();
    const lowerDirection = direction.clone().applyAxisAngle(new THREE.Vector3(sign, 0, 0), -.035);
    joints[wrist] = vector(joints[elbow]).addScaledVector(lowerDirection, length(rest, elbow, wrist)).toArray();
    downwardPalm(joints, rest, side, direction.toArray());
  }
  orientLimbs(joints, rest, orientation([0, rise, Math.sqrt(1 - rise * rise)], [0, -1, 0]));
  joints.equipment = { kind: 'mat', neckSupport: { position: [0, .020 * h, joints[2][2] + .05 * h], size: [.23 * h, .035 * h, .20 * h] } };
  return joints;
}

/** Original movement-specific IK demonstrations; no motion capture claim. */
export function floorCatalogPose(id, progress, rest) {
  if (!FLOOR_CATALOG_IDS.has(id)) return null;
  const t = Number.isFinite(progress) ? THREE.MathUtils.clamp(progress, 0, 1) : 0;
  const h = scaleFor(rest);
  const joints = id === 'pushup' ? kneePushup(rest, t, h)
    : id === 'bird_dog' ? birdDog(rest, t, h)
      : id === 'dead_bug' ? heelTouch(rest, t, h)
        : id === 'heel_slide' ? heelSlide(rest, t, h)
          : id === 'cat_cow' ? catCow(rest, t, h)
            : id === 'single_bridge' ? singleBridge(rest, t, h)
              : id === 'knee_side_plank' ? kneeSidePlank(rest, h)
                : id === 'clamshell' ? clamshell(rest, t, h)
                  : proneY(rest, t, h);
  joints.equipment ||= { kind: 'mat' };
  return joints;
}
