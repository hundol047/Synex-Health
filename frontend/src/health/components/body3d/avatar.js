import data from './assets/human-mesh.json';
import {morphPositions} from './morph.js';
export function personalizedVertices(measurement={},profile={}) {
 const known=data.profiles[profile.gender];
 const base=Float32Array.from(known||data.profiles.male,(v,i)=>(known?v:(v+data.profiles.female[i])/2)*data.scale);
 return morphPositions(base,measurement,profile);
}
// Original, unbranded garments share the body's topology and joint weights.
// Covered body faces are omitted so skin cannot poke through the opaque clothing.
export function sportswear(base,stature=1,gender) {
 const positions=base.slice(),indices={skin:[],top:[],bottom:[],shoes:[]};
 const materialAt=(x,y)=>y<.13?'shoes':y<.94?(gender==='male'&&y<.57?'skin':'bottom'):y<1.49&&(Math.abs(x)<.265||y>1.27)?'top':'skin';
 const labels=[];
 for(let i=0;i<base.length;i+=3){const x=base[i],y=base[i+1]/stature,z=base[i+2];const label=materialAt(x,y);labels.push(label);
  if(label==='top') {positions[i]=x*1.015;positions[i+2]=z+Math.sign(z-.035)*.006;}
  if(label==='bottom'){positions[i]=x*1.02;positions[i+2]=z+Math.sign(z-.035)*.008;}
  if(label==='shoes'){positions[i]=x+Math.sign(x)*.006;positions[i+2]=z+.012;}
 }
 for(let i=0;i<data.indices.length;i+=3){const face=data.indices.slice(i,i+3),ls=face.map(v=>labels[v]);const label=['shoes','bottom','top'].find(l=>ls.includes(l))||'skin';indices[label].push(...face);}
 return {positions,indices,labels};
}
