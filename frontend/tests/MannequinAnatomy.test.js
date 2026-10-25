import { describe, expect, it } from 'vitest';
import mesh from '../src/health/components/body3d/assets/human-mesh.json';
import { centralTorsoLoop, sectionLoops, compositionAnatomicalRegions } from '../src/health/components/body3d/mannequinAnatomy.js';
import { GIRTH_FIELDS, mannequinBase, mannequinPositions, torsoCircumference, referenceMannequinMeasurement } from '../src/health/components/body3d/mannequinMath.js';
const measurement = { height: 178, weight: 78, skeletal_muscle_mass: 30, body_fat_percentage: 23, chest_circumference: 99, waist_circumference: 84, hip_circumference: 101 };
const positiveLimb = (positions, height) => sectionLoops(positions, mesh.indices, height).filter(loop => loop.minX > .01).sort((a, b) => b.area - a.area)[0];
function ellipticalTubes() {
  const positions = [], indices = [], count = 128;
  for (const [cx, rx, rz] of [[0, .17, .13], [-.36, .035, .035], [.36, .035, .035]]) {
    const start = positions.length / 3;
    for (const y of [1, 2]) for (let i = 0; i < count; i++) { const angle = i / count * Math.PI * 2; positions.push(cx + rx * Math.cos(angle), y, rz * Math.sin(angle)); }
    for (let i = 0; i < count; i++) { const j = (i + 1) % count; indices.push(start + i, start + j, start + count + i, start + j, start + count + j, start + count + i); }
  }
  return { positions: Float32Array.from(positions), indices };
}
describe('anatomical composition surface', () => {
  it('measures the closed central torso contour and excludes separate arm loops without segment labels', () => {
    const fixture = ellipticalTubes(), loops = sectionLoops(fixture.positions, fixture.indices, 1.5);
    expect(loops).toHaveLength(3); expect(loops.every(loop => loop.closed)).toBe(true);
    const torso = centralTorsoLoop(fixture.positions, fixture.indices, 1.5), h = (.17 - .13) ** 2 / (.17 + .13) ** 2;
    const ellipse = Math.PI * (.17 + .13) * (1 + 3 * h / (10 + Math.sqrt(4 - 3 * h)));
    expect(torso.perimeter).toBeCloseTo(ellipse, 3);
    expect(torso.minX).toBeCloseTo(-.17, 6); expect(torso.maxX).toBeCloseTo(.17, 6); expect(Math.abs(torso.center[0])).toBeLessThan(1e-6);
  });
  it('retains the real adult hip and chest contours that arm-labelled torso vertices previously cut open', () => {
    const ranges = { male: { hip: [97, 98], chest: [102, 103] }, female: { hip: [101, 102], chest: [94, 95] } };
    for (const gender of ['male', 'female']) {
      const base = mannequinBase(gender);
      for (const [part, height] of [['hip', .94], ['chest', 1.34]]) {
        const loop = centralTorsoLoop(base, mesh.indices, height), circumference = torsoCircumference(base, height);
        expect(loop.closed, `${gender} ${part}`).toBe(true); expect(circumference).toBeGreaterThan(ranges[gender][part][0]); expect(circumference).toBeLessThan(ranges[gender][part][1]);
      }
    }
  });
  it('groups the actual head, hips and limbs for composition picking without changing shared exercise labels', () => {
    const original = mesh.regions.slice();
    for (const gender of ['male', 'female']) {
      const base = mannequinBase(gender), regions = compositionAnatomicalRegions(base, mesh.indices);
      expect(regions).toBeInstanceOf(Uint8Array); expect(regions).toHaveLength(base.length / 3);
      expect(compositionAnatomicalRegions(base, mesh.indices)).toBe(regions);
      let correctedHipVertices = 0;
      for (let i = 0; i < regions.length; i++) {
        const x = base[i * 3], y = base[i * 3 + 1];
        if (y >= 1.57) expect(regions[i]).toBe(0);
        if (y > .91 && y < .97 && Math.abs(x) < .25) {
          expect(regions[i]).toBe(1);
          if ([2, 3].includes(original[i])) correctedHipVertices++;
        }
        if (Math.abs(x) > .47 && y < 1.12) expect(regions[i]).toBe(x > 0 ? 2 : 3);
        if (y < .14 && Math.abs(x) > .05) expect(regions[i]).toBe(x > 0 ? 4 : 5);
      }
      expect(correctedHipVertices).toBeGreaterThan(10);
    }
    expect(mesh.regions).toEqual(original);
  });
  it('preserves the neutral adult asset, head, hands and feet while changing soft tissue around local joint centers', () => {
    for (const gender of ['male', 'female']) {
      const base = mannequinBase(gender), profile = { gender };
      const neutral = { height: 178, weight: 22 * 1.78 ** 2, skeletal_muscle_mass: (gender === 'female' ? 8 : 10) * 1.78 ** 2, body_fat_percentage: gender === 'female' ? 27 : 20 };
      expect(mannequinPositions(base, neutral, profile)).toEqual(base);
      const changed = mannequinPositions(base, { ...measurement, weight: 105, skeletal_muscle_mass: 45, body_fat_percentage: 38, chest_circumference: undefined, waist_circumference: undefined, hip_circumference: undefined }, profile);
      for (let i = 0; i < base.length; i += 3) {
        const x = base[i], y = base[i + 1]; expect(changed[i + 1]).toBe(base[i + 1]);
        if (y >= 1.57 || y <= .14 || Math.abs(x) > .47 && y < 1.12) { expect(changed[i]).toBeCloseTo(base[i], 6); expect(changed[i + 2]).toBeCloseTo(base[i + 2], 6); }
      }
      for (const plane of [.54, 1.26]) {
        const original = positiveLimb(base, plane), current = positiveLimb(changed, plane);
        expect(Math.hypot(current.center[0] - original.center[0], current.center[1] - original.center[1])).toBeLessThan(.003);
      }
    }
  });
  it('fits measured adult girths at every stature without balloon hips or changing equal-mass reference geometry', () => {
    const cases = [['male', measurement], ['female', measurement], ['unspecified', measurement],
      ['female', { ...measurement, height: 160, weight: 62, skeletal_muscle_mass: 20, body_fat_percentage: 27, chest_circumference: 90, waist_circumference: 76, hip_circumference: 96 }],
      ['male', { ...measurement, height: 190, weight: 105, skeletal_muscle_mass: 45, body_fat_percentage: 28, chest_circumference: 112, waist_circumference: 97, hip_circumference: 110 }]];
    for (const [gender, input] of cases) {
      const base = mannequinBase(gender), profile = { gender }, positions = mannequinPositions(base, input, profile), scale = input.height / 178;
      expect(positions.every(Number.isFinite)).toBe(true);
      for (const [key, , plane] of GIRTH_FIELDS) expect(Math.abs(torsoCircumference(positions, plane * scale) - input[key]), `${gender} ${key}`).toBeLessThan(.5);
      expect(Math.max(...positions.filter((_, i) => i % 3 === 1))).toBeCloseTo(input.height / 100, 5);
      if (input === measurement) { const hip = centralTorsoLoop(positions, mesh.indices, .90); expect(hip.maxX - hip.minX, `${gender} pelvis width`).toBeLessThan(.43); expect(hip.maxX - hip.minX).toBeGreaterThan(.31); }
      expect(mannequinPositions(base, referenceMannequinMeasurement(input, input.skeletal_muscle_mass), profile, input.segments || [])).toEqual(positions);
    }
  });
  it('keeps neighbouring surface triangles continuous across pelvis and joint transitions', () => {
    for (const gender of ['male', 'female']) {
      const base = mannequinBase(gender), positions = mannequinPositions(base, measurement, { gender });
      for (let i = 0; i < mesh.indices.length; i += 3) for (let edge = 0; edge < 3; edge++) {
        const a = mesh.indices[i + edge] * 3, b = mesh.indices[i + (edge + 1) % 3] * 3;
        const distance = array => Math.hypot(array[a] - array[b], array[a + 1] - array[b + 1], array[a + 2] - array[b + 2]);
        const original = distance(base); if (original < .001) continue;
        const ratio = distance(positions) / original; expect(ratio).toBeGreaterThan(.5); expect(ratio).toBeLessThan(1.55);
      }
    }
  });
});
