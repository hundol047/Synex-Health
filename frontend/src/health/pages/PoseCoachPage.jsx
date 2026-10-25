import React from 'react';
import {Link,useNavigate,useSearchParams} from 'react-router-dom';
import {ArrowLeft,ChevronDown} from 'lucide-react';
import {COACHING_CATALOG,coachingMotionId} from '../components/exercise/coachingCatalog.js';
import CameraCoaching from '../components/exercise/CameraCoaching.jsx';
export default function PoseCoachPage(){
 const navigate=useNavigate();
 const [params,setParams]=useSearchParams(),motion=coachingMotionId(params.get('motion'))||'squat';
 function returnToHome(event){
  if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
  event.preventDefault();
  // User navigation takes priority over the continuously animated instructor.
  navigate('/health',{flushSync:true});
 }
 return <section className="pose-coach-page" aria-label="맨몸·헬스장 자세 코칭">
  <header className="pose-coach-header">
   <Link className="pose-coach-back" to="/health" onClick={returnToHome} aria-label="운동 홈으로 돌아가기"><ArrowLeft size={19} aria-hidden="true"/></Link>
   <div className="pose-coach-heading"><h1>운동 자세 코칭</h1><p>맨몸 42종 · 헬스장 32종 · 자세 분석과 음성 안내</p></div>
   <label className="pose-coach-selector"><span>운동 선택</span><select aria-label="따라 할 운동" value={motion} onChange={e=>setParams({motion:e.target.value},{replace:true,flushSync:true})}>{[['bodyweight','맨몸운동'],['equipment','헬스장 운동']].map(([type,name])=><optgroup key={type} label={name}>{Object.entries(COACHING_CATALOG).filter(([,c])=>c.trainingType===type).map(([id,c])=><option key={id} value={id}>{c.label}</option>)}</optgroup>)}</select><ChevronDown size={14} aria-hidden="true"/></label>
  </header>
  <CameraCoaching motion={motion} immersive/>
 </section>;
}
