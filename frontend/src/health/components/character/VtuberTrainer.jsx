import React,{useMemo} from 'react';
import data from './assets/vtuber/female.json';
import TrainerAthlete from './TrainerAthlete.jsx';
import {customizeVtuberData} from './vtuberAppearance.js';
export default function VtuberTrainer(props){
 const c=props.character||{};
 const fitted=useMemo(()=>customizeVtuberData(data,c),[c.vtuberOutfit,c.vtuberChest,c.vtuberHips,c.vtuberGlutes,c.vtuberWaist]);
 return <TrainerAthlete {...props} data={fitted} body="female"/>;
}
