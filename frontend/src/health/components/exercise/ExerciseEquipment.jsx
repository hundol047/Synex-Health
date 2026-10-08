import React, { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

import { equipmentDescriptor, isEquipmentPoint } from './exerciseEquipmentSpec.js';
export { equipmentDescriptor, EQUIPMENT_BY_MOTION } from './exerciseEquipmentSpec.js';
const isPoint = isEquipmentPoint;
const point = (value, fallback) => isPoint(value) ? value.slice(0, 3) : isPoint(value?.center) ? value.center.slice(0, 3) : fallback;
const add = (a, b) => a.map((v, i) => v + b[i]);
const average = points => points[0].map((_, i) => points.reduce((sum, p) => sum + p[i], 0) / points.length);
const scaled = (p, h) => p.map(v => v * h);

function resources() {
  const geometries = {
    rounded: new RoundedBoxGeometry(1, 1, 1, 2, .07),
    cylinder: new THREE.CylinderGeometry(1, 1, 1, 16, 1),
    hex: new THREE.CylinderGeometry(1, 1, 1, 8, 1),
    sphere: new THREE.SphereGeometry(1, 12, 8),
    torus: new THREE.TorusGeometry(1, .1, 6, 20),
  };
  const material = (color, roughness, metalness, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });
  const materials = {
    frame: material('#183c48', .42, .45), trim: material('#377780', .4, .25),
    pad: material('#244d58', .84, .03), accent: material('#269394', .65, .13),
    metal: material('#c6d6dc', .28, .8), rubber: material('#344d56', .91, .03),
    weight: material('#173440', .52, .35), gold: material('#d6ad72', .5, .35),
    screen: material('#13323c', .7, .1), towel: material('#e0eee7', .98, 0),
    glass: material('#95bbb9', .35, .12, { transparent: true, opacity: .25, depthWrite: false }),
  };
  return { geometries, materials };
}

function Box({ r, at, size, material = 'frame', rotation, name }) {
  return <mesh name={name} position={at} rotation={rotation} scale={size} geometry={r.geometries.rounded} material={r.materials[material]} receiveShadow/>;
}

function Tube({ r, a, b, radius = .025, material = 'frame', rounded = false }) {
  const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b);
  const delta = end.clone().sub(start), length = Math.max(.001, delta.length());
  const rotation = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
  return <>
    <mesh position={start.add(end).multiplyScalar(.5)} quaternion={rotation} scale={[radius, length, radius]} geometry={r.geometries.cylinder} material={r.materials[material]}/>
    {rounded && [a, b].map((at, i) => <mesh key={i} position={at} scale={radius} geometry={r.geometries.sphere} material={r.materials[material]}/>)}
  </>;
}

function Axial({ r, at, axis = [1, 0, 0], radius, length, material = 'metal', hex = false }) {
  const rotation = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(...axis).normalize());
  return <mesh position={at} quaternion={rotation} scale={[radius, length, radius]} geometry={r.geometries[hex ? 'hex' : 'cylinder']} material={r.materials[material]}/>;
}

function Dumbbell({ r, at, h, axis = [1, 0, 0] }) {
  const direction = new THREE.Vector3(...axis).normalize().toArray();
  return <group name="gripped-dumbbell">
    <Axial r={r} at={at} axis={direction} radius={.015 * h} length={.25 * h}/>
    {[-1, 1].map(side => <React.Fragment key={side}>
      <Axial r={r} at={add(at, direction.map(v => v * side * .098 * h))} axis={direction} radius={.088 * h} length={.055 * h} material="weight" hex/>
      <Axial r={r} at={add(at, direction.map(v => v * side * .066 * h))} axis={direction} radius={.025 * h} length={.016 * h} material="accent"/>
      <Axial r={r} at={add(at, direction.map(v => v * side * .13 * h))} axis={direction} radius={.033 * h} length={.009 * h} material="metal"/>
    </React.Fragment>)}
  </group>;
}

function Dumbbells({ r, spec }) {
  const { h, handles, motion, gripAxes } = spec;
  const single = spec.kind === 'single_dumbbell';
  const neutral = motion === 'hammer_curl';
  return (single ? [average(handles)] : handles).map((at, i) => <Dumbbell key={i} r={r} at={at} h={h} axis={single ? [0, 1, 0] : point(gripAxes?.[i] || spec.gripAxis, neutral ? [0, 0, 1] : [1, 0, 0])}/>);
}

function Barbell({ r, spec }) {
  const { h, handles } = spec;
  const axis = new THREE.Vector3(...handles[1]).sub(new THREE.Vector3(...handles[0]));
  if (axis.lengthSq() < .001) axis.set(1, 0, 0);
  axis.normalize();
  const center = point(spec.bar?.center || spec.bar, average(handles));
  const span = Math.max(.94 * h, new THREE.Vector3(...handles[0]).distanceTo(new THREE.Vector3(...handles[1])) + .68 * h);
  return <group name="gripped-barbell">
    <Axial r={r} at={center} axis={axis.toArray()} radius={.016 * h} length={span + .26 * h}/>
    {[-1, 1].flatMap(side => [.0, .047].map((offset, i) => <Axial key={`${side}-${i}`} r={r} at={new THREE.Vector3(...center).addScaledVector(axis, side * (span / 2 - .04 * h + offset * h)).toArray()} axis={axis.toArray()} radius={(i === 0 ? .18 : .14) * h} length={.036 * h} material={i === 0 ? 'weight' : 'trim'}/>))}
    {[-1, 1].map(side => <Axial key={side} r={r} at={new THREE.Vector3(...center).addScaledVector(axis, side * (span / 2 + .075 * h)).toArray()} axis={axis.toArray()} radius={.025 * h} length={.045 * h} material="gold"/>)}
  </group>;
}

function Chair({ r, spec, machine = false }) {
  const { h } = spec;
  const seat = spec.seat;
  const back = point(spec.back, add(seat, [0, .25 * h, -.18 * h]));
  const angle = Number.isFinite(spec.back?.angle) ? spec.back.angle : 0;
  return <group name={machine ? 'machine-seat' : 'stable-chair'}>
    <Box r={r} at={seat} size={[.41 * h, .07 * h, .40 * h]} material="pad"/>
    <Box r={r} at={back} size={[.36 * h, .43 * h, .075 * h]} rotation={[angle, 0, 0]} material="pad"/>
    {[-1, 1].flatMap(x => [-1, 1].map(z => {
      const at = [seat[0] + x * .17 * h, .035 * h, seat[2] + z * .16 * h];
      return <Tube key={`${x}-${z}`} r={r} a={at} b={[at[0], seat[1] - .02 * h, at[2]]} radius={.021 * h} material={machine ? 'frame' : 'trim'} rounded/>;
    }))}
    <Tube r={r} a={[seat[0] - .17 * h, .10 * h, seat[2] - .16 * h]} b={[seat[0] + .17 * h, .10 * h, seat[2] - .16 * h]} radius={.022 * h}/>
    {[-1, 1].map(side => <Tube key={side} r={r} a={[seat[0] + side * .14 * h, seat[1], seat[2] - .17 * h]} b={[back[0] + side * .14 * h, back[1], back[2]]} radius={.022 * h}/>)}
  </group>;
}

function Bench({ r, spec, incline = false, rack = false }) {
  const { h } = spec;
  const center = incline ? [0, (spec.topY ?? .69 * h) - .045 * h, spec.topZ ?? .42 * h] : point(spec.bench, [0, .505 * h, -.11 * h]);
  const depth = incline ? .39 * h : spec.bench?.length || 1.05 * h;
  return <group name={incline ? 'incline-hand-support' : 'training-bench'}>
    <Box r={r} at={center} size={[(incline ? .76 : .40) * h, .09 * h, depth]} material="pad"/>
    <Tube r={r} a={add(center, [0, -.09 * h, -depth * .35])} b={add(center, [0, -.09 * h, depth * .35])} radius={.04 * h}/>
    {[-1, 1].map(side => {
      const z = center[2] + side * depth * .34;
      return <React.Fragment key={side}><Tube r={r} a={[0, center[1] - .07 * h, z]} b={[0, .055 * h, z]} radius={.035 * h}/><Tube r={r} a={[-.27 * h, .04 * h, z]} b={[.27 * h, .04 * h, z]} radius={.03 * h} rounded/></React.Fragment>;
    })}
    {rack && [-1, 1].map(side => <React.Fragment key={side}>
      <Tube r={r} a={[side * .46 * h, .04 * h, center[2] - .47 * h]} b={[side * .46 * h, 1.12 * h, center[2] - .47 * h]} radius={.026 * h}/>
      <Tube r={r} a={[side * .46 * h, .72 * h, center[2] - .47 * h]} b={[side * .46 * h, .72 * h, center[2] - .10 * h]} radius={.023 * h}/>
      <Box r={r} at={[side * .46 * h, .026 * h, center[2] - .38 * h]} size={[.10 * h, .04 * h, .45 * h]} material="rubber"/>
    </React.Fragment>)}
  </group>;
}

function Support({ r, spec }) {
  const { h } = spec;
  const contacts = spec.contactPoints?.filter(isPoint) || [];
  const top = point(spec.supportCenter || spec.supportTop, contacts[0] || [.45 * h, 1.08 * h, .28 * h]);
  return <group name="fixed-hand-support">
    <Tube r={r} a={add(top, [0, 0, -.20 * h])} b={add(top, [0, 0, .20 * h])} radius={.025 * h} material="trim" rounded/>
    {[-1, 1].map(side => <React.Fragment key={side}><Tube r={r} a={add(top, [0, 0, side * .16 * h])} b={[top[0], .04 * h, top[2] + side * .16 * h]} radius={.023 * h}/><Tube r={r} a={[top[0] - .12 * h, .035 * h, top[2] + side * .16 * h]} b={[top[0] + .12 * h, .035 * h, top[2] + side * .16 * h]} radius={.024 * h} rounded/></React.Fragment>)}
  </group>;
}

function Wall({ r, spec }) {
  const { h } = spec;
  const face = spec.wallZ ?? (spec.kind === 'back_wall' ? -.23 : .64) * h;
  // Keep every part of the slab beyond its contact face. Treating wallZ as
  // the slab center previously buried contact skin inside 1.4 cm of glass.
  const z = face + (spec.kind === 'back_wall' ? -1 : 1) * .014 * h;
  return <group name="wall-contact-plane">
    <Box r={r} at={[0, .90 * h, z]} size={[1.2 * h, 1.80 * h, .028 * h]} material="glass"/>
    <Tube r={r} a={[-.6 * h, .018 * h, z]} b={[.6 * h, .018 * h, z]} radius={.013 * h} material="trim"/>
    {[-1, 1].map(side => <Tube key={side} r={r} a={[side * .6 * h, .02 * h, z]} b={[side * .6 * h, 1.80 * h, z]} radius={.012 * h} material="trim"/>)}
  </group>;
}

function Grip({ r, at, h, axis = [1, 0, 0] }) {
  return <Axial r={r} at={at} axis={axis} radius={.018 * h} length={.115 * h} material="rubber"/>;
}

function CableTower({ r, spec, seated = false }) {
  const { h } = spec;
  const pulley = point(spec.pulley, scaled(spec.kind === 'cable_row' ? [0, .64, 1.05] : spec.kind === 'cable_pallof' ? [-.90, 1.1, .45] : [0, 1.85, .80], h));
  const side = spec.kind === 'cable_pallof';
  // The overhead wheel reaches toward the user; its tower stays beyond the
  // seat and planted feet rather than intersecting the seated athlete.
  const mast = [pulley[0], 1.04 * h, side ? pulley[2] : Math.max(pulley[2] + .08 * h, .88 * h)];
  return <group name="cable-resistance-tower">
    <Box r={r} at={[mast[0], .035 * h, mast[2]]} size={[.40 * h, .065 * h, .48 * h]} material="rubber"/>
    {[-1, 1].map(x => <Tube key={x} r={r} a={[mast[0] + x * .12 * h, .065 * h, mast[2]]} b={[mast[0] + x * .12 * h, 2.05 * h, mast[2]]} radius={.026 * h}/>)}
    <Box r={r} at={[mast[0], 1.05 * h, mast[2]]} size={[.34 * h, 1.9 * h, .16 * h]} material="glass"/>
    {[0, 1, 2, 3, 4, 5].map(i => <Box key={i} r={r} at={[mast[0], (.14 + i * .056) * h, mast[2]]} size={[.24 * h, .043 * h, .13 * h]} material={i === 5 ? 'accent' : 'weight'}/>)}
    <Tube r={r} a={mast.map((v, i) => i === 1 ? .37 * h : v)} b={[mast[0], 1.88 * h, mast[2]]} radius={.008 * h} material="metal"/>
    <Tube r={r} a={[mast[0], pulley[1], mast[2]]} b={pulley} radius={.025 * h}/>
    <Axial r={r} at={pulley} axis={[1, 0, 0]} radius={.053 * h} length={.035 * h} material="trim"/>
    <Tube r={r} a={[mast[0], .34 * h, mast[2]]} b={pulley} radius={.0035 * h} material="rubber"/>
    {seated && <Chair r={r} spec={spec} machine/>}
  </group>;
}

function Cables({ r, spec }) {
  const { h, handles, kind } = spec;
  const pulley = point(spec.pulley, scaled(kind === 'cable_row' ? [0, .64, 1.05] : kind === 'cable_pallof' ? [-.90, 1.1, .45] : [0, 1.85, .80], h));
  const middle = average(handles);
  const split = kind === 'cable_face_pull' || kind === 'cable_pallof';
  const meeting = split ? add(middle, [0, kind === 'cable_face_pull' ? .025 * h : 0, .08 * h]) : middle;
  return <>
    <Tube r={r} a={pulley} b={meeting} radius={.004 * h} material="rubber"/>
    {split ? handles.map((at, i) => <React.Fragment key={i}><Tube r={r} a={meeting} b={at} radius={.011 * h} material="rubber"/><Grip r={r} at={at} h={h} axis={[0, 1, 0]}/></React.Fragment>) : <>
      <Tube r={r} a={handles[0]} b={handles[1]} radius={.014 * h} material="metal" rounded/>
      {handles.map((at, i) => <Grip key={i} r={r} at={at} h={h}/>)}
    </>}
  </>;
}

function Bands({ r, spec }) {
  const { h, handles } = spec;
  if (spec.kind === 'band_pull_apart') return <group name="elastic-pull-apart-band"><Tube r={r} a={handles[0]} b={handles[1]} radius={.012 * h} material="accent"/>{handles.map((at, i) => <Grip key={i} r={r} at={at} h={h} axis={[0, 1, 0]}/>)}</group>;
  const anchor = point(spec.anchor || spec.pulley, [0, .95 * h, .83 * h]);
  return <group name="anchored-resistance-band">
    <Tube r={r} a={[0, .025 * h, anchor[2]]} b={[0, 1.75 * h, anchor[2]]} radius={.025 * h}/>
    <Box r={r} at={[0, .025 * h, anchor[2]]} size={[.45 * h, .04 * h, .36 * h]} material="rubber"/>
    <Axial r={r} at={anchor} radius={.035 * h} length={.07 * h} material="gold"/>
    {handles.map((at, i) => <React.Fragment key={i}><Tube r={r} a={anchor} b={at} radius={.009 * h} material="accent"/><Grip r={r} at={at} h={h}/></React.Fragment>)}
  </group>;
}

function MachineFrame({ r, spec }) {
  const { h } = spec;
  const seat = spec.seat;
  return <>
    <Chair r={r} spec={spec} machine/>
    <Tube r={r} a={[-.40 * h, .045 * h, -.27 * h]} b={[.40 * h, .045 * h, -.27 * h]} radius={.038 * h} rounded/>
    <Tube r={r} a={[0, .045 * h, -.30 * h]} b={[0, .045 * h, .64 * h]} radius={.035 * h}/>
    <Tube r={r} a={[0, .07 * h, -.24 * h]} b={[0, seat[1] + .43 * h, -.24 * h]} radius={.032 * h}/>
    {[-1, 1].map(side => <Box key={side} r={r} at={[side * .36 * h, .04 * h, -.27 * h]} size={[.12 * h, .065 * h, .22 * h]} material="rubber"/>)}
  </>;
}

function PressOrRowMachine({ r, spec }) {
  const { h, handles, kind } = spec;
  const row = kind === 'machine_row';
  const pivots = spec.pivots || handles.map(at => [(Math.sign(at[0]) || 1) * .45 * h, row ? .44 * h : 1.20 * h, (row ? .80 : -.16) * h]);
  return <group name={row ? 'supported-row-machine' : 'chest-press-machine'}>
    <MachineFrame r={r} spec={spec}/>
    {row && <Box r={r} at={point(spec.chestPad, [0, .91 * h, .24 * h])} size={[.28 * h, .29 * h, .09 * h]} material="pad" rotation={[-.10, 0, 0]}/>}
    {handles.map((at, i) => <React.Fragment key={i}>
      <Tube r={r} a={[pivots[i][0], .04 * h, pivots[i][2]]} b={pivots[i]} radius={.027 * h}/>
      <Axial r={r} at={pivots[i]} radius={.047 * h} length={.06 * h} material="accent"/>
      <Tube r={r} a={pivots[i]} b={at} radius={.020 * h} material="trim"/>
      <Grip r={r} at={at} h={h} axis={[0, 1, 0]}/>
    </React.Fragment>)}
  </group>;
}

function LegMachine({ r, spec, joints }) {
  const { h, kind } = spec;
  const ankles = [point(joints[11], [-.14 * h, .12 * h, .46 * h]), point(joints[14], [.14 * h, .12 * h, .46 * h])];
  const knees = [point(joints[10], [-.14 * h, .53 * h, .35 * h]), point(joints[13], [.14 * h, .53 * h, .35 * h])];
  const rollers = spec.rollers?.filter(isPoint) || [];
  const shin = new THREE.Vector3(...average(ankles)).sub(new THREE.Vector3(...average(knees))).normalize();
  const rollerSide = kind === 'seated_leg_curl' ? -1 : 1;
  const shinRoller = add(rollers.length ? average(rollers) : average(ankles), [0, shin.z * .09 * h * rollerSide, -shin.y * .09 * h * rollerSide]);
  const kneeAxis = point(spec.kneeAxis, average(knees));
  const axis = [1, 0, 0];
  return <group name={`equipment-${kind}`}>
    <MachineFrame r={r} spec={spec}/>
    {kind === 'leg_press' ? (() => {
      const plate = point(spec.footplate, add(average(ankles), [0, 0, .085 * h]));
      const normal = point(spec.footplate?.normal, [0, -.35, -1]);
      const rotation = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(...normal).normalize());
      return <>
        <mesh position={plate} quaternion={rotation} scale={[.64 * h, .40 * h, .06 * h]} geometry={r.geometries.rounded} material={r.materials.rubber}/>
        {[-1, 1].map(side => <Tube key={side} r={r} a={[side * .30 * h, .075 * h, -.13 * h]} b={[side * .30 * h, .075 * h, 1.10 * h]} radius={.032 * h} material="metal"/>)}
        <Tube r={r} a={[0, .08 * h, .35 * h]} b={add(plate, [0, -.08 * h, .02 * h])} radius={.038 * h} material="trim"/>
      </>;
    })() : kind === 'machine_hip_abduction' ? knees.map((at, i) => {
      const side = Math.sign(at[0]) || (i ? -1 : 1);
      const pad = add(rollers[i] || at, [side * .065 * h, -.04 * h, 0]);
      return <React.Fragment key={i}><Box r={r} at={pad} size={[.08 * h, .17 * h, .23 * h]} material="pad"/><Tube r={r} a={[side * .12 * h, .25 * h, .04 * h]} b={pad} radius={.026 * h} material="trim"/><Axial r={r} at={[side * .12 * h, .25 * h, .04 * h]} axis={[0, 1, 0]} radius={.042 * h} length={.055 * h} material="accent"/></React.Fragment>;
    }) : <>
      <Axial r={r} at={shinRoller} axis={axis} radius={.065 * h} length={.53 * h} material="pad"/>
      {[-1, 1].map(side => <Tube key={side} r={r} a={[side * .26 * h, kneeAxis[1], kneeAxis[2]]} b={add(shinRoller, [side * .26 * h, 0, 0])} radius={.021 * h} material="trim"/>)}
      <Axial r={r} at={kneeAxis} axis={axis} radius={.048 * h} length={.55 * h} material="accent"/>
      {kind === 'seated_leg_curl' && <Axial r={r} at={add(kneeAxis, [0, .07 * h, -.11 * h])} axis={axis} radius={.068 * h} length={.51 * h} material="pad"/>}
    </>}
    {spec.handles?.map((at, i) => <React.Fragment key={i}><Tube r={r} a={add(spec.seat, [(Math.sign(at[0]) || 1) * .22 * h, 0, 0])} b={at} radius={.019 * h}/><Grip r={r} at={at} h={h} axis={[0, 0, 1]}/></React.Fragment>)}
  </group>;
}

function Treadmill({ r, spec }) {
  const { h } = spec;
  const y = spec.beltY ?? 0;
  const handles = spec.railHandles || [[-.36 * h, 1.00 * h + y, .57 * h], [.36 * h, 1.00 * h + y, .57 * h]];
  return <group name="treadmill">
    <Box r={r} at={[0, y - .055 * h, 0]} size={[.78 * h, .10 * h, 1.42 * h]} material="frame"/>
    <Box r={r} at={[0, y - .009 * h, 0]} size={[.53 * h, .016 * h, 1.28 * h]} material="rubber"/>
    {[-1, 1].map(side => <React.Fragment key={side}><Box r={r} at={[side * .33 * h, y - .003 * h, 0]} size={[.075 * h, .027 * h, 1.35 * h]} material="trim"/><Tube r={r} a={[side * .35 * h, y, .57 * h]} b={handles[side < 0 ? 0 : 1]} radius={.033 * h}/><Tube r={r} a={handles[side < 0 ? 0 : 1]} b={[side * .35 * h, 1.02 * h + y, .17 * h]} radius={.026 * h} material="rubber" rounded/></React.Fragment>)}
    <Tube r={r} a={handles[0]} b={handles[1]} radius={.032 * h}/>
    <Box r={r} at={[0, 1.09 * h + y, .57 * h]} size={[.48 * h, .22 * h, .07 * h]} rotation={[-.24, 0, 0]} material="screen"/>
    <Box r={r} at={[0, 1.08 * h + y, .53 * h]} size={[.29 * h, .075 * h, .011 * h]} rotation={[-.24, 0, 0]} material="accent"/>
  </group>;
}

function Bike({ r, spec, joints }) {
  const { h, handles } = spec;
  const seat = point(spec.seat, [0, .91 * h, 0]);
  const pivot = point(spec.pedalPivot, [0, .40 * h, .32 * h]);
  const pedals = spec.pedals?.filter(isPoint) || [point(joints[11], [-.12 * h, .26 * h, .32 * h]), point(joints[14], [.12 * h, .54 * h, .32 * h])];
  return <group name="stationary-cycle">
    <Tube r={r} a={[0, .09 * h, -.25 * h]} b={[0, .09 * h, .67 * h]} radius={.045 * h}/>
    {[-.20, .61].map(z => <Tube key={z} r={r} a={[-.29 * h, .065 * h, z * h]} b={[.29 * h, .065 * h, z * h]} radius={.04 * h} rounded/>)}
    <Axial r={r} at={[0, .31 * h, .61 * h]} radius={.23 * h} length={.18 * h} material="weight"/>
    <Axial r={r} at={[.102 * h, .31 * h, .61 * h]} radius={.15 * h} length={.012 * h} material="trim"/>
    <Tube r={r} a={pivot} b={add(seat, [0, -.055 * h, 0])} radius={.036 * h} material="trim"/>
    <Tube r={r} a={pivot} b={[0, .73 * h, .59 * h]} radius={.04 * h}/>
    <Tube r={r} a={[0, .73 * h, .59 * h]} b={average(handles)} radius={.028 * h}/>
    <Box r={r} at={seat} size={[.28 * h, .07 * h, .27 * h]} material="pad"/>
    <Axial r={r} at={pivot} radius={.054 * h} length={.28 * h} material="metal"/>
    {pedals.map((at, i) => <React.Fragment key={i}><Tube r={r} a={add(pivot, [(Math.sign(at[0]) || 1) * .13 * h, 0, 0])} b={at} radius={.019 * h} material="metal"/><Box r={r} at={add(at, [0, -.019 * h, 0])} size={[.12 * h, .038 * h, .21 * h]} material="rubber"/></React.Fragment>)}
    <Tube r={r} a={handles[0]} b={handles[1]} radius={.023 * h}/>
    {handles.map((at, i) => <Grip key={i} r={r} at={at} h={h} axis={[0, 0, 1]}/>)}
  </group>;
}

function Elliptical({ r, spec, joints }) {
  const { h, handles } = spec;
  const pedals = spec.pedals?.filter(isPoint) || [point(joints[11], [-.13 * h, .10 * h, -.12 * h]), point(joints[14], [.13 * h, .10 * h, .22 * h])];
  const pivot = point(spec.pedalPivot, [0, .25 * h, -.48 * h]);
  return <group name="elliptical-trainer">
    <Box r={r} at={[0, .045 * h, 0]} size={[.60 * h, .07 * h, 1.28 * h]} material="rubber"/>
    <Axial r={r} at={pivot} radius={.20 * h} length={.24 * h} material="weight"/>
    <Tube r={r} a={[0, .08 * h, .50 * h]} b={[0, 1.11 * h, .50 * h]} radius={.035 * h}/>
    <Box r={r} at={[0, 1.17 * h, .50 * h]} size={[.26 * h, .19 * h, .06 * h]} rotation={[-.20, 0, 0]} material="screen"/>
    {pedals.map((at, i) => {
      const side = Math.sign(at[0]) || (i ? -1 : 1);
      const hinge = [side * .24 * h, .65 * h, .48 * h];
      return <React.Fragment key={i}>
        <Tube r={r} a={add(pivot, [side * .15 * h, 0, 0])} b={at} radius={.024 * h} material="trim"/>
        <Box r={r} at={add(at, [0, -.0225 * h, 0])} size={[.17 * h, .045 * h, .35 * h]} material="rubber"/>
        <Tube r={r} a={at} b={hinge} radius={.022 * h} material="trim"/>
        <Tube r={r} a={hinge} b={handles[i]} radius={.024 * h}/>
        <Axial r={r} at={hinge} radius={.043 * h} length={.045 * h} material="accent"/>
        <Grip r={r} at={handles[i]} h={h} axis={[0, 1, 0]}/>
      </React.Fragment>;
    })}
  </group>;
}

export default function ExerciseEquipment({ motion, joints = [], rest = [], progress, heightScale }) {
  const r = useMemo(resources, []);
  useEffect(() => () => {
    Object.values(r.geometries).forEach(geometry => geometry.dispose());
    Object.values(r.materials).forEach(material => material.dispose());
  }, [r]);
  const spec = equipmentDescriptor(motion, joints, rest, heightScale);
  let content;
  switch (spec.kind) {
    case 'chair': content = <Chair r={r} spec={spec}/>; break;
    case 'wall': case 'back_wall': content = <Wall r={r} spec={spec}/>; break;
    case 'support': content = <Support r={r} spec={spec}/>; break;
    case 'incline': content = <Bench r={r} spec={spec} incline/>; break;
    case 'dumbbell': case 'single_dumbbell': content = <Dumbbells r={r} spec={spec}/>; break;
    case 'barbell': content = <Barbell r={r} spec={spec}/>; break;
    case 'bench_dumbbell': content = <><Bench r={r} spec={spec}/><Dumbbells r={r} spec={spec}/></>; break;
    case 'bench_barbell': content = <><Bench r={r} spec={spec} rack/><Barbell r={r} spec={spec}/></>; break;
    case 'band_row': case 'band_pull_apart': content = <Bands r={r} spec={spec}/>; break;
    case 'machine_chest_press': case 'machine_row': content = <PressOrRowMachine r={r} spec={spec}/>; break;
    case 'lat_pulldown': case 'cable_row': content = <><CableTower r={r} spec={spec} seated/><Cables r={r} spec={spec}/>{spec.kind === 'lat_pulldown' && <Axial r={r} at={add(spec.seat, [0, .16 * spec.h, .29 * spec.h])} radius={.065 * spec.h} length={.46 * spec.h} material="pad"/>}</>; break;
    case 'cable_pushdown': case 'cable_face_pull': case 'cable_pallof': content = <><CableTower r={r} spec={spec}/><Cables r={r} spec={spec}/></>; break;
    case 'leg_press': case 'leg_extension': case 'seated_leg_curl': case 'machine_hip_abduction': content = <LegMachine r={r} spec={spec} joints={joints}/>; break;
    case 'treadmill_walk': content = <Treadmill r={r} spec={spec}/>; break;
    case 'stationary_cycle': content = <Bike r={r} spec={spec} joints={joints}/>; break;
    case 'elliptical': content = <Elliptical r={r} spec={spec} joints={joints}/>; break;
    default: content = null;
  }
  const neckSupport = spec.neckSupport;
  const towel = neckSupport && isPoint(neckSupport.position) && isPoint(neckSupport.size) ? <Box r={r} at={neckSupport.position} size={neckSupport.size} material="towel" name="folded-towel-neck-support"/> : null;
  if (!content && !towel) return null;
  // Geometry/material ownership belongs to this component's pool. R3F must not
  // dispose a shared unit mesh when an exercise-specific element unmounts.
  return <group name={`exercise-equipment-${spec.kind || 'mat'}`} dispose={null}>{content}{towel}</group>;
}
