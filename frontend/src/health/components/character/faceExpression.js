import {blinkAmount} from './livingFace.js';
import {eyeCenterX} from './character.js';
const smooth=t=>{const x=Math.max(0,Math.min(1,t));return x*x*(3-2*x);};
// Move the actual textured skin of the eyelids. No detached skin-colored patch.
// The source is immutable and the body, hands and support points are untouched.
export function faceBlinkSurface(source,scale,progress,character){
 const blink=blinkAmount(progress);if(!blink)return source;
 const output=source.slice();
 for(let i=0;i<source.length;i+=3){
  const x=source[i]/scale,y=source[i+1]/scale,z=source[i+2]/scale;
  if(y<1.64||y>1.687||z<.095||Math.abs(x)<.012||Math.abs(x)>.057)continue;
  const dx=Math.abs(x)-eyeCenterX(character),dy=y-1.663;
  const horizontal=1-smooth((Math.abs(dx)-.0105)/.0105);
  const vertical=1-smooth((Math.abs(dy)-.005)/.014);
  const weight=horizontal*vertical*blink;
  output[i+1]+=(1.6626-y)*weight*scale;
  output[i+2]+=.00045*weight*scale;
 }
 return output;
}
