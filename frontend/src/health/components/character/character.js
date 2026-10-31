import {useSyncExternalStore} from 'react';
import portraitHead from './assets/portrait-head.json';
export const CHARACTER_KEY='synex-exercise-character-v1';
export const DEFAULT_CHARACTER=Object.freeze({style:'realistic',body:'male',face:'balanced',hairStyle:'wavy',outfit:'tee',pants:'joggers',eyes:'#543a29',hair:'#30251f',skin:'#c4967b',top:'#799bbd',bottom:'#293747',eyeSize:0,hairVolume:0,chest:0,hips:0,shoulders:0,waist:0});
export function normalizeCharacter(value={}){
 const v=value&&typeof value==='object'?value:{};const result={...DEFAULT_CHARACTER};
 for(const [key,options] of Object.entries({style:['realistic','toon'],body:['male','female'],face:['balanced','soft','angular','refined'],hairStyle:['short','parted','wavy','layered','bob','pixie','sleek','bun','ponytail'],outfit:['tee','tank','long'],pants:['leggings','shorts','joggers']}))if(options.includes(v[key]))result[key]=v[key];
 for(const key of ['hair','skin','top','bottom','eyes'])if(/^#[0-9a-f]{6}$/i.test(v[key]||''))result[key]=v[key];
 for(const key of ['chest','hips','shoulders','waist','eyeSize','hairVolume'])if(Number.isFinite(v[key]))result[key]=Math.max(-1,Math.min(1,v[key]));
 return result;
}
const subscribe=fn=>{window.addEventListener('synex-character',fn);window.addEventListener('storage',fn);return()=>{window.removeEventListener('synex-character',fn);window.removeEventListener('storage',fn);};};
const snapshot=()=>{try{return localStorage.getItem(CHARACTER_KEY)||'';}catch{return '';}};
export function readCharacter(raw=snapshot()){try{return normalizeCharacter(JSON.parse(raw));}catch{return {...DEFAULT_CHARACTER};}}
export function useCharacter(){return readCharacter(useSyncExternalStore(subscribe,snapshot,()=>''));}
export function saveCharacter(value){localStorage.setItem(CHARACTER_KEY,JSON.stringify(normalizeCharacter(value)));window.dispatchEvent(new Event('synex-character'));}
// Cosmetic surface morphs do not alter measurements, bone lengths or support anchors.
export const eyeCenterX=character=>character?.body==='female'&&character?.face==='refined'?.032:.034;
export function eyeProportions(value=0){
 const amount=Number.isFinite(value)?Math.max(-1,Math.min(1,value)):0;
 return [1+.15*amount,1+.25*amount,1];
}
export function characterSurface(base,options,scale=1){
 const c=normalizeCharacter(options),out=base.slice();
 if(c.body==='female'&&c.face==='refined'){
  for(const [index,x,y,z] of portraitHead.deltas){out[index*3]+=x*scale;out[index*3+1]+=y*scale;out[index*3+2]+=z*scale;}
 }
 const source=out.slice();
 const bell=(v,center,width)=>Math.exp(-(((v-center)/width)**2));
 for(let i=0;i<out.length;i+=3){const x=source[i]/scale,y=source[i+1]/scale,z=source[i+2]/scale;
  const torso=Math.max(0,1-Math.abs(x)/.27);
  const hip=bell(y,.93,.09)*torso,waist=bell(y,1.12,.09)*torso,chest=bell(y,1.34,.08)*torso;
  out[i]*=1+.08*c.hips*hip+.07*c.waist*waist+.05*c.shoulders*bell(y,1.43,.08);
  out[i+2]+=(.012*c.chest*chest*Math.max(0,Math.min(1,z/.08))+.006*c.hips*hip*Math.sign(z-.035))*scale;
  // Reshape the original eye openings too, so scaled detail meshes do not
  // leave the old socket visible behind them. No limb/joint heights change.
  if(y>1.63&&y<1.696&&z>.08&&Math.abs(x)>.009){
   const center=Math.sign(x)*.034,dx=x-center,dy=y-1.663;
   const distance=Math.sqrt((dx/.027)**2+(dy/.026)**2);
   const t=Math.max(0,Math.min(1,(distance-.45)/.55)),weight=1-t*t*(3-2*t);
   const [sx,sy]=eyeProportions(c.eyeSize);
   out[i]+=(dx*(sx-1)+(Math.sign(x)*eyeCenterX(c)-center))*weight*scale;out[i+1]+=dy*(sy-1)*weight*scale;
  }
  if(c.face==='refined'&&y>1.55&&z>.06){
   const jaw=bell(y,1.584,.035),nose=bell(x,0,.021)*bell(y,1.638,.025);
   // The female portrait already has authored nose sculpts. Do not apply
   // the generic nose pinch again on top of those feature targets.
   out[i]*=1-.09*jaw-(c.body==='female'?0:.10*nose);
   if(c.body!=='female')out[i+2]-=.0015*nose*scale;
   const front=Math.min(1,Math.max(0,(z-.10)/.04));
   out[i+1]+=(c.body==='female'?0:.0014)*bell(Math.abs(x),.024,.013)*bell(y,1.607,.009)*front*scale;
   if(c.body==='female'){
    // Fill the hollow tear trough and relax the protruding lower lip. These
    // local surface changes leave eyelid centers and the jaw joint intact.
    const cheek=bell(Math.abs(x),.044,.023)*bell(y,1.637,.015);
    out[i+2]+=(.0012*bell(Math.abs(x),.034,.018)*bell(y,1.650,.009)+.0008*cheek-.0011*bell(x,0,.025)*bell(y,1.600,.005))*front*scale;
   }
  }
  if(y>1.55&&y<1.76){const face=bell(y,1.63,.06);out[i]*=1+face*(c.face==='soft'?.055:c.face==='angular'?-.055:0);if(c.style==='toon')out[i]*=1+.045*face;}
 }
 return out;
}
