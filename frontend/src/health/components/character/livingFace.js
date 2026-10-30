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
export function lidCoverGeometry(scale=1){
 const positions=[],indices=[];
 for(let i=0;i<=24;i++){
  const u=i/24,x=(u*2-1)*.0105*scale,edge=Math.sin(Math.PI*u);
  positions.push(x,.0038*edge*scale,.00225*scale,x,-.0031*edge*scale,.00225*scale);
  if(i<24){const a=i*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();return g;
}
