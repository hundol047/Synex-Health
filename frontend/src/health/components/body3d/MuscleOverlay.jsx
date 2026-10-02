import React,{useEffect,useMemo} from 'react';
import * as THREE from 'three';
import data from './assets/human-mesh.json';
import {overlayPositions,interpolatePositions,OVERLAY_REGIONS} from './overlayMath.js';

// Share topology CPU storage. Independent GPU index handles prevent disposal of one layer
// from invalidating another; positions/normals vary, with one shared pose/camera.
const grouped=[];const groups=[];
for(let r=0;r<6;r++){
 const start=grouped.length;
 for(let i=0;i<data.indices.length;i+=3){const ids=data.indices.slice(i,i+3);const labels=ids.map(id=>data.regions[id]);const region=labels.find(v=>labels.filter(x=>x===v).length>=2)??labels[0];if(region===r)grouped.push(...ids);}
 groups.push({start,count:grouped.length-start,materialIndex:r});
}
const index=new THREE.BufferAttribute(new Uint32Array(grouped),1);
export default function MuscleOverlay({gender='unspecified',height=178,myValues,referenceValues,metric,selectedSegment,onSelect,onHover,options,clippingPlanes=[]}){
 const base=useMemo(()=>Float32Array.from(data.profiles[gender]||data.profiles.female.map((v,i)=>(v+data.profiles.male[i])/2),v=>v*data.scale),[gender]);
 const a=useMemo(()=>overlayPositions(base,data.regions,myValues,height,metric),[base,myValues,height,metric]);
 const b=useMemo(()=>overlayPositions(base,data.regions,referenceValues,height,metric),[base,referenceValues,height,metric]);
 const interpolated=useMemo(()=>options.interpolate?interpolatePositions(a,b,options.mix):a,[a,b,options.interpolate,options.mix]);
 return <group name="muscle-comparison-shared-pose">
  {options.showMy&&<Surface name="my-muscle" positions={interpolated} values={myValues} color="#1462ed" opacity={options.myOpacity} style={options.myStyle} {...{selectedSegment,onSelect,onHover,clippingPlanes}}/>}
  {options.showReference&&!options.interpolate&&<Surface name="reference-average" positions={b} values={referenceValues} color="#57616e" opacity={options.referenceOpacity} style={options.referenceStyle} {...{selectedSegment,onSelect,onHover,clippingPlanes}}/>}
 </group>;
}
function Surface({name,positions,values,color,opacity,style,selectedSegment,onSelect,onHover,clippingPlanes}){
 const geometry=useMemo(()=>{const g=new THREE.BufferGeometry();g.setIndex(new THREE.BufferAttribute(index.array,1));g.setAttribute('position',new THREE.BufferAttribute(positions,3));groups.forEach(v=>g.addGroup(v.start,v.count,v.materialIndex));g.computeVertexNormals();g.computeBoundingSphere();
  if(import.meta.env.DEV){const regions={};for(let j=0;j<positions.length;j+=3){const name=OVERLAY_REGIONS[data.regions[j/3]];if(!name)continue;const r=regions[name]||(regions[name]={count:0,depth:0,center:[0,0,0]});r.count++;r.depth+=Math.abs(positions[j+2]);for(let k=0;k<3;k++)r.center[k]+=positions[j+k];}for(const r of Object.values(regions)){r.depth/=r.count;r.center=r.center.map(v=>v/r.count);}g.userData.regions=regions;}
  return g;},[positions]);
 useEffect(()=>()=>geometry.dispose(),[geometry]);
 const region=e=>OVERLAY_REGIONS[data.regions[e.face?.a]];
 return <mesh name={name} geometry={geometry} renderOrder={name==='my-muscle'?1:2}
  onClick={e=>{if(e.delta>5)return;const r=region(e);if(r&&Number.isFinite(values[r])){e.stopPropagation();onSelect?.(r);}}}
  onPointerMove={e=>onHover?.(region(e))} onPointerOut={()=>onHover?.(null)}>
  {OVERLAY_REGIONS.map((r,i)=><meshStandardMaterial key={i} attach={`material-${i}`} color={r?color:'#bac5d3'}
    transparent opacity={!r?(name==='my-muscle'?.16:0):!Number.isFinite(values[r])?0:opacity*(selectedSegment&&selectedSegment!==r?.18:1)}
    depthWrite={false} side={THREE.FrontSide} wireframe={style==='wireframe'||style==='outline'}
    roughness={.75} metalness={0} clippingPlanes={clippingPlanes} polygonOffset polygonOffsetFactor={name==='my-muscle'?1:-1}/>) }
 </mesh>;
}
