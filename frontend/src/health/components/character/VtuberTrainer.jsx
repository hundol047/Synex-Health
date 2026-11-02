import React from 'react';
import data from './assets/vtuber/female.json';
import TrainerAthlete from './TrainerAthlete.jsx';
export default function VtuberTrainer(props){return <TrainerAthlete {...props} data={data} body="female"/>;}
