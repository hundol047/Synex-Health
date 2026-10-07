import {LOCAL_ONLY} from '../lib/localMode.js';
import React,{useState} from 'react';
import BottomActions from './BottomActions.jsx';
import {BUILD_LABEL,UI_REVISION} from '../lib/buildInfo.js';
const STEPS=[['Synex Health에 오신 것을 환영합니다','체성분 기록과 운동 루틴으로 나의 변화를 관리합니다.'],['개인정보 안내','직접 입력한 건강 기록은 계정에 보관됩니다. 학교 공유는 별도로 동의한 경우에만 가능합니다.'],['체성분 기록','측정 결과를 수동 입력하거나 지원하는 CSV를 가져올 수 있습니다. 자동 연동은 지원 기관에서 제공됩니다.'],['3D 체형 안내','체성분에 따른 설명용 모델입니다. 실제 신체 스캔이나 의료용 해부학 모델이 아닙니다.'],['건강 앱 연결 · 선택','HealthKit / Health Connect는 연결 화면에서 원하는 항목을 선택할 때 권한을 요청합니다. 거절해도 기록과 운동 기능을 사용할 수 있습니다.'],['알림 · 선택','운동 알림은 연결 화면에서 직접 켤 수 있습니다. 알림을 허용하지 않아도 앱을 사용할 수 있습니다.'],['학교 연결 · 선택','학교를 선택하는 것과 소속 인증은 다릅니다. 연결하지 않고 개인 건강 기록으로 사용할 수 있습니다.']];
const DEVICE_STEPS=[['나의 몸, 나의 기록','체성분을 기록하고 나에게 맞는 운동을 차근차근 시작하세요.'],['기록은 이 폰에만','건강 기록은 이 기기에 암호화해 보관합니다. 앱을 삭제하면 기록도 사라지므로 필요한 기록은 내보내세요.'],['결과지 그대로 입력하기','체중·골격근량·체지방률을 직접 입력하세요. 모르는 부위별 수치는 비워두어도 됩니다.'],['내 몸을 한눈에','성별과 측정값을 반영한 설명용 3D 모형입니다. 손가락으로 돌려 보고 지난 측정과 비교할 수 있습니다.'],['동작을 보고 따라 하기','운동 이름 옆의 작은 시범으로 방법을 먼저 확인하세요. 운동 경험과 안전 문진을 입력하면 기본 계획을 만듭니다.'],['꾸준하게, 내 속도로','무리하지 않고 완료한 운동과 느낀 부담을 기록하세요. 알림은 원할 때 직접 켤 수 있습니다.'],['학교 선택은 자유롭게','학교 소속은 이 기기에 저장합니다. 건강센터에 기록을 공유하거나 학교 계정으로 로그인하지 않습니다.']];
const INTRO_STEPS=LOCAL_ONLY?DEVICE_STEPS:STEPS;
function readCompleted(){try{return localStorage.getItem(LOCAL_ONLY?'synex-personal-onboarding-v1':'synex-onboarding-v1')==='done';}catch{return false;}}
export default function Onboarding({children}){
 const [done,setDone]=useState(()=>readCompleted()),[step,setStep]=useState(0);
 if(done)return children;
 return <main className="health-main onboarding-page"><section className="card onboarding"><p>{step+1} / {INTRO_STEPS.length}</p><h1>{INTRO_STEPS[step][0]}</h1><p>{INTRO_STEPS[step][1]}</p>{!LOCAL_ONLY&&<p><a href="/privacypolicy.html" target="_blank" rel="noreferrer">개인정보 처리 안내</a> · <a href="/terms.html" target="_blank" rel="noreferrer">서비스 이용 안내</a></p>}{!LOCAL_ONLY&&<p className="muted" data-testid="build-label">{UI_REVISION} · {BUILD_LABEL}</p>}</section><BottomActions className="onboarding-actions" label="시작 안내 이동"><button className="btn btn-ghost" disabled={step===0} onClick={()=>setStep(step-1)}>이전</button><button className="btn btn-primary" onClick={()=>{if(step<INTRO_STEPS.length-1)setStep(step+1);else{try{localStorage.setItem(LOCAL_ONLY?'synex-personal-onboarding-v1':'synex-onboarding-v1','done');}catch{/* Continue this session even if browser storage is unavailable. */}setDone(true);}}}>{step===INTRO_STEPS.length-1?'시작하기':'다음'}</button></BottomActions></main>;
}
