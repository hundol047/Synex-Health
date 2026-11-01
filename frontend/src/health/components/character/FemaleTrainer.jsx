import React from 'react';
import data from './assets/authored/female.json';
import TrainerAthlete from './TrainerAthlete.jsx';
export default function FemaleTrainer(props){return <TrainerAthlete {...props} data={data} body="female"/>;}
