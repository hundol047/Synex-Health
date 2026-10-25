import React,{useState} from 'react';
import CameraCoaching from '../../health/components/exercise/CameraCoaching.jsx';
import {CATALOG_POSE_EXERCISES} from '../../health/components/exercise/catalogPoseAnalyzer.js';
export default function LocalCameraPreview({onExit}){
 const [motion,setMotion]=useState('squat'),[accepted,setAccepted]=useState(false);
 return <main className="health-main"><section className="card"><h1>운동 카메라 테스트 · 74개</h1><p>서버 없이 이 기기에서 운동 시범과 관절 추정을 시험합니다. 영상·건강기록을 저장하거나 업로드하지 않습니다. 실제 사람 정확도 검증 전이며 힘·근활성·통증은 측정하지 않습니다.</p><button className="btn" onClick={onExit}>서버 연결 화면으로 돌아가기</button>
 {!accepted?<><p>통증이나 어지럼이 있으면 중지하세요. 만 14세 이상만 이용할 수 있습니다.</p><label><input type="checkbox" onChange={e=>setAccepted(e.target.checked)}/>만 14세 이상이며 검증 전 카메라 테스트에 동의합니다</label></>:<><label>테스트할 운동<select value={motion} onChange={e=>setMotion(e.target.value)}>{Object.entries(CATALOG_POSE_EXERCISES).map(([id,c])=><option key={id} value={id}>{c.label}</option>)}</select></label><button className="btn" onClick={()=>setAccepted(false)}>카메라 테스트 동의 철회</button><CameraCoaching key={motion} motion={motion} localPreview/></>}
 </section></main>;
}
