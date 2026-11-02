import {VTUBER_OUTFITS,normalizeVtuberOptions} from './vtuberOptions.js';

// Detail follows bind-space fabric and the native UVs, so neither the weave nor
// hair strands slide through the body when an exercise changes its pose. Filter
// subpixel patterns with derivatives rather than adding textures or draw calls.
export function finishVtuberSurface(material,surface,character){
 const c=normalizeVtuberOptions(character),outfit=VTUBER_OUTFITS.find(o=>o.id===c.vtuberOutfit);
 const kind=surface.kind==='Hair'?'hair':surface.kind==='Skin'?'skin':surface.name==='EyeIris_00_EYE'?'iris':surface.kind==='Clothes'?'fabric':null;
 if(!kind)return material;
 const role=surface.tintRole||(surface.name==='Tops_01_CLOTH'?'top':surface.name==='Bottoms_01_CLOTH'?'bottom':null);
 const previous=material.onBeforeCompile,key=material.customProgramCacheKey();
 material.userData.vtuberFinish=kind;
 material.onBeforeCompile=shader=>{
  previous?.(shader);
  shader.vertexShader='attribute vec3 vtuberRest; varying vec3 vVtuberRest; varying vec3 vVtuberNormal; varying vec2 vVtuberUV; varying vec3 vVtuberView;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
   vVtuberRest=vtuberRest; vVtuberNormal=normalize(mat3(modelMatrix)*normal); vVtuberUV=uv; vVtuberView=cameraPosition-(modelMatrix*vec4(position,1.0)).xyz;
  `);
  shader.fragmentShader=`varying vec3 vVtuberRest; varying vec3 vVtuberNormal; varying vec2 vVtuberUV; varying vec3 vVtuberView;
   float vtuberLine(float distance,float width){float aa=max(fwidth(distance),.0002);return 1.0-smoothstep(width-aa,width+aa,abs(distance));}
   float vtuberThread(float phase){return sin(phase)*(1.0-smoothstep(.7,1.8,fwidth(phase)));}
  `+shader.fragmentShader;
  let detail='';
  if(kind==='hair')detail=`
   vec3 hn=normalize(vVtuberNormal)*(gl_FrontFacing?1.0:-1.0);float hlight=dot(hn,normalize(vec3(-.4,.65,1.0)))*.5+.5;
   float fibers=.035*vtuberThread(vVtuberUV.x*190.0+sin(vVtuberUV.y*9.0)*.4)+.022*vtuberThread(vVtuberUV.x*45.0+sin(vVtuberUV.y*5.0)*.15);
   float gloss=pow(max(0.0,dot(hn,normalize(normalize(vec3(-.4,.65,1.0))+normalize(vVtuberView)))),18.0);
   diffuseColor.rgb*=.82+.20*hlight+fibers;
   diffuseColor.rgb+=mix(diffuseColor.rgb,vec3(1.0),.3)*gloss*.16;
  `;
  if(kind==='skin')detail=`
   float softKey=dot((normalize(vVtuberNormal)*(gl_FrontFacing?1.0:-1.0)),normalize(vec3(-.4,.65,1.0)))*.5+.5;
   diffuseColor.rgb*=mix(vec3(.955,.938,.93),vec3(1.015,1.01,1.005),softKey);
  `;
  if(kind==='iris')detail=`
   vec2 ip=vec2(fract(vVtuberUV.x*2.0)-.5,vVtuberUV.y-.5);float ir=length(ip);
   float irisPigment=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));
   float irisMask=smoothstep(.015,.06,irisPigment)*(1.0-smoothstep(.6,.85,irisPigment))*smoothstep(.10,.14,ir)*(1.0-smoothstep(.23,.28,ir));
   float irisFibers=vtuberThread(atan(ip.y,ip.x+.00001)*42.0+ir*20.0);
   diffuseColor.rgb*=1.0+irisMask*irisFibers*.075;
   diffuseColor.rgb+=vec3(.018,.023,.03)*irisMask*exp(-pow((ir-.19)/.045,2.0));
  `;
  if(kind==='fabric'){
   const hem=role==='top'&&!outfit.nativeTop?outfit.topHem:role==='bottom'&&!outfit.nativeBottom?outfit.bottomHem:-10;
   const waist=role==='bottom'&&!outfit.nativeBottom?1.06:-10;
   shader.uniforms.vtuberHem={value:hem};shader.uniforms.vtuberWaist={value:waist};
   shader.fragmentShader='uniform float vtuberHem; uniform float vtuberWaist;\n'+shader.fragmentShader;
   detail=`
    vec3 fn=normalize(vVtuberNormal)*(gl_FrontFacing?1.0:-1.0);
    float fabricLight=dot(fn,normalize(vec3(-.5,.65,1.0)))*.5+.5;
    diffuseColor.rgb*=.72+.30*fabricLight;
    float fabricSheen=pow(max(0.0,dot(fn,normalize(normalize(vec3(-.5,.65,1.0))+normalize(vVtuberView)))),16.0);
    diffuseColor.rgb+=mix(diffuseColor.rgb,vec3(1.0),.08)*fabricSheen*.045;
    float weave=vtuberThread(vVtuberRest.x*1700.0+vVtuberRest.y*850.0)*vtuberThread(vVtuberRest.y*1700.0-vVtuberRest.z*850.0);
    diffuseColor.rgb*=1.0+weave*.022;
    float hemBand=vtuberLine(vVtuberRest.y-(vtuberHem+.006),.006);
    float belt=vtuberLine(vVtuberRest.y-(vtuberWaist-.014),.014);
    diffuseColor.rgb*=1.0-.13*hemBand-.18*belt;
    float hemStitch=vtuberLine(vVtuberRest.y-(vtuberHem+.010),.0008);
    float waistStitch=vtuberLine(vVtuberRest.y-(vtuberWaist-.026),.0008);
    float stitch=max(hemStitch,waistStitch)*(.75+.25*vtuberThread((vVtuberRest.x+vVtuberRest.z)*1100.0));
    diffuseColor.rgb=mix(diffuseColor.rgb,mix(diffuseColor.rgb,vec3(1.0),.3),stitch*.6);
    // Quiet side stitching follows the fitted shirt in bind space.
    float shirtSide=smoothstep(.075,.115,abs(vVtuberRest.x))*smoothstep(vtuberHem+.018,vtuberHem+.045,vVtuberRest.y)*(1.0-smoothstep(1.35,1.40,vVtuberRest.y));
    float sideSeam=vtuberLine(vVtuberRest.z-.045,.0012)*shirtSide;
    diffuseColor.rgb*=1.0-${role==='top'&&!outfit.nativeTop?'.065':'0.0'}*sideSeam;
    // Tonal sportswear panels and narrow piping keep user-selected colors,
    // while giving the fitted outfit a readable, finished silhouette.
    float panelHeight=smoothstep(${role==='top'?'1.17':'0.18'},${role==='top'?'1.21':'0.23'},vVtuberRest.y)*(1.0-smoothstep(${role==='top'?'1.35':'1.01'},${role==='top'?'1.40':'1.05'},vVtuberRest.y));
    float outerPanel=smoothstep(${role==='top'?'.085':'.11'},${role==='top'?'.14':'.17'},abs(vVtuberRest.x))*panelHeight;
    float piping=vtuberLine(vVtuberRest.z-.055,.0016)*outerPanel;
    diffuseColor.rgb*=1.0-${role==='top'&&!outfit.nativeTop||role==='bottom'&&!outfit.nativeBottom?'.10':'0.0'}*outerPanel;
    diffuseColor.rgb=mix(diffuseColor.rgb,mix(diffuseColor.rgb,vec3(1.0),.35),piping*${role==='top'&&!outfit.nativeTop||role==='bottom'&&!outfit.nativeBottom?'.55':'0.0'});
   `;
  }
  // Existing pigment recoloring comes first; muscle guidance is composed later
  // at color_fragment and must remain visible over the garment finish.
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',detail+'\n#include <color_fragment>');
 };
 material.customProgramCacheKey=()=>key+'-vtuber-finish-'+kind+'-v4';return material;
}
