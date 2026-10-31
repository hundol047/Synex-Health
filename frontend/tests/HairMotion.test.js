import {it,expect} from 'vitest';
import * as THREE from 'three';
import {hairWave,attachHairFlex,swayingHairMaterial} from '../src/health/components/character/hairMotion.js';
import {taperedStrand} from '../src/health/components/character/livingFace.js';
import {DEFAULT_CHARACTER} from '../src/health/components/character/character.js';
it('keeps roots fixed and sway bounded with a continuous repeating phase',()=>{
 const g=attachHairFlex(taperedStrand(new THREE.CatmullRomCurve3([new THREE.Vector3(),new THREE.Vector3(0,-.1,0),new THREE.Vector3(0,-.15,-.02)]),.001,24),.018);
 try{const flex=g.attributes.hairFlex.array;expect(Array.from(flex.slice(0,6))).toEqual([0,0,0,0,0,0]);expect(flex.at(-1)).toBeCloseTo(.018);for(let p=0;p<=1;p+=.01){const [x,z]=hairWave(p);expect(Math.abs(x)*.018).toBeLessThan(.017);expect(z).toBeGreaterThanOrEqual(0);}expect(hairWave(0)[0]).toBeCloseTo(hairWave(1)[0]);expect(hairWave(.4)).toEqual(hairWave(.4));}finally{g.dispose();}
});
it('shares phase-controlled sway in realistic and toon shaders',()=>{
 for(const style of ['realistic','toon']){const a=swayingHairMaterial({...DEFAULT_CHARACTER,style},1);try{const shader={uniforms:{},vertexShader:'#include <begin_vertex>'};a.material.onBeforeCompile(shader);a.setProgress(.25);expect(shader.uniforms.hairWave.value.x).toBeCloseTo(.72);expect(shader.vertexShader).toContain('transformed.x+=');a.setProgress(0);expect(shader.uniforms.hairWave.value.length()).toBe(0);}finally{a.dispose();}}
});
it('uses authored linear normal data without disposing shared texture resources',()=>{
 const color=new THREE.Texture(),normal=new THREE.Texture();let colorDisposed=false,normalDisposed=false;
 color.addEventListener('dispose',()=>{colorDisposed=true;});normal.addEventListener('dispose',()=>{normalDisposed=true;});
 const hair=swayingHairMaterial(DEFAULT_CHARACTER,1,color,normal);
 expect(hair.material.normalMap).toBe(normal);expect(hair.material.bumpMap).toBeNull();
 expect(normal.colorSpace).toBe(THREE.NoColorSpace);expect(hair.material.normalScale.x).toBeLessThanOrEqual(.5);
 hair.dispose();expect(colorDisposed).toBe(false);expect(normalDisposed).toBe(false);
 color.dispose();normal.dispose();
});
