// An art-directed portrait option, not a population/ethnicity measurement.
// Work in rest space once, before support calibration and exercise skinning.
// Source files, body dimensions and the complete exercise rig stay intact.
const smooth=(a,b,v)=>{const t=Math.max(0,Math.min(1,(v-a)/(b-a)));return t*t*(3-2*t);};
const bump=(x,y,cx,cy,rx,ry)=>Math.exp(-2*(((x-cx)/rx)**2+((y-cy)/ry)**2));

export function naturalPortraitPoint(point,eyes,body){
 const [x,y,z]=point;
 if(y<=1.54||y>=1.76||z<=.055)return [...point];
 const eyeY=(eyes[0][1]+eyes[1][1])/2;
 // Protect each entire eye globe and its socket. Moving only the iris or
 // flattening a globe leaves gaps and changes the apparent gaze.
 let eyeGuard=1;
 for(const e of eyes)eyeGuard*=smooth(.019,.032,Math.hypot(x-e[0],y-e[1],z-e[2]));
 const front=smooth(.055,.095,z)*smooth(1.54,1.56,y)*(1-smooth(1.73,1.76,y))*eyeGuard, female=body==='female';
 const nose=bump(x,y,0,eyeY-.021,.028,.041);
 const cheek=bump(Math.abs(x),y,.049,eyeY-.039,.033,.039);
 const jaw=bump(Math.abs(x),y,.037,eyeY-.083,.045,.035);
 const lips=bump(x,y,0,eyeY-.058,.033,.021);
 const brow=bump(x,y,0,eyeY+.025,.052,.028);
 return [
  x+Math.tanh(x/.02)*((female?.0008:.0004)*cheek+(female?.0004:.0003)*jaw)*front,
  y,
  z+(-(female?.006:.003)*nose+.0003*cheek-.0004*jaw-.0006*lips-.0004*brow)*front,
 ];
}

export function naturalTrainerData(source){
 const restBlink=source.body==='female'?.06:.035, original=source.positions;
 const relaxed=original.slice();
 for(const rows of Object.values(source.morphs))for(const [i,x,y,z] of rows){
  relaxed[i*3]+=restBlink*x;relaxed[i*3+1]+=restBlink*y;relaxed[i*3+2]+=restBlink*z;
 }
 const transform=p=>naturalPortraitPoint(p,source.eyes,source.body);
 const positions=relaxed.slice();
 for(let i=0;i<positions.length;i+=3){const p=transform(relaxed.slice(i,i+3));for(let k=0;k<3;k++)positions[i+k]=p[k];}
 const morphs={};
 for(const [name,rows] of Object.entries(source.morphs))morphs[name]=rows.map(([i,...delta])=>{
  const closed=transform(delta.map((v,k)=>relaxed[i*3+k]+(1-restBlink)*v));
  return [i,...closed.map((v,k)=>v-positions[i*3+k])];
 });
 return {...source,positions,morphs,
  refinement:{...source.refinement,faceResculpted:true,portraitStyle:'natural',restBlink},
 };
}
