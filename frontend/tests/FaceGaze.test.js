import {it,expect} from 'vitest';
import {eyeGaze} from '../src/health/components/character/livingFace.js';
import {visibleIrisGeometry,eyeOpening} from '../src/health/components/character/eyeSurface.js';
it('keeps fixation small, repeatable, stationary on pause and continuous at the loop',()=>{
 expect(eyeGaze(0)).toEqual([0,0]);expect(eyeGaze(1)).toEqual([0,0]);expect(eyeGaze(NaN)).toEqual([0,0]);
 expect(eyeGaze(.2)).toEqual(eyeGaze(.3));expect(eyeGaze(.2)).not.toEqual(eyeGaze(.5));
 for(let p=0;p<=1;p+=.005){const [x,y]=eyeGaze(p);expect(Math.abs(x)).toBeLessThanOrEqual(.0008);expect(Math.abs(y)).toBeLessThanOrEqual(.0003);}
});
it('clips moving irises and pupils to the lids instead of sliding them over the skin',()=>{
 for(const phase of [.2,.5,.777])for(const closure of [0,.5,.9,1])for(const radius of [.002,.0057]){
  const g=visibleIrisGeometry(1,radius,closure,.00018,eyeGaze(phase));
  try{const p=g.attributes.position;
   for(let i=0;i<p.count;i++){const [bottom,top]=eyeOpening(p.getX(i),closure);expect(p.getY(i)).toBeGreaterThanOrEqual(bottom-.000001);expect(p.getY(i)).toBeLessThanOrEqual(top+.000001);}
   expect(p.array.every(Number.isFinite)).toBe(true);expect(g.attributes.uv.array.every(v=>v>=0&&v<=1)).toBe(true);
  }finally{g.dispose();}
 }
});
