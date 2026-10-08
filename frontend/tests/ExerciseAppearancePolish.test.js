import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { personalizedVertices, sportswear } from '../src/health/components/body3d/avatar.js';
import { exerciseAvatarGeometry, exerciseGarmentAt, exerciseMaterials } from '../src/health/components/exercise/exerciseAppearance.js';

const texturesOf = materials => [...new Set(materials.flatMap(material => [material.map, material.normalMap, material.bumpMap, material.roughnessMap]).filter(Boolean))];

describe('exercise athlete surface finish', () => {
  it('keeps skin colors from bleeding into opaque garments and shares a continuous waist atlas', () => {
    const appearance = exerciseMaterials();
    try {
      expect(appearance.materials[0].vertexColors).toBe(true);
      for (const material of appearance.materials.slice(1, 4)) expect(material.vertexColors).toBe(false);
      expect(appearance.materials[1].map).toBe(appearance.materials[2].map);
      expect(appearance.materials[0].clearcoat).toBe(0);
      expect(appearance.materials[0].roughness).toBeGreaterThan(.7);
      expect(appearance.materials[1].map.colorSpace).toBe(THREE.SRGBColorSpace);
      expect(appearance.materials[0].bumpMap.colorSpace).toBe(THREE.NoColorSpace);
    } finally { appearance.dispose(); }
  });

  it('covers both shoulders and leaves a rounded front neckline and the lower arms exposed', () => {
    expect(exerciseGarmentAt(0, 1.485, .09)).toBe('top');
    expect(exerciseGarmentAt(0, 1.5, .09)).toBe('skin');
    expect(exerciseGarmentAt(.095, 1.515, .075)).toBe('top');
    expect(exerciseGarmentAt(-.095, 1.515, .075)).toBe('top');
    expect(exerciseGarmentAt(.29, 1.29, .04)).toBe('skin');
    expect(exerciseGarmentAt(-.29, 1.29, .04)).toBe('skin');
    expect(exerciseGarmentAt(.3, 1.2, .04, 'bottom')).toBe('bottom');
    expect(exerciseGarmentAt(.1, .08, .1, 'shoes')).toBe('shoes');
    for (const gender of ['male', 'female']) {
      const wear = sportswear(personalizedVertices({}, { gender }), 1, gender);
      const saved = wear.positions.slice(), geometry = exerciseAvatarGeometry(wear);
      try {
        expect(geometry.attributes.position.array).toEqual(saved);
        expect(wear.positions).toEqual(saved);
        expect(geometry.groups[0].count).toBeGreaterThan(0);
        expect(geometry.groups[1].count).toBeGreaterThan(0);
        expect(geometry.groups[2].count).toBe(wear.indices.bottom.length);
        expect(geometry.groups[3].count).toBe(wear.indices.shoes.length);
      } finally { geometry.dispose(); }
    }
  });

  it('uses deterministic local maps within a small memory budget and releases every owned texture once', () => {
    const first = exerciseMaterials(), second = exerciseMaterials();
    const maps = texturesOf(first.materials), otherMaps = texturesOf(second.materials);
    expect(maps).toHaveLength(4);
    expect(maps.every(map => map.isDataTexture)).toBe(true);
    expect(maps.every(map => map.magFilter === THREE.LinearFilter && map.minFilter === THREE.LinearMipmapLinearFilter && map.generateMipmaps)).toBe(true);
    expect(maps.reduce((bytes, map) => bytes + map.image.data.byteLength, 0)).toBeLessThan(220000);
    for (let i = 0; i < maps.length; i++) {
      expect(maps[i]).not.toBe(otherMaps[i]);
      expect(Buffer.from(maps[i].image.data).equals(Buffer.from(otherMaps[i].image.data))).toBe(true);
    }
    const disposed = maps.map(() => vi.fn()), otherDisposed = otherMaps.map(() => vi.fn());
    maps.forEach((map, i) => map.addEventListener('dispose', disposed[i]));
    otherMaps.forEach((map, i) => map.addEventListener('dispose', otherDisposed[i]));
    first.dispose(); first.dispose();
    disposed.forEach(callback => expect(callback).toHaveBeenCalledTimes(1));
    otherDisposed.forEach(callback => expect(callback).not.toHaveBeenCalled());
    second.dispose();
    otherDisposed.forEach(callback => expect(callback).toHaveBeenCalledTimes(1));
  });
});
