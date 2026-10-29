import {it,expect} from 'vitest';
import {normalizeCharacter,characterSurface,DEFAULT_CHARACTER,saveCharacter,readCharacter,CHARACTER_KEY} from '../src/health/components/character/character.js';
import {personalizedVertices} from '../src/health/components/body3d/avatar.js';
it('bounds malformed cosmetic data and keeps health measurements out of preferences',()=>{
 expect(normalizeCharacter({chest:100,hips:NaN,hair:'url(x)',style:'bad',weight:900})).toEqual({...DEFAULT_CHARACTER,chest:1});
 expect(normalizeCharacter(null)).toEqual(DEFAULT_CHARACTER);
 localStorage.clear();localStorage.setItem('health-record','unchanged');saveCharacter({...DEFAULT_CHARACTER,body:'female',style:'toon'});expect(readCharacter().body).toBe('female');expect(localStorage.getItem('health-record')).toBe('unchanged');localStorage.setItem(CHARACTER_KEY,'broken');expect(readCharacter()).toEqual(DEFAULT_CHARACTER);
});
it('keeps all heights and mesh topology intact at both cosmetic extremes',()=>{
 for(const gender of ['male','female'])for(const sign of [-1,1]){
 const base=personalizedVertices({}, {gender}),original=base.slice();const out=characterSurface(base,{body:gender,chest:sign,hips:sign,waist:sign,shoulders:sign,style:'toon',face:'soft'});
 expect(base).toEqual(original);expect(out.length).toBe(base.length);expect(out.every(Number.isFinite)).toBe(true);
 for(let i=0;i<out.length;i+=3){expect(out[i+1]).toBe(base[i+1]);expect(Math.abs(out[i]-base[i])).toBeLessThan(.025);expect(Math.abs(out[i+2]-base[i+2])).toBeLessThan(.02);}
 }
});
