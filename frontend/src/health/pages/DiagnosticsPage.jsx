import {rendererStats} from '../components/body3d/rendererStats.js';
import React,{useState} from 'react';
import {Capacitor} from '@capacitor/core';
import {healthAvailability} from '../../shared/lib/deviceHealth.js';
import {api} from '../../shared/lib/api.js';
import {useApiData} from '../lib/useApiData.js';
import {Card,ErrorState} from '../../shared/components/ui.jsx';
export default function DiagnosticsPage(){
 const state=useApiData(()=>api('/api/diagnostics'),[]),[checks,setChecks]=useState({}),[busy,setBusy]=useState(false);
 async function inspect(){setBusy(true);const next={};const renderer=rendererStats();next['3D Renderer']=renderer?'available (last viewed scene)':'3D 화면을 먼저 여세요';next['Average overlay available']=renderer?.overlayAvailable??false;if(import.meta.env.DEV&&renderer){next.WebGL=renderer.webgl;next.GPU=renderer.renderer;next.FPS=renderer.renderedFPS+' (on-demand sample; not device benchmark)';next['Mesh count']=renderer.meshCount;next.Vertices=renderer.vertices;next['Geometry buffers']=renderer.geometryBuffers;}
 try{const r=await fetch('/pose/pose_landmarker_lite.task',{method:'HEAD'});next.pose=r.ok?'asset_available_not_inference_verified':'asset_unavailable';}catch{next.pose='unavailable';}
 if(Capacitor.isNativePlatform()){
  try{const {App}=await import('@capacitor/app');const info=await App.getInfo();next.version=`${info.version} (${info.build})`;}catch{next.version='unavailable';}
  try{const {LocalNotifications}=await import('@capacitor/local-notifications');next.notifications=(await LocalNotifications.checkPermissions()).display;}catch{next.notifications='unavailable';}
 }else{next.version='web';try{next.notifications=Notification.permission;}catch{next.notifications='unsupported';}}
 try{const health=await healthAvailability();next.health=`${health.provider}: ${health.available?'available_permission_not_verified':'unavailable'}`;}catch{next.health='unavailable';}setChecks(next);setBusy(false);}
 return <Card title="기기 진단 · QA"><p>권한을 자동 요청하지 않습니다. 아래 상태는 실제 기기 인증이나 스토어 승인 결과가 아닙니다.</p>{state.error&&<ErrorState message={state.error.message} onRetry={state.reload}/>}<dl>{Object.entries({platform:Capacitor.getPlatform(),camera:navigator.mediaDevices?.getUserMedia?'api_available_permission_not_checked':'unavailable',api:state.data?.api||'checking',auth:state.data?.auth||'unknown',database:state.data?.database||'unknown',billing:state.data?.billing||'unknown',school:state.data?.school?.integration_status||'unknown',...checks}).map(([k,v])=><div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl><button className="btn btn-primary" disabled={busy} onClick={inspect}>{busy?'확인 중…':'기기 상태 확인'}</button></Card>;
}
