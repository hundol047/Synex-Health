import React,{useMemo,useState} from 'react';
import {HealthAPI} from '../../shared/lib/api.js';
import {Card,ErrorState,Skeleton} from '../../shared/components/ui.jsx';
import {useApiData} from '../lib/useApiData.js';
import {workoutSummary} from '../lib/workoutProgress.js';
export default function TrainingProgress(){
 const {data,loading,error,reload}=useApiData(()=>HealthAPI.listWorkouts(),[]),[selected,setSelected]=useState('');
 const summary=useMemo(()=>workoutSummary(data||[]),[data]);
 if(loading)return <Skeleton/>;if(error)return <ErrorState message={error.message} onRetry={reload}/>;
 const exercise=summary.exercises.find(e=>e.key===selected)||summary.exercises[0];
 const sessions=exercise?.sessions||[],first=sessions[0],last=sessions.at(-1);
 return <Card title="운동 성장 기록"><p>최근 8주 · 월요일 시작 · 이번 주는 진행 중입니다. 세트 기록이 있는 경우 준비 세트를 제외합니다.</p>
 <div className="data-table-wrap"><table><caption>주간 활동과 기록된 외부 중량 운동량</caption><thead><tr><th>주 시작</th><th>활동 일수</th><th>목표 완료 기록이 있는 날</th><th>본 세트</th><th>중량×횟수</th></tr></thead><tbody>{summary.weeks.map(w=><tr key={w.date}><td>{w.date}</td><td>{w.days}일</td><td>{w.completedDays}일</td><td>{w.sets}</td><td>{w.loadedSets?`${Math.round(w.volume*10)/10} kg·회`:'중량 미기록'}</td></tr>)}</tbody></table></div>
 <p className="muted">입력한 외부 중량만 합산합니다. 맨몸 부하·한쪽 덤벨의 양측 환산은 추정하지 않으며, 서로 다른 기구의 수치를 근력으로 비교하지 않습니다. 중단 전 수행한 세트도 포함합니다.</p>
 {exercise?<><label>운동별 변화<select className="text-input" value={exercise.key} onChange={e=>setSelected(e.target.value)}>{summary.exercises.map(e=><option key={e.key} value={e.key}>{e.name}</option>)}</select></label>
 {sessions.length>=2&&<p>첫 기록 → 최근 기록: 최고 입력 중량 {first.max??'미기록'} → {last.max??'미기록'} kg · 총 반복 {first.reps} → {last.reps}회</p>}
 <div className="data-table-wrap"><table><caption>{exercise.name} · 최근 12개 기록</caption><thead><tr><th>날짜</th><th>본 세트</th><th>총 반복</th><th>최고 중량 kg</th><th>중량×횟수</th></tr></thead><tbody>{sessions.slice(-12).map((s,i)=><tr key={s.date+i}><td>{s.date}</td><td>{s.sets}</td><td>{s.reps}</td><td>{s.max??'미기록'}</td><td>{s.volume==null?'미기록':Math.round(s.volume*10)/10}</td></tr>)}</tbody></table></div>
 <p>{sessions.some(s=>s.pain>0)?'통증이 포함된 기록이 있습니다. 수치 상승만으로 증량하지 마세요.':'동일한 기구·중량 기준·가동범위에서 기록을 비교하세요. 기록만으로 정체나 운동 효과를 판정하지 않습니다.'}</p></>:<p>운동 기록에서 세트별 중량·횟수를 입력하면 운동별 변화가 나타납니다.</p>}</Card>;
}
