import React,{useState} from 'react';
import {Link} from 'react-router-dom';
import {api} from '../../shared/lib/api.js';
import {Card,Skeleton,ErrorState,EmptyState} from '../../shared/components/ui.jsx';
import {useApiData} from '../lib/useApiData.js';
import {CATEGORY_LABELS,EQUIPMENT_LABELS,equipmentText} from '../lib/exerciseLabels.js';
import ExerciseCard from '../components/exercise/ExerciseCard.jsx';
export default function ExerciseLibraryPage(){
 const {data,loading,error,reload}=useApiData(()=>api('/api/exercise-catalog'),[]);
 const [query,setQuery]=useState(''),[category,setCategory]=useState('all'),[type,setType]=useState('all'),[equipment,setEquipment]=useState('all'),[limit,setLimit]=useState(12);
 if(loading)return <Skeleton/>;
 if(error)return <ErrorState message={error.message} onRetry={reload}/>;
 const list=data||[], term=query.trim().toLowerCase();
 const filtered=list.filter(e=>(type==='all'||e.training_type===type)&&(category==='all'||e.category===category)&&(equipment==='all'||e.equipment.includes(equipment))&&`${e.name} ${e.english_name} ${e.target_muscle.join(' ')} ${equipmentText(e.equipment)}`.toLowerCase().includes(term));
 function change(setter,value){setter(value);setLimit(12);}
 return <Card title={`운동 라이브러리 · ${list.length}개`}>
  <div className="motion-controls" role="group" aria-label="운동 방식">
   {[['all','전체'],['bodyweight','맨몸운동'],['equipment','헬스장 운동']].map(([value,label])=><button key={value} className={`btn ${type===value?'btn-primary':'btn-secondary'}`} aria-pressed={type===value} onClick={()=>{change(setType,value);setEquipment('all');}}>{label} {list.filter(e=>value==='all'||e.training_type===value).length}</button>)}
  </div>
  <p className="muted">맨몸운동은 별도 중량 기구 없이, 헬스장 운동은 표시된 장비로 수행합니다. 덤벨·밴드 운동은 장비가 있는 집에서도 할 수 있습니다.</p>
  <div className="profile-grid"><label>운동·근육 검색<input value={query} onChange={e=>change(setQuery,e.target.value)} placeholder="예: 스쿼트, 등, 덤벨"/></label>
   <label>운동 부위<select value={category} onChange={e=>change(setCategory,e.target.value)}><option value="all">전체 부위</option>{Object.entries(CATEGORY_LABELS).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
   {type!=='bodyweight'&&<label>이용할 기구<select value={equipment} onChange={e=>change(setEquipment,e.target.value)}><option value="all">전체 기구</option>{[...new Set(list.flatMap(e=>e.equipment))].map(id=><option key={id} value={id}>{EQUIPMENT_LABELS[id]||id}</option>)}</select></label>}
  </div>
  <p role="status">조건에 맞는 운동 {filtered.length}개</p>
  <Link className="btn btn-secondary" to="/health/profile">내 운동 방식·장비 설정하기</Link>
  <p className="muted">시범은 자세 이해를 위한 개념도입니다. 기구 조절과 안전 장치는 현장에서 확인하세요.</p>
  {!filtered.length&&<EmptyState title="조건에 맞는 운동이 없어요" description="검색어 또는 부위·기구 조건을 바꿔 보세요."/>}
  {filtered.slice(0,limit).map(e=><ExerciseCard key={e.id} exercise={{...e,exercise_name:e.name,exercise_id:e.id,target_regions:e.target_muscle,rest_seconds:e.rest,reason:`${CATEGORY_LABELS[e.category]} · ${equipmentText(e.equipment)}${e.auto_recommend===false?' · 지도받은 후 수행':''}`}}/>)}
  {limit<filtered.length&&<button className="btn btn-secondary btn-block" onClick={()=>setLimit(n=>n+12)}>운동 더 보기 ({filtered.length-limit}개 남음)</button>}
 </Card>;
}
