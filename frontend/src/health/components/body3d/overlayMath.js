export const OVERLAY_REGIONS=[null,'TRUNK','LEFT_ARM','RIGHT_ARM','LEFT_LEG','RIGHT_LEG'];
export function numericDelta(value, reference){
 const valid=Number.isFinite(value)&&Number.isFinite(reference);
 return {user_value:value??null,reference_value:reference??null,difference_kg:valid?Number((value-reference).toFixed(3)):null,difference_percent:valid&&reference>0?Number(((value-reference)/reference*100).toFixed(1)):null};
}
export const signed=(v,digits=1)=>Number.isFinite(v)?`${v>0?'+':''}${v.toFixed(digits)}`:'—';
export function valuesFor(measurement,metric){return Object.fromEntries((measurement?.segments||[]).map(s=>[s.segment,s[metric==='fat'?'fat_mass_kg':'lean_mass_kg']]));}
export function referenceValues(group,metric){return Object.fromEntries(Object.entries(group?.segments||{}).map(([s,row])=>[s,row[metric]?.reference_value]));}
export function comparisonRows(a,b){return OVERLAY_REGIONS.slice(1).map(segment=>({segment,...numericDelta(a[segment],b[segment])}));}
const gauss=(v,c,w)=>Math.exp(-(((v-c)/w)**2));
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
// Artist-authored deformation envelopes; NOT separate measured muscles or population norms.
// A single monotonic transfer is used for BOTH bodies. No body-wide BMI/fat rescale in lean mode.
export function overlayPositions(base,regions,values,height=178,metric='lean'){
 const out=new Float32Array(base.length),scale=clamp((height||178)/178,.6,1.4);
 for(let i=0;i<base.length;i+=3){
  const x=base[i],y=base[i+1],z=base[i+2],region=OVERLAY_REGIONS[regions[i/3]];
  const arm=region?.includes('ARM'),leg=region?.includes('LEG');
  const v=values[region];
  const nominal=metric==='fat'?(arm?.6:leg?2.4:7):(arm?2.5:leg?7:22);
  const factor=Number.isFinite(v)&&v>=0?clamp(Math.log1p(v/nominal)/Math.log(2)-1,-1,2):0;
  let center=0,envelope=0,front=1;
  if(arm){
   center=Math.sign(x)*(.23+(1.43-y)*.52);
   // deltoid, upper arm front/back and forearm: continuous overlapping zones.
   envelope=.19*gauss(y,1.42,.09)+.23*gauss(y,1.25,.13)+.13*gauss(y,1.04,.11);
   front=1+.12*Math.tanh(z*15);
  }else if(leg){
   center=Math.sign(x)*.105;
   envelope=.20*gauss(y,.87,.15)+.25*gauss(y,.66,.17)+.17*gauss(y,.30,.14);
   front=1+.12*Math.tanh(z*12);
  }else if(region==='TRUNK'){
   // chest / upper & lower back / abdomen visual zones, smoothly faded at neck/pelvis.
   envelope=.17*gauss(y,1.39,.10)+.15*gauss(y,1.24,.13)+.17*gauss(y,1.06,.11);
   front=1+.10*Math.tanh(z*12);
  }
  out[i]=(x+(x-center)*factor*envelope)*scale;
  out[i+1]=y*scale;
  out[i+2]=z*(1+factor*envelope*front)*scale;
 }
 return out;
}
export function interpolatePositions(a,b,t){const out=new Float32Array(a.length);for(let i=0;i<a.length;i++)out[i]=a[i]+(b[i]-a[i])*t;return out;}
