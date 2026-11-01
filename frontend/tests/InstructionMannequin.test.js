import { expect, it } from 'vitest';
import { personalizedVertices, sportswear } from '../src/health/components/body3d/avatar.js';
import { exerciseAvatarGeometry } from '../src/health/components/exercise/exerciseAppearance.js';
import { applyMannequinColors, applyAthleteHighlights, mannequinGuide, regionWeight } from '../src/health/components/exercise/instructionMannequin.js';
import {BufferGeometry,Float32BufferAttribute,MeshPhysicalMaterial} from 'three';

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
it('highlights every selected skin/outfit material when an authored model has more than three surfaces',()=>{
 const geometry=new BufferGeometry().setAttribute('position',new Float32BufferAttribute([.1,.7,.1,0,1.67,.1],3));
 const materials=Array.from({length:7},()=>new MeshPhysicalMaterial());
 try{
  applyAthleteHighlights(geometry,1,'squat',materials);
  expect(geometry.getAttribute('exerciseHighlight').getX(0)).toBeGreaterThan(.5);
  expect(geometry.getAttribute('exerciseHighlight').getX(1)).toBe(0);
  for(const m of materials){const shader={uniforms:{},vertexShader:'#include <begin_vertex>',fragmentShader:'#include <color_fragment>'};m.onBeforeCompile(shader);expect(shader.uniforms.exerciseRed).toBeDefined();expect(shader.fragmentShader).toContain('vExerciseHighlight');}
 }finally{geometry.dispose();materials.forEach(m=>m.dispose());}
});
it('keeps muscle masks attached to the rest anatomy when the previous exercise bent the mesh',()=>{
 const rest=new Float32Array([.1,.7,.1,0,1.67,.1]);
 const geometry=new BufferGeometry().setAttribute('position',new Float32BufferAttribute([.1,1.67,.1,0,.7,.1],3));
 const material=new MeshPhysicalMaterial();
 try{
  applyAthleteHighlights(geometry,1,'squat',[material],rest);
  expect(geometry.getAttribute('exerciseHighlight').getX(0)).toBeGreaterThan(.5);
  expect(geometry.getAttribute('exerciseHighlight').getX(1)).toBe(0);
 }finally{geometry.dispose();material.dispose();}
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
