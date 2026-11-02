import {it,expect} from 'vitest';
import {Vector3,BufferGeometry,BufferAttribute,Ray,DoubleSide,ShaderLib,Texture} from 'three';
import {MeshBVH} from 'three-mesh-bvh';
import source from '../src/health/components/character/assets/vtuber/female.json';
import {VTUBER_DEFAULTS,VTUBER_OUTFITS,normalizeVtuberOptions} from '../src/health/components/character/vtuberOptions.js';
import {customizeVtuberData,vtuberWardrobe,vtuberShapePoint} from '../src/health/components/character/vtuberAppearance.js';
import {createVtuberMaterial} from '../src/health/components/character/vtuberMaterials.js';
import {normalizeCharacter,saveCharacter,readCharacter} from '../src/health/components/character/character.js';
import {prepareDetailedModel,poseDetailedModel} from '../src/health/components/character/detailedModel.js';
import {rigRotation,poseJoints} from '../src/health/components/exercise/rig.js';
import {CLASP_MOTIONS} from '../src/health/components/exercise/handPoses.js';
import catalog from '../src/shared/lib/localCatalog.json';
import {STRETCHES} from '../src/health/components/exercise/stretchCatalog.js';
const v=p=>new Vector3(...p);
const area=(positions,indices)=>{let sum=0;for(let i=0;i<indices.length;i+=3){const [a,b,c]=indices.slice(i,i+3).map(j=>v(positions.slice(j*3,j*3+3)));sum+=b.sub(a).cross(c.sub(a)).length()/2;}return sum;};
const extremes=[{}, {vtuberChest:1,vtuberHips:1,vtuberGlutes:1,vtuberWaist:-1},{vtuberChest:-1,vtuberHips:-1,vtuberGlutes:-1,vtuberWaist:1}];

it('migrates old saved choices and validates all new inputs without touching records',()=>{
 expect(normalizeCharacter({model:'vtuber'})).toMatchObject(VTUBER_DEFAULTS);
 expect(normalizeVtuberOptions({vtuberChest:Infinity,vtuberHips:99,vtuberGlutes:-99,vtuberHair:'url(x)',vtuberEyes:'#55AACC',vtuberOutfit:'missing'})).toMatchObject({...VTUBER_DEFAULTS,vtuberHips:1,vtuberGlutes:-1,vtuberEyes:'#55aacc'});
 localStorage.clear();localStorage.setItem('workout','retained');saveCharacter({model:'vtuber',vtuberOutfit:'crop',vtuberGlutes:.8,vtuberHair:'#a98bda',vtuberEyes:'#3d86c9'});
 expect(readCharacter()).toMatchObject({model:'vtuber',vtuberOutfit:'crop',vtuberGlutes:.8,vtuberHair:'#a98bda',vtuberEyes:'#3d86c9'});expect(localStorage.getItem('workout')).toBe('retained');
});

it('changes hip width independently of rear volume and preserves joint heights',()=>{
 const p=[.12,.94,-.08],hips=vtuberShapePoint(p,{...VTUBER_DEFAULTS,vtuberHips:1}),rear=vtuberShapePoint(p,{...VTUBER_DEFAULTS,vtuberGlutes:1});
 expect(hips[0]).toBeGreaterThan(p[0]+.015);expect(hips[2]).toBe(p[2]);
 expect(rear[2]).toBeLessThan(p[2]-.03);expect(rear[0]).toBe(p[0]);expect(hips[1]).toBe(p[1]);expect(rear[1]).toBe(p[1]);
});

it('partitions six outfits without deleting body surface or leaving unused bounds vertices',()=>{
 const original=area(source.positions,source.groups[0]);
 for(const outfit of VTUBER_OUTFITS){
  const d=vtuberWardrobe(source,outfit.id),skin=d.surfaceMaterials.findIndex(s=>s.name==='Body_00_SKIN'),top=d.surfaceMaterials.findIndex(s=>s.name==='VtuberFittedTop'),bottom=top+1;
  expect(area(d.positions,[...d.groups[skin],...d.groups[top],...d.groups[bottom]]),outfit.id).toBeCloseTo(original,6);
  expect(new Set(d.groups.flat()).size).toBe(d.weights.length);
  expect(d.groups[top].length>0).toBe(!outfit.nativeTop);expect(d.groups[bottom].length>0).toBe(!outfit.nativeBottom);
  const ids=new Map();d.sourceVertices.forEach((s,i)=>{const p=d.positions.slice(i*3,i*3+3);if(ids.has(s))expect(v(p).distanceTo(v(ids.get(s)))).toBeLessThan(.00002);else ids.set(s,p);});
  for(const g of d.groups)expect(g.every(i=>Number.isInteger(i)&&i>=0&&i<d.weights.length)).toBe(true);
  for(const rows of Object.values(d.morphs))expect(rows.every(([i])=>i<d.weights.length)).toBe(true);
 }
 expect(source.positions.length/3).toBe(24951);
});

it('keeps face, blink shapes and support hands unchanged at body-slider extremes',()=>{
 for(const outfit of VTUBER_OUTFITS){const base=vtuberWardrobe(source,outfit.id);
  for(const shape of extremes.slice(1)){
   const d=customizeVtuberData(source,{vtuberOutfit:outfit.id,...shape});
   expect(d.rest).toBe(source.rest);expect(d.morphs.AK_09_EyeBlinkLeft).toEqual(base.morphs.AK_09_EyeBlinkLeft);
   for(let i=0;i<base.weights.length;i++){
    expect(d.positions[i*3+1]).toBe(base.positions[i*3+1]);
    if(base.weights[i].some(([bone,w])=>bone>=12&&w>.85))expect(d.positions.slice(i*3,i*3+3)).toEqual(base.positions.slice(i*3,i*3+3));
   }
   expect(d.guidePositions).toBe(base.positions);
  }
 }
});

it('recolors iris and hair separately while leaving eye whites and highlights untouched',()=>{
 const color={vtuberHair:'#a98bda',vtuberEyes:'#3d86c9'},map=new Texture();
 for(const surface of source.surfaceMaterials){const m=createVtuberMaterial(surface,{map},color);try{
  const expected=surface.kind==='Hair'||surface.name==='FaceBrow_00_FACE'?'#a98bda':surface.name==='EyeIris_00_EYE'?'#3d86c9':undefined;
  if(surface.kind!=='Clothes')expect(m.userData.vtuberTint).toBe(expected);
  if(expected){const shader={uniforms:{},vertexShader:ShaderLib.basic.vertexShader,fragmentShader:ShaderLib.basic.fragmentShader};m.onBeforeCompile(shader);expect(shader.uniforms.vtuberTint).toBeDefined();if(surface.name==='EyeIris_00_EYE')expect(shader.fragmentShader).toContain('tintMask=smoothstep');}
 }finally{m.dispose();}}
 map.dispose();
});

it('keeps the chest and pelvis covered by opaque fabric in every fitted outfit',()=>{
 for(const outfit of VTUBER_OUTFITS.filter(o=>!o.nativeTop)){
  const d=vtuberWardrobe(source,outfit.id),skin=d.groups[0];
  for(let i=0;i<skin.length;i+=3){
   const ps=skin.slice(i,i+3).map(j=>d.positions.slice(j*3,j*3+3)),p=[0,1,2].map(k=>ps.reduce((s,a)=>s+a[k],0)/3);
   expect(Math.abs(p[0])<.10&&p[1]>1.19&&p[1]<1.36&&p[2]>.07,`${outfit.id}: chest skin`).toBe(false);
   expect(Math.abs(p[0])<.12&&p[1]>.84&&p[1]<1.01,`${outfit.id}: pelvis skin`).toBe(false);
  }
 }
});

it('fills the upper torso omitted by the original tee, without coloring hands as pants',()=>{
 for(const outfit of VTUBER_OUTFITS.filter(o=>!o.nativeTop)){
  const d=vtuberWardrobe(source,outfit.id),g=new BufferGeometry(),tri=d.groups.flatMap((group,i)=>d.surfaceMaterials[i].tintRole?group:[]);
  g.setIndex(tri);g.setAttribute('position',new BufferAttribute(new Float32Array(d.positions),3));
  try{const bvh=new MeshBVH(g,{verbose:false}),ray=new Ray(new Vector3(),new Vector3(0,0,-1));
   for(const y of [1.20,1.24,1.28,1.32,1.36])for(const x of [-.04,0,.04]){
    ray.origin.set(x,y,2);const hit=bvh.raycastFirst(ray,DoubleSide);expect(hit,`${outfit.id}: missing chest at ${x}/${y}`).not.toBeNull();expect(hit.point.z).toBeGreaterThan(.06);
   }
   for(const side of [-1,1])for(const y of [1.21,1.26,1.31,1.36])for(const z of [.02,.08,.13]){
    ray.origin.set(2*side,y,z);ray.direction.set(-side,0,0);const hit=bvh.raycastFirst(ray,DoubleSide);
    expect(hit,`${outfit.id}: missing side at ${side}/${y}/${z}`).not.toBeNull();expect(hit.point.x*side).toBeGreaterThan(.04);
   }
   ray.direction.set(0,0,-1);
   for(const y of [.87,.92,.98]){ray.origin.set(0,y,2);expect(bvh.raycastFirst(ray,DoubleSide),`${outfit.id}: missing pelvis ${y}`).not.toBeNull();}
   const bottoms=d.groups.flatMap((group,i)=>d.surfaceMaterials[i].tintRole==='bottom'?group:[]);
   expect(bottoms.some(i=>d.weights[i].some(([b,w])=>b>=12&&w>.1))).toBe(false);
  }finally{g.dispose();}
 }
});

it('retains finite, welded motion surfaces for all outfits at both shape extremes',()=>{
 for(const outfit of VTUBER_OUTFITS)for(const shape of extremes){
  const d=customizeVtuberData(source,{vtuberOutfit:outfit.id,...shape}),m=prepareDetailedModel(d),first=new Map(),pairs=[];
  d.sourceVertices.forEach((s,i)=>{if(first.has(s))pairs.push([first.get(s),i]);else first.set(s,i);});
  try{for(const motion of ['squat','lunge','full_pushup','bridge','curl','wall_push','wall_hinge'])for(const t of [0,.5,1]){
   const p=poseDetailedModel(m,motion,t),a=m.geometry.attributes.position.array;
   expect(a.every(Number.isFinite),outfit.id+'/'+motion).toBe(true);expect(m.geometry.boundingSphere.radius).toBeLessThan(2.5);
   for(const [x,y]of pairs)if(Math.hypot(a[x*3]-a[y*3],a[x*3+1]-a[y*3+1],a[x*3+2]-a[y*3+2])>.00003)throw Error(`${outfit.id}/${motion}: split seam`);
   if(Number.isFinite(p.equipment?.wallZ)){
    let min=Infinity;for(let i=2;i<a.length;i+=3)min=Math.min(min,motion==='wall_hinge'?a[i]-p.equipment.wallZ:p.equipment.wallZ-a[i]);expect(min).toBeGreaterThan(-.002);
   }
  }}finally{m.geometry.dispose();}
 }
},180000);

it('checks the complete catalog for an enlarged fitted model and actual clasp/chest separation',()=>{
 const d=customizeVtuberData(source,{vtuberOutfit:'crop',vtuberChest:1,vtuberHips:1,vtuberGlutes:1}),m=prepareDetailedModel(d),torso=new BufferGeometry();
 try{
  for(const {motion_id:motion}of [...catalog,...STRETCHES])for(const t of [0,.25,.5,.75,1]){poseDetailedModel(m,motion,t);expect(m.geometry.attributes.position.array.every(Number.isFinite),motion).toBe(true);}
  const ids=Array.from(m.geometry.index.array),tri=[];
  for(let i=0;i<ids.length;i+=3){const f=ids.slice(i,i+3);if(f.every(j=>m.weights[j].some(([b,w])=>b===0&&w>.65)&&m.base[j*3+1]>m.rest[0][1]+.12))tri.push(...f);}
  torso.setIndex(tri);const hands=m.weights.flatMap((w,i)=>w.some(([b,f])=>b>=12&&f>.85)?[i]:[]),ray=new Ray(new Vector3(),new Vector3(0,0,-1)),point=new Vector3();let hits=0;
  for(const motion of CLASP_MOTIONS)for(let f=0;f<=12;f++){
   const j=poseDetailedModel(m,motion,f/12),q=rigRotation(j,0,m.rest).invert(),hip=v(j[0]),a=m.geometry.attributes.position.array.slice();
   for(let i=0;i<a.length;i+=3)point.fromArray(a,i).sub(hip).applyQuaternion(q).toArray(a,i);
   torso.setAttribute('position',new BufferAttribute(a,3));const bvh=new MeshBVH(torso,{verbose:false});let gap=Infinity;
   for(const i of hands){ray.origin.set(a[i*3],a[i*3+1],2);const hit=bvh.raycastFirst(ray,DoubleSide);if(hit){hits++;gap=Math.min(gap,a[i*3+2]-hit.point.z);}}
   expect(gap,motion).toBeGreaterThan(.005);
   const p=poseJoints(motion,f/12,m.rest);for(const [e,w,tip]of [[4,5,17],[7,8,18]])expect(v(p[w]).sub(v(p[e])).angleTo(v(p[tip]).sub(v(p[w])))*180/Math.PI).toBeLessThan(40);
  }
  expect(hits).toBeGreaterThan(100);
 }finally{m.geometry.dispose();torso.dispose();}
},120000);
