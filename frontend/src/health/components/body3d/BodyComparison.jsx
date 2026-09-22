import React,{useRef,useState} from 'react';
import { api } from '../../../shared/lib/api.js';
import { useApiData } from '../../lib/useApiData.js';
import { ErrorState,Skeleton,EmptyState } from '../../../shared/components/ui.jsx';
import BodyScene from './BodyScene.jsx';
import BodyTools,{BODY_NOTICE} from './BodyTools.jsx';
import { measurementDeltas } from './morph.js';
import { SEGMENT_LABEL_KO } from '../../lib/bodyMapColors.js';
export default function BodyComparison(){
 const {data,error,loading,reload}=useApiData(()=>api('/api/advanced/body'),[]);
 const camera=useRef({owner:'current'}),[previous,setPrevious]=useState(''),[current,setCurrent]=useState('');
 const [layer,setLayer]=useState('body'),[slice,setSlice]=useState({enabled:false,axis:'horizontal',position:0});
 if(loading)return <Skeleton height={300}/>;
 if(error)return <ErrorState message={error.message} onRetry={reload}/>;
 if(data.measurements.length<2)return <EmptyState title="두 번 이상의 측정이 필요합니다" description="재측정 후 체형 변화를 비교할 수 있습니다."/>;
 const list=data.measurements,a=list.find(m=>m.id===previous)||list.at(-2),b=list.find(m=>m.id===current)||list.at(-1);
 const deltas=measurementDeltas(a,b),colors={};
 for(const d of deltas.filter(d=>d.key.endsWith(layer==='fat'?'.fat_mass_kg':'.lean_mass_kg')))if(d.value!=null)colors[d.key.split('.')[0]]=d.value>0?'#187aaf':d.value<0?'#c57a36':'#8b9eaa';
 const labels={weight:'체중',skeletal_muscle_mass:'골격근량',body_fat_percentage:'체지방률',lean_mass_kg:'제지방',fat_mass_kg:'지방'};
 return <section><h3>Before / After 3D</h3><p>{BODY_NOTICE}</p><BodyTools {...{layer,setLayer,slice,setSlice}}/>
 <div className="body-compare-grid">{[['previous','이전',a,setPrevious],['current','현재',b,setCurrent]].map(([id,label,m,set])=><div key={id}><label>{label} 측정 <select value={m.id} onChange={e=>set(e.target.value)}>{list.map(item=><option key={item.id} value={item.id}>{item.measurement_date}</option>)}</select></label><BodyScene sceneId={id} sharedCamera={camera} gender={data.profile.gender} profile={data.profile} measurement={m} layer={layer} slice={slice} segmentColors={id==='current'?colors:{}} height={420}/></div>)}</div>
 <p className="muted">카메라 각도 동기화 · {layer==='fat'?'지방':'제지방'} 변화: 파랑 증가 / 주황 감소 / 회색 변화 없음. 질병·위험도가 아닙니다.</p>
 <div className="data-table-wrap"><table><caption>선택한 두 측정의 변화 (현재 − 이전)</caption><thead><tr><th>항목</th><th>변화</th></tr></thead><tbody>{deltas.map(d=><tr key={d.key}><th>{d.key.split('.').map(k=>labels[k]||SEGMENT_LABEL_KO[k]||k).join(' ')}</th><td>{d.value==null?'측정 없음':`${d.value>0?'+':''}${d.value} ${d.key==='body_fat_percentage'?'%p':'kg'}`}</td></tr>)}</tbody></table></div></section>;
}
