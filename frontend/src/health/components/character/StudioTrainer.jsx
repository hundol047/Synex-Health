import React from 'react';
import source from './assets/studio/female.json';
import texture from './assets/authored/studio-head.json';
import TrainerAthlete from './TrainerAthlete.jsx';
const data={...source,surfaceMaterials:source.surfaceMaterials.map(s=>s.name==='Std_Skin_Head'?{...s,map:texture.map,mapSourceHash:texture.generatedImageSha256}:s)};
export default function StudioTrainer(props){return <TrainerAthlete {...props} data={data} body="female"/>;}
