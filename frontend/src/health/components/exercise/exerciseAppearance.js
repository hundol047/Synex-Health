import * as THREE from 'three';
import { avatarGeometry } from '../body3d/appearance.js';

const clamp = THREE.MathUtils.clamp;
const gaussian = (x, y, cx, cy, sx, sy) => Math.exp(-(((x - cx) / sx) ** 2 + ((y - cy) / sy) ** 2));

// Classify in the neutral body, before skeletal deformation. The neck follows
// a rounded crew-neck opening, and each sleeve ends across the upper arm
// rather than along a vertical plane through the world.
export function exerciseGarmentAt(x, y, z, original = 'skin') {
  if (original === 'bottom' || original === 'shoes' || y <= .965) return original;
  const front = clamp((z - .02) / .07, 0, 1);
  const neckline = Math.min(1.543, 1.511 - .022 * front + .048 * Math.min(1, (x / .1) ** 2));
  if (y >= neckline) return 'skin';
  if (Math.abs(x) > .185) {
    const sleeve = ((Math.abs(x) - .185) * .14 - (y - 1.42) * .17) / (.14 ** 2 + .17 ** 2);
    if (sleeve > .61) return 'skin';
  }
  return 'top';
}

export function exerciseAvatarGeometry(wear, stature = 1) {
  const geometry = avatarGeometry(wear, stature);
  const uv = new Float32Array(wear.positions.length / 3 * 2);
  const colors = geometry.attributes.color.array;
  const skin = new THREE.Color('#c4967b'), lip = new THREE.Color('#a36660'), brow = new THREE.Color('#594138');
  const cheek = new THREE.Color('#c78f79'), hairColor = new THREE.Color('#342820');
  for (let i = 0; i < wear.labels.length; i++) {
    const x = wear.positions[i * 3] / stature, y = wear.positions[i * 3 + 1] / stature, z = wear.positions[i * 3 + 2] / stature;
    uv[i * 2] = Math.atan2(x, z - .035) / (2 * Math.PI) + .5;
    uv[i * 2 + 1] = y / 1.8;
    // A shared boundary vertex can belong to both skin and a shirt triangle.
    // Skin and hair use vertex colors; opaque garments own their base colors.
    // This prevents isolated skin-colored patches at the neck and sleeves.
    const color = skin.clone();
    color.offsetHSL(0, 0, .007 * Math.sin(y * 13) + .003 * Math.sin(x * 37));
    if (y > 1.54 && z > .105) {
      color.lerp(cheek, .16 * gaussian(Math.abs(x), y, .049, 1.635, .027, .024));
      color.lerp(lip, .58 * gaussian(x, y, 0, 1.609, .027, .006));
      color.lerp(brow, .72 * gaussian(Math.abs(x), y, .034, 1.694, .020, .0035));
      color.lerp(brow, .24 * gaussian(Math.abs(x), y, .034, 1.677, .013, .003));
    }
    const hairline = z > .095 ? 1.728 - .013 * Math.cos(x * 35) : 1.638;
    if (y > 1.54) color.lerp(hairColor, THREE.MathUtils.smoothstep(y, hairline, hairline + .018));
    color.toArray(colors, i * 3);
  }
  geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  const indices = [], groups = [[], [], [], [], []];
  const garmentIndex = { skin: 0, top: 1, bottom: 2, shoes: 3 };
  for (const [original, faces] of Object.entries(wear.indices)) {
    for (let i = 0; i < faces.length; i += 3) {
      const face = faces.slice(i, i + 3);
      let x = 0, y = 0, z = 0;
      for (const index of face) { x += wear.positions[index * 3]; y += wear.positions[index * 3 + 1]; z += wear.positions[index * 3 + 2]; }
      x /= 3 * stature; y /= 3 * stature; z /= 3 * stature;
      const garment = exerciseGarmentAt(x, y, z, original);
      const hairline = z > .095 ? 1.728 - .013 * Math.cos(x * 35) : 1.638;
      const material = garment === 'skin' && y > hairline + .012 ? 4 : garmentIndex[garment];
      groups[material].push(...face);
    }
  }
  geometry.clearGroups();
  groups.forEach((group, i) => { const start = indices.length; indices.push(...group); geometry.addGroup(start, group.length, i); });
  geometry.setIndex(indices);
  return geometry;
}

// Small deterministic original textures are generated once per athlete. No
// network fetch, image decoder or external asset is needed on the phone.
const noise = (x, y) => {
  let n = Math.imul(x + 1, 374761393) ^ Math.imul(y + 1, 668265263);
  n = Math.imul(n ^ n >>> 13, 1274126177);
  return ((n ^ n >>> 16) >>> 0) / 4294967295;
};
function localTexture(size, pixel, color = false) {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const at = (y * size + x) * 4, value = pixel(x, y, size);
    data[at] = value[0]; data[at + 1] = value[1]; data[at + 2] = value[2]; data[at + 3] = 255;
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  texture.needsUpdate = true;
  return texture;
}

export function exerciseMaterials() {
  const fabric = localTexture(64, (x, y) => [
    128 + Math.round(9 * Math.sin(x * Math.PI / 2) + 2 * (noise(x, y) - .5)),
    128 + Math.round(9 * Math.sin(y * Math.PI / 2) + 2 * (noise(y, x) - .5)), 254,
  ]);
  fabric.repeat.set(12, 16);
  const tailored = localTexture(128, (x, y, size) => {
    const theta = (x / size - .5) * 2 * Math.PI, height = y / size * 1.8;
    const side = THREE.MathUtils.smoothstep(Math.abs(Math.sin(theta)), .76, .98);
    // Both garments share this atlas. Its small waist transition follows the
    // exact rest height across shared triangles, avoiding a sawtooth hem.
    const top = THREE.MathUtils.smoothstep(height, .941, .961);
    const hem = gaussian(height, 0, .951, 0, .009, 1);
    const knit = (noise(x, y) - .5) * 3;
    return [35 + 18 * top, 59 + 60 * top, 77 + 48 * top].map(channel => Math.round(channel * (1 - side * .035 - hem * .025) + knit * .22));
  }, true);
  const pores = localTexture(128, (x, y) => {
    const value = Math.round(232 + (noise(x, y) - .5) * 26);
    return [value, value, value];
  });
  pores.repeat.set(5, 8);
  const hair = localTexture(128, (x, y) => {
    const strand = Math.sin((x + .25 * Math.sin(y * .08)) * Math.PI / 2);
    const value = Math.round(205 + 17 * strand + 8 * (noise(x, y) - .5));
    return [value, value, value];
  });
  hair.repeat.set(4, 3);
  const common = { metalness: 0, side: THREE.DoubleSide };
  const materials = [
    new THREE.MeshPhysicalMaterial({ ...common, vertexColors: true, roughness: .78, roughnessMap: pores, bumpMap: pores, bumpScale: .002, clearcoat: 0, envMapIntensity: .7 }),
    new THREE.MeshStandardMaterial({ ...common, roughness: .9, map: tailored, normalMap: fabric, normalScale: new THREE.Vector2(.085, .085) }),
    new THREE.MeshStandardMaterial({ ...common, roughness: .94, map: tailored, normalMap: fabric, normalScale: new THREE.Vector2(.065, .065) }),
    new THREE.MeshStandardMaterial({ ...common, color: '#dce3df', roughness: .84 }),
    new THREE.MeshStandardMaterial({ ...common, vertexColors: true, roughness: .9, bumpMap: hair, bumpScale: .0009, envMapIntensity: .55 }),
  ];
  let disposed = false;
  return { materials, dispose: () => {
    if (disposed) return;
    disposed = true;
    materials.forEach(material => material.dispose());
    [fabric, tailored, pores, hair].forEach(texture => texture.dispose());
  } };
}
