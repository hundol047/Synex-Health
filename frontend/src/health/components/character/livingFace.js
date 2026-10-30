import * as THREE from 'three';
// Driven only by the existing demonstration phase: pausing or reduced motion
// pauses the expression too. No independent animation loop or facial tracking.
export function blinkAmount(progress){
 if(!Number.isFinite(progress))return 0;
 const p=Math.max(0,Math.min(1,progress)),start=.76,peak=.777,end=.805;
 const ease=t=>t*t*(3-2*t);
 if(p<=start||p>=end)return 0;
 return p<peak?ease((p-start)/(peak-start)):1-ease((p-peak)/(end-peak));
}
export function taperedStrand(curve,radius,segments=18){
 const geometry=new THREE.TubeGeometry(curve,segments,radius,5,false),position=geometry.attributes.position;
 const color=new Float32Array(position.count*3);
 for(let ring=0;ring<=segments;ring++){
  const t=ring/segments,center=curve.getPointAt(t),taper=.07+.93*Math.pow(1-t,.42);
  for(let side=0;side<=5;side++){
   const i=ring*6+side,v=new THREE.Vector3().fromBufferAttribute(position,i).sub(center).multiplyScalar(taper).add(center);position.setXYZ(i,v.x,v.y,v.z);
   const shade=.72+.25*Math.sin(t*Math.PI*.75);color.set([shade,shade,shade],i*3);
  }
 }
 geometry.setAttribute('color',new THREE.BufferAttribute(color,3));geometry.computeVertexNormals();return geometry;
}
// Upper lid travels over the eye surface rather than flattening the entire eye.
export function lidCoverGeometry(scale=1,toon=false){
 const positions=[],indices=[],columns=24,rows=8;
 for(let row=0;row<=rows;row++)for(let i=0;i<=columns;i++){
  const u=i/columns,v=row/rows*2-1,edge=Math.sqrt(Math.max(0,1-(u*2-1)**2));
  const height=(toon?.0049:.0036)*scale;
  // Elliptical coverage, with a curved surface rather than a flat eye patch.
  positions.push((u*2-1)*.0108*scale,v*height*edge,(.0023+.00065*edge*(1-.6*v*v))*scale);
  if(row<rows&&i<columns){const a=row*(columns+1)+i;indices.push(a,a+columns+1,a+1,a+1,a+columns+1,a+columns+2);}
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();return g;
}
export function closedLidCreaseGeometry(scale=1){
 const points=Array.from({length:25},(_,i)=>{const t=i/24,edge=Math.sin(Math.PI*t);return new THREE.Vector3((t*2-1)*.0102*scale,(-.0004-.0004*edge)*scale,(.0027+.0005*edge)*scale);});
 return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),24,.00020*scale,6,false);
}
