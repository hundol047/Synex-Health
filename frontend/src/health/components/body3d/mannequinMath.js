import data from './assets/human-mesh.json';
import { anatomicalFrame, centralTorsoLoop, clamp, smooth } from './mannequinAnatomy.js';
const valid=v=>Number.isFinite(v)&&v>0;
export const GIRTH_FIELDS=[['chest_circumference','가슴둘레 (cm)',1.34],['waist_circumference','허리둘레 (cm)',1.10],['hip_circumference','엉덩이둘레 (cm)',.94]];
export function mannequinBase(gender){
 return Float32Array.from(data.profiles[gender]||data.profiles.male.map((v,i)=>(v+data.profiles.female[i])/2),v=>v*data.scale);
}
// Measure the actual central CLOSED surface loop. Segment-selection labels
// cannot be used to remove arms: doing so also cuts some chest/hip triangles.
export function torsoCircumference(positions,y){
 return (centralTorsoLoop(positions,data.indices,y)?.perimeter||0)*100;
}
// Illustrative local envelopes preserve the adult mesh's anatomical centers,
// joints, hands, feet and head. Whole-body SMM changes soft tissue, while fat
// affects its own distribution. Bone/mineral totals never invent bone shape.
// These coefficients describe the authored mesh, not population anatomy.
export function mannequinPositions(base,measurement={},profile={},shapeSegments=measurement.segments||[]){
 const height=clamp(valid(measurement.height)?measurement.height:valid(profile.height_cm)?profile.height_cm:178,50,250);
 const scale=height/178,female=profile.gender==='female';
 const bmi=valid(measurement.weight)?measurement.weight/(height/100)**2:22;
 const fat=Number.isFinite(measurement.body_fat_percentage)?measurement.body_fat_percentage:female?27:20;
 const mass=valid(measurement.skeletal_muscle_mass)?measurement.skeletal_muscle_mass:(female?8:10)*(height/100)**2;
 const muscle=clamp(mass/(height/100)**2/(female?8:10),.25,2.3)-1;
 const adipose=(clamp(fat,0,70)-(female?27:20))/25;
 const frame=clamp(Math.sqrt(clamp(bmi,12,60)/22),.7,1.6),anatomy=anatomicalFrame(base,data.indices);
 const out=new Float32Array(base.length);
 const segmentMap=new Map((Array.isArray(shapeSegments)?shapeSegments:[]).map(v=>[v.segment,v]));
 const names=['TRUNK','LEFT_ARM','RIGHT_ARM','LEFT_LEG','RIGHT_LEG'];
 const segmentShapes=Object.fromEntries(names.map(name=>{
  const value=segmentMap.get(name)?.lean_mass_kg,baseIndex=name==='TRUNK'?6.8:name.includes('ARM')?.8:2.6;
  return [name,Number.isFinite(value)?clamp(value/(baseIndex*(height/100)**2),.5,1.8)-1:0];
 }));
 for(let i=0;i<base.length;i+=3){
  const x=base[i],y=base[i+1],z=base[i+2],a=anatomy.at(x,y,z),side=x>=0?'LEFT':'RIGHT';
  const arm=a.arm*a.armSoft*a.elbow,leg=a.leg*a.legSoft*a.knee;
  const tissue=a.torso+arm+leg;
  const local=segmentShapes.TRUNK*a.torso+segmentShapes[`${side}_ARM`]*arm+segmentShapes[`${side}_LEG`]*leg;
  const lean=muscle*(.055*a.torso+.14*a.chest+.18*a.thigh*a.legSoft*a.knee+.13*a.calf*a.legSoft*a.knee+.20*a.upperArm*a.armSoft*a.elbow+.12*a.forearm*a.armSoft*a.elbow);
  const soft=adipose*(.055*tissue+.18*a.abdomen+.09*a.hips+.07*a.thigh*a.legSoft+.055*a.upperArm*a.armSoft);
  const radius=clamp(1+(frame-1)*tissue*.42+lean+soft+local*.09,.65,1.75);
  const depth=clamp(radius+adipose*.07*a.abdomen*smooth(-.015,.08,z-a.centerZ),.65,1.9);
  out[i]=(a.centerX+(x-a.centerX)*radius)*scale;
  out[i+1]=y*scale;
  out[i+2]=(a.centerZ+(z-a.centerZ)*depth)*scale;
 }
 // Joined constraints use local cross-section centers. Below the pelvis the
 // thigh centers stay planted instead of being pushed out from world x=0.
 const targets=GIRTH_FIELDS.filter(([key])=>valid(measurement[key]));
 if(!targets.length)return out;
 const unfit=out.slice();
 const knots=[[.55,1],...targets.map(([key,,plane])=>{
  const perimeter=torsoCircumference(unfit,plane*scale);
  return [plane,valid(perimeter)?clamp(measurement[key]/perimeter,.55,1.85):1];
 }).sort((a,b)=>a[0]-b[0]),[1.56,1]];
 function fit(){
  out.set(unfit);
  for(let i=0;i<out.length;i+=3){
   const x=base[i],y=base[i+1],z=base[i+2];if(y<=.55||y>=1.56)continue;
   const j=knots.findIndex(k=>k[0]>=y),[lo,va]=knots[j-1],[hi,vb]=knots[j];
   const a=anatomy.at(x,y,z),ratio=1+(va+(vb-va)*smooth(lo,hi,y)-1)*(1-a.arm);
   const cx=a.centerX*scale,cz=a.centerZ*scale;
   out[i]=cx+(unfit[i]-cx)*ratio;out[i+2]=cz+(unfit[i+2]-cz)*ratio;
  }
 }
 // Triangle interpolation near each plane and shoulder blending can differ
 // slightly from uniform scaling. Refine the actual measured loop itself.
 for(let iteration=0;iteration<5;iteration++){
  fit();let error=0;
  for(const [key,,plane]of targets){
   const perimeter=torsoCircumference(out,plane*scale);if(!valid(perimeter))continue;
   error=Math.max(error,Math.abs(perimeter-measurement[key]));
   knots.find(k=>k[0]===plane)[1]*=clamp(measurement[key]/perimeter,.85,1.15);
  }
  if(error<.025)break;
 }
 return out;
}
export function referenceMannequinMeasurement(measurement,value){
 // Only muscle mass changes. Keep actual height, weight, fat and girths; never
 // manufacture a whole reference InBody record or regional reference masses.
 return {...measurement,skeletal_muscle_mass:value,segments:(measurement.segments||[]).map(({lean_mass_kg,lean_reference_percent,...rest})=>rest)};
}
