import * as THREE from 'three';
import { skinDetailColors } from '../character/skinTone.js';
import faceAtlasData from '../character/assets/face-uv.json';
import { avatarGeometry } from '../body3d/appearance.js';

const clamp = THREE.MathUtils.clamp;
const gaussian = (x, y, cx, cy, sx, sy) => Math.exp(-(((x - cx) / sx) ** 2 + ((y - cy) / sy) ** 2));

// Classify in the neutral body, before skeletal deformation. The neck follows
// a rounded crew-neck opening, and each sleeve ends across the upper arm
// rather than along a vertical plane through the world.
export function exerciseGarmentAt(x, y, z, original = 'skin', character) {
  if(character){
    if(y<.13)return 'shoes';
    if(y<.965&&Math.abs(x)>.32)return 'skin';
    if(y<.965)return (character.pants==='shorts'&&y<.70)?'skin':'bottom';
    const arm=Math.abs(x)>.185;
    if(arm&&y<1.42){
      if(character.outfit==='tank')return 'skin';
      if(character.outfit==='long')return y>1.14?'top':'skin';
    }
  }
  if (original === 'bottom' || original === 'shoes' || y <= .965) return original;
  const front = clamp((z - .02) / .07, 0, 1);
  const neckline = Math.min(1.543, 1.511 - .022 * front + .048 * Math.min(1, (x / .1) ** 2));
  if (y >= neckline) return 'skin';
  if (Math.abs(x) > .185) {
    const sleeve = ((Math.abs(x) - .185) * .14 - (y - 1.42) * .17) / (.14 ** 2 + .17 ** 2);
    if (sleeve > .61) return 'skin';
  }
  return 'top';
}

export function exerciseAvatarGeometry(wear, stature = 1, character) {
  const geometry = avatarGeometry(wear, stature);
  const uv = new Float32Array(wear.positions.length / 3 * 2);
  const colors = geometry.attributes.color.array;
  const {skin,lip,cheek,upperLid:brow} = skinDetailColors(character?.skin || '#c4967b');
  const hairColor = new THREE.Color(character?.hair || '#342820');
  for (let i = 0; i < wear.labels.length; i++) {
    const x = wear.positions[i * 3] / stature, y = wear.positions[i * 3 + 1] / stature, z = wear.positions[i * 3 + 2] / stature;
    uv[i * 2] = Math.atan2(x, z - .035) / (2 * Math.PI) + .5;
    uv[i * 2 + 1] = y / 1.8;
    // A shared boundary vertex can belong to both skin and a shirt triangle.
    // Skin and hair use vertex colors; opaque garments own their base colors.
    // This prevents isolated skin-colored patches at the neck and sleeves.
    const color = skin.clone();
    color.multiplyScalar(1 + .012 * Math.sin(y * 13) + .006 * Math.sin(x * 37));
    if (y > 1.54 && z > .105) {
      color.lerp(cheek, .10 * gaussian(Math.abs(x), y, .049, 1.635, .027, .024));
      color.lerp(lip, .45 * gaussian(x, y, 0, 1.609, .027, .006));
      // Socket shading sits behind the actual eye, not a second painted brow.
      color.lerp(brow, .12 * gaussian(Math.abs(x), y, .034, 1.668, .016, .008));
    }
    const hairline = z > .095 ? 1.728 - .013 * Math.cos(x * 35) : 1.638;
    if (!character && y > 1.54) color.lerp(hairColor, THREE.MathUtils.smoothstep(y, hairline, hairline + .018));
    color.toArray(colors, i * 3);
  }
  geometry.setAttribute('characterFaceUv',new THREE.Float32BufferAttribute(faceAtlasData.coordinates,3));
  geometry.setAttribute('characterRest',new THREE.BufferAttribute(Float32Array.from(wear.positions,v=>v/stature),3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  const indices = [], groups = [[], [], [], [], []];
  const garmentIndex = { skin: 0, top: 1, bottom: 2, shoes: 3 };
  for (const [original, faces] of Object.entries(wear.indices)) {
    for (let i = 0; i < faces.length; i += 3) {
      const face = faces.slice(i, i + 3);
      let x = 0, y = 0, z = 0;
      for (const index of face) { x += wear.positions[index * 3]; y += wear.positions[index * 3 + 1]; z += wear.positions[index * 3 + 2]; }
      x /= 3 * stature; y /= 3 * stature; z /= 3 * stature;
      const garment = exerciseGarmentAt(x, y, z, original, character);
      const hairline = z > .095 ? 1.728 - .013 * Math.cos(x * 35) : 1.638;
      const material = !character && garment === 'skin' && y > hairline + .012 ? 4 : garmentIndex[garment];
      groups[material].push(...face);
    }
  }
  geometry.clearGroups();
  groups.forEach((group, i) => { const start = indices.length; indices.push(...group); geometry.addGroup(start, group.length, i); });
  geometry.setIndex(indices);
  return geometry;
}

// Small deterministic original textures are generated once per athlete. No
// network fetch, image decoder or external asset is needed on the phone.
const noise = (x, y) => {
  let n = Math.imul(x + 1, 374761393) ^ Math.imul(y + 1, 668265263);
  n = Math.imul(n ^ n >>> 13, 1274126177);
  return ((n ^ n >>> 16) >>> 0) / 4294967295;
};
function localTexture(size, pixel, color = false) {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const at = (y * size + x) * 4, value = pixel(x, y, size);
    data[at] = value[0]; data[at + 1] = value[1]; data[at + 2] = value[2]; data[at + 3] = 255;
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  texture.needsUpdate = true;
  return texture;
}

export function exerciseMaterials(character,faceAtlas=null) {
  const fabric = localTexture(64, (x, y) => [
    128 + Math.round(9 * Math.sin(x * Math.PI / 2) + 2 * (noise(x, y) - .5)),
    128 + Math.round(9 * Math.sin(y * Math.PI / 2) + 2 * (noise(y, x) - .5)), 254,
  ]);
  fabric.repeat.set(12, 16);
  const tailored = localTexture(128, (x, y, size) => {
    const theta = (x / size - .5) * 2 * Math.PI, height = y / size * 1.8;
    const side = THREE.MathUtils.smoothstep(Math.abs(Math.sin(theta)), .76, .98);
    // Both garments share this atlas. Its small waist transition follows the
    // exact rest height across shared triangles, avoiding a sawtooth hem.
    const top = THREE.MathUtils.smoothstep(height, .941, .961);
    const hem = gaussian(height, 0, .951, 0, .009, 1);
    const knit = (noise(x, y) - .5) * 3;
    return [35 + 2 * top, 59 + 40 * top, 77 + 158 * top].map(channel => Math.round(channel * (1 - side * .035 - hem * .025) + knit * .22));
  }, true);
  const pores = localTexture(128, (x, y) => {
    const value = Math.round(232 + (noise(x, y) - .5) * 26);
    return [value, value, value];
  });
  pores.repeat.set(5, 8);
  const hair = localTexture(128, (x, y) => {
    const strand = Math.sin((x + .25 * Math.sin(y * .08)) * Math.PI / 2);
    const value = Math.round(205 + 17 * strand + 8 * (noise(x, y) - .5));
    return [value, value, value];
  });
  hair.repeat.set(4, 3);
  const common = { metalness: 0, side: THREE.DoubleSide };
  const materials = [
    new THREE.MeshPhysicalMaterial({ ...common, vertexColors: true, roughness: .78, roughnessMap: pores, bumpMap: pores, bumpScale: .00015, clearcoat: 0, envMapIntensity: .55 }),
    new THREE.MeshStandardMaterial({ ...common, roughness: .9, map: tailored, normalMap: fabric, normalScale: new THREE.Vector2(.085, .085) }),
    new THREE.MeshStandardMaterial({ ...common, roughness: .94, map: tailored, normalMap: fabric, normalScale: new THREE.Vector2(.065, .065) }),
    new THREE.MeshStandardMaterial({ ...common, color: '#f7faff', roughness: .84 }),
    new THREE.MeshStandardMaterial({ ...common, vertexColors: true, roughness: .9, bumpMap: hair, bumpScale: .0009, envMapIntensity: .55 }),
  ];
  if(character){
    for(const [index,key] of [[1,'top'],[2,'bottom']]){materials[index].map=null;materials[index].color.set(character[key]);}
    if(character.style==='toon'){
      for(let i=0;i<materials.length;i++){
        const old=materials[i];materials[i]=new THREE.MeshToonMaterial({color:old.color,vertexColors:old.vertexColors,side:THREE.DoubleSide});old.dispose();
      }
    }
  }
  if(character)for(const material of materials.slice(0,3)){
    material.vertexColors=true;material.color.set('#ffffff');material.map=null;
    material.onBeforeCompile=shader=>{
      shader.uniforms.characterLip={value:skinDetailColors(character.skin).lip};
      shader.uniforms.characterLipStrength={value:faceAtlas&&character.style!=='toon'?(character.face==='refined'?.28:.06):.55};
      shader.uniforms.characterFaceAtlas={value:faceAtlas};
      shader.uniforms.characterFaceReference={value:new THREE.Color(faceAtlasData.reference[character.body]||faceAtlasData.reference.male)};
      shader.uniforms.characterTop={value:new THREE.Color(character.top)};shader.uniforms.characterBottom={value:new THREE.Color(character.bottom)};
      shader.vertexShader='attribute vec3 characterRest; attribute vec3 characterFaceUv; varying vec3 vCharacterRest; varying vec3 vCharacterFaceUv;\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvCharacterRest=characterRest;vCharacterFaceUv=characterFaceUv;');
      shader.fragmentShader='uniform float characterLipStrength; uniform vec3 characterLip; uniform vec3 characterTop; uniform vec3 characterBottom; uniform sampler2D characterFaceAtlas; uniform vec3 characterFaceReference; varying vec3 vCharacterRest; varying vec3 vCharacterFaceUv;\n'+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
        // Fine garment relief stays in rest coordinates while the body moves.
        float clothRelief(vec3 p) {
          float side=abs(p.x),y=p.y;
          float waist=exp(-pow((y-1.025)/.075,2.));
          float flank=exp(-pow((side-.14)/.075,2.))*exp(-pow((y-1.20)/.22,2.));
          float knee=exp(-pow((y-.51)/.065,2.));
          float ankle=exp(-pow((y-.20)/.045,2.));
          float fold=sin(y*115.+side*48.+sin(side*32.)*.6);
          return .00065*fold*(waist+flank*.5)+${character.pants==='joggers'?'.0008':'.00018'}*sin(y*155.+side*31.)*(knee+ankle*.7);
        }
        vec3 clothNormal(vec3 n,vec3 pos,float height) {
          vec3 dx=dFdx(pos),dy=dFdy(pos),r1=cross(dy,n),r2=cross(n,dx);
          float determinant=dot(dx,r1);
          return normalize(abs(determinant)*n-sign(determinant)*(dFdx(height)*r1+dFdy(height)*r2));
        }
      `);
      shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
        float ax=abs(vCharacterRest.x),y=vCharacterRest.y,z=vCharacterRest.z;
        ${faceAtlas&&character.style!=='toon'?`float faceBlend=smoothstep(1.54,1.565,y)*smoothstep(.96,.999,vCharacterFaceUv.z);
        vec4 faceTexel=texture2D(characterFaceAtlas,vCharacterFaceUv.xy);
        vec3 facialAlbedo=faceTexel.rgb;
        vec3 faceDetail=clamp(facialAlbedo/max(characterFaceReference,vec3(.001)),vec3(.06),vec3(1.65));
        diffuseColor.rgb*=mix(vec3(1.),faceDetail,faceBlend);`:''}
        float sleeve=((ax-.185)*.14-(y-1.42)*.17)/(.14*.14+.17*.17);
        float neck=min(1.543,1.511-.022*clamp((z-.02)/.07,0.,1.)+.048*min(1.,pow(ax/.1,2.)));
        float shirt=smoothstep(.959,.967,y)*(1.-smoothstep(neck-.002,neck+.002,y));
        shirt*=1.-smoothstep(${character.outfit==='tank'?'.08':character.outfit==='long'?'1.48':'.61'}-.015,${character.outfit==='tank'?'.08':character.outfit==='long'?'1.48':'.61'}+.015,sleeve)*smoothstep(.18,.19,ax);
        ${character.outfit==='tank'?'shirt*=1.-smoothstep(.14,.175,ax)*smoothstep(1.24,1.30,y);':''}
        float pants=smoothstep(${character.pants==='shorts'?'.698':'.13'},${character.pants==='shorts'?'.702':'.14'},y)*(1.-smoothstep(.959,.967,y))*(1.-smoothstep(.30,.32,ax));
        diffuseColor.rgb=mix(diffuseColor.rgb,characterBottom,pants);
        diffuseColor.rgb=mix(diffuseColor.rgb,characterTop,shirt);
        float seam=exp(-pow((y-neck+.005)/.0022,2.))*shirt;
        seam+=exp(-pow((y-.977)/.0025,2.))*shirt;
        seam+=exp(-pow((sleeve-.585)/.009,2.))*shirt*smoothstep(.18,.20,ax);
        float panels=exp(-pow((ax-.152)/.002,2.))*shirt*smoothstep(.04,.08,z);
        float waistband=exp(-pow((y-.935)/.015,4.))*pants;
        float weave=sin(vCharacterRest.x*2100.)*sin(y*2500.);
        diffuseColor.rgb*=1.-seam*.13-panels*.07-waistband*.08+(shirt+pants)*weave*.009;
        diffuseColor.rgb*=1.+clamp(clothRelief(vCharacterRest)*60.,-.06,.06)*(shirt+pants);
        float skinFace=smoothstep(1.55,1.58,y)*(1.-smoothstep(1.71,1.74,y))*smoothstep(.085,.12,z);
        float cheekWarm=exp(-pow((ax-.045)/.032,2.)-pow((y-1.635)/.028,2.))*skinFace;
        float skinGrain=fract(sin(dot(floor(vCharacterRest.xy*4200.),vec2(12.9898,78.233)))*43758.5453)-.5;
        diffuseColor.rgb*=vec3(1.+cheekWarm*.018,1.-cheekWarm*.006,1.-cheekWarm*.013)*(1.+skinGrain*.009*skinFace);
        float lipShape=exp(-pow(vCharacterRest.x/.024,4.)-pow((y-1.609)/.0048,4.))*smoothstep(.09,.12,z);
        diffuseColor.rgb=mix(diffuseColor.rgb,characterLip,lipShape*characterLipStrength);
        float lipCrease=exp(-pow(vCharacterRest.x/.021,4.)-pow((y-1.609)/.00065,2.))*smoothstep(.09,.12,z);
        diffuseColor.rgb*=1.-lipCrease*.18;
      `);
      if(character.style!=='toon')shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
        normal=clothNormal(normal,-vViewPosition,clothRelief(vCharacterRest)*max(shirt,pants)${faceAtlas?'+(faceTexel.a-.5)*.00012*faceBlend':''});
      `).replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
        float facialSkin=smoothstep(1.54,1.57,vCharacterRest.y)*(1.-smoothstep(1.72,1.74,vCharacterRest.y))*smoothstep(.08,.11,vCharacterRest.z);
        float tZone=exp(-pow(vCharacterRest.x/.022,2.))*.07;
        roughnessFactor=mix(roughnessFactor,.58-tZone,facialSkin);
      `);
    };
    material.customProgramCacheKey=()=>`face-atlas-v6-${Boolean(faceAtlas)}-${character.outfit}-${character.pants}`;
  }
  let disposed = false;
  return { materials, dispose: () => {
    if (disposed) return;
    disposed = true;
    materials.forEach(material => material.dispose());
    [fabric, tailored, pores, hair].forEach(texture => texture.dispose());
  } };
}

// Garment volume follows the same deforming surface; there is no separate
// intersecting skin layer underneath the selected garment faces.
export function fitExerciseClothing(wear,scale,character){
 if(!character)return wear;
 const positions=wear.positions.slice();
 for(let i=0;i<positions.length;i+=3){
  const x=positions[i]/scale,y=positions[i+1]/scale,z=positions[i+2]/scale;
  if(y>.985&&y<1.475&&Math.abs(x)<.21){
   const side=Math.abs(x),weight=Math.sin((y-.985)/.49*Math.PI)**2*(1-THREE.MathUtils.smoothstep(side,.16,.21));
   const direction=Math.sign(z-.035),front=THREE.MathUtils.smoothstep(Math.abs(z-.035),.02,.07);
   const folds=.0018*Math.sin(y*100+side*33)*Math.exp(-(((y-1.07)/.12)**2));
   positions[i+2]+=(.006+folds)*weight*front*direction*scale;
   positions[i]+=Math.sign(x)*.002*weight*scale;
  }
  if(character.pants==='joggers'&&y>.17&&y<.94&&Math.abs(x)<.3){
   const center=Math.sign(x)*(.10+Math.max(0,.9-y)*.11),t=Math.sin((y-.17)/.77*Math.PI);
   positions[i]+=(x-center)*.22*t;positions[i+2]+=(z-.04)*.16*t;
  }
 }
 return {...wear,positions};
}
