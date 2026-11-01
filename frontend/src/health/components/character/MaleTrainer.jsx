import React from 'react';
import data from './assets/trainer/male.json';
import TrainerAthlete from './TrainerAthlete.jsx';
export default function MaleTrainer(props){return <TrainerAthlete {...props} data={data} body="male"/>;}
