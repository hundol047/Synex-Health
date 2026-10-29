import {useSyncExternalStore} from 'react';
export const CHARACTER_KEY='synex-exercise-character-v1';
export const DEFAULT_CHARACTER=Object.freeze({style:'realistic',body:'male',face:'balanced',hair:'#342820',skin:'#c4967b',top:'#2563eb',bottom:'#253b4d',chest:0,hips:0,shoulders:0,waist:0});
export function normalizeCharacter(value={}){
 const v=value&&typeof value==='object'?value:{};const result={...DEFAULT_CHARACTER};
 for(const [key,options] of Object.entries({style:['realistic','toon'],body:['male','female'],face:['balanced','soft','angular']}))if(options.includes(v[key]))result[key]=v[key];
 for(const key of ['hair','skin','top','bottom'])if(/^#[0-9a-f]{6}$/i.test(v[key]||''))result[key]=v[key];
 for(const key of ['chest','hips','shoulders','waist'])if(Number.isFinite(v[key]))result[key]=Math.max(-1,Math.min(1,v[key]));
 return result;
}
const subscribe=fn=>{window.addEventListener('synex-character',fn);window.addEventListener('storage',fn);return()=>{window.removeEventListener('synex-character',fn);window.removeEventListener('storage',fn);};};
const snapshot=()=>{try{return localStorage.getItem(CHARACTER_KEY)||'';}catch{return '';}};
export function readCharacter(raw=snapshot()){try{return normalizeCharacter(JSON.parse(raw));}catch{return {...DEFAULT_CHARACTER};}}
export function useCharacter(){return readCharacter(useSyncExternalStore(subscribe,snapshot,()=>''));}
export function saveCharacter(value){localStorage.setItem(CHARACTER_KEY,JSON.stringify(normalizeCharacter(value)));window.dispatchEvent(new Event('synex-character'));}
// Cosmetic surface morphs do not alter measurements, bone lengths or support anchors.
export function characterSurface(base,options,scale=1){
 const c=normalizeCharacter(options),out=base.slice();
 const bell=(v,center,width)=>Math.exp(-(((v-center)/width)**2));
 for(let i=0;i<out.length;i+=3){const x=base[i]/scale,y=base[i+1]/scale,z=base[i+2]/scale;
  const torso=Math.max(0,1-Math.abs(x)/.27);
  const hip=bell(y,.93,.09)*torso,waist=bell(y,1.12,.09)*torso,chest=bell(y,1.34,.08)*torso;
  out[i]*=1+.08*c.hips*hip+.07*c.waist*waist+.05*c.shoulders*bell(y,1.43,.08);
  out[i+2]+=(.012*c.chest*chest*Math.max(0,Math.min(1,z/.08))+.006*c.hips*hip*Math.sign(z-.035))*scale;
  if(y>1.55&&y<1.76){const face=bell(y,1.63,.06);out[i]*=1+face*(c.face==='soft'?.055:c.face==='angular'?-.055:0);if(c.style==='toon')out[i]*=1+.045*face;}
 }
 return out;
}
