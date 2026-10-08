import React from 'react';
import {Link,useSearchParams} from 'react-router-dom';
import {BODYWEIGHT_EXERCISES} from '../components/exercise/bodyweightGuide.js';
import CameraCoaching from '../components/exercise/CameraCoaching.jsx';
export default function PoseCoachPage(){
 const [params,setParams]=useSearchParams(),requested=params.get('motion'),motion=Object.hasOwn(BODYWEIGHT_EXERCISES,requested)?requested:'squat';
 return <section className="pose-coach-page" aria-label="맨몸운동 자세 코칭"><header className="pose-coach-header"><Link className="pose-coach-back" to="/health" aria-label="운동 홈으로 돌아가기">←</Link><div><h1>맨몸운동 코칭</h1><p>위에서 배우고 · 아래에서 자세 확인</p></div><label><select aria-label="따라 할 운동" value={motion} onChange={e=>setParams({motion:e.target.value},{replace:true})}>{Object.entries(BODYWEIGHT_EXERCISES).map(([id,c])=><option key={id} value={id}>{c.label}</option>)}</select></label></header><CameraCoaching key={motion} motion={motion} immersive/></section>;
}
