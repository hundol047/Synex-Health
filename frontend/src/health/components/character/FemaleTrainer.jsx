import React,{lazy} from 'react';
import data from './assets/scanned/female.json';
import TrainerAthlete from './TrainerAthlete.jsx';
const StudioTrainer=lazy(()=>import('./StudioTrainer.jsx'));
export default function FemaleTrainer(props){return props.character?.detailedStyle==='studio'?<StudioTrainer {...props}/>:<TrainerAthlete {...props} data={data} body="female"/>;}
