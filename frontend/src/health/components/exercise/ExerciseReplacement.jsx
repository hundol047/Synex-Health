import {LOCAL_ONLY} from '../../../shared/lib/localMode.js';
import React,{useState} from 'react';
import {HealthAPI} from '../../../shared/lib/api.js';
import {equipmentText} from '../../lib/exerciseLabels.js';
export default function ExerciseReplacement({routine,exercise,onReplaced}){
 const [options,setOptions]=useState(null),[chosen,setChosen]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function load(){setBusy(true);setError('');try{setOptions(await HealthAPI.exerciseAlternatives(routine.id,exercise.exercise_id));}catch(e){setError(e.message);}finally{setBusy(false);}}
 async function replace(){setBusy(true);setError('');try{await HealthAPI.replaceExercise(routine.id,exercise.exercise_id,chosen);await onReplaced();}catch(e){setError(e.message);}finally{setBusy(false);}}
 if(LOCAL_ONLY)return <p className="muted">운동을 바꾸려면 프로필의 장소·기구를 수정하고 계획을 다시 만드세요.</p>;
 return <div><button type="button" className="btn btn-secondary" disabled={busy} onClick={load}>이 운동 교체하기</button>
 {options&&<div><p>장비·장소·제약에 맞는 같은 움직임의 쉬운 동작입니다. 교체하면 새 루틴으로 저장되며 이전 기록은 보존됩니다. 통증이 있다면 교체로 계속하지 말고 중단하세요.</p>
 {options.length?<><label>대체 운동<select className="text-input" value={chosen} onChange={e=>setChosen(e.target.value)}><option value="">선택하세요</option>{options.map(o=><option key={o.id} value={o.id}>{o.name} · {equipmentText(o.equipment)}</option>)}</select></label><button type="button" className="btn btn-primary" disabled={busy||!chosen} onClick={replace}>{busy?'저장 중…':'선택한 운동으로 교체'}</button></>:<p>현재 조건에 맞는 대체 운동이 없습니다. 장비 설정을 확인하세요.</p>}</div>}
 {error&&<p role="alert">{error}</p>}</div>;
}
