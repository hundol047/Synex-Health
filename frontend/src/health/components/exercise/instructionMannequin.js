import * as THREE from 'three';
import catalog from '../../../shared/lib/localCatalog.json' with { type: 'json' };

const entries = new Map(catalog.map(exercise => [exercise.motion_id, exercise]));
const aliases = { push_up: 'full_pushup', hip_hinge: 'hinge', glute_bridge: 'bridge' };
export const MANNEQUIN_COLORS = { neutral: '#d4dce3', primary: '#c93e43', secondary: '#df9b9b' };
// Broad surface regions for instruction, not individual segmented muscles or
// an estimate of measured activation. Masks are authored in the neutral pose
// and deform with the same vertices as the body, including wrist/hip motion.
const regions = [
  ['대퇴사두근', 'thighFront'], ['햄스트링', 'thighBack'], ['둔근', 'glutes'],
  ['대흉근', 'chest'], ['광배근', 'back'], ['승모근', 'upperBack'],
  ['삼각근', 'shoulders'], ['상완삼두근', 'upperArms'], ['상완이두근', 'upperArms'],
  ['종아리', 'calves'], ['복부', 'core'], ['척추', 'back'],
];
export function mannequinGuide(motion) {
  const exercise = entries.get(aliases[motion] || motion);
  const primaryLabel = (exercise?.target_muscle || []).join(' · ');
  const secondaryLabel = (exercise?.secondary_muscle || []).join(' · ');
  const select = text => [...new Set(regions.filter(([word]) => text.includes(word)).map(([, region]) => region))];
  return { primaryLabel, secondaryLabel, primary: select(primaryLabel), secondary: select(secondaryLabel) };
}
const smooth = THREE.MathUtils.smoothstep;
const band = (value, min, max, fade = .025) => smooth(value, min - fade, min) * (1 - smooth(value, max, max + fade));
export function regionWeight(region, x, y, z) {
  const ax = Math.abs(x), front = smooth(z, .015, .075), back = 1 - smooth(z, -.045, .025);
  const torso = 1 - smooth(ax, .16, .24);
  const thighs = band(y, .57, .91) * (1 - smooth(ax, .22, .28));
  switch (region) {
    case 'thighFront': return thighs * front;
    case 'thighBack': return thighs * back;
    case 'glutes': return band(y, .83, 1.02) * torso * back;
    case 'chest': return band(y, 1.25, 1.44) * torso * front;
    case 'back': return band(y, 1.02, 1.43) * torso * back;
    case 'upperBack': return band(y, 1.36, 1.49) * torso * back;
    case 'core': return band(y, 1.02, 1.24) * torso * front;
    case 'shoulders': return band(y, 1.34, 1.49) * smooth(ax, .14, .20);
    case 'upperArms': return band(y, 1.17, 1.39) * smooth(ax, .19, .24);
    case 'calves': return band(y, .22, .49) * (1 - smooth(ax, .21, .28));
    default: return 0;
  }
}
export function applyMannequinColors(geometry, stature, motion) {
  const { primary, secondary } = mannequinGuide(motion);
  const positions = geometry.attributes.position.array, colors = geometry.attributes.color.array;
  const neutral = new THREE.Color(MANNEQUIN_COLORS.neutral), main = new THREE.Color(MANNEQUIN_COLORS.primary), assist = new THREE.Color(MANNEQUIN_COLORS.secondary), color = new THREE.Color();
  for (let i = 0; i < positions.length; i += 3) {
    const point = [positions[i] / stature, positions[i + 1] / stature, positions[i + 2] / stature];
    const a = Math.max(0, ...primary.map(region => regionWeight(region, ...point)));
    const b = Math.max(0, ...secondary.map(region => regionWeight(region, ...point)));
    color.copy(neutral).lerp(assist, b).lerp(main, a).toArray(colors, i);
  }
  geometry.attributes.color.needsUpdate = true;
  geometry.clearGroups();
  geometry.addGroup(0, geometry.index.count, 0);
}
export function mannequinMaterials() {
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .78, metalness: 0, side: THREE.DoubleSide });
  return { materials: [material], dispose: () => material.dispose() };
}
