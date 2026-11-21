import React,{useMemo,useState} from 'react';
import {HealthAPI} from '../../shared/lib/api.js';
import {Card,ErrorState,Skeleton} from '../../shared/components/ui.jsx';
import {useApiData} from '../lib/useApiData.js';
import {workoutSummary} from '../lib/workoutProgress.js';
import {personalRecords,regionWeeklySets,measurementTrainingLink,E1RM_MAX_REPS} from '../lib/trainingInsights.js';
import {SEGMENT_LABEL_KO} from '../lib/bodyMapColors.js';
export default function TrainingProgress({measurement}={}){
 const {data,loading,error,reload}=useApiData(()=>HealthAPI.listWorkouts(),[]),[selected,setSelected]=useState('');
 const summary=useMemo(()=>workoutSummary(data||[]),[data]);
 const records=useMemo(()=>personalRecords(data||[]),[data]);
 const volume=useMemo(()=>regionWeeklySets(data||[]),[data]);
 const link=useMemo(()=>measurementTrainingLink(measurement,volume),[measurement,volume]);
 if(loading)return <Skeleton/>;if(error)return <ErrorState message={error.message} onRetry={reload}/>;
 const exercise=summary.exercises.find(e=>e.key===selected)||summary.exercises[0];
 const sessions=exercise?.sessions||[],first=sessions[0],last=sessions.at(-1);
 return <><Card title="운동 성장 기록"><p>최근 8주 · 월요일 시작 · 이번 주는 진행 중입니다. 세트 기록이 있는 경우 준비 세트를 제외합니다.</p>
 <div className="data-table-wrap"><table><caption>주간 활동과 기록된 외부 중량 운동량</caption><thead><tr><th>주 시작</th><th>활동 일수</th><th>목표 완료 기록이 있는 날</th><th>본 세트</th><th>중량×횟수</th></tr></thead><tbody>{summary.weeks.map(w=><tr key={w.date}><td>{w.date}</td><td>{w.days}일</td><td>{w.completedDays}일</td><td>{w.sets}</td><td>{w.loadedSets?`${Math.round(w.volume*10)/10} kg·회`:'중량 미기록'}</td></tr>)}</tbody></table></div>
 <p className="muted">입력한 외부 중량만 합산합니다. 맨몸 부하·한쪽 덤벨의 양측 환산은 추정하지 않으며, 서로 다른 기구의 수치를 근력으로 비교하지 않습니다. 중단 전 수행한 세트도 포함합니다.</p>
 {exercise?<><label>운동별 변화<select className="text-input" value={exercise.key} onChange={e=>setSelected(e.target.value)}>{summary.exercises.map(e=><option key={e.key} value={e.key}>{e.name}</option>)}</select></label>
 {sessions.length>=2&&<p>첫 기록 → 최근 기록: 최고 입력 중량 {first.max??'미기록'} → {last.max??'미기록'} kg · 총 반복 {first.reps} → {last.reps}회</p>}
 <div className="data-table-wrap"><table><caption>{exercise.name} · 최근 12개 기록</caption><thead><tr><th>날짜</th><th>본 세트</th><th>총 반복</th><th>최고 중량 kg</th><th>중량×횟수</th></tr></thead><tbody>{sessions.slice(-12).map((s,i)=><tr key={s.date+i}><td>{s.date}</td><td>{s.sets}</td><td>{s.reps}</td><td>{s.max??'미기록'}</td><td>{s.volume==null?'미기록':Math.round(s.volume*10)/10}</td></tr>)}</tbody></table></div>
 <p>{sessions.some(s=>s.pain>0)?'통증이 포함된 기록이 있습니다. 수치 상승만으로 증량하지 마세요.':'동일한 기구·중량 기준·가동범위에서 기록을 비교하세요. 기록만으로 정체나 운동 효과를 판정하지 않습니다.'}</p></>:<p>운동 기록에서 세트별 중량·횟수를 입력하면 운동별 변화가 나타납니다.</p>}</Card>
 <PersonalRecords records={records}/>
 <MeasurementLink link={link} volume={volume}/></>;
}

function PersonalRecords({records}){
 return <Card title="개인 최고 기록">{records.length?<><div className="data-table-wrap"><table><caption>운동별 최고 입력 기록 · 통증 기록 제외</caption><thead><tr><th>운동</th><th>최고 중량</th><th>추정 1RM</th><th>맨몸 최고 횟수</th></tr></thead><tbody>{records.map(r=><tr key={r.key}><td>{r.name}{r.recent&&<strong className="pr-badge"> · 최근 갱신</strong>}</td><td>{r.heaviest?`${r.heaviest.weight_kg} kg × ${r.heaviest.reps}회 (${r.heaviest.date})`:'—'}</td><td>{r.e1rm?`${r.e1rm.value} kg`:'—'}</td><td>{r.reps?`${r.reps.reps}회 (${r.reps.date})`:'—'}</td></tr>)}</tbody></table></div>
 <p className="muted">추정 1RM은 Epley 공식(중량×(1+횟수/30))으로 {E1RM_MAX_REPS}회 이하 세트에서만 계산한 참고값입니다. 실제 1회 최대 중량 측정을 권장하지 않으며, 다른 기구·가동범위의 기록과 비교하지 마세요.</p></>
 :<p>세트별 횟수(와 중량)를 기록하면 운동별 최고 기록이 표시됩니다.</p>}</Card>;
}

function MeasurementLink({link,volume}){
 return <Card title="측정 결과 ↔ 실제 훈련량"><p>최근 측정의 부위별 근육 기준 대비(%)와 지난 4주+이번 주에 기록한 본 세트 수를 함께 봅니다.</p>
 {link.status==='no_segments'||link.status==='no_reference'?<p>부위별 근육 분석 값과 기준 대비(%)를 입력하면 측정 결과와 훈련량을 연결해 보여드립니다.</p>
 :<div className="data-table-wrap"><table><caption>{link.date} 측정 기준</caption><thead><tr><th>부위</th><th>측정 최저 기준 대비</th><th>이번 주 세트</th><th>이전 4주 주평균</th><th>훈련 비중</th><th>확인</th></tr></thead><tbody>{link.regions.map(r=>{const v=volume.find(x=>x.region===r.region);return <tr key={r.region}><td>{r.region}</td><td>{r.percent}% ({SEGMENT_LABEL_KO[r.segment]||r.segment})</td><td>{v.current}</td><td>{v.average}</td><td>{r.share}%</td><td>{r.advice}</td></tr>;})}</tbody></table></div>}
 {link.status==='no_training'&&<p>최근 5주간 세트 기록이 없어 훈련 비중을 계산하지 않았습니다.</p>}
 {link.regions?.some(r=>r.advice==='훈련 비중 확인')&&<p role="status">기준 대비 90% 미만 부위의 훈련 비중이 30% 미만입니다. 루틴 화면에서 해당 부위 운동이 포함되어 있는지 확인하세요. 통증이 있으면 늘리지 말고 상담하세요.</p>}
 <p className="muted">전신 운동은 모든 부위에 1세트씩 포함합니다. 기기 기준값은 데모·장비별 기준일 수 있으며 진단이 아닙니다. 세트 수는 운동 효과를 보장하지 않습니다.</p></Card>;
}
