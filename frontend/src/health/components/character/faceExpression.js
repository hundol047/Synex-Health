import {blinkAmount} from './livingFace.js';
import {fittedEyeLayout} from './authoredFaceGeometry.js';
const smooth=t=>{const x=Math.max(0,Math.min(1,t));return x*x*(3-2*x);};
// Move the actual textured skin of the eyelids. No detached skin-colored patch.
// The source is immutable and the body, hands and support points are untouched.
export function faceBlinkSurface(source,scale,progress,character,reference=source){
 const blink=blinkAmount(progress);if(!blink)return source;
 const output=source.slice(),eyes=fittedEyeLayout(reference);
 for(let i=0;i<source.length;i+=3){
  const x=source[i]/scale,y=source[i+1]/scale,z=source[i+2]/scale;
  if(y<1.64||y>1.687||z<.095||Math.abs(x)<.012||Math.abs(x)>.057)continue;
  const eye=eyes[x<0?0:1],dx=x-eye.center.x/scale,dy=y-eye.center.y/scale;
  const horizontal=1-smooth((Math.abs(dx)-.0105)/.0105);
  const vertical=1-smooth((Math.abs(dy)-.005)/.014);
  const weight=horizontal*vertical*blink;
  output[i+1]+=(eye.center.y/scale-.0003-y)*weight*scale;
  output[i+2]+=Math.min(.004,Math.max(0,eye.front/scale+.0003-z))*weight*scale;
 }
 return output;
}
