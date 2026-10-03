// Bounded illustrative deformation, NOT a body reconstruction or medical model.
export const REGIONS=[null,'TRUNK','LEFT_ARM','RIGHT_ARM','LEFT_LEG','RIGHT_LEG'];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const finite=(v,f)=>Number.isFinite(v)&&v>0?v:f;
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
export function morphParameters(m={},profile={}) {
  const height=clamp(finite(m.height,finite(profile.height_cm,178)),110,245);
  const bmi=finite(m.weight,0)?m.weight/(height/100)**2:finite(m.bmi,22);
  const female=profile.gender==='female';
  const fat=Number.isFinite(m.body_fat_percentage)&&m.body_fat_percentage>=0?m.body_fat_percentage:(Number.isFinite(m.body_fat_mass)&&m.body_fat_mass>=0&&finite(m.weight,0)?clamp(m.body_fat_mass/m.weight*100,0,65):(female?27:20));
  const muscle=finite(m.skeletal_muscle_mass, (female?8:10)*(height/100)**2)/(height/100)**2;
  const global=clamp(Math.sqrt(clamp(bmi,14,45)/22),.8,1.35);
  const parts={};
  for(const name of REGIONS.slice(1)){
    const seg=(Array.isArray(m.segments)?m.segments:[]).find(s=>s.segment===name);
    const trunk=name==='TRUNK',arm=name.includes('ARM');
    const leanBase=(trunk?6.8:arm?.8:2.6)*(height/100)**2;
    const fatBase=(trunk?3:arm?.22:1)*(height/100)**2;
    const lean=Number.isFinite(seg?.lean_mass_kg)?clamp(seg.lean_mass_kg/leanBase,.5,1.8):muscle/(female?8:10);
    const adipose=Number.isFinite(seg?.fat_mass_kg)?clamp(seg.fat_mass_kg/fatBase,0,3):fat/(female?27:20);
    parts[name]=clamp(global*(1+.12*(lean-1)+.09*(adipose-1)+.04*(clamp(muscle/(female?8:10),.5,1.8)-1)+.03*(clamp(fat/(female?27:20),0,3)-1)),.72,1.65);
  }
  const waist=finite(m.waist_circumference,finite(m.waist_circumference_cm,null));
  const abdomen=waist?clamp(waist/(female?78:86),.85,1.35):clamp(1+(fat-(female?27:20))*.006,.88,1.22);
  const shoulder=clamp(1+(muscle/(female?8:10)-1)*.12,.9,1.15);
  const missing=['height','weight','skeletal_muscle_mass','body_fat_percentage','waist_circumference','visceral_fat_level'].filter(k=>m[k]==null);
  return {heightScale:clamp(height/178,.6,1.4),parts,abdomen,shoulder,missing,estimated:true};
}
export function morphPositions(base,m,profile){
  const out=new Float32Array(base.length),p=morphParameters(m,profile);
  for(let i=0;i<base.length;i+=3){
    const x=base[i],y=base[i+1],z=base[i+2],side=x>=0?'LEFT':'RIGHT';
    const leg=1-smooth(.79,1.02,y),arm=smooth(.19,.34,Math.abs(x))*smooth(.87,1.13,y);
    const trunk=(1-leg)*(1-arm)*(1-smooth(1.43,1.57,y));
    const limb=p.parts[`${side}_${leg>.5?'LEG':'ARM'}`];
    const limbWeight=leg+arm*(1-leg),center=leg>.5?Math.sign(x)*.10:Math.sign(x)*(.22+(1.42-y)*.55);
    const factor=(limb-1)*limbWeight;
    const belly=smooth(.9,1.08,y)*(1-smooth(1.22,1.36,y))*trunk;
    const shoulder=smooth(1.25,1.4,y)*(1-smooth(1.48,1.56,y));
    out[i]=(x+(x-center)*factor+x*(p.parts.TRUNK-1)*trunk)+x*((p.abdomen-1)*belly*.35+(p.shoulder-1)*shoulder);
    out[i+1]=y*p.heightScale;
    out[i+2]=z*(1+factor+(p.parts.TRUNK-1)*trunk+(p.abdomen-1)*belly);
  }
  return out;
}
export function measurementDeltas(previous,current){
  if(!previous||!current)return [];
  const delta=(a,b)=>!Number.isFinite(a)||!Number.isFinite(b)?null:Math.round((b-a)*100)/100;
  return [...['weight','skeletal_muscle_mass','body_fat_percentage'].map(key=>({key,value:delta(previous[key],current[key])})),...REGIONS.slice(1).flatMap(region=>['lean_mass_kg','fat_mass_kg'].map(key=>({key:`${region}.${key}`,value:delta(previous.segments?.find(s=>s.segment===region)?.[key],current.segments?.find(s=>s.segment===region)?.[key])})))];
}
