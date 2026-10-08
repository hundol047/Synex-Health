import React from 'react';
import {Link,useNavigate,useSearchParams} from 'react-router-dom';
import {ArrowLeft,ChevronDown} from 'lucide-react';
import {BODYWEIGHT_EXERCISES} from '../components/exercise/bodyweightGuide.js';
import CameraCoaching from '../components/exercise/CameraCoaching.jsx';
export default function PoseCoachPage(){
 const navigate=useNavigate();
 const [params,setParams]=useSearchParams(),requested=params.get('motion'),motion=Object.hasOwn(BODYWEIGHT_EXERCISES,requested)?requested:'squat';
 function returnToHome(event){
  if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
  event.preventDefault();
  // User navigation takes priority over the continuously animated instructor.
  navigate('/health',{flushSync:true});
 }
 return <section className="pose-coach-page" aria-label="맨몸운동 자세 코칭">
  <header className="pose-coach-header">
   <Link className="pose-coach-back" to="/health" onClick={returnToHome} aria-label="운동 홈으로 돌아가기"><ArrowLeft size={19} aria-hidden="true"/></Link>
   <div className="pose-coach-heading"><h1>맨몸운동 코칭</h1><p>시범을 배우고, 내 자세를 확인해요</p></div>
   <label className="pose-coach-selector"><span>운동 선택</span><select aria-label="따라 할 운동" value={motion} onChange={e=>setParams({motion:e.target.value},{replace:true,flushSync:true})}>{Object.entries(BODYWEIGHT_EXERCISES).map(([id,c])=><option key={id} value={id}>{c.label}</option>)}</select><ChevronDown size={14} aria-hidden="true"/></label>
  </header>
  <CameraCoaching motion={motion} immersive/>
 </section>;
}
