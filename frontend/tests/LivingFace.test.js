import {it,expect} from 'vitest';
import {Vector3,CatmullRomCurve3} from 'three';
import {blinkAmount,taperedStrand,lidCoverGeometry} from '../src/health/components/character/livingFace.js';
it('closes smoothly and opens within the existing playback phase with no open/closed seam',()=>{
 for(const p of [0,.5,.76,.805,1,NaN])expect(blinkAmount(p)).toBe(0);
 expect(blinkAmount(.777)).toBe(1);
 for(let i=0;i<=1000;i++){const b=blinkAmount(i/1000);expect(b).toBeGreaterThanOrEqual(0);expect(b).toBeLessThanOrEqual(1);if(i)expect(Math.abs(b-blinkAmount((i-1)/1000))).toBeLessThan(.1);}
});
it('tapers hair tips and builds finite lid coverage without excess geometry',()=>{
 const curve=new CatmullRomCurve3([new Vector3(),new Vector3(0,.02,0),new Vector3(.01,.04,0)]),strand=taperedStrand(curve,.001,18),lid=lidCoverGeometry();
 try{const p=strand.attributes.position;expect(p.count).toBe(19*6);expect(new Vector3().fromBufferAttribute(p,18*6).distanceTo(curve.getPointAt(1))).toBeLessThan(.0001);expect(p.array.every(Number.isFinite)).toBe(true);expect(lid.attributes.position.array.every(Number.isFinite)).toBe(true);expect(strand.attributes.color.count).toBe(p.count);}finally{strand.dispose();lid.dispose();}
});
