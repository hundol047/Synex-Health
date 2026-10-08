import * as THREE from 'three';
import { bodyweightPoseJoints } from './bodyweightRig.js';
import { repetition, smoothStep, solveTwoBone } from './poseMath.js';
import { toolGripAnchor, toolHandRotation } from './exerciseGrip.js';

// Authored joint paths and support anchors, not captured biomechanics. All
// equipment coordinates travel with the same pose frame as the athlete.
export const EQUIPMENT_CATALOG_IDS = new Set([
  'band_row', 'curl', 'shoulder_press', 'lateral_raise', 'triceps_extension',
  'goblet_squat', 'dumbbell_row', 'band_pull_apart', 'hammer_curl', 'front_raise',
  'dumbbell_rdl', 'barbell_rdl', 'dumbbell_split_squat', 'dumbbell_shrug',
  'machine_chest_press', 'lat_pulldown', 'machine_row', 'leg_press',
  'leg_extension', 'seated_leg_curl', 'machine_hip_abduction', 'cable_pushdown',
  'cable_face_pull', 'cable_row', 'dumbbell_bench_press', 'dumbbell_floor_press',
  'barbell_bench_press', 'barbell_squat', 'treadmill_walk', 'stationary_cycle',
  'elliptical', 'cable_pallof',
]);

const v = point => new THREE.Vector3(...point);
const unit = point => v(point).normalize();
const smooth = smoothStep;
const rep = repetition;
const average = (a, b) => a.map((value, i) => (value + b[i]) / 2);

const solveLimb = solveTwoBone;

export function equipmentCatalogPose(id, progress, rest) {
  if (!EQUIPMENT_CATALOG_IDS.has(id)) return null;
  const t = Number.isFinite(progress) ? THREE.MathUtils.clamp(progress, 0, 1) : 0;
  const e = rep(t), h = rest[0][1] / .94;
  const joints = rest.map(point => point.slice());
  const length = (a, b) => v(rest[a]).distanceTo(v(rest[b]));
  const arm = [[3, 4, 5, 17], [6, 7, 8, 18]];
  const leg = [[9, 10, 11, 15], [12, 13, 14, 16]];
  const data = { type: id, scale: h };
  const point = (x, y, z) => [x * h, y * h, z * h];
  const setFrame = (hip, axis = [0, 1, 0], pelvisAxis = [0, 1, 0]) => {
    const direction = unit(axis);
    joints[0] = hip.slice();
    joints[1] = v(hip).addScaledVector(direction, length(0, 1)).toArray();
    joints[2] = v(joints[1]).addScaledVector(direction, length(1, 2)).toArray();
    const torso = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
    const pelvis = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), unit(pelvisAxis));
    for (const [root, parent] of [[3, 1], [6, 1], [9, 0], [12, 0]]) {
      joints[root] = v(rest[root]).sub(v(rest[parent])).applyQuaternion(parent === 0 ? pelvis : torso).add(v(joints[parent])).toArray();
    }
    joints.boneRotations = { 0: torso.toArray(), 1: torso.toArray() };
  };
  const setArm = (i, target, bend = [i === 0 ? 1 : -1, -1, 0], handDirection) => {
    const [root, elbow, wrist, finger] = arm[i];
    [joints[elbow], joints[wrist]] = solveLimb(joints[root], target, length(root, elbow), length(elbow, wrist), bend);
    joints[finger] = v(joints[wrist]).addScaledVector(handDirection ? unit(handDirection) : v(joints[wrist]).sub(v(joints[elbow])).normalize(), length(wrist, finger)).toArray();
  };
  const armFK = (i, upperDirection, forearmDirection, handDirection) => {
    const [root, elbow, wrist, finger] = arm[i];
    joints[elbow] = v(joints[root]).addScaledVector(unit(upperDirection), length(root, elbow)).toArray();
    joints[wrist] = v(joints[elbow]).addScaledVector(unit(forearmDirection), length(elbow, wrist)).toArray();
    joints[finger] = v(joints[wrist]).addScaledVector(unit(handDirection || forearmDirection), length(wrist, finger)).toArray();
  };
  const setLeg = (i, target, bend = [0, 0, 1], footPitch = 0) => {
    const [root, knee, ankle, toe] = leg[i];
    [joints[knee], joints[ankle]] = solveLimb(joints[root], target, length(root, knee), length(knee, ankle), bend);
    const rotation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), footPitch);
    joints[toe] = v(joints[ankle]).add(v(rest[toe]).sub(v(rest[ankle])).applyQuaternion(rotation)).toArray();
  };
  const planted = () => leg.forEach(([, , ankle], i) => setLeg(i, rest[ankle]));
  const relaxedArms = () => arm.forEach(([root], i) => {
    const side = i === 0 ? 1 : -1, reach = length(root, root + 1) + length(root + 1, root + 2);
    setArm(i, v(joints[root]).add(new THREE.Vector3(side * .025 * h, -reach * .98, .025 * h)).toArray());
  });
  const averageShin = (length(10, 11) + length(13, 14)) / 2;
  const seatedHipY = .10 * h + averageShin + (rest[0][1] - rest[9][1]);
  const seatedFrame = (tilt = 0) => {
    setFrame([0, seatedHipY, 0], [0, Math.cos(tilt), Math.sin(tilt)]);
    // Joint centers sit above the supporting skin surface. Place pads beneath
    // the gluteal envelope, not through the pelvis/thigh mesh.
    data.seat = [0, seatedHipY - .205 * h, .08 * h];
    data.back = { center: [0, seatedHipY + .22 * h, (-.185 + .22 * Math.sin(tilt)) * h], angle: -tilt };
    leg.forEach(([root, knee, ankle, toe], i) => {
      joints[knee] = v(joints[root]).add(new THREE.Vector3(0, 0, length(root, knee))).toArray();
      joints[ankle] = v(joints[knee]).add(new THREE.Vector3(0, -length(knee, ankle), .005 * h)).toArray();
      // Resolve the tiny sagittal bias without changing shin length.
      joints[ankle] = v(joints[knee]).addScaledVector(v(joints[ankle]).sub(v(joints[knee])).normalize(), length(knee, ankle)).toArray();
      joints[toe] = v(joints[ankle]).add(v(rest[toe]).sub(v(rest[ankle]))).toArray();
    });
  };

  if (['goblet_squat', 'barbell_squat', 'dumbbell_rdl', 'barbell_rdl'].includes(id)) {
    const family = id.includes('rdl') ? 'hinge' : 'squat';
    const base = bodyweightPoseJoints(family, t, rest);
    base.forEach((p, i) => { joints[i] = p.slice(); });
    for (let i = 0; i < 2; i++) {
      const side = i === 0 ? 1 : -1, root = arm[i][0];
      if (id === 'goblet_squat') setArm(i, [side * .215 * h, joints[1][1] - .135 * h, joints[1][2] + .17 * h], [side * .5, -1, .1], [-side, 0, 0]);
      else if (id === 'barbell_squat') setArm(i, [side * .33 * h, joints[1][1] - .015 * h, joints[1][2] + .07 * h], [side, -1, -.1], [0, 0, -.5]);
      else setArm(i, [side * (id === 'barbell_rdl' ? .25 : .22) * h, joints[root][1] - (length(root, root + 1) + length(root + 1, root + 2)) * .975, joints[root][2] + .035 * h], [0, 0, 1]);
    }
    if (id === 'goblet_squat') data.grip = 'goblet';
  } else if (id === 'dumbbell_split_squat') {
    setFrame(point(0, .81 - .235 * e, -.035), [0, Math.cos(.07 + .12 * e), Math.sin(.07 + .12 * e)]);
    setLeg(0, point(.16, .10, .24));
    const rotation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), .58);
    const rear = v(point(-.16, .04, -.40)).sub(v(rest[16]).sub(v(rest[14])).applyQuaternion(rotation)).toArray();
    setLeg(1, rear, [0, 0, 1], .58);
    relaxedArms();
  } else if (['dumbbell_bench_press', 'dumbbell_floor_press', 'barbell_bench_press'].includes(id)) {
    const floor = id === 'dumbbell_floor_press', support = (floor ? .095 : .55) * h;
    setFrame([0, support + .04 * h, .18 * h], [0, 0, -1], [0, 0, -1]);
    // The occiput rests on the same support plane as the upper back instead of
    // leaving the head floating above a bench or the mat.
    const neckDrop = .045 * h, neck = length(1, 2);
    const neckDirection = unit([0, -neckDrop, -Math.sqrt(Math.max(0, neck ** 2 - neckDrop ** 2))]);
    joints[2] = v(joints[1]).addScaledVector(neckDirection, neck).toArray();
    joints.boneRotations[1] = new THREE.Quaternion().setFromUnitVectors(v(rest[2]).sub(v(rest[1])).normalize(), neckDirection).toArray();
    const targetFoot = floor ? point(.18, .10, .83) : point(.18, .10, .68);
    for (let i = 0; i < 2; i++) {
      const side = i === 0 ? 1 : -1, root = arm[i][0];
      setLeg(i, [side * targetFoot[0], targetFoot[1], targetFoot[2]], [0, 1, .15]);
      const spread = id === 'barbell_bench_press' ? .285 : .23 - .035 * e;
      const reach = length(root, root + 1) + length(root + 1, root + 2);
      const low = floor ? .155 : .13;
      setArm(i, [side * spread * h, joints[root][1] + low * h + (reach * .95 - low * h) * e, joints[root][2] + .035 * h], [side, -.3, .3], [0, 1, 0]);
    }
    data.bench = floor ? null : { center: [0, support - .13 * h, -.11 * h], top: support - .085 * h, length: 1.05 * h };
    data.supportY = support;
  } else if (['machine_chest_press', 'lat_pulldown', 'machine_row', 'cable_row', 'leg_extension', 'seated_leg_curl', 'machine_hip_abduction'].includes(id)) {
    seatedFrame(id === 'lat_pulldown' ? -.055 : id === 'machine_row' ? .09 : 0);
    relaxedArms();
    // Hands rest on the side supports; they do not dangle through the seat.
    if (['leg_extension', 'seated_leg_curl', 'machine_hip_abduction'].includes(id)) {
      arm.forEach(([root], i) => setArm(i, [joints[root][0] + (i === 0 ? .025 : -.025) * h, joints[root][1] - (length(root, root + 1) + length(root + 1, root + 2)) * .975, .035 * h], [i === 0 ? 1 : -1, 0, .3], [0, 0, 1]));
    }
    if (id === 'leg_extension' || id === 'seated_leg_curl') {
      const theta = id === 'leg_extension' ? 1.38 * e : 1.18 - 1.50 * e;
      leg.forEach(([, knee, ankle, toe]) => {
        joints[ankle] = v(joints[knee]).addScaledVector(unit([0, -Math.cos(theta), Math.sin(theta)]), length(knee, ankle)).toArray();
        joints[toe] = v(joints[ankle]).add(v(rest[toe]).sub(v(rest[ankle])).applyAxisAngle(new THREE.Vector3(1, 0, 0), -theta)).toArray();
      });
      data.rollers = [joints[11].slice(), joints[14].slice()];
      data.kneeAxis = average(joints[10], joints[13]);
    } else if (id === 'machine_hip_abduction') {
      leg.forEach(([root, knee, ankle, toe], i) => {
        const theta = .12 + .55 * e, side = i === 0 ? 1 : -1;
        joints[knee] = v(joints[root]).addScaledVector(unit([side * Math.sin(theta), 0, Math.cos(theta)]), length(root, knee)).toArray();
        joints[ankle] = v(joints[knee]).add(new THREE.Vector3(0, -length(knee, ankle), 0)).toArray();
        joints[toe] = v(joints[ankle]).add(v(rest[toe]).sub(v(rest[ankle]))).toArray();
      });
      data.rollers = [joints[10].slice(), joints[13].slice()];
    } else {
      for (let i = 0; i < 2; i++) {
        const side = i === 0 ? 1 : -1, root = arm[i][0], shoulder = joints[root];
        let target, toward;
        if (id === 'machine_chest_press') {
          target = [side * (.24 - .03 * e) * h, shoulder[1] - .065 * h, shoulder[2] + (.18 + .23 * e) * h];
          toward = [side, -.6, -.3];
        } else if (id === 'lat_pulldown') {
          target = [side * (.31 + .01 * e) * h, shoulder[1] + (.38 - .42 * e) * h, shoulder[2] + .11 * h];
          toward = [side, -1, -.2];
        } else {
          target = [side * .14 * h, shoulder[1] - (.12 + .075 * e) * h, shoulder[2] + (.40 - .22 * e) * h];
          toward = [side * .1, -.1, -1];
        }
        setArm(i, target, toward, [0, 0, 1]);
      }
      if (id === 'lat_pulldown') data.pulley = point(0, 1.91, .22);
      else if (id === 'cable_row') data.pulley = point(0, .58, 1.0);
    }
  } else if (id === 'leg_press') {
    setFrame(point(0, .44, -.28), [0, .69, -.72], [0, .90, -.44]);
    data.seat = point(0, .23, -.28);
    data.back = { center: point(0, .69, -.57), angle: -.81 };
    for (let i = 0; i < 2; i++) setLeg(i, point(i === 0 ? .16 : -.16, .44 + .23 * e, .31 + .11 * e), [0, 1, .1], -.88);
    for (let i = 0; i < 2; i++) setArm(i, point(i === 0 ? .235 : -.235, .49, -.24), [i === 0 ? 1 : -1, -1, 0], [0, 0, 1]);
    const feet = average(average(joints[11], joints[15]), average(joints[14], joints[16]));
    const plateNormal = unit([0, .64, -.77]);
    data.footplate = { center: v(feet).addScaledVector(plateNormal, -.085 * h).toArray(), normal: plateNormal.toArray() };
  } else if (id === 'stationary_cycle') {
    setFrame(point(0, .91, -.03), [0, Math.cos(.31), Math.sin(.31)]);
    data.seat = point(0, .70, -.03);
    data.pedalPivot = point(0, .40, .32);
    data.pedals = [];
    for (let i = 0; i < 2; i++) {
      const phase = 2 * Math.PI * t + i * Math.PI;
      const pedal = point(i === 0 ? .14 : -.14, .40 + .18 * Math.cos(phase), .32 + .18 * Math.sin(phase));
      data.pedals.push(pedal);
      setLeg(i, v(pedal).add(new THREE.Vector3(0, .055 * h, -.045 * h)).toArray(), [0, 0, 1], .09 * Math.sin(phase));
      setArm(i, point(i === 0 ? .205 : -.205, 1.17, .49), [i === 0 ? .5 : -.5, -1, 0], [0, 0, 1]);
    }
  } else if (id === 'treadmill_walk' || id === 'elliptical') {
    const phi = 2 * Math.PI * t, elliptical = id === 'elliptical';
    const belt = elliptical ? .065 : .06;
    setFrame([.008 * h * Math.sin(phi), rest[0][1] + (belt - .045) * h - .009 * h * (1 - Math.cos(phi * 2)), rest[0][2]], [0, Math.cos(.025), Math.sin(.025)]);
    data.beltY = belt * h;
    data.pedals = [];
    for (let i = 0; i < 2; i++) {
      const side = i === 0 ? 1 : -1, phase = phi + i * Math.PI;
      let ankle;
      if (elliptical) ankle = point(side * .15, .19 + .028 * Math.sin(phase), .04 + .24 * Math.cos(phase));
      else {
        const cycle = ((t + i * .5) % 1 + 1) % 1;
        const stance = cycle < .60;
        const part = stance ? cycle / .60 : (cycle - .60) / .40;
        const travel = smooth(0, 1, part);
        ankle = point(side * .15, .16 + (stance ? 0 : .105 * Math.sin(Math.PI * travel)), .035 + (stance ? .22 - .44 * travel : -.22 + .44 * travel));
      }
      setLeg(i, ankle, [0, 0, 1]);
      if (elliptical) {
        data.pedals.push(v(ankle).add(new THREE.Vector3(0, -.060 * h, .045 * h)).toArray());
        setArm(i, point(side * .30, 1.30, .26 - .13 * Math.cos(phase)), [side * .5, -1, 0], [0, 1, 0]);
      } else {
        const swing = -.23 * Math.cos(phase);
        armFK(i, [0, -Math.cos(swing), Math.sin(swing)], [0, -Math.cos(swing + .47), Math.sin(swing + .47)]);
      }
    }
    if (elliptical) data.pedalPivot = point(0, .20, .18);
  } else {
    const row = id === 'dumbbell_row';
    setFrame(row ? point(0, .85, -.21) : rest[0], row ? [0, Math.cos(.90), Math.sin(.90)] : [0, 1, 0]);
    planted();
    for (let i = 0; i < 2; i++) {
      const side = i === 0 ? 1 : -1, root = arm[i][0], shoulder = joints[root];
      if (id === 'curl' || id === 'hammer_curl') {
        const theta = .04 + 2.08 * e;
        armFK(i, [side * .06, -.997, 0], [0, -Math.cos(theta), Math.sin(theta)]);
        if (id === 'hammer_curl') data.gripAxes = [0, 1].map(() => [0, Math.sin(theta), Math.cos(theta)]);
      } else if (id === 'shoulder_press') {
        setArm(i, [side * (.32 - .105 * e) * h, shoulder[1] + (-.015 + .42 * e) * h, shoulder[2] + .065 * h], [side, .1, .1], [0, 1, 0]);
      } else if (id === 'lateral_raise' || id === 'front_raise') {
        const theta = .04 + 1.31 * e, lateral = id === 'lateral_raise';
        armFK(i, lateral ? [side * Math.sin(theta), -Math.cos(theta), 0] : [0, -Math.cos(theta), Math.sin(theta)], lateral ? [side * Math.sin(theta), -Math.cos(theta), .12] : [0, -Math.cos(theta), Math.sin(theta + .075)]);
        data.gripAxes = [[0, 0, 1], [0, 0, 1]];
      } else if (id === 'triceps_extension') {
        const theta = 2.02 * (1 - e);
        const transverse = (side * .215 * h - shoulder[0]) / (length(root, root + 1) + length(root + 1, root + 2));
        const sagittal = Math.sqrt(Math.max(0, 1 - transverse ** 2));
        armFK(i, [transverse, sagittal, 0], [transverse, sagittal * Math.cos(theta), -sagittal * Math.sin(theta)], [-side, 0, 0]);
        data.grip = 'goblet';
      } else if (id === 'dumbbell_shrug') {
        // Scapular elevation rather than a spurious elbow curl or torso lift.
        joints[root][1] += .040 * h * e;
        armFK(i, [side * .06, -.998, 0], [side * .03, -.999, 0]);
      } else if (row) {
        setArm(i, [shoulder[0], shoulder[1] - (.41 - .205 * e) * h, shoulder[2] - .20 * h * e], [0, 0, -1]);
      } else if (id === 'band_row') {
        setArm(i, [side * .16 * h, shoulder[1] - (.09 + .09 * e) * h, shoulder[2] + (.395 - .24 * e) * h], [side * .2, 0, -1], [0, 0, 1]);
        data.pulley = point(0, 1.28, .91);
      } else if (id === 'band_pull_apart') {
        setArm(i, [side * (.11 + .48 * e) * h, shoulder[1] - .05 * h, shoulder[2] + (.40 - .32 * e) * h], [side, -.2, -.1], [0, 0, 1]);
      } else if (id === 'cable_pushdown') {
        armFK(i, [side * .035, -.97, .16], [0, -Math.cos(1.30 * (1 - e)), Math.sin(1.30 * (1 - e))]);
        data.pulley = point(0, 1.93, .60);
      } else if (id === 'cable_face_pull') {
        setArm(i, [side * (.12 + .14 * e) * h, shoulder[1] + .12 * h * e, shoulder[2] + (.40 - .28 * e) * h], [side, .15, -.5], [0, 0, 1]);
        data.pulley = point(0, 1.56, 1.05);
      } else if (id === 'cable_pallof') {
        setArm(i, [side * .022 * h, shoulder[1] - .125 * h, shoulder[2] + (.16 + .212 * e) * h], [side, -.2, -.1], [0, 0, 1]);
        data.pulley = point(-1.0, 1.31, .31);
      }
    }
  }
  if (!data.gripAxes) data.gripAxes = [[1, 0, 0], [1, 0, 0]];
  if (id === 'hammer_curl') data.gripAxes[1] = data.gripAxes[0].map(value => -value);
  if (['machine_chest_press', 'machine_row', 'cable_face_pull', 'goblet_squat', 'triceps_extension'].includes(id)) data.gripAxes = [[0, 1, 0], [0, -1, 0]];
  if (['stationary_cycle', 'leg_press', 'leg_extension', 'seated_leg_curl', 'machine_hip_abduction'].includes(id)) {
    data.gripAxes = [[0, 0, 1], [0, 0, -1]];
    arm.forEach(([, , wrist, finger]) => { joints[finger] = v(joints[wrist]).add(new THREE.Vector3(0, -length(wrist, finger), 0)).toArray(); });
  }
  data.wristAnchors = [joints[5].slice(), joints[8].slice()];
  data.grip = 'closed';
  joints.boneRotations ||= {};
  data.handles = arm.map((_, i) => {
    const rotation = toolHandRotation(rest, joints, i, data.gripAxes[i]);
    joints.boneRotations[12 + i] = rotation.toArray();
    return toolGripAnchor(rest, joints, i, rotation);
  });
  if (id.startsWith('barbell_') || id === 'lat_pulldown') data.bar = data.handles.map(point => point.slice());
  joints.equipment = data;
  return joints;
}
