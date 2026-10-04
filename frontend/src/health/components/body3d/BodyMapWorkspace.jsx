import React,{useMemo,useState} from 'react';
import {Link} from 'react-router-dom';
import BodyScene from './BodyScene.jsx';
import BodyTools from './BodyTools.jsx';
import SegmentDetailPanel from './SegmentDetailPanel.jsx';
import ReferenceSource,{cohortLabel} from './ReferenceSource.jsx';
import ExercisePreview from '../exercise/ExercisePreview.jsx';
import {colorsForMode,SEGMENT_LABEL_KO,STATUS_COLORS} from '../../lib/bodyMapColors.js';
import {valuesFor,referenceValues,comparisonRows,signed,MODEL_NOTICE} from './overlayMath.js';

const MODES=[['my','My Body · 내 몸'],['average','Average Compare · 기준 비교'],['previous','Previous Compare · 이전 비교'],['balance','Left / Right · 좌우'],['range','Range View · 참고 범위']];
export default function BodyMapWorkspace({comparisonData,height=480,defaultMode='average',routine,onGroupChange}){
 const [mode,setMode]=useState(defaultMode==='reference'?'average':defaultMode),[metric,setMetric]=useState('lean');
 const [layer,setLayer]=useState('body'),[slice,setSlice]=useState({enabled:false,axis:'horizontal',position:0});
 const [selected,setSelected]=useState(null),[hovered,setHovered]=useState(null),[details,setDetails]=useState(false);
 const [groupError,setGroupError]=useState(''),[groupBusy,setGroupBusy]=useState(false);
 const [groupId,setGroupId]=useState(()=>comparisonData?.average_comparison?.selection_mode==='manual'?comparisonData.average_comparison.selected_group_id:'auto'),[pair,setPair]=useState('current-average'),[highlight,setHighlight]=useState(false);
 const [options,setOptions]=useState({showMy:true,showReference:true,myOpacity:.86,referenceOpacity:.40,myStyle:'surface',referenceStyle:'wireframe',interpolate:false,mix:0});
 const change=(key,value)=>setOptions(old=>({...old,[key]:value}));
 const groups=comparisonData?.average_comparison?.groups||[];
 const group=groups.find(g=>g.id===(groupId==='auto'?comparisonData?.average_comparison?.selected_group_id:groupId));
 const current=comparisonData?.measurement,previous=comparisonData?.previous_measurement;
 const aMeasurement=mode==='average'&&pair==='previous-average'?previous:current;
 const a=useMemo(()=>valuesFor(aMeasurement,metric),[aMeasurement,metric]);
 const b=useMemo(()=>mode==='previous'?valuesFor(previous,metric):referenceValues(group,metric),[mode,previous,group,metric]);
 const rows=useMemo(()=>comparisonRows(a,b),[a,b]);
 const hasComparison=rows.some(r=>r.difference_kg!=null);
 const comparisonMode=mode==='average'||mode==='previous';
 const overlay=comparisonMode&&hasComparison?{myValues:a,referenceValues:b,metric,options}:null;
 const row=rows.find(r=>r.segment===(hovered||selected));
 const selectedRow=rows.find(r=>r.segment===selected);
 const referenceLabel=mode==='previous'?'이전 측정':'비교군 평균';
 const label=metric==='fat'?'체지방량':'부위 제지방량';
 const select=segment=>{setSelected(segment);setDetails(false);};
 const sorted=highlight?[...rows].sort((x,y)=>Math.abs(y.difference_percent??0)-Math.abs(x.difference_percent??0)):rows;
 const canInterpolate=rows.every(r=>r.user_value!=null&&r.reference_value!=null);
 const total=group?.totals?.[metric==='fat'?'body_fat_mass':'skeletal_muscle_mass'];
 const recommended=(routine?.needs_review?[]:routine?.exercises||[]).filter(ex=>{
  if(!selected)return false;const regions=(ex.target_regions||[]).join(' ');
  return regions.includes(SEGMENT_LABEL_KO[selected])||(selected.includes('LEG')&&/하체|다리|둔근/.test(regions))||(selected.includes('ARM')&&/팔|상체/.test(regions))||(selected==='TRUNK'&&/몸통|코어/.test(regions));
 }).filter((ex,i,arr)=>arr.findIndex(v=>v.motion_id===ex.motion_id)===i).slice(0,3);
 return <section className="comparison-workspace" aria-label="신체 비교">
  <nav className="compare-tabs" aria-label="3D 비교 모드">{MODES.map(([id,name])=><button key={id} aria-pressed={mode===id} className={`btn ${mode===id?'btn-primary':'btn-ghost'}`} onClick={()=>{setMode(id);setHovered(null);change('interpolate',false);}}>{name}</button>)}</nav>
  <div className="motion-controls" aria-label="측정 항목">{[['lean','Muscle · 제지방'],['fat','Fat · 체지방']].map(([id,name])=><button key={id} className="btn btn-secondary" aria-pressed={metric===id} onClick={()=>setMetric(id)}>{name}</button>)}</div>
  {mode==='average'&&<>
   <div className="compare-summary"><span>{pair==='previous-average'?'이전 측정':'현재 측정'} · {aMeasurement?.measurement_date||'측정 없음'}</span><h3>{metric==='fat'?'전체 체지방량':'전체 골격근량'}</h3><strong>{aMeasurement?.[metric==='fat'?'body_fat_mass':'skeletal_muscle_mass']??'—'} kg</strong><span>평균 {total?.reference_value??'—'} kg</span>{pair==='current-average'&&total?.difference_kg!=null&&<b>{signed(total.difference_kg)} kg · {signed(total.difference_percent)}%</b>}</div>
   <p className="muted">부위 제지방량에는 근육 외 조직도 포함됩니다. 부위 합계로 전체 골격근량을 추정하지 않습니다.</p>
   {group&&<p className={group.metadata.demo?'motion-cautions':'muted'}>{group.metadata.demo?'DEMO · 시연용 예시 비교군 · 실제 인구 평균 아님':'선택된 비교 기준'}: {cohortLabel(group.metadata)}</p>}
   <details className="compare-settings"><summary>비교군 및 이전·현재 선택</summary>
    {groups.length>0&&<label>비교 기준<select value={groupId} disabled={groupBusy} onChange={async e=>{const value=e.target.value;setGroupError('');setGroupBusy(true);try{await onGroupChange?.(value==='auto'?null:value);setGroupId(value);}catch(error){setGroupError(error.message);}finally{setGroupBusy(false);}}}><option value="auto">자동 추천</option>{groups.map(g=><option key={g.id} value={g.id}>{cohortLabel(g.metadata)} · {g.metadata.dataset_id||g.metadata.reference_source}</option>)}</select></label>}
    <label>비교할 측정<select value={pair} onChange={e=>setPair(e.target.value)}><option value="current-average">현재 / 평균</option>{previous&&<option value="previous-average">이전 / 평균 (현재 선택 기준)</option>}</select></label>
   </details>{groupError&&<p role="alert">{groupError}</p>}
  </>}
  {comparisonMode&&!hasComparison&&<p role="status" className="comparison-empty">{mode==='previous'?'비교 가능한 이전 측정이 없습니다.':'현재 조건에 맞는 비교군 데이터가 충분하지 않습니다.'} 내 신체 모델과 측정값은 계속 확인할 수 있습니다.</p>}
  {overlay&&<>
   <div className="overlay-legend" aria-label="레이어 범례"><span>━ MY BODY · 파란 표면 · {pair==='previous-average'&&mode==='average'?'이전':'현재'}</span><span>▱ {referenceLabel} · 회색 격자</span></div>
   <details className="compare-settings"><summary>레이어 · 투명도 · 겹쳐보기 설정</summary><div className="overlay-controls">
    <label><input type="checkbox" checked={options.showMy} onChange={e=>change('showMy',e.target.checked)}/> 내 {metric==='fat'?'체지방':'제지방'}</label>
    <label><input type="checkbox" checked={options.showReference} onChange={e=>change('showReference',e.target.checked)}/> {referenceLabel}</label>
    {[['myOpacity','내 표면 투명도'],['referenceOpacity','비교 표면 투명도']].map(([key,title])=><label key={key}>{title} {Math.round(options[key]*100)}%<input aria-label={title} type="range" min="0.05" max="1" step=".05" value={options[key]} onChange={e=>change(key,Number(e.target.value))}/></label>)}
    {[['myStyle','내 표현'],['referenceStyle','비교 표현']].map(([key,title])=><label key={key}>{title}<select value={options[key]} onChange={e=>change(key,e.target.value)}><option value="surface">Surface · 반투명 표면</option><option value="wireframe">Ghost · 격자선</option></select></label>)}
    <div className="motion-controls">{[['겹쳐보기',true,true],['내 몸만',true,false],['평균만',false,true]].map(([title,showMy,showReference])=><button className="btn btn-secondary" key={title} onClick={()=>setOptions(o=>({...o,showMy,showReference,interpolate:false}))}>{title==='평균만'&&mode==='previous'?'이전만':title}</button>)}</div>
    <label><input type="checkbox" checked={options.interpolate} disabled={!canInterpolate} onChange={e=>change('interpolate',e.target.checked)}/> My Body → {referenceLabel} 보간</label>
    {options.interpolate&&<label>표면 전환 {Math.round(options.mix*100)}%<input aria-label="표면 전환" type="range" min="0" max="1" step=".01" value={options.mix} onChange={e=>change('mix',Number(e.target.value))}/></label>}
    <p className="muted">보간은 두 데이터 사이의 시각적 전환이며 실제 신체 변화가 아닙니다. 격자선·낮은 해상도 렌더링이 기본입니다.</p>
   </div></details>
  </>}
  {!comparisonMode&&<BodyTools {...{layer,setLayer,slice,setSlice}}/>}
  <SceneBoundary><div className="overlay-viewer"><BodyScene performanceMode={slice.enabled?'section_view':options.interpolate?'interpolation':mode==='previous'?'previous_compare':mode==='average'?(options.referenceStyle==='wireframe'?'wireframe':'average_overlay'):'my_body'} measurement={aMeasurement||current} profile={comparisonData?.body_profile} gender={comparisonData?.body_profile?.gender||'unspecified'} height={height} layer={layer} slice={slice}
    segmentColors={mode==='range'?colorsForMode(comparisonData,'reference'):mode==='balance'?colorsForMode(comparisonData,'balance'):{}} overlay={overlay} selectedSegment={hovered||selected||(highlight?sorted[0]?.segment:null)} onSelect={select} onHover={setHovered}/>
   {comparisonMode&&row&&<div className="overlay-tooltip" role="status"><strong>{SEGMENT_LABEL_KO[row.segment]}</strong><span>You {row.user_value??'—'} kg · {referenceLabel} {row.reference_value??'—'} kg</span><span>{signed(row.difference_kg)} kg · {signed(row.difference_percent)}%</span></div>}
  </div></SceneBoundary>
  {mode==='range'&&<div className="overlay-legend">{[['within','기준 범위'],['above','기준보다 높음'],['below','기준보다 낮음'],['far_below','큰 차이']].map(([s,t])=><span key={s}><i style={{background:STATUS_COLORS[s]}}/>{t}</span>)}</div>}
  <p className="muted">{MODEL_NOTICE}</p>
  <p className="muted">{label}을 기반으로 한 시각적 근사 표현입니다. 개별 근육의 실제 질량·모양이나 건강 상태를 뜻하지 않습니다. 표시 형상은 제한된 변형 범위를 사용하므로 정확한 차이는 kg·%로 확인하세요.</p>
  <div className="compare-region-buttons" aria-label="비교 부위 선택">{rows.map(r=><button key={r.segment} className={`btn ${selected===r.segment?'btn-primary':'btn-ghost'}`} aria-pressed={selected===r.segment} onClick={()=>select(r.segment)}>{SEGMENT_LABEL_KO[r.segment]}</button>)}</div>
  {comparisonMode&&<>
   <label><input type="checkbox" checked={highlight} onChange={e=>setHighlight(e.target.checked)}/> Difference Highlight · 차이가 큰 순서</label>
   <div className="comparison-table-wrap"><table className="comparison-table"><caption>{label} · {mode==='previous'?'현재 − 이전':'선택 측정 − 비교군 평균'}</caption><thead><tr><th>부위</th><th>내 값 kg</th><th>{referenceLabel} kg</th><th>차이 kg</th><th>차이 %</th></tr></thead><tbody>{sorted.map(r=><tr key={r.segment} className={selected===r.segment?'selected':''}><th><button onClick={()=>select(r.segment)}>{SEGMENT_LABEL_KO[r.segment]}</button></th><td>{r.user_value??'—'}</td><td>{r.reference_value??'—'}</td><td>{signed(r.difference_kg,2)}</td><td>{signed(r.difference_percent)}</td></tr>)}</tbody></table></div>
   {selected&&<p>{SEGMENT_LABEL_KO[selected]} {label}: {selectedRow?.difference_kg!=null?`${referenceLabel}보다 ${Math.abs(selectedRow.difference_kg).toFixed(2)}kg ${selectedRow.difference_kg<0?'낮습니다':selectedRow.difference_kg>0?'높습니다':'차이가 없습니다'}.`:'비교 데이터가 없습니다.'} 건강 상태나 근력을 직접 진단하지 않습니다.</p>}
   {mode==='average'&&<ReferenceSource group={group}/>}
  </>}
  {selected&&<section className="segment-exercises"><h3>{SEGMENT_LABEL_KO[selected]} · 내 루틴의 관련 운동</h3>{recommended.length?recommended.map(ex=><div key={ex.motion_id}><ExercisePreview exercise={ex}/><Link to={`/health/routine#${ex.exercise_id}`}>{ex.exercise_name}</Link><p className="muted">{ex.reason}</p></div>):<p className="muted">현재 유효한 루틴에 관련 운동이 없습니다. <Link to="/health/routine">목표·경험·통증을 반영한 루틴 확인</Link></p>}</section>}
  {selected&&<button className="btn btn-ghost" onClick={()=>setDetails(true)}>원본 측정값 · 상세 보기</button>}
  <SegmentDetailPanel segment={details?selected:null} comparisonData={comparisonData} onClose={()=>setDetails(false)}/>
 </section>;
}
class SceneBoundary extends React.Component{
 constructor(p){super(p);this.state={failed:false};}
 static getDerivedStateFromError(){return {failed:true};}
 render(){return this.state.failed?<p role="alert">비교 모델을 생성할 수 없습니다. 아래 수치 비교는 계속 이용할 수 있습니다.</p>:this.props.children;}
}
