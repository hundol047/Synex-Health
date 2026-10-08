import * as THREE from 'three';
import { avatarGeometry } from '../body3d/appearance.js';

// Small, original procedural textures remain bundled/offline. The UVs are
// bound to the rest surface so fabric does not slide when the athlete moves.
export function exerciseAvatarGeometry(wear, stature = 1) {
  const geometry = avatarGeometry(wear, stature);
  const uv = new Float32Array(wear.positions.length / 3 * 2);
  const colors = geometry.attributes.color.array;
  const palette = { top: new THREE.Color('#397f88'), bottom: new THREE.Color('#223d51'), shoes: new THREE.Color('#d5dfdc') };
  for (let i = 0; i < wear.labels.length; i++) {
    const x = wear.positions[i * 3] / stature, y = wear.positions[i * 3 + 1] / stature, z = wear.positions[i * 3 + 2] / stature;
    uv[i * 2] = Math.atan2(x, z - .035) / (2 * Math.PI) + .5;
    uv[i * 2 + 1] = y / 1.8;
    const collar = wear.labels[i] === 'skin' && y > 1.47 && y < 1.54 && Math.abs(x) > .075;
    const label = collar ? 'top' : wear.labels[i];
    if (palette[label]) {
      const color = palette[label].clone();
      const seam = label === 'top' && (Math.abs(x) > .185 || y > 1.438) || label === 'bottom' && y > .89;
      color.multiplyScalar(seam ? .89 : 1);
      color.toArray(colors, i * 3);
    }
  }
  geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  // Hair receives a separate matte material instead of sharing shiny skin.
  const indices = [], groups = [...Object.values(wear.indices), []];
  const skin = [], hair = groups[4], top = wear.indices.top.slice();
  for (let i = 0; i < wear.indices.skin.length; i += 3) {
    const face = wear.indices.skin.slice(i, i + 3);
    const center = face.reduce((v, index) => v.add(new THREE.Vector3(...wear.positions.slice(index * 3, index * 3 + 3))), new THREE.Vector3()).multiplyScalar(1 / 3 / stature);
    const hairline = center.z > .095 ? 1.728 - .013 * Math.cos(center.x * 35) : 1.638;
    (center.y > hairline + .012 ? hair : center.y > 1.47 && center.y < 1.54 && Math.abs(center.x) > .075 ? top : skin).push(...face);
  }
  groups[0] = skin;
  groups[1] = top;
  geometry.clearGroups();
  groups.forEach((group, i) => { const start = indices.length; indices.push(...group); geometry.addGroup(start, group.length, i); });
  geometry.setIndex(indices);
  return geometry;
}

export function exerciseMaterials() {
  const size = 64, data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const at = (y * size + x) * 4;
    data[at] = 128 + Math.round(14 * Math.sin(x * Math.PI / 2));
    data[at + 1] = 128 + Math.round(14 * Math.sin(y * Math.PI / 2));
    data[at + 2] = 252; data[at + 3] = 255;
  }
  const fabric = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  fabric.wrapS = fabric.wrapT = THREE.RepeatWrapping;
  fabric.repeat.set(12, 16); fabric.needsUpdate = true;
  const common = { vertexColors: true, metalness: 0, side: THREE.DoubleSide };
  const materials = [
    new THREE.MeshPhysicalMaterial({ ...common, roughness: .51, clearcoat: .035, clearcoatRoughness: .8 }),
    new THREE.MeshStandardMaterial({ ...common, roughness: .87, normalMap: fabric, normalScale: new THREE.Vector2(.13, .13) }),
    new THREE.MeshStandardMaterial({ ...common, roughness: .91, normalMap: fabric, normalScale: new THREE.Vector2(.10, .10) }),
    new THREE.MeshStandardMaterial({ ...common, roughness: .76 }),
    new THREE.MeshStandardMaterial({ ...common, roughness: .96 }),
  ];
  return { materials, dispose: () => { materials.forEach(material => material.dispose()); fabric.dispose(); } };
}
