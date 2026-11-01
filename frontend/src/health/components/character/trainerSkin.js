import * as THREE from 'three';

// A low-contrast skin lobe, separate from fabric and the wet eye surface.
// This is a real-time approximation, not a biometric skin/SSS simulation.
export function createTrainerSkinMaterial(options,{nativeTexture=false}={}) {
 const material=new THREE.MeshPhysicalMaterial({...options,
  roughness:nativeTexture?.53:.48,metalness:0,ior:1.4,specularIntensity:.5,
  clearcoat:.035,clearcoatRoughness:.45,envMapIntensity:.65,
 });
 // A photographed scan already contains its skin detail. Preserve those
 // samples exactly; its previous fabric-like finish hid the softbox lobe.
 if(nativeTexture)return material;
 const image=options.map?.image;
 const texel=new THREE.Vector2(1/(image?.width||2048),1/(image?.height||2048));
 material.onBeforeCompile=shader=>{
  shader.uniforms.synexSkinTexel={value:texel};
  const filter=`
   #ifdef USE_MAP
   // A small, low-strength filter keeps the authored pores and pigmentation.
   // Broad nine-tap blurring used to flatten cheeks and the nose into wax.
   vec3 synexSkinSample(vec2 uv, vec3 center, vec2 offset, inout float total) {
    vec3 color=texture2D(map,uv+offset*synexSkinTexel).rgb;
    vec3 difference=color-center;
    float weight=exp(-dot(difference,difference)*180.0);
    total+=weight;
    return color*weight;
   }
   #endif
  `;
  // The sampler is declared in map_pars_fragment, before the helper function.
  shader.fragmentShader='uniform vec2 synexSkinTexel;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <map_pars_fragment>', '#include <map_pars_fragment>\n'+filter);
  shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`
   #ifdef USE_MAP
    vec4 skinSource=texture2D(map,vMapUv);
    float total=1.0;
    vec3 filtered=skinSource.rgb*total;
    filtered+=synexSkinSample(vMapUv,skinSource.rgb,vec2(1.5,0.0),total);
    filtered+=synexSkinSample(vMapUv,skinSource.rgb,vec2(-1.5,0.0),total);
    filtered+=synexSkinSample(vMapUv,skinSource.rgb,vec2(0.0,1.5),total);
    filtered+=synexSkinSample(vMapUv,skinSource.rgb,vec2(0.0,-1.5),total);
    diffuseColor*=vec4(mix(skinSource.rgb,filtered/total,.30),skinSource.a);
   #endif
  `);
 };
 material.customProgramCacheKey=()=> 'synex-trainer-skin-v2';
 return material;
}
