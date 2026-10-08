// Equipment is authored per exercise. In particular, a machine press is never
// inferred to be a dumbbell press from a substring in its identifier.
export const EQUIPMENT_BY_MOTION = Object.freeze({
  sit_stand: 'chair', march: 'chair', ankle_pump: 'chair', hamstring_stretch: 'chair', seated_calf: 'chair',
  wall_push: 'wall', close_wall_push: 'wall', calf_stretch: 'wall', wall_sit: 'back_wall', wall_hinge: 'back_wall',
  incline_push: 'incline', calf: 'support', single_calf: 'support', split_squat: 'support', hip_abduction: 'support',
  band_row: 'band_row', band_pull_apart: 'band_pull_apart',
  curl: 'dumbbell', hammer_curl: 'dumbbell', shoulder_press: 'dumbbell', lateral_raise: 'dumbbell',
  front_raise: 'dumbbell', dumbbell_row: 'dumbbell', dumbbell_rdl: 'dumbbell', dumbbell_split_squat: 'dumbbell',
  dumbbell_shrug: 'dumbbell', goblet_squat: 'single_dumbbell', triceps_extension: 'single_dumbbell',
  dumbbell_floor_press: 'dumbbell', dumbbell_bench_press: 'bench_dumbbell',
  barbell_rdl: 'barbell', barbell_squat: 'barbell', barbell_bench_press: 'bench_barbell',
  machine_chest_press: 'machine_chest_press', machine_row: 'machine_row', lat_pulldown: 'lat_pulldown',
  cable_row: 'cable_row', leg_press: 'leg_press', leg_extension: 'leg_extension', seated_leg_curl: 'seated_leg_curl',
  machine_hip_abduction: 'machine_hip_abduction', cable_pushdown: 'cable_pushdown', cable_face_pull: 'cable_face_pull',
  cable_pallof: 'cable_pallof', treadmill_walk: 'treadmill_walk', stationary_cycle: 'stationary_cycle', elliptical: 'elliptical',
});

const KNOWN_KINDS = new Set(Object.values(EQUIPMENT_BY_MOTION));
const KIND_ALIASES = { seat: 'chair', high_cable: 'lat_pulldown', low_cable: 'cable_row', side_cable: 'cable_pallof', bike: 'stationary_cycle', treadmill: 'treadmill_walk' };
export const isEquipmentPoint = point => Array.isArray(point) && point.length >= 3 && point.slice(0, 3).every(Number.isFinite);
const point = (value, fallback) => isEquipmentPoint(value) ? value.slice(0, 3) : isEquipmentPoint(value?.center) ? value.center.slice(0, 3) : fallback;
const add = (a, b) => a.map((v, i) => v + b[i]);
const average = points => points[0].map((_, i) => points.reduce((sum, p) => sum + p[i], 0) / points.length);
const scaled = (p, h) => p.map(v => v * h);

export function equipmentDescriptor(motion, joints = [], rest = [], heightScale) {
  const metadata = joints.equipment || {};
  const h = Number.isFinite(heightScale) && heightScale > 0 ? heightScale : metadata.heightScale || metadata.scale || (rest[0]?.[1] ? rest[0][1] / .94 : 1);
  const authored = EQUIPMENT_BY_MOTION[motion];
  const requested = metadata.kind || metadata.type;
  // Rig subtypes can share a support, but an unknown machine name must not
  // silently produce a pair of weights or an unrelated attachment.
  const kind = KNOWN_KINDS.has(requested) ? requested : requested === motion ? authored : KIND_ALIASES[requested] || authored;
  const hands = [point(joints[5], scaled([-.22, 1, .3], h)), point(joints[8], scaled([.22, 1, .3], h))];
  const handles = metadata.handles?.length === 2 && metadata.handles.every(isEquipmentPoint) ? metadata.handles : hands;
  return { ...metadata, kind, h, motion, hands, handles,
    seat: point(metadata.seat || metadata.seatCenter, scaled([0, .49, 0], h)),
  };
}

