import {BufferGeometry,Float32BufferAttribute} from 'three';

// Render-only Loop refinement. The exercise rig keeps its original support,
// grip and collision geometry. Sparse stencils are evaluated after posing, so
// expressions, hair sway and body sliders also reach the refined surface.
const edgeKey=(a,b)=>a<b?`${a}:${b}`:`${b}:${a}`;
export function createVtuberSmoothing(model){
 const {data}=model,source=data.sourceVertices,physical=new Map(),representatives=[],ids=[];
 source.forEach((key,i)=>{if(!physical.has(key)){physical.set(key,physical.size);representatives.push(i);}ids.push(physical.get(key));});
 const count=physical.size,neighbors=Array.from({length:count},()=>new Set()),edges=new Map(),amount=new Float32Array(count).fill(1),hairOnly=new Uint8Array(count).fill(1);
 data.groups.forEach((group,g)=>{
  const material=data.surfaceMaterials[g],hair=material.kind==='Hair';
  for(const i of group){const hand=data.weights[i].some(([bone,w])=>bone>=12&&w>.2);
   const blend=hand?0:hair?.85:material.name==='Face_00_SKIN'?.25:['Skin','Clothes'].includes(material.kind)?.75:0;
   amount[ids[i]]=Math.min(amount[ids[i]],blend);if(!hair)hairOnly[ids[i]]=0;
  }
  for(let i=0;i<group.length;i+=3){const t=group.slice(i,i+3).map(v=>ids[v]);if(new Set(t).size!==3)continue;
   for(let j=0;j<3;j++){const a=t[j],b=t[(j+1)%3],key=edgeKey(a,b);neighbors[a].add(b);neighbors[b].add(a);
    if(!edges.has(key))edges.set(key,{a,b,opposite:[]});edges.get(key).opposite.push(t[(j+2)%3]);
   }
  }
 });
 const border=Array.from({length:count},()=>new Set()),irregular=new Set();
 for(const e of edges.values()){
  if(e.opposite.length===1){border[e.a].add(e.b);border[e.b].add(e.a);}
  if(e.opposite.length>2){irregular.add(e.a);irregular.add(e.b);}
 }
 // Open non-hair edges are deliberately pinned: lips, eyelids, garment hems
 // and the stitched pelvic panel must not pull away from adjacent surfaces.
 const stencils=neighbors.map((near,i)=>{
  if(hairOnly[i]&&border[i].size===2&&!irregular.has(i))return [[representatives[i],1-.25*amount[i]],...[...border[i]].map(j=>[representatives[j],.125*amount[i]])];
  if(border[i].size||irregular.has(i)||!near.size||!amount[i])return [[representatives[i],1]];
  const beta=(near.size===3?3/16:3/(8*near.size))*amount[i];
  return [[representatives[i],1-near.size*beta],...[...near].map(j=>[representatives[j],beta])];
 });
 for(const e of edges.values()){
  const blend=e.opposite.length===2&&!irregular.has(e.a)&&!irregular.has(e.b)?Math.min(amount[e.a],amount[e.b]):0;
  e.id=stencils.length;
  stencils.push([[representatives[e.a],.5-.125*blend],[representatives[e.b],.5-.125*blend],...(blend?e.opposite.map(i=>[representatives[i],.125*blend]):[])]);
 }
 const vertexIds=[...ids],uv=[...data.uv],uvEdges=new Map(),groups=[];
 const midpoint=(a,b)=>{
  const key=edgeKey(a,b);if(uvEdges.has(key))return uvEdges.get(key);
  const index=vertexIds.length,e=edges.get(edgeKey(ids[a],ids[b]));
  // Degenerate triangles are retained linearly instead of making NaN stencils.
  vertexIds.push(e?.id??ids[a]);uv.push((data.uv[a*2]+data.uv[b*2])/2,(data.uv[a*2+1]+data.uv[b*2+1])/2);uvEdges.set(key,index);return index;
 };
 const geometry=new BufferGeometry(),indices=[];
 for(const group of data.groups){const start=indices.length;
  for(let i=0;i<group.length;i+=3){const [a,b,c]=group.slice(i,i+3),ab=midpoint(a,b),bc=midpoint(b,c),ca=midpoint(c,a);indices.push(a,ab,ca,ab,b,bc,ca,bc,c,ab,bc,ca);}
  geometry.addGroup(start,indices.length-start,groups.length);groups.push(indices.length-start);
 }
 geometry.setIndex(indices);geometry.setAttribute('uv',new Float32BufferAttribute(uv,2));
 const positions=new Float32Array(vertexIds.length*3),scratch=new Float32Array(stencils.length*3);
 // Flatten once; avoid allocating arrays or walking nested maps per frame.
 const offsets=new Uint32Array(stencils.length+1),terms=[],coefficients=[];
 stencils.forEach((row,i)=>{offsets[i]=terms.length;for(const [j,w]of row){terms.push(j*3);coefficients.push(w);}});offsets[stencils.length]=terms.length;
 const inputOffsets=Uint32Array.from(terms),weights=Float32Array.from(coefficients),outputOffsets=Uint32Array.from(vertexIds,i=>i*3);
 const evaluate=(input,output,normal=false)=>{
  for(let i=0;i<stencils.length;i++){
   let x=0,y=0,z=0;for(let t=offsets[i];t<offsets[i+1];t++){const j=inputOffsets[t],w=weights[t];x+=input[j]*w;y+=input[j+1]*w;z+=input[j+2]*w;}
   const inverse=normal?1/(Math.sqrt(x*x+y*y+z*z)||1):1;scratch[i*3]=x*inverse;scratch[i*3+1]=y*inverse;scratch[i*3+2]=z*inverse;
  }
  for(let i=0;i<vertexIds.length;i++){const j=outputOffsets[i];output[i*3]=scratch[j];output[i*3+1]=scratch[j+1];output[i*3+2]=scratch[j+2];}
  return output;
 };
 const guide=evaluate(model.guideBase,new Float32Array(positions.length));
 geometry.setAttribute('vtuberRest',new Float32BufferAttribute(evaluate(model.geometry.attributes.vtuberRest.array,new Float32Array(positions.length)),3));
 geometry.setAttribute('position',new Float32BufferAttribute(positions,3));
 geometry.setAttribute('normal',new Float32BufferAttribute(new Float32Array(positions.length),3));
 const update=()=>{
  const p=geometry.attributes.position;evaluate(model.geometry.attributes.position.array,p.array);p.needsUpdate=true;
  // Interpolate the already welded pose normals. Rebuilding all refined
  // triangle normals would quadruple CPU work on mobile on every frame.
  evaluate(model.geometry.attributes.normal.array,geometry.attributes.normal.array,true);
  geometry.attributes.normal.needsUpdate=true;
  // Convex stencils stay within the original posed bounds, including support.
  geometry.boundingBox=model.geometry.boundingBox?.clone()||null;
  geometry.boundingSphere=model.geometry.boundingSphere?.clone()||null;
 };
 update();
 return {geometry,guide,update,vertexIds,stencils,dispose:()=>geometry.dispose()};
}
