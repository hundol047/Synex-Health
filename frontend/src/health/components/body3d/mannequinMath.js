import data from './assets/human-mesh.json';
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
const valid=v=>Number.isFinite(v)&&v>0;
export const GIRTH_FIELDS=[['chest_circumference','가슴둘레 (cm)',1.34],['waist_circumference','허리둘레 (cm)',1.10],['hip_circumference','엉덩이둘레 (cm)',.94]];
export function mannequinBase(gender){
 return Float32Array.from(data.profiles[gender]||data.profiles.male.map((v,i)=>(v+data.profiles.female[i])/2),v=>v*data.scale);
}
// Length of the actual triangle/plane intersections in model metres. At these
// torso planes we exclude the arms, so their separate loops are not counted.
export function torsoCircumference(positions,y){
 let length=0;
 for(let i=0;i<data.indices.length;i+=3){
  const ids=data.indices.slice(i,i+3);
  if(ids.some(id=>[2,3].includes(data.regions[id])))continue;
  const hits=[];
  for(let e=0;e<3;e++){
   const a=ids[e]*3,b=ids[(e+1)%3]*3,dyA=positions[a+1]-y,dyB=positions[b+1]-y;
   if((dyA<=0&&dyB>0)||(dyB<=0&&dyA>0)){
    const t=dyA/(dyA-dyB);hits.push([positions[a]+t*(positions[b]-positions[a]),positions[a+2]+t*(positions[b+2]-positions[a+2])]);
   }
  }
  if(hits.length===2)length+=Math.hypot(hits[0][0]-hits[1][0],hits[0][1]-hits[1][1]);
 }
 return length*100;
}
// The coefficients describe our authored mesh, not population means. SMM and
// fat affect different envelopes; bone/mineral mass cannot determine bone shape.
export function mannequinPositions(base,measurement={},profile={},shapeSegments=measurement.segments||[]){
 const height=clamp(valid(measurement.height)?measurement.height:valid(profile.height_cm)?profile.height_cm:178,50,250);
 const scale=height/178,female=profile.gender==='female';
 const bmi=valid(measurement.weight)?measurement.weight/(height/100)**2:22;
 const fat=Number.isFinite(measurement.body_fat_percentage)?measurement.body_fat_percentage:female?27:20;
 const mass=valid(measurement.skeletal_muscle_mass)?measurement.skeletal_muscle_mass:(female?8:10)*(height/100)**2;
 const muscle=clamp(mass/(height/100)**2/(female?8:10),.25,2.3)-1;
 const adipose=(clamp(fat,0,70)-(female?27:20))/25;
 const frame=clamp(Math.sqrt(clamp(bmi,12,60)/22),.7,1.6);
 const out=new Float32Array(base.length);
 const segmentMap=new Map(shapeSegments.map(v=>[v.segment,v]));
 const names=[null,'TRUNK','LEFT_ARM','RIGHT_ARM','LEFT_LEG','RIGHT_LEG'];
 const segmentShapes=Object.fromEntries(names.slice(1).map(name=>{
  const value=segmentMap.get(name)?.lean_mass_kg,baseIndex=name==='TRUNK'?6.8:name.includes('ARM')?.8:2.6;
  return [name,Number.isFinite(value)?clamp(value/(baseIndex*(height/100)**2),.5,1.8)-1:0];
 }));
 for(let i=0;i<base.length;i+=3){
  const x=base[i],y=base[i+1],z=base[i+2];
  const leg=1-smooth(.77,1.02,y),arm=smooth(.19,.34,Math.abs(x))*smooth(.87,1.13,y);
  const trunk=(1-leg)*(1-arm)*(1-smooth(1.46,1.58,y));
  const abdomen=smooth(.94,1.07,y)*(1-smooth(1.23,1.34,y))*trunk;
  const chest=smooth(1.18,1.32,y)*(1-smooth(1.46,1.57,y))*trunk;
  const thigh=smooth(.3,.55,y)*(1-smooth(.88,1.02,y))*leg;
  const upperArm=smooth(.99,1.16,y)*(1-smooth(1.4,1.5,y))*arm;
  const body=1-smooth(1.43,1.58,y);
  const left=smooth(-.03,.03,x),part=type=>segmentShapes[`LEFT_${type}`]*left+segmentShapes[`RIGHT_${type}`]*(1-left);
  const segmentShape=segmentShapes.TRUNK*trunk+part('ARM')*arm+part('LEG')*leg*(1-arm);
  const radial=clamp(1+(frame-1)*body*.75+muscle*(.12*body+.13*upperArm+.14*thigh+.13*chest)+adipose*(.11*body+.25*abdomen+.09*thigh)+segmentShape*.1,.55,1.9);
  const center=Math.sign(x)*(.10*leg+(.22+(1.42-y)*.55)*arm*(1-leg));
  const shoulder=smooth(1.24,1.38,y)*(1-smooth(1.48,1.58,y));
  out[i]=(x+(x-center)*(radial-1)+x*muscle*.055*shoulder)*scale;
  out[i+1]=y*scale;
  out[i+2]=z*radial*scale*(1+.1*adipose*abdomen);
 }
 // Interpolate a continuous radius profile through measured girths. Independent
 // narrow bulges create shelves at the pelvis; broad joined constraints retain
 // a natural silhouette and hit the measured cross-sections at their planes.
 const knots=[[.55,1],...GIRTH_FIELDS.filter(([key])=>valid(measurement[key])).map(([key,,plane])=>{
  const perimeter=torsoCircumference(out,plane*scale);
  return [plane,valid(perimeter)?clamp(measurement[key]/perimeter,.6,1.65):1];
 }).sort((a,b)=>a[0]-b[0]),[1.56,1]];
 for(let i=0;i<out.length;i+=3){
  const y=base[i+1];if(y<=knots[0][0]||y>=knots.at(-1)[0])continue;
  const j=knots.findIndex(k=>k[0]>=y),[a,va]=knots[j-1],[b,vb]=knots[j];
  const ratio=va+(vb-va)*smooth(a,b,y),weight=1-smooth(.24,.36,Math.abs(base[i]));
  out[i]*=1+(ratio-1)*weight;out[i+2]*=1+(ratio-1)*weight;
 }
 return out;
}
export function referenceMannequinMeasurement(measurement,value){
 // Only muscle mass changes. Keep actual height, weight, fat and girths; never
 // manufacture a whole reference InBody record or regional reference masses.
 return {...measurement,skeletal_muscle_mass:value,segments:(measurement.segments||[]).map(({lean_mass_kg,lean_reference_percent,...rest})=>rest)};
}
