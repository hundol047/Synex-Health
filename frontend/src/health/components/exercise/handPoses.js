import * as THREE from 'three';
import { handRestFrame } from './exerciseGrip.js';
import { orientation, scaleFor, segmentLength, solveLimb, vector } from './poseMath.js';

export const CLASP_MOTIONS = new Set(['squat', 'lunge', 'side_lunge', 'sumo_squat', 'reverse_lunge', 'sit_stand', 'wall_hinge']);
const SUPPORT_MOTIONS = new Set(['pushup', 'full_pushup', 'push_up', 'plank', 'bridge', 'glute_bridge', 'single_bridge', 'heel_slide', 'dead_bug', 'bird_dog', 'cat_cow', 'wall_push', 'close_wall_push', 'incline_push', 'calf_stretch', 'recovery_child', 'recovery_child_side', 'recovery_cat_release', 'recovery_figure_four', 'recovery_ankle_circles', 'recovery_wrist_flex', 'recovery_wrist_extend']);
const SINGLE_SUPPORT = new Set(['calf', 'single_calf', 'split_squat', 'hip_abduction']);

export function exerciseHandShape(motion, joints) {
  if (motion === 'prone_y') return 'open';
  if (motion === 'treadmill_walk') return 'relaxed';
  if (joints.equipment?.grip) return joints.equipment.grip;
  if (CLASP_MOTIONS.has(motion)) return 'clasp';
  if (SUPPORT_MOTIONS.has(motion)) return 'open';
  if (SINGLE_SUPPORT.has(motion)) return ['open', 'relaxed'];
  if (motion === 'knee_side_plank') return ['relaxed', 'open'];
  if (motion === 'clamshell') return ['open', 'relaxed'];
  return 'relaxed';
}

// Opposed palms, staggered finger rows and fixed-length arm IK. The two hands
// share one contact frame throughout the repetition instead of independently
// aiming two flat palms at the same point and letting their surfaces intersect.
export function refineExerciseHands(motion, joints, rest) {
  if (!CLASP_MOTIONS.has(motion)) return joints;
  const h = scaleFor(rest), center = vector(joints[5]).add(vector(joints[8])).multiplyScalar(.5);
  joints.boneRotations ||= {};
  for (const side of [0, 1]) {
    const { wrist, finger, sign, along, back } = handRestFrame(rest, side);
    const handScale = h * (rest.handGripScale?.[side] || 1);
    const direction = [-sign, 0, 0], palmBack = [0, 0, sign];
    const target = center.clone().add(new THREE.Vector3(sign * .174 * handScale, (side ? .074 : -.060) * handScale, -sign * .004 * handScale));
    solveLimb(joints, rest, side, 'arm', target.toArray(), [sign * .7, -.7, -.1]);
    joints[finger] = vector(joints[wrist]).addScaledVector(vector(direction), segmentLength(rest, wrist, finger)).toArray();
    const rotation = orientation(direction, palmBack).multiply(orientation(along.toArray(), back.toArray()).invert());
    joints.boneRotations[12 + side] = rotation.toArray();
    // Carry the palm's roll through the lower arm; independently rotating the
    // hand left a narrow, twisted seam where the wrist weights blend.
    const elbow = side ? 7 : 4;
    const forearm = vector(joints[wrist]).sub(vector(joints[elbow])).normalize();
    const aligned = vector(rest[wrist]).sub(vector(rest[elbow])).normalize().applyQuaternion(rotation);
    joints.boneRotations[3 + side * 2] = new THREE.Quaternion().setFromUnitVectors(aligned, forearm).multiply(rotation).toArray();
  }
  return joints;
}
