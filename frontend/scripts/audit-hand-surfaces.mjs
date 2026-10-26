// Manual surface audit against a local Vite server; no application records changed.
import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
const output=process.env.SYNEX_AUDIT_OUTPUT||'/tmp/synex-hand-surfaces';await mkdir(output,{recursive:true});
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
const page=await browser.newPage({viewport:{width:1200,height:620}});
await page.goto(process.env.SYNEX_AUDIT_URL||'http://127.0.0.1:5189');
const ids=await page.evaluate(async()=>{
 const T=await import('/node_modules/.vite/deps/three.js');
 const {personalizedVertices,sportswear}=await import('/src/health/components/body3d/avatar.js');
 const {exerciseAvatarGeometry}=await import('/src/health/components/exercise/exerciseAppearance.js');
 const {REST,bindSurface,poseJoints,deformSurface,rigRotation}=await import('/src/health/components/exercise/rig.js');
 const {calibrateGripScale,gripSurface,handRestFrame}=await import('/src/health/components/exercise/exerciseGrip.js');
 const {exerciseHandShape}=await import('/src/health/components/exercise/handPoses.js');
 const {STRETCHES}=await import('/src/health/components/exercise/stretchCatalog.js');
 const {default:catalog}=await import('/src/shared/lib/localCatalog.json');
 document.body.innerHTML='<div id="label" style="height:20px;color:#172b4d;background:white;font:14px sans-serif"></div>';document.body.style.margin='0';
 const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(1200,600);document.body.appendChild(renderer.domElement);renderer.setScissorTest(true);
 const scene=new T.Scene();scene.background=new T.Color('#edf2f7');scene.add(new T.HemisphereLight('#ffffff','#6c7d90',2));
 const light=new T.DirectionalLight('#ffffff',3);light.position.set(2,4,3);scene.add(light);
 const material=new T.MeshStandardMaterial({color:'#cbd3dc',roughness:.8,side:T.DoubleSide});
 const base=personalizedVertices({},{}),wear=sportswear(base),weights=bindSurface(base),rest=REST.map(p=>p.slice());rest.handGripScale=calibrateGripScale(wear.positions,weights,rest);
 const geometry=exerciseAvatarGeometry(wear),all=Array.from(geometry.index.array),mesh=new T.Mesh(geometry,material);scene.add(mesh);
 const indices=[0,1].map(side=>{const out=[];for(let i=0;i<all.length;i+=3){const face=all.slice(i,i+3);if(face.every(index=>weights[index].some(([bone,w])=>(bone===12+side||bone===3+side*2)&&w>.5)))out.push(...face);}return out;});
 const camera=new T.PerspectiveCamera(35,.5,.01,10);
 window.renderHandAudit=(motion,phase)=>{
  const pose=poseJoints(motion,phase,rest),shape=exerciseHandShape(motion,pose),skin=gripSurface(wear.positions,weights,rest,shape);
  geometry.setIndex(all);deformSurface(skin,weights,pose,geometry.attributes.position.array,rest,false);geometry.attributes.position.needsUpdate=true;geometry.computeVertexNormals();geometry.computeBoundingSphere();geometry.clearGroups();
  for(let tile=0;tile<4;tile++){
   const side=tile>>1,{wrist,along,back}=handRestFrame(rest,side),rotation=rigRotation(pose,12+side,rest);
   const direction=along.applyQuaternion(rotation),normal=back.applyQuaternion(rotation).multiplyScalar(tile%2?-1:1),target=new T.Vector3(...pose[wrist]).addScaledVector(direction,.13);
   camera.position.copy(target).addScaledVector(normal,.72).addScaledVector(direction,.08);camera.up.copy(direction).multiplyScalar(-1);camera.lookAt(target);camera.updateProjectionMatrix();
   geometry.setIndex(indices[side]);renderer.setViewport(tile*300,0,300,600);renderer.setScissor(tile*300,0,300,600);renderer.render(scene,camera);
  }
  document.getElementById('label').textContent=`${motion} / ${phase} / left back-palm / right back-palm`;
  return {motion,phase,shape,finite:geometry.attributes.position.array.every(Number.isFinite)};
 };
 window.renderChestAudit=gender=>{
  const wear=sportswear(personalizedVertices({}, {gender}),1,gender);
  geometry.attributes.position.array.set(wear.positions);geometry.attributes.position.needsUpdate=true;geometry.setIndex(all);geometry.computeVertexNormals();geometry.computeBoundingSphere();geometry.clearGroups();
  camera.aspect=2;camera.up.set(0,1,0);camera.position.set(.18,1.30,.85);camera.lookAt(0,1.30,0);camera.updateProjectionMatrix();
  renderer.setScissorTest(false);renderer.setViewport(0,0,1200,600);renderer.render(scene,camera);document.getElementById('label').textContent=gender+' chest surface';
 };
 return [...catalog,...STRETCHES].map(e=>e.motion_id);
});
const filter=process.env.SYNEX_AUDIT_MOTIONS?.split(',');
const selected=filter?ids.filter(id=>filter.includes(id)):ids;
const report=[];
try{for(const id of selected)for(const phase of [0,.5]){const result=await page.evaluate(([id,phase])=>window.renderHandAudit(id,phase),[id,phase]);if(!result.finite)throw Error('Invalid surface '+id);report.push(result);await page.screenshot({path:`${output}/${id}-${phase}.png`});}
 for(const gender of ['male','female']){await page.evaluate(gender=>window.renderChestAudit(gender),gender);await page.screenshot({path:`${output}/chest-${gender}.png`});}
 await writeFile(`${output}/report.json`,JSON.stringify({motions:selected.length,frames:report},null,2));console.log(`Rendered ${selected.length} motions, ${report.length} hand close-up frames`);
}finally{await browser.close();}
