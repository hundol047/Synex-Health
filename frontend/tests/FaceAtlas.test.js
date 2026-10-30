import {it,expect,vi} from 'vitest';
import {Texture} from 'three';
import mesh from '../src/health/components/body3d/assets/human-mesh.json';
import atlas from '../src/health/components/character/assets/face-uv.json';
import {DEFAULT_CHARACTER,normalizeCharacter} from '../src/health/components/character/character.js';
import {EYE_COLORS} from '../src/health/components/character/eyeColors.js';
import {exerciseMaterials} from '../src/health/components/exercise/exerciseAppearance.js';

it('matches the shipped topology and confines atlas coordinates to the head island',()=>{
 expect(atlas.sourceRevision).toBe(mesh.revision);
 expect(atlas.coordinates.length).toBe(mesh.profiles.male.length);
 let mapped=0;
 for(let i=0;i<atlas.coordinates.length;i+=3){
  const [u,v,mask]=atlas.coordinates.slice(i,i+3);
  expect(Number.isFinite(u)&&u>=0&&u<=1).toBe(true);
  expect(Number.isFinite(v)&&v>=0&&v<=1).toBe(true);
  expect([0,1]).toContain(mask);
  if(mask){mapped++;expect(Math.max(mesh.profiles.male[i+1],mesh.profiles.female[i+1])*mesh.scale).toBeGreaterThan(1.54);}
 }
 expect(mapped).toBeGreaterThan(2500);
});

it('keeps shared face textures alive when individual viewers dispose materials',()=>{
 const texture=new Texture(),disposed=vi.fn();texture.addEventListener('dispose',disposed);
 const first=exerciseMaterials(DEFAULT_CHARACTER,texture),second=exerciseMaterials({...DEFAULT_CHARACTER,skin:'#543529'},texture);
 try{
  const shader={uniforms:{},vertexShader:'#include <begin_vertex>',fragmentShader:'#include <color_fragment>\n#include <normal_fragment_maps>'};
  first.materials[0].onBeforeCompile(shader);
  expect(shader.uniforms.characterFaceAtlas.value).toBe(texture);
  expect(shader.fragmentShader).toContain('faceDetail');
  expect(shader.fragmentShader).toContain('faceTexel.a');
  first.dispose();expect(disposed).not.toHaveBeenCalled();
  second.dispose();expect(disposed).not.toHaveBeenCalled();
 }finally{first.dispose();second.dispose();texture.dispose();}
});

it('supports distinct named eye colors without changing saved body or skin preferences',()=>{
 expect(new Set(EYE_COLORS.map(c=>c.color)).size).toBe(7);
 for(const {color} of EYE_COLORS){
  const saved=normalizeCharacter({...DEFAULT_CHARACTER,body:'female',skin:'#704735',eyes:color});
  expect(saved.eyes).toBe(color);expect(saved.body).toBe('female');expect(saved.skin).toBe('#704735');
 }
});
