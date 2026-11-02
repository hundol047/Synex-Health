// Fit the outer chest/clothing envelope once in the same rest frame as the rig.
// The hand controller uses the fitted surface rather than an average-body radius.
export function calibrateTorsoClearance(base,weights,rest){
 const h=rest.statureScale??rest[0][1]/.94;let front=.15*h;
 for(let i=0;i<weights.length;i++){
  const x=base[i*3]-rest[0][0],y=base[i*3+1]-rest[0][1],z=base[i*3+2]-rest[0][2];
  if(Math.abs(x)<.21*h&&y>.12*h&&y<.43*h&&weights[i].some(([b,w])=>b===0&&w>.65))front=Math.max(front,z);
 }
 return {front};
}
