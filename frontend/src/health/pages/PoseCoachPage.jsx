import React from 'react';
import {useSearchParams} from 'react-router-dom';
import {Card} from '../../shared/components/ui.jsx';
import {SUPPORTED_POSE_EXERCISES} from '../components/exercise/poseCoach.js';
import CameraCoaching from '../components/exercise/CameraCoaching.jsx';
export default function PoseCoachPage(){
 const [params,setParams]=useSearchParams(),requested=params.get('motion'),motion=Object.hasOwn(SUPPORTED_POSE_EXERCISES,requested)?requested:'squat';
 if(requested&&!Object.hasOwn(SUPPORTED_POSE_EXERCISES,requested))return <Card title="운동 확인 필요"><p>선택한 운동의 분석 정의가 없습니다. 운동 목록에서 다시 선택해 주세요.</p></Card>;
 return <Card title="카메라 코칭 · 원할 때만 피드백"><label>따라 할 운동<select value={motion} onChange={e=>setParams({motion:e.target.value},{replace:true})}>{Object.entries(SUPPORTED_POSE_EXERCISES).map(([id,c])=><option key={id} value={id}>{c.label}</option>)}</select></label><CameraCoaching key={motion} motion={motion}/></Card>;
}
