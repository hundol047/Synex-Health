import React from 'react';

// Load only the selected trainer, including its mesh and textures.
const FemaleTrainer=React.lazy(()=>import('./FemaleTrainer.jsx'));
const MaleTrainer=React.lazy(()=>import('./MaleTrainer.jsx'));
export default function DetailedAthlete(props){
 const Trainer=props.character.body==='female'?FemaleTrainer:MaleTrainer;
 return <Trainer {...props}/>;
}
