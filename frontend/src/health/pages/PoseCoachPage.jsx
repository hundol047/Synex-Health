import React from 'react';
import {useSearchParams} from 'react-router-dom';
import {Card} from '../../shared/components/ui.jsx';
import {POSE_EXERCISES} from '../components/exercise/poseCoach.js';
import CameraCoaching from '../components/exercise/CameraCoaching.jsx';
export default function PoseCoachPage(){
 const [params,setParams]=useSearchParams(),requested=params.get('motion'),motion=Object.hasOwn(POSE_EXERCISES,requested)?requested:'squat';
 return <Card title="카메라 코칭 · 원할 때만 피드백"><label>따라 할 운동<select value={motion} onChange={e=>setParams({motion:e.target.value},{replace:true})}>{Object.entries(POSE_EXERCISES).map(([id,c])=><option key={id} value={id}>{c.label}</option>)}</select></label><CameraCoaching key={motion} motion={motion}/></Card>;
}
