// One Loop subdivision step on connected hair topology, preserving duplicated
// UV seams. Immutable stencils are cached; fitted positions remain per-head.
const cache=new WeakMap();
const boundaryCache=new WeakMap();
// Count physical edges, not duplicated UV vertices: an atlas seam is not a
// hairline and must never become a transparent split through the crown.
export function hairBoundaryVertices(data){
 if(boundaryCache.has(data.indices))return boundaryCache.get(data.indices);
 const edges=new Map();
 for(let i=0;i<data.indices.length;i+=3){
  const tri=data.indices.slice(i,i+3).map(v=>data.vertices[v]);
  for(let k=0;k<3;k++){
   const a=tri[k],b=tri[(k+1)%3],key=a<b?`${a}:${b}`:`${b}:${a}`;
   const edge=edges.get(key);if(edge)edge.count++;else edges.set(key,{a,b,count:1});
  }
 }
 const boundary=new Set();for(const edge of edges.values())if(edge.count===1){boundary.add(edge.a);boundary.add(edge.b);}
 boundaryCache.set(data.indices,boundary);return boundary;
}
function topology(data,count){
 if(cache.has(data))return cache.get(data);
 const neighbors=Array.from({length:count},()=>new Set()),edges=new Map();
 const key=(a,b)=>a<b?`${a}:${b}`:`${b}:${a}`;
 for(let i=0;i<data.indices.length;i+=3){
  const tri=data.indices.slice(i,i+3).map(v=>data.vertices[v]);
  for(let k=0;k<3;k++){
   const a=tri[k],b=tri[(k+1)%3],opposite=tri[(k+2)%3],id=key(a,b);
   neighbors[a].add(b);neighbors[b].add(a);
   if(!edges.has(id))edges.set(id,{a,b,opposite:[]});edges.get(id).opposite.push(opposite);
  }
 }
 const boundary=Array.from({length:count},()=>[]);
 for(const e of edges.values())if(e.opposite.length===1){boundary[e.a].push(e.b);boundary[e.b].push(e.a);}
 const stencils=neighbors.map((near,v)=>{
  const border=boundary[v];
  if(border.length===2)return [[v,.75],...border.map(n=>[n,.125])];
  if(border.length||!near.size)return [[v,1]];
  const beta=near.size===3?3/16:3/(8*near.size);
  return [[v,1-near.size*beta],...[...near].map(n=>[n,beta])];
 });
 for(const e of edges.values()){
  e.index=stencils.length;
  stencils.push(e.opposite.length===2?[[e.a,.375],[e.b,.375],...e.opposite.map(v=>[v,.125])]:[[e.a,.5],[e.b,.5]]);
 }
 const vertices=[...data.vertices],uv=[...data.uv],indices=[],uvEdges=new Map();
 const midpoint=(a,b)=>{
  const id=key(a,b);if(uvEdges.has(id))return uvEdges.get(id);
  const index=vertices.length;vertices.push(edges.get(key(data.vertices[a],data.vertices[b])).index);
  uv.push((data.uv[a*2]+data.uv[b*2])/2,(data.uv[a*2+1]+data.uv[b*2+1])/2);
  uvEdges.set(id,index);return index;
 };
 for(let i=0;i<data.indices.length;i+=3){
  const [a,b,c]=data.indices.slice(i,i+3),ab=midpoint(a,b),bc=midpoint(b,c),ca=midpoint(c,a);
  indices.push(a,ab,ca,ab,b,bc,ca,bc,c,ab,bc,ca);
 }
 const result={stencils,vertices,uv,indices};cache.set(data,result);return result;
}
export function subdivideHair(data,fitted){
 const {stencils,...surface}=topology(data,fitted.length);
 const points=stencils.map(stencil=>{
  const p=[0,0,0];for(const [v,w] of stencil)for(let k=0;k<3;k++)p[k]+=fitted[v][k]*w;return p;
 });
 return {...surface,points};
}
