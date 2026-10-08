import React,{useState,useRef,useEffect,useCallback,lazy,Suspense} from 'react';
import {Link} from 'react-router-dom';
import {Search, SlidersHorizontal, Dumbbell, Video, X, ArrowUpRight} from 'lucide-react';
import {api} from '../../shared/lib/api.js';
import {Card,Skeleton,ErrorState,EmptyState} from '../../shared/components/ui.jsx';
import {useApiData} from '../lib/useApiData.js';
import {CATEGORY_LABELS,EQUIPMENT_LABELS,equipmentText} from '../lib/exerciseLabels.js';
import {BODYWEIGHT_EXERCISES,bodyweightRecordingMotionId} from '../components/exercise/bodyweightGuide.js';
import {cameraMotionId} from '../components/exercise/motionGuide.js';
import ExerciseCard from '../components/exercise/ExerciseCard.jsx';
import '../components/exercise/exercise-experience.css';
const ExerciseMotion=lazy(()=>import('../components/exercise/ExerciseMotion.jsx'));
const toExercise=e=>({...e,exercise_name:e.name,exercise_id:e.id,target_regions:e.target_muscle,duration:e.dose_type==='duration'?'시간 기준 운동':undefined,rest_seconds:e.dose_type==='duration'?null:e.rest,reason:`${CATEGORY_LABELS[e.category]} · ${equipmentText(e.equipment)}${e.auto_recommend===false?' · 지도받은 후 수행':''}`});
export default function ExerciseLibraryPage(){
 const {data,loading,error,reload}=useApiData(()=>api('/api/exercise-catalog'),[]);
 const [query,setQuery]=useState(''),[category,setCategory]=useState('all'),[type,setType]=useState('all'),[equipment,setEquipment]=useState('all'),[limit,setLimit]=useState(12),[poseOnly,setPoseOnly]=useState(false);
 const [selectedId,setSelectedId]=useState(null),[headerHeight,setHeaderHeight]=useState(65),stage=useRef(null);
 const scrollToStage=useCallback(()=>{requestAnimationFrame(()=>stage.current?.scrollIntoView?.({behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'}));},[]);
 useEffect(()=>{
  const header=document.querySelector('.health-topbar');
  if(!header)return;
  const measure=()=>setHeaderHeight(Math.ceil(header.getBoundingClientRect().height));
  measure();
  const observer=typeof ResizeObserver==='undefined'?null:new ResizeObserver(measure);
  observer?.observe(header);
  return()=>observer?.disconnect();
 },[]);
 useEffect(()=>{
  if(!selectedId||loading||error)return;
  document.body.classList.add('exercise-library-focus');
  const closeOnEscape=event=>{if(event.key==='Escape')setSelectedId(null);};
  document.addEventListener('keydown',closeOnEscape);
  return()=>{document.body.classList.remove('exercise-library-focus');document.removeEventListener('keydown',closeOnEscape);};
 },[selectedId,loading,error]);
 if(loading)return <Skeleton/>;
 if(error)return <ErrorState message={error.message} onRetry={reload}/>;
 const list=data||[], term=query.trim().toLowerCase();
 const filtered=list.filter(e=>(!poseOnly||(e.training_type==='bodyweight'&&!!BODYWEIGHT_EXERCISES[cameraMotionId(e.motion_id)]))&&(type==='all'||e.training_type===type)&&(category==='all'||e.category===category)&&(equipment==='all'||e.equipment.includes(equipment))&&`${e.name} ${e.english_name} ${e.target_muscle.join(' ')} ${equipmentText(e.equipment)}`.toLowerCase().includes(term));
 const selected=filtered.find(e=>e.id===selectedId);
 function change(setter,value){setter(value);setLimit(12);setSelectedId(null);}
 function selectExercise(id){setSelectedId(id);if(id===selectedId)scrollToStage();}
 return <Card title={`운동 라이브러리 · ${list.length}개`} className="exercise-library">
  {selected&&<button type="button" className="exercise-library-focus-exit" aria-label="운동 목록으로 돌아가기" onClick={()=>setSelectedId(null)}><X size={15}/> 시범 닫기</button>}
  <div className="exercise-library-intro"><div><span className="exercise-library-kicker">움직임을 이해하고, 따라 해 보세요</span><h3>내 운동을 더 선명하게</h3><p>전용 3D 시범으로 자세와 지지점을 살펴보세요.</p></div><Dumbbell size={30} strokeWidth={1.3}/></div>
  <div className="exercise-library-types" role="group" aria-label="운동 방식">
   {[['all','전체'],['bodyweight','맨몸운동'],['equipment','헬스장 운동']].map(([value,label])=><button key={value} className={`btn ${type===value?'btn-primary':'btn-secondary'}`} aria-pressed={type===value} onClick={()=>{change(setType,value);setEquipment('all');}}>{label} {list.filter(e=>value==='all'||e.training_type===value).length}</button>)}
  </div>
  <div className="exercise-library-filters"><label className="exercise-library-search"><span><Search size={15}/> 운동·근육 검색</span><input className="text-input" value={query} onChange={e=>change(setQuery,e.target.value)} placeholder="예: 스쿼트, 등, 덤벨"/></label>
   <label>운동 부위<select className="text-input" value={category} onChange={e=>change(setCategory,e.target.value)}><option value="all">전체 부위</option>{Object.entries(CATEGORY_LABELS).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
   {type!=='bodyweight'&&<label>이용할 기구<select className="text-input" value={equipment} onChange={e=>change(setEquipment,e.target.value)}><option value="all">전체 기구</option>{[...new Set(list.flatMap(e=>e.equipment))].map(id=><option key={id} value={id}>{EQUIPMENT_LABELS[id]||id}</option>)}</select></label>}
  </div>
  <label className="exercise-library-camera-filter"><input type="checkbox" checked={poseOnly} onChange={e=>change(setPoseOnly,e.target.checked)}/><Video size={16}/><span>맨몸 카메라 코칭 지원 운동만 보기</span></label><p className="exercise-library-camera-note">동영상 촬영은 맨몸운동 42종, 실시간 자세 교정은 7종을 지원합니다.</p>
  {selected&&<section ref={stage} className="exercise-library-stage" style={{'--exercise-header-height':`${headerHeight}px`}} aria-label="선택한 운동 시범"><div className="exercise-library-stage-heading"><div><span>{CATEGORY_LABELS[selected.category]} · {equipmentText(selected.equipment)}</span><h3>{selected.name}</h3></div><button type="button" className="btn btn-ghost" aria-label="선택한 운동 시범 닫기" onClick={()=>setSelectedId(null)}><X size={18}/></button></div>{selected.training_type==='bodyweight'&&bodyweightRecordingMotionId(selected.motion_id)&&<div className="exercise-library-stage-action"><Link className="exercise-library-camera-entry" to={`/health/pose?motion=${bodyweightRecordingMotionId(selected.motion_id)}`}><Video size={16}/> {cameraMotionId(selected.motion_id)?'이 동작 촬영·자세 교정':'이 동작 동영상 촬영'} <ArrowUpRight size={15}/></Link></div>}<Suspense fallback={<p className="exercise-library-stage-loading" role="status">동작을 불러오는 중입니다.</p>}><ExerciseMotion key={selected.id} exercise={toExercise(selected)} onReady={scrollToStage}/></Suspense></section>}
  <div className="exercise-library-results"><p role="status"><SlidersHorizontal size={15}/> 조건에 맞는 운동 <strong>{filtered.length}개</strong></p><Link to="/health/profile" aria-label="내 운동 방식·장비 설정하기">운동·장비 설정 <ArrowUpRight size={14}/></Link></div>
  {!filtered.length&&<EmptyState title="조건에 맞는 운동이 없어요" description="검색어 또는 부위·기구 조건을 바꿔 보세요."/>}
  <div className="exercise-library-grid">{filtered.slice(0,limit).map(e=><ExerciseCard key={e.id} exercise={toExercise(e)} compact selected={selectedId===e.id} onSelect={()=>selectExercise(e.id)}/>)}</div>
  {limit<filtered.length&&<button className="btn btn-secondary btn-block" onClick={()=>setLimit(n=>n+12)}>운동 더 보기 ({filtered.length-limit}개 남음)</button>}
  <p className="exercise-library-footnote">시범은 자세 이해를 위한 애니메이션입니다. 실제 기구의 조절 방법과 안전 장치는 현장에서 확인하세요.</p>
 </Card>;
}
