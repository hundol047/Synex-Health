import {it,expect} from 'vitest';
import {BufferGeometry,Float32BufferAttribute,Ray,Vector3,DoubleSide} from 'three';
import {MeshBVH} from 'three-mesh-bvh';
import source from '../src/health/components/character/assets/vtuber/female.json';
import {VTUBER_OUTFITS} from '../src/health/components/character/vtuberOptions.js';
import {softenVtuberShoulders,slimVtuberTorso,vtuberWardrobe,customizeVtuberData} from '../src/health/components/character/vtuberAppearance.js';
const surface=data=>{
 const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute(data.positions,3));g.setIndex(data.groups.flat());
 const bvh=new MeshBVH(g,{verbose:false});
 return {g,depth:(x,y,side=1)=>{const hit=bvh.raycastFirst(new Ray(new Vector3(x,y,2*side),new Vector3(0,0,-side)),DoubleSide);expect(hit,`coverage ${x}/${y}/${side}`).not.toBeNull();return hit.point.z;}};
};
it('slims ribcage width and depth while retaining waist, shoulder, neck and limb anchors',()=>{
 const p=[.12,1.28,.17],q=slimVtuberTorso(p);
 expect(q[0]).toBeLessThan(p[0]*.9);expect(q[0]).toBeGreaterThan(p[0]*.8);
 expect(q[2]).toBeLessThan(p[2]-.015);expect(q[1]).toBe(p[1]);
 for(const point of [[.1,1.15,.15],[.18,1.46,.02],[0,1.55,.05],[.3,1.28,.1],[.1,.94,-.08]])expect(slimVtuberTorso(point)).toEqual(point);
 for(const y of [1.15,1.24,1.36,1.46]){
  const a=slimVtuberTorso([.1,y-.00001,.17]),b=slimVtuberTorso([.1,y+.00001,.17]);
  expect(Math.hypot(...a.map((v,k)=>v-b[k]))).toBeLessThan(.000025);
 }
});
it('keeps all outfits closed across the chest and retains independent chest adjustment',()=>{
 for(const outfit of VTUBER_OUTFITS){
  const original=surface(vtuberWardrobe(source,outfit.id)),slim=surface(customizeVtuberData(source,{vtuberOutfit:outfit.id})),large=surface(customizeVtuberData(source,{vtuberOutfit:outfit.id,vtuberChest:1}));
  try{
   for(const y of [1.20,1.24,1.28,1.32,1.36])for(const x of [-.04,0,.04]){
    const front=slim.depth(x,y),back=slim.depth(x,y,-1);
    expect(front-back).toBeGreaterThan(.08);expect(front).toBeLessThan(original.depth(x,y));
    expect(large.depth(x,y)).toBeGreaterThan(front);
   }
  }finally{original.g.dispose();slim.g.dispose();large.g.dispose();}
 }
});

it('softens shoulder caps symmetrically without changing hand, hip or neck anchors',()=>{
 const right=softenVtuberShoulders([.185,1.425,.08]),left=softenVtuberShoulders([-.185,1.425,.08]);
 expect(right[0]).toBeLessThan(.175);expect(right[0]).toBeGreaterThan(.165);
 expect(left[0]).toBe(-right[0]);expect(right[1]).toBe(1.425);expect(right[2]).toBeLessThan(.08);
 for(const p of [[.45,1.1,.13],[.1,.94,.02],[0,1.5,.02]])expect(softenVtuberShoulders(p)).toEqual(p);
});
