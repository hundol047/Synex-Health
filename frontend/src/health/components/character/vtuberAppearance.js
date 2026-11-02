import {VTUBER_OUTFITS,normalizeVtuberOptions,VTUBER_SHAPE_KEYS} from './vtuberOptions.js';
import {Triangle,Vector3} from 'three';

const smooth=(a,b,v)=>{const t=Math.max(0,Math.min(1,(v-a)/(b-a)));return t*t*(3-2*t);};
const bell=(v,center,width)=>Math.exp(-(((v-center)/width)**2));
const wardrobeCache=new WeakMap();

// Split the native body surface at clothing boundaries. Adjacent skin/fabric
// polygons share each intersection vertex, so hems do not create open cracks.
// Covered skin is replaced by opaque fabric, rather than overlapping two skins.
export function vtuberWardrobe(source,id){
 let cache=wardrobeCache.get(source);if(!cache){cache=new Map();wardrobeCache.set(source,cache);}
 const outfit=VTUBER_OUTFITS.find(o=>o.id===id)||VTUBER_OUTFITS[0];
 if(cache.has(outfit.id))return cache.get(outfit.id);
 const positions=source.positions.slice(),uv=source.uv.slice(),weights=source.weights.slice(),sources=source.sourceVertices.slice();
 const groups=source.groups.map(g=>g.slice()),materials=source.surfaceMaterials.map(s=>({...s}));
 const top=groups.length,bottom=top+1,upper=top+2,pelvis=top+3;groups.push([],[],[],[]);
 materials.push({name:'VtuberFittedTop',kind:'Clothes',toon:true,muscleGuide:true,tintRole:'top',alphaMode:'OPAQUE'},
  {name:'VtuberFittedBottom',kind:'Clothes',toon:true,muscleGuide:true,tintRole:'bottom',alphaMode:'OPAQUE'},
  {name:'VtuberUpperTop',kind:'Clothes',toon:true,muscleGuide:true,tintRole:'top',alphaMode:'OPAQUE'},
  {name:'VtuberPelvis',kind:'Clothes',toon:true,muscleGuide:true,tintRole:'bottom',alphaMode:'OPAQUE'});
 const skinIndex=materials.findIndex(s=>s.name==='Body_00_SKIN'),teeIndex=materials.findIndex(s=>s.name==='Tops_01_CLOTH'),shortsIndex=materials.findIndex(s=>s.name==='Bottoms_01_CLOTH');
 if(!outfit.nativeTop)groups[teeIndex]=[];
 if(!outfit.nativeBottom)groups[shortsIndex]=[];
 const edges=new Map(),seams=new Map();let nextSource=Math.max(...sources)+1;
 const point=i=>positions.slice(i*3,i*3+3);
 const intersection=(a,b,t,tag)=>{
  const key=tag+':'+Math.min(a,b)+':'+Math.max(a,b);if(edges.has(key))return edges.get(key);
  const id=weights.length,p=point(a).map((v,k)=>v+(positions[b*3+k]-v)*t);
  positions.push(...p);uv.push(...uv.slice(a*2,a*2+2).map((v,k)=>v+(uv[b*2+k]-v)*t));
  const row=new Map();for(const [i,f]of [[a,1-t],[b,t]])for(const [bone,w]of weights[i])row.set(bone,(row.get(bone)||0)+w*f);
  weights.push([...row].filter(([,w])=>w>1e-9));
  const seam=tag+':'+Math.min(sources[a],sources[b])+':'+Math.max(sources[a],sources[b]);
  if(!seams.has(seam))seams.set(seam,nextSource++);sources.push(seams.get(seam));edges.set(key,id);return id;
 };
 const split=(poly,field,tag)=>{
  const inside=[],outside=[];
  for(let j=0;j<poly.length;j++){
   const a=poly[j],b=poly[(j+1)%poly.length],fa=field(point(a)),fb=field(point(b));
   (fa>=0?inside:outside).push(a);
   if((fa>=0)!==(fb>=0)){const i=intersection(a,b,fa/(fa-fb),tag);inside.push(i);outside.push(i);}
  }
  return [inside,outside];
 };
 const add=(target,poly)=>{for(let i=1;i<poly.length-1;i++)if(new Set([poly[0],poly[i],poly[i+1]]).size===3)target.push(poly[0],poly[i],poly[i+1]);};
 const cover=(poly,fields,tag,target,remaining)=>{
  let candidate=poly;
  for(let i=0;i<fields.length&&candidate.length>=3;i++){
   const [inside,outside]=split(candidate,fields[i],tag+i);add(remaining,outside);candidate=inside;
  }
  if(candidate.length>=3)add(target,candidate);
 };
 const topFields=[
  ([,y])=>y-(outfit.topHem||1.035),
  // Keep a low neckline centrally, but wrap the complete shoulder cap. The
  // lower cutoff left triangular skin gaps between the fitted/native panels.
  ([x,y])=>1.405+.09*smooth(.035,.16,Math.abs(x))-y,
  ([x,y,z])=>{
   // A plane across each upper/lower arm gives a consistent sleeve hem.
   if(Math.abs(x)<.205)return 1;
   const side=x>=0?0:1,a=source.rest[side?6:3],b=source.rest[side?8:5],axis=b.map((v,k)=>v-a[k]),p=[x,y,z];
   const t=p.reduce((s,v,k)=>s+(v-a[k])*axis[k],0)/axis.reduce((s,v)=>s+v*v,0);
   return (outfit.sleeve??.05)-t;
  },
 ];
 const bottomFields=[([,y])=>1.06-y,([,y])=>y-(outfit.bottomHem||.145)];
 let body=groups[skinIndex];
 if(!outfit.nativeTop){const rest=[];for(let i=0;i<body.length;i+=3)cover(body.slice(i,i+3),topFields,'top',groups[top],rest);body=rest;}
 if(!outfit.nativeBottom){const rest=[];for(let i=0;i<body.length;i+=3){
  const tri=body.slice(i,i+3);
  // Rest-pose fingers share the pelvis height. Never turn hands/nails into pants.
  if(tri.some(j=>weights[j].some(([b,w])=>((b>=2&&b<=5)||b>=12)&&w>.1)))rest.push(...tri);
  else cover(tri,bottomFields,'bottom',groups[bottom],rest);
 }body=rest;}
 groups[skinIndex]=body;
 if(!outfit.nativeTop){
  // The source intentionally omits the upper torso hidden inside its tee.
  // Retain the authored shirt's complete upper shell instead of exposing that
  // empty space. Fit its waist to the intact lower torso and trim the sleeves.
  const nativeBody=source.groups[skinIndex],bodyPoint=i=>source.positions.slice(i*3,i*3+3);
  const waistSegments=[];
  for(let i=0;i<nativeBody.length;i+=3){
   const p=nativeBody.slice(i,i+3).map(bodyPoint),hits=[];
   for(let k=0;k<3;k++){const a=p[k],b=p[(k+1)%3];if((a[1]>=1.15)!==(b[1]>=1.15)){const t=(1.15-a[1])/(b[1]-a[1]);hits.push([a[0]+t*(b[0]-a[0]),a[2]+t*(b[2]-a[2])-.08]);}}
   if(hits.length===2)waistSegments.push(hits);
  }
  const waistRadius=(x,z)=>{
   const length=Math.hypot(x,z-.08),dx=x/length,dz=(z-.08)/length;let radius=Infinity;
   const cross=(a,b,c,d)=>a*d-b*c;
   for(const [a,b]of waistSegments){
    const ex=b[0]-a[0],ez=b[1]-a[1],den=cross(dx,dz,ex,ez);if(Math.abs(den)<1e-9)continue;
    const r=cross(a[0],a[1],ex,ez)/den,t=cross(a[0],a[1],dx,dz)/den;
    if(r>0&&t>=0&&t<=1)radius=Math.min(radius,r);
   }
   return Number.isFinite(radius)?radius+.0015:length;
  };
  for(const i of new Set(source.groups[teeIndex])){
   const [x,y,z]=point(i),length=Math.hypot(x,z-.08);
   if(y>=1.14&&y<1.30&&Math.abs(x)<.19&&length){
    const fitted=waistRadius(x,z),blend=1-smooth(1.15,1.29,y),ratio=1+(fitted/length-1)*blend;
    positions[i*3]=x*ratio;positions[i*3+2]=.08+(z-.08)*ratio;
   }
  }
  // Shorten and fit the authored sleeve onto the actual shoulder/upper arm.
  // Cutting the loose sleeve off with a plane exposes the absent armpit skin.
  // Keeping its connected surface and moving its rim retains a closed torso.
  const armWeight=row=>row.reduce((sum,[b,w])=>sum+(b>=2&&b<=5?w:0),0),armTriangles=[];
  for(let i=0;i<nativeBody.length;i+=3){const t=nativeBody.slice(i,i+3);if(t.every(j=>armWeight(source.weights[j])>.3))armTriangles.push(t);}
  const triangle=new Triangle(),target=new Vector3(),closest=new Vector3(),best=new Vector3(),bary=new Vector3(),normal=new Vector3();
  for(const i of new Set(source.groups[teeIndex])){
   const amount=smooth(.25,.75,armWeight(weights[i]));if(!amount)continue;
   const p=point(i),side=p[0]>=0?0:1,a=source.rest[side?6:3],b=source.rest[side?8:5],axis=b.map((v,k)=>v-a[k]);
   const t=Math.max(0,p.reduce((sum,v,k)=>sum+(v-a[k])*axis[k],0)/axis.reduce((sum,v)=>sum+v*v,0));
   target.fromArray(p.map((v,k)=>v-.82*t*axis[k]));let distance=Infinity,bestTri;
   for(const tri of armTriangles){triangle.a.fromArray(source.positions,tri[0]*3);triangle.b.fromArray(source.positions,tri[1]*3);triangle.c.fromArray(source.positions,tri[2]*3);triangle.closestPointToPoint(target,closest);const d=closest.distanceToSquared(target);if(d<distance){distance=d;best.copy(closest);bestTri=tri;}}
   triangle.a.fromArray(source.positions,bestTri[0]*3);triangle.b.fromArray(source.positions,bestTri[1]*3);triangle.c.fromArray(source.positions,bestTri[2]*3);triangle.getBarycoord(best,bary);triangle.getNormal(normal);
   best.addScaledVector(normal,.0015);for(let k=0;k<3;k++)positions[i*3+k]=p[k]+amount*(best.getComponent(k)-p[k]);
   const row=new Map(weights[i].map(([bone,w])=>[bone,w*(1-amount)]));
   bestTri.forEach((j,k)=>{for(const [bone,w]of source.weights[j])row.set(bone,(row.get(bone)||0)+amount*w*bary.getComponent(k));});weights[i]=[...row].filter(([,w])=>w>1e-9);
  }
  const fields=[([,y])=>y-1.15];
  // Discard the lower shirt and sleeve offcuts; the native arms and the
  // partitioned lower surface already supply those regions.
  for(let i=0;i<source.groups[teeIndex].length;i+=3)cover(source.groups[teeIndex].slice(i,i+3),fields,'upper',groups[upper],[]);
 }
 // The body already contains a complete pelvic surface. Its duplicate UV
 // seam vertices are not a hole. Retaining a piece of the loose shorts here
 // created a second shell, baggy folds and floating flaps in fitted outfits.
 // The opaque partitioned body is the sole fitted lower-garment surface.
 // Inactive native garments must not enlarge collision/floor bounds or consume
 // skinning time. Compact all attributes and sparse face/finger shapes together.
 const used=[...new Set(groups.flat())].sort((a,b)=>a-b),remap=new Map(used.map((v,i)=>[v,i]));
 const sparse=rows=>rows.filter(([i])=>remap.has(i)).map(([i,...d])=>[remap.get(i),...d]);
 const result={...source,positions:used.flatMap(point),uv:used.flatMap(i=>uv.slice(i*2,i*2+2)),weights:used.map(i=>weights[i]),sourceVertices:used.map(i=>sources[i]),
  groups:groups.map(g=>g.map(i=>remap.get(i))),surfaceMaterials:materials,materials:materials.map(s=>s.kind),
  morphs:Object.fromEntries(Object.entries(source.morphs).map(([k,v])=>[k,sparse(v)])),
  grips:Object.fromEntries(Object.entries(source.grips).map(([k,sides])=>[k,sides.map(sparse)])),wardrobe:outfit.id};
 cache.set(outfit.id,result);return result;
}

export function vtuberShapePoint(point,options){
 const [x,y,z]=point,c=options,central=1-smooth(.16,.30,Math.abs(x));
 if(y<.62||y>1.49||!central)return point.slice();
 // Spread proportional changes through the upper thigh/waist instead of
 // producing a narrow hip bulge and isolated rear protrusion at slider limits.
 const hip=bell(y,.94,.17)*central,waist=bell(y,1.12,.12)*central,chest=bell(y,1.32,.105)*central;
 return [x*(1+.12*c.vtuberHips*hip+.12*c.vtuberWaist*waist+.045*c.vtuberChest*chest),y,
  z+.045*c.vtuberChest*chest*smooth(.015,.10,z)-.028*c.vtuberGlutes*bell(y,.93,.145)*central*(1-smooth(-.04,.04,z))];
}

export function customizeVtuberData(source,value){
 const c=normalizeVtuberOptions(value),base=vtuberWardrobe(source,c.vtuberOutfit);
 if(VTUBER_SHAPE_KEYS.every(k=>c[k]===0))return base;
 const positions=base.positions.slice(),eligible=new Set();
 base.groups.forEach((g,i)=>{const s=base.surfaceMaterials[i];if(s.name==='Body_00_SKIN'||s.kind==='Clothes')for(const id of g)eligible.add(id);});
 for(const i of eligible){
  if(base.weights[i].some(([bone,w])=>(bone===1||bone>=12)&&w>.5))continue;
  const mapped=vtuberShapePoint(base.positions.slice(i*3,i*3+3),c);for(let k=0;k<3;k++)positions[i*3+k]=mapped[k];
 }
 // Keep long front strands outside an enlarged chest, with roots unchanged.
 base.groups.forEach((g,gi)=>{if(base.surfaceMaterials[gi].kind!=='Hair')return;for(const i of new Set(g)){
  const [x,y,z]=base.positions.slice(i*3,i*3+3);
  if(z>.07&&y<1.49&&y>1.12)positions[i*3+2]+=.045*Math.max(0,c.vtuberChest)*bell(y,1.32,.12)*(1-smooth(.16,.30,Math.abs(x)));
 }});
 return {...base,positions,guidePositions:base.positions};
}
