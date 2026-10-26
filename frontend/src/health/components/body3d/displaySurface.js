import data from './assets/human-mesh.json' with { type: 'json' };

// Remove small chest surface details from the shared demonstration topology.
// Fit the surrounding chest curve; keep breast volume, X/Y positions, indices
// and every vertex outside the local patch unchanged.
const smooth = t => { const x=Math.max(0,Math.min(1,t));return x*x*(3-2*x); };
export function smoothChestDetails(base, gender) {
  const output=base.slice();
  for(const side of [-1,1]){
    const cx=side*(gender==='female'?.114:.100),cy=1.298,rx=.022,ry=.019;
    const rows=Array.from({length:6},()=>Array(7).fill(0));
    for(let i=0;i<base.length;i+=3){
      if(base[i+2]<.09)continue;
      const u=(base[i]-cx)/rx,v=(base[i+1]-cy)/ry,r=Math.hypot(u,v);
      if(r<1||r>1.8)continue;
      const terms=[1,u,v,u*u,u*v,v*v];
      for(let a=0;a<6;a++){for(let b=0;b<6;b++)rows[a][b]+=terms[a]*terms[b];rows[a][6]+=terms[a]*base[i+2];}
    }
    let valid=true;
    for(let col=0;col<6;col++){
      let pivot=col;for(let row=col+1;row<6;row++)if(Math.abs(rows[row][col])>Math.abs(rows[pivot][col]))pivot=row;
      [rows[col],rows[pivot]]=[rows[pivot],rows[col]];
      const divisor=rows[col][col];if(Math.abs(divisor)<1e-8){valid=false;break;}
      for(let j=col;j<7;j++)rows[col][j]/=divisor;
      for(let row=0;row<6;row++)if(row!==col){const factor=rows[row][col];for(let j=col;j<7;j++)rows[row][j]-=factor*rows[col][j];}
    }
    if(!valid)continue;
    const coefficients=rows.map(row=>row[6]);
    for(let i=0;i<base.length;i+=3){
      if(base[i+2]<.09)continue;
      const u=(base[i]-cx)/rx,v=(base[i+1]-cy)/ry,r=Math.hypot(u,v);
      if(r>=1)continue;
      const terms=[1,u,v,u*u,u*v,v*v],z=terms.reduce((sum,value,k)=>sum+value*coefficients[k],0),blend=1-smooth((r-.55)/.45);
      output[i+2]=base[i+2]+(z-base[i+2])*blend;
    }
  }
  return output;
}
const profiles=Object.fromEntries(['male','female'].map(gender=>[gender,smoothChestDetails(Float32Array.from(data.profiles[gender],v=>v*data.scale),gender)]));
export function displayBodyBase(gender){
  return profiles[gender]?.slice()||Float32Array.from(profiles.male,(value,i)=>(value+profiles.female[i])/2);
}
