import React,{useMemo,useState} from 'react';
import {HealthAPI} from '../../shared/lib/api.js';
import {Card,ErrorState,Skeleton,StatTile} from '../../shared/components/ui.jsx';
import {useApiData} from '../lib/useApiData.js';
import {workoutSummary} from '../lib/workoutProgress.js';
import {personalRecords,regionWeeklySets,measurementTrainingLink,E1RM_MAX_REPS} from '../lib/trainingInsights.js';
import {SEGMENT_LABEL_KO} from '../lib/bodyMapColors.js';

const kgReps=v=>`${Math.round(v*10)/10} kg·회`;

export default function TrainingProgress({measurement}={}){
 const {data,loading,error,reload}=useApiData(()=>HealthAPI.listWorkouts(),[]),[selected,setSelected]=useState('');
 const summary=useMemo(()=>workoutSummary(data||[]),[data]);
 const records=useMemo(()=>personalRecords(data||[]),[data]);
 const volume=useMemo(()=>regionWeeklySets(data||[]),[data]);
 const link=useMemo(()=>measurementTrainingLink(measurement,volume),[measurement,volume]);
 if(loading)return <Skeleton/>;if(error)return <ErrorState message={error.message} onRetry={reload}/>;
 const exercise=summary.exercises.find(e=>e.key===selected)||summary.exercises[0];
 const sessions=exercise?.sessions||[],first=sessions[0],last=sessions.at(-1);
 const thisWeek=summary.weeks.at(-1),lastWeek=summary.weeks.at(-2);
 const anyActivity=summary.weeks.some(w=>w.days||w.sets);
 return <><Card title="운동 성장 기록">
 {anyActivity?<div className="stat-grid">
  <StatTile label="이번 주 운동한 날" value={thisWeek.days} unit="일" delta={thisWeek.days-lastWeek.days} deltaLabel="지난주 대비"/>
  <StatTile label="이번 주 본 세트" value={thisWeek.sets} unit="세트" delta={thisWeek.sets-lastWeek.sets} deltaLabel="지난주 대비"/>
  <StatTile label="이번 주 중량×횟수" value={thisWeek.loadedSets?Math.round(thisWeek.volume):null} unit=" kg·회"/>
  <StatTile label="최근 갱신한 기록" value={records.filter(r=>r.recent).length} unit="개"/>
 </div>:<p>운동을 기록하면 이번 주 운동한 날과 세트 수가 여기에 바로 보여요.</p>}
 <details className="simple-details"><summary>주별 기록 자세히 보기</summary>
 <p className="muted">최근 8주 · 월요일 시작 · 이번 주는 진행 중입니다. 세트 기록이 있으면 준비 세트를 제외합니다.</p>
 <div className="data-table-wrap"><table><caption>주간 활동과 기록된 외부 중량 운동량</caption><thead><tr><th>주 시작</th><th>활동 일수</th><th>목표 완료 기록이 있는 날</th><th>본 세트</th><th>중량×횟수</th></tr></thead><tbody>{summary.weeks.map(w=><tr key={w.date}><td>{w.date}</td><td>{w.days}일</td><td>{w.completedDays}일</td><td>{w.sets}</td><td>{w.loadedSets?kgReps(w.volume):'중량 미기록'}</td></tr>)}</tbody></table></div>
 <p className="muted">입력한 외부 중량만 합산합니다. 맨몸 부하·한쪽 덤벨의 양측 환산은 추정하지 않으며, 서로 다른 기구의 수치를 근력으로 비교하지 않습니다. 중단 전 수행한 세트도 포함합니다.</p></details>
 {exercise?<details className="simple-details"><summary>운동별 변화 보기</summary><label>운동 선택<select className="text-input" value={exercise.key} onChange={e=>setSelected(e.target.value)}>{summary.exercises.map(e=><option key={e.key} value={e.key}>{e.name}</option>)}</select></label>
 {sessions.length>=2&&<p>첫 기록 → 최근 기록: 최고 입력 중량 {first.max??'미기록'} → {last.max??'미기록'} kg · 총 반복 {first.reps} → {last.reps}회</p>}
 <div className="data-table-wrap"><table><caption>{exercise.name} · 최근 12개 기록</caption><thead><tr><th>날짜</th><th>본 세트</th><th>총 반복</th><th>최고 중량 kg</th><th>중량×횟수</th></tr></thead><tbody>{sessions.slice(-12).map((s,i)=><tr key={s.date+i}><td>{s.date}</td><td>{s.sets}</td><td>{s.reps}</td><td>{s.max??'미기록'}</td><td>{s.volume==null?'미기록':Math.round(s.volume*10)/10}</td></tr>)}</tbody></table></div>
 <p className="muted">{sessions.some(s=>s.pain>0)?'통증이 포함된 기록이 있습니다. 수치 상승만으로 증량하지 마세요.':'동일한 기구·중량 기준·가동범위에서 기록을 비교하세요. 기록만으로 정체나 운동 효과를 판정하지 않습니다.'}</p></details>
 :anyActivity&&<p className="muted">운동 기록에서 세트별 중량·횟수를 입력하면 운동별 변화가 나타납니다.</p>}</Card>
 <PersonalRecords records={records}/>
 <MeasurementLink link={link} volume={volume}/></>;
}

function PersonalRecords({records}){
 return <Card title="개인 최고 기록">{records.length?<><ul className="record-list" aria-label="운동별 최고 입력 기록 · 통증 기록 제외">{records.map(r=><li key={r.key}>
  <div className="record-name">{r.name}{r.recent&&<span className="badge badge-blue">최근 갱신</span>}</div>
  <div className="record-values">
   {r.heaviest&&<span>최고 <strong>{r.heaviest.weight_kg} kg × {r.heaviest.reps}회</strong> <small>{r.heaviest.date}</small></span>}
   {r.e1rm&&<span>추정 1RM <strong>{r.e1rm.value} kg</strong></span>}
   {r.reps&&<span>맨몸 최고 <strong>{r.reps.reps}회</strong> <small>{r.reps.date}</small></span>}
  </div></li>)}</ul>
 <details className="simple-details"><summary>추정 1RM이란?</summary><p className="muted">한 번에 들 수 있는 최대 중량을 Epley 공식(중량×(1+횟수/30))으로 짐작한 참고값입니다. {E1RM_MAX_REPS}회 이하로 수행한 세트에서만 계산하고 통증이 기록된 세트는 뺍니다. 실제로 최대 중량을 들어 확인하지 마시고, 다른 기구·가동범위의 기록과 비교하지 마세요.</p></details></>
 :<p>운동을 기록할 때 횟수(와 중량)를 적으면 운동별 최고 기록이 자동으로 모여요.</p>}</Card>;
}

const ADVICE_TONE={'훈련 비중 확인':'warning','진행 중':'blue','유지':'success','기록 없음':'demo'};
function MeasurementLink({link,volume}){
 const needsSegments=link.status==='no_segments'||link.status==='no_reference';
 return <Card title="측정 결과 ↔ 실제 훈련량">
 {needsSegments?<p>체성분 입력에서 ‘팔·다리 근육 분석’의 기준 대비(%)를 넣으면, 부족한 부위를 실제로 얼마나 운동했는지 함께 보여드려요.</p>
 :<><p className="muted">{link.date} 측정 · 최근 5주 운동 기록 기준</p><ul className="region-link-list">{link.regions.map(r=>{const v=volume.find(x=>x.region===r.region);return <li key={r.region}>
  <div className="region-link-head"><strong>{r.region}</strong><span className={`badge badge-${ADVICE_TONE[r.advice]||'blue'}`}>{r.advice}</span></div>
  <div className="region-link-meta">근육 기준 대비 {r.percent}% ({SEGMENT_LABEL_KO[r.segment]||r.segment}) · 이번 주 {v.current}세트 · 주평균 {v.average}세트</div>
  <div className="share-bar" role="img" aria-label={`훈련 비중 ${r.share}%`}><span style={{width:`${Math.min(100,r.share)}%`}}/></div>
 </li>;})}</ul></>}
 {link.status==='no_training'&&<p>최근 5주간 세트 기록이 없어 훈련 비중을 계산하지 않았어요.</p>}
 {link.regions?.some(r=>r.advice==='훈련 비중 확인')&&<p role="status" className="motion-cautions">기준 대비 90% 미만인 부위의 운동 비중이 30%보다 낮아요. 루틴에 해당 부위 운동이 있는지 확인해 보세요. 통증이 있으면 늘리지 말고 상담하세요.</p>}
 <details className="simple-details"><summary>어떻게 계산하나요?</summary><p className="muted">부위마다 가장 낮은 측정값(예: 왼팔·오른팔 중 낮은 쪽)을 씁니다. 전신 운동은 모든 부위에 세트를 더합니다. 기기 기준값은 장비마다 다를 수 있으며 진단이 아닙니다. 세트 수가 운동 효과를 보장하지는 않습니다.</p></details></Card>;
}
