import { expect, it } from 'vitest';
import { personalizedVertices, sportswear } from '../src/health/components/body3d/avatar.js';
import { exerciseAvatarGeometry } from '../src/health/components/exercise/exerciseAppearance.js';
import { applyMannequinColors, mannequinGuide, regionWeight } from '../src/health/components/exercise/instructionMannequin.js';

it('distinguishes chest, thigh, and back instruction and leaves unknown motions neutral', () => {
  expect(mannequinGuide('squat').primary).toEqual(['thighFront', 'thighBack']);
  expect(mannequinGuide('wall_push').primary).toEqual(['chest']);
  expect(mannequinGuide('band_row').primary).toContain('back');
  expect(mannequinGuide('push_up')).toEqual(mannequinGuide('full_pushup'));
  expect(mannequinGuide('unknown').primary).toEqual([]);
  expect(regionWeight('chest', 0, 1.35, .1)).toBe(1);
  expect(regionWeight('chest', 0, 1.35, -.1)).toBe(0);
  expect(regionWeight('back', 0, 1.35, -.1)).toBe(1);
  expect(regionWeight('thighFront', .1, 1.65, .1)).toBe(0);
});
it('changes only colors and material groups, preserving every vertex and face for the existing rig', () => {
  const wear = sportswear(personalizedVertices({}, {}), 1);
  const geometry = exerciseAvatarGeometry(wear);
  try {
    const vertices = geometry.attributes.position.array.slice(), faces = geometry.index.array.slice();
    applyMannequinColors(geometry, 1, 'squat');
    const squatColors = geometry.attributes.color.array.slice();
    applyMannequinColors(geometry, 1, 'wall_push');
    expect(geometry.attributes.position.array).toEqual(vertices);
    expect(geometry.index.array).toEqual(faces);
    expect(geometry.attributes.color.array).not.toEqual(squatColors);
    expect(geometry.attributes.color.array.every(Number.isFinite)).toBe(true);
    expect(geometry.groups).toEqual([{start:0, count:faces.length, materialIndex:0}]);
  } finally { geometry.dispose(); }
});
