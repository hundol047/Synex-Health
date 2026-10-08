import * as THREE from 'three';
import { equipmentDescriptor, isEquipmentPoint } from './exerciseEquipmentSpec.js';

const point = (p, fallback) => isEquipmentPoint(p) ? p : isEquipmentPoint(p?.center) ? p.center : fallback;
const add = (a, b) => a.map((v, i) => v + b[i]);
const avg = points => points[0].map((_, i) => points.reduce((n, p) => n + p[i], 0) / points.length);
const scaled = (p, h) => p.map(v => v * h);

// Bounds follow the actual procedural primitives in ExerciseEquipment. Each
// part retains its own box so fixed cameras can fit occupied space instead of
// treating the empty corners of an entire gym machine as visible geometry.
export function equipmentBounds(motion, joints = [], rest = [], heightScale) {
  const s = equipmentDescriptor(motion, joints, rest, heightScale), { h, handles, kind } = s;
  const parts = [];
  const extent = (at, half) => {
    if (!isEquipmentPoint(at) || !isEquipmentPoint(half)) return;
    parts.push({ min: at.map((v, i) => v - half[i]), max: at.map((v, i) => v + half[i]) });
  };
  const box = (at, size, rotation = [0, 0, 0]) => {
    const m = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(...rotation)).elements;
    extent(at, [0, 1, 2].map(i => Math.abs(m[i]) * size[0] / 2 + Math.abs(m[i + 4]) * size[1] / 2 + Math.abs(m[i + 8]) * size[2] / 2));
  };
  const axial = (at, axis, radius, length) => {
    const direction = new THREE.Vector3(...axis).normalize().toArray();
    extent(at, direction.map(value => Math.abs(value) * length / 2 + radius * Math.sqrt(Math.max(0, 1 - value * value))));
  };
  const tube = (a, b, radius) => {
    const half = a.map((value, i) => Math.abs(b[i] - value) / 2 + radius);
    extent(avg([a, b]), half);
  };
  const grip = (at, axis = [1, 0, 0]) => axial(at, axis, .018 * h, .115 * h);
  const chair = () => {
    const seat = s.seat, back = point(s.back, add(seat, [0, .25 * h, -.18 * h]));
    box(seat, scaled([.41, .07, .40], h));
    box(back, scaled([.36, .43, .075], h), [s.back?.angle || 0, 0, 0]);
    for (const x of [-1, 1]) for (const z of [-1, 1]) {
      const at = [seat[0] + x * .17 * h, .035 * h, seat[2] + z * .16 * h];
      tube(at, [at[0], seat[1] - .02 * h, at[2]], .021 * h);
    }
    tube([seat[0] - .17 * h, .10 * h, seat[2] - .16 * h], [seat[0] + .17 * h, .10 * h, seat[2] - .16 * h], .022 * h);
    for (const side of [-1, 1]) tube([seat[0] + side * .14 * h, seat[1], seat[2] - .17 * h], [back[0] + side * .14 * h, back[1], back[2]], .022 * h);
  };
  const bench = (incline = false, rack = false) => {
    const center = incline ? [0, (s.topY ?? .69 * h) - .045 * h, s.topZ ?? .42 * h] : point(s.bench, scaled([0, .505, -.11], h));
    const depth = incline ? .39 * h : s.bench?.length || 1.05 * h;
    box(center, [(incline ? .76 : .40) * h, .09 * h, depth]);
    tube(add(center, [0, -.09 * h, -depth * .35]), add(center, [0, -.09 * h, depth * .35]), .04 * h);
    for (const side of [-1, 1]) {
      const z = center[2] + side * depth * .34;
      tube([0, center[1] - .07 * h, z], [0, .055 * h, z], .035 * h);
      tube([-.27 * h, .04 * h, z], [.27 * h, .04 * h, z], .03 * h);
      if (rack) {
        tube([side * .46 * h, .04 * h, center[2] - .47 * h], [side * .46 * h, 1.12 * h, center[2] - .47 * h], .026 * h);
        tube([side * .46 * h, .72 * h, center[2] - .47 * h], [side * .46 * h, .72 * h, center[2] - .10 * h], .023 * h);
        box([side * .46 * h, .026 * h, center[2] - .38 * h], scaled([.10, .04, .45], h));
      }
    }
  };
  const dumbbells = () => {
    const single = kind === 'single_dumbbell';
    for (const [i, at] of (single ? [avg(handles)] : handles).entries()) {
      const axis = new THREE.Vector3(...(single ? [0, 1, 0] : point(s.gripAxes?.[i] || s.gripAxis, motion === 'hammer_curl' ? [0, 0, 1] : [1, 0, 0]))).normalize().toArray();
      axial(at, axis, .015 * h, .25 * h);
      for (const side of [-1, 1]) {
        axial(add(at, axis.map(v => v * side * .098 * h)), axis, .088 * h, .055 * h);
        axial(add(at, axis.map(v => v * side * .066 * h)), axis, .025 * h, .016 * h);
        axial(add(at, axis.map(v => v * side * .13 * h)), axis, .033 * h, .009 * h);
      }
    }
  };
  const barbell = () => {
    const direction = new THREE.Vector3(...handles[1]).sub(new THREE.Vector3(...handles[0]));
    if (direction.lengthSq() < .001) direction.set(1, 0, 0);
    const axis = direction.normalize().toArray(), center = point(s.bar?.center || s.bar, avg(handles));
    const span = Math.max(.94 * h, new THREE.Vector3(...handles[0]).distanceTo(new THREE.Vector3(...handles[1])) + .68 * h);
    axial(center, axis, .016 * h, span + .26 * h);
    for (const side of [-1, 1]) {
      for (const [i, offset] of [0, .047].entries()) axial(add(center, axis.map(v => v * side * (span / 2 - .04 * h + offset * h))), axis, (i === 0 ? .18 : .14) * h, .036 * h);
      axial(add(center, axis.map(v => v * side * (span / 2 + .075 * h))), axis, .025 * h, .045 * h);
    }
  };
  const machineFrame = () => {
    chair();
    tube(scaled([-.40, .045, -.27], h), scaled([.40, .045, -.27], h), .038 * h);
    tube(scaled([0, .045, -.30], h), scaled([0, .045, .64], h), .035 * h);
    tube(scaled([0, .07, -.24], h), [0, s.seat[1] + .43 * h, -.24 * h], .032 * h);
    for (const side of [-1, 1]) box([side * .36 * h, .04 * h, -.27 * h], scaled([.12, .065, .22], h));
  };
  const pulley = () => point(s.pulley, scaled(kind === 'cable_row' ? [0, .64, 1.05] : kind === 'cable_pallof' ? [-.90, 1.1, .45] : [0, 1.85, .80], h));
  const tower = (seated) => {
    const p = pulley(), mast = [p[0], 1.04 * h, kind === 'cable_pallof' ? p[2] : Math.max(p[2] + .08 * h, .88 * h)];
    box([mast[0], .035 * h, mast[2]], scaled([.40, .065, .48], h));
    for (const x of [-1, 1]) tube([mast[0] + x * .12 * h, .065 * h, mast[2]], [mast[0] + x * .12 * h, 2.05 * h, mast[2]], .026 * h);
    box([mast[0], 1.05 * h, mast[2]], scaled([.34, 1.9, .16], h));
    for (let i = 0; i < 6; i++) box([mast[0], (.14 + i * .056) * h, mast[2]], scaled([.24, .043, .13], h));
    tube([mast[0], .37 * h, mast[2]], [mast[0], 1.88 * h, mast[2]], .008 * h);
    tube([mast[0], p[1], mast[2]], p, .025 * h);
    axial(p, [1, 0, 0], .053 * h, .035 * h);
    tube([mast[0], .34 * h, mast[2]], p, .0035 * h);
    if (seated) chair();
  };
  const cables = () => {
    const middle = avg(handles), split = kind === 'cable_face_pull' || kind === 'cable_pallof';
    const meeting = split ? add(middle, [0, kind === 'cable_face_pull' ? .025 * h : 0, .08 * h]) : middle;
    tube(pulley(), meeting, .004 * h);
    if (split) for (const at of handles) { tube(meeting, at, .011 * h); grip(at, [0, 1, 0]); }
    else { tube(handles[0], handles[1], .014 * h); handles.forEach(at => grip(at)); }
  };
  switch (kind) {
    case 'chair': chair(); break;
    case 'wall': case 'back_wall': {
      const face = s.wallZ ?? (kind === 'back_wall' ? -.23 : .64) * h;
      const z = face + (kind === 'back_wall' ? -1 : 1) * .014 * h;
      box([0, .90 * h, z], scaled([1.2, 1.80, .028], h));
      tube([-.6 * h, .018 * h, z], [.6 * h, .018 * h, z], .013 * h);
      for (const side of [-1, 1]) tube([side * .6 * h, .02 * h, z], [side * .6 * h, 1.80 * h, z], .012 * h);
      break;
    }
    case 'support': {
      const top = point(s.supportCenter || s.supportTop, s.contactPoints?.filter(isEquipmentPoint)[0] || scaled([.45, 1.08, .28], h));
      tube(add(top, [0, 0, -.20 * h]), add(top, [0, 0, .20 * h]), .025 * h);
      for (const side of [-1, 1]) {
        tube(add(top, [0, 0, side * .16 * h]), [top[0], .04 * h, top[2] + side * .16 * h], .023 * h);
        tube([top[0] - .12 * h, .035 * h, top[2] + side * .16 * h], [top[0] + .12 * h, .035 * h, top[2] + side * .16 * h], .024 * h);
      }
      break;
    }
    case 'incline': bench(true); break;
    case 'dumbbell': case 'single_dumbbell': dumbbells(); break;
    case 'barbell': barbell(); break;
    case 'bench_dumbbell': bench(); dumbbells(); break;
    case 'bench_barbell': bench(false, true); barbell(); break;
    case 'band_pull_apart': tube(handles[0], handles[1], .012 * h); handles.forEach(at => grip(at, [0, 1, 0])); break;
    case 'band_row': {
      const anchor = point(s.anchor || s.pulley, scaled([0, .95, .83], h));
      tube([0, .025 * h, anchor[2]], [0, 1.75 * h, anchor[2]], .025 * h);
      box([0, .025 * h, anchor[2]], scaled([.45, .04, .36], h));
      axial(anchor, [1, 0, 0], .035 * h, .07 * h);
      for (const at of handles) { tube(anchor, at, .009 * h); grip(at); }
      break;
    }
    case 'machine_chest_press': case 'machine_row': {
      machineFrame(); const row = kind === 'machine_row';
      if (row) box(point(s.chestPad, scaled([0, .91, .24], h)), scaled([.28, .29, .09], h), [-.10, 0, 0]);
      const pivots = s.pivots || handles.map(at => [(Math.sign(at[0]) || 1) * .45 * h, (row ? .44 : 1.20) * h, (row ? .80 : -.16) * h]);
      handles.forEach((at, i) => { tube([pivots[i][0], .04 * h, pivots[i][2]], pivots[i], .027 * h); axial(pivots[i], [1, 0, 0], .047 * h, .06 * h); tube(pivots[i], at, .020 * h); grip(at, [0, 1, 0]); });
      break;
    }
    case 'lat_pulldown': case 'cable_row': tower(true); cables(); if (kind === 'lat_pulldown') axial(add(s.seat, [0, .16 * h, .29 * h]), [1, 0, 0], .065 * h, .46 * h); break;
    case 'cable_pushdown': case 'cable_face_pull': case 'cable_pallof': tower(false); cables(); break;
    case 'leg_press': case 'leg_extension': case 'seated_leg_curl': case 'machine_hip_abduction': {
      machineFrame();
      const ankles = [point(joints[11], scaled([-.14, .12, .46], h)), point(joints[14], scaled([.14, .12, .46], h))];
      const knees = [point(joints[10], scaled([-.14, .53, .35], h)), point(joints[13], scaled([.14, .53, .35], h))];
      const rollers = s.rollers?.filter(isEquipmentPoint) || [];
      const shin = new THREE.Vector3(...avg(ankles)).sub(new THREE.Vector3(...avg(knees))).normalize();
      const side = kind === 'seated_leg_curl' ? -1 : 1;
      const roller = add(rollers.length ? avg(rollers) : avg(ankles), [0, shin.z * .09 * h * side, -shin.y * .09 * h * side]);
      const knee = point(s.kneeAxis, avg(knees));
      if (kind === 'leg_press') {
        const plate = point(s.footplate, add(avg(ankles), [0, 0, .085 * h]));
        const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(...point(s.footplate?.normal, [0, -.35, -1])).normalize());
        const euler = new THREE.Euler().setFromQuaternion(quaternion);
        box(plate, scaled([.64, .40, .06], h), [euler.x, euler.y, euler.z]);
        for (const x of [-1, 1]) tube([x * .30 * h, .075 * h, -.13 * h], [x * .30 * h, .075 * h, 1.10 * h], .032 * h);
        tube(scaled([0, .08, .35], h), add(plate, [0, -.08 * h, .02 * h]), .038 * h);
      } else if (kind === 'machine_hip_abduction') knees.forEach((at, i) => {
        const sign = Math.sign(at[0]) || (i ? -1 : 1), pad = add(rollers[i] || at, [sign * .065 * h, -.04 * h, 0]);
        box(pad, scaled([.08, .17, .23], h));
        tube([sign * .12 * h, .25 * h, .04 * h], pad, .026 * h);
        axial([sign * .12 * h, .25 * h, .04 * h], [0, 1, 0], .042 * h, .055 * h);
      });
      else {
        axial(roller, [1, 0, 0], .065 * h, .53 * h);
        for (const x of [-1, 1]) tube([x * .26 * h, knee[1], knee[2]], add(roller, [x * .26 * h, 0, 0]), .021 * h);
        axial(knee, [1, 0, 0], .048 * h, .55 * h);
        if (kind === 'seated_leg_curl') axial(add(knee, [0, .07 * h, -.11 * h]), [1, 0, 0], .068 * h, .51 * h);
      }
      for (const at of handles) { tube(add(s.seat, [(Math.sign(at[0]) || 1) * .22 * h, 0, 0]), at, .019 * h); grip(at, [0, 0, 1]); }
      break;
    }
    case 'treadmill_walk': {
      const y = s.beltY ?? 0, rails = s.railHandles || [[-.36 * h, 1.00 * h + y, .57 * h], [.36 * h, 1.00 * h + y, .57 * h]];
      box([0, y - .055 * h, 0], scaled([.78, .10, 1.42], h));
      box([0, y - .009 * h, 0], scaled([.53, .016, 1.28], h));
      for (const x of [-1, 1]) {
        box([x * .33 * h, y - .003 * h, 0], scaled([.075, .027, 1.35], h));
        tube([x * .35 * h, y, .57 * h], rails[x < 0 ? 0 : 1], .033 * h);
        tube(rails[x < 0 ? 0 : 1], [x * .35 * h, 1.02 * h + y, .17 * h], .026 * h);
      }
      tube(rails[0], rails[1], .032 * h);
      box([0, 1.09 * h + y, .57 * h], scaled([.48, .22, .07], h), [-.24, 0, 0]);
      box([0, 1.08 * h + y, .53 * h], scaled([.29, .075, .011], h), [-.24, 0, 0]);
      break;
    }
    case 'stationary_cycle': {
      const seat = point(s.seat, scaled([0, .91, 0], h)), pivot = point(s.pedalPivot, scaled([0, .40, .32], h));
      const pedals = s.pedals?.filter(isEquipmentPoint) || [point(joints[11], scaled([-.12, .26, .32], h)), point(joints[14], scaled([.12, .54, .32], h))];
      tube(scaled([0, .09, -.25], h), scaled([0, .09, .67], h), .045 * h);
      for (const z of [-.20, .61]) tube(scaled([-.29, .065, z], h), scaled([.29, .065, z], h), .04 * h);
      axial(scaled([0, .31, .61], h), [1, 0, 0], .23 * h, .18 * h);
      axial(scaled([.102, .31, .61], h), [1, 0, 0], .15 * h, .012 * h);
      tube(pivot, add(seat, [0, -.055 * h, 0]), .036 * h);
      tube(pivot, scaled([0, .73, .59], h), .04 * h);
      tube(scaled([0, .73, .59], h), avg(handles), .028 * h);
      box(seat, scaled([.28, .07, .27], h)); axial(pivot, [1, 0, 0], .054 * h, .28 * h);
      for (const at of pedals) { tube(add(pivot, [(Math.sign(at[0]) || 1) * .13 * h, 0, 0]), at, .019 * h); box(add(at, [0, -.019 * h, 0]), scaled([.12, .038, .21], h)); }
      tube(handles[0], handles[1], .023 * h); handles.forEach(at => grip(at, [0, 0, 1]));
      break;
    }
    case 'elliptical': {
      const pedals = s.pedals?.filter(isEquipmentPoint) || [point(joints[11], scaled([-.13, .10, -.12], h)), point(joints[14], scaled([.13, .10, .22], h))];
      const pivot = point(s.pedalPivot, scaled([0, .25, -.48], h));
      box(scaled([0, .045, 0], h), scaled([.60, .07, 1.28], h));
      axial(pivot, [1, 0, 0], .20 * h, .24 * h);
      tube(scaled([0, .08, .50], h), scaled([0, 1.11, .50], h), .035 * h);
      box(scaled([0, 1.17, .50], h), scaled([.26, .19, .06], h), [-.20, 0, 0]);
      pedals.forEach((at, i) => {
        const sign = Math.sign(at[0]) || (i ? -1 : 1), hinge = [sign * .24 * h, .65 * h, .48 * h];
        tube(add(pivot, [sign * .15 * h, 0, 0]), at, .024 * h);
        box(add(at, [0, -.0225 * h, 0]), scaled([.17, .045, .35], h));
        tube(at, hinge, .022 * h); tube(hinge, handles[i], .024 * h);
        axial(hinge, [1, 0, 0], .043 * h, .045 * h); grip(handles[i], [0, 1, 0]);
      });
      break;
    }
  }
  if (isEquipmentPoint(s.neckSupport?.position) && isEquipmentPoint(s.neckSupport?.size)) box(s.neckSupport.position, s.neckSupport.size);
  if (!parts.length) return null;
  return {
    min: [0, 1, 2].map(i => Math.min(...parts.map(p => p.min[i]))),
    max: [0, 1, 2].map(i => Math.max(...parts.map(p => p.max[i]))),
    parts,
  };
}
