import React from 'react';
import data from './assets/trainer/female.json';
import TrainerAthlete from './TrainerAthlete.jsx';
export default function FemaleTrainer(props){return <TrainerAthlete {...props} data={data} body="female"/>;}
