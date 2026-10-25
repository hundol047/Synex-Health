import React,{useMemo,useState,useRef,useLayoutEffect} from 'react';
import './mannequin.css';
import {Link} from 'react-router-dom';
import BodyScene from './BodyScene.jsx';
import {BODY_FOCUS_AREAS} from './mannequinFocus.js';
import {publishedMuscleReference,ageAt} from '../../lib/publishedMuscleReference.js';
import {referenceMannequinMeasurement,GIRTH_FIELDS} from './mannequinMath.js';
import {signed} from './overlayMath.js';
import MuscleComparisonReadout,{COMPARISON_OPACITY} from './MuscleComparisonReadout.jsx';
import SegmentComparisonReadout from './SegmentComparisonReadout.jsx';
const format=v=>Number.isFinite(v)?Number(v.toFixed(1)):'—';
export default function CompositionMannequin({comparisonData,height=540}){
 const m=comparisonData?.measurement,profile=comparisonData?.body_profile||{};
 const [display,setDisplay]=useState('overlap'),[selected,setSelected]=useState(null),[focusRegion,setFocusRegion]=useState('whole'),[focusRevision,setFocusRevision]=useState(0);
 const sceneElement=useRef(null),readoutElement=useRef(null);
 useLayoutEffect(()=>{
  const card=readoutElement.current,viewer=sceneElement.current;if(!card||!viewer||!selected)return;
  const measure=()=>viewer.style.setProperty('--comparison-card-height',`${card.getBoundingClientRect().height}px`);
  measure();const observer=new ResizeObserver(measure);observer.observe(card);return()=>observer.disconnect();
 },[selected]);
 function selectSurface(segment){
  const area=BODY_FOCUS_AREAS.find(a=>a.segment===segment&&segment!=='TRUNK');
  if(area)focusArea(area);else{setSelected(segment);setFocusRegion('whole');setFocusRevision(v=>v+1);scrollToComparison();}
 }
 function scrollToComparison(){requestAnimationFrame(()=>{const element=sceneElement.current;if(!element)return;const box=element.getBoundingClientRect();if(box.bottom>window.innerHeight-80||box.top<0)element.scrollIntoView({block:'center',behavior:'auto'});});}
 function focusArea(area){
  setFocusRegion(area.id);setSelected(area.segment);setFocusRevision(v=>v+1);
  scrollToComparison();
 }
 const [myOpacity,setMyOpacity]=useState(COMPARISON_OPACITY.myOpacity),[referenceOpacity,setReferenceOpacity]=useState(COMPARISON_OPACITY.referenceOpacity),[skeleton,setSkeleton]=useState(false),[referenceWireframe,setReferenceWireframe]=useState(false),[referenceContour,setReferenceContour]=useState(true);
 const reference=useMemo(()=>publishedMuscleReference(m,profile),[m,profile]);
 const refMeasurement=useMemo(()=>reference.available&&reference.canOverlay?referenceMannequinMeasurement(m,reference.value):null,[m,reference.available,reference.canOverlay,reference.value]);
 const options={showMy:display!=='reference'||!refMeasurement,showReference:display!=='my',layout:display==='side-by-side'?'side-by-side':'overlap',myOpacity,referenceOpacity,skeleton,referenceWireframe,referenceContour};
 const mannequin=useMemo(()=>({referenceMeasurement:refMeasurement,options}),[refMeasurement,display,myOpacity,referenceOpacity,skeleton,referenceWireframe,referenceContour]);
 const missing=[['height','키'],['weight','체중'],['body_fat_percentage','체지방률'],['skeletal_muscle_mass','골격근량']].filter(([k])=>!Number.isFinite(k==='height'?m?.height||profile.height_cm:m?.[k])).map(([,label])=>label);
 const referenceMissing=[...(!['male','female'].includes(profile.gender)?['성별']:[]),...(ageAt(profile.birth_date,m?.measurement_date)==null?['생년월일']:[]),...missing];
 const age=ageAt(profile.birth_date,m?.measurement_date),outsideStudyAge=age!=null&&(age<18||age>88),referenceNeedsInput=referenceMissing.length>0&&!outsideStudyAge;
 if(!m)return <p>인바디 결과지의 수치를 입력하면 내 마네킹이 만들어집니다. <Link to="/health/profile">측정값 입력하기</Link></p>;
 return <div className="composition-mannequin" aria-label="내 체성분 마네킹">
  <div className="mannequin-heading"><div><span className="mannequin-eyebrow">MY BODY</span><h3>수치로 그린 내 몸</h3><p className="muted">{m.measurement_date} 측정 · 반투명 3D</p></div><Link className="btn btn-secondary" to="/health/profile">인바디 수치 입력</Link></div>
  <div className="mannequin-stats">{[['키',m.height||profile.height_cm,'cm'],['체중',m.weight,'kg'],['체지방률',m.body_fat_percentage,'%'],['골격근량',m.skeletal_muscle_mass,'kg'],...(Number.isFinite(m.bone_mass)?[['추정 골량',m.bone_mass,'kg']]:[]),...(Number.isFinite(m.mineral_mass)?[['무기질량',m.mineral_mass,'kg']]:[])].map(([name,value,unit])=><div key={name}><span>{name}</span><strong>{format(value)} <small>{unit}</small></strong></div>)}</div>
  {missing.length>0&&<p role="status" className="mannequin-note">{missing.join('·')} 미입력: 해당 부분은 기본 형상입니다. <Link to="/health/profile">측정값 보완</Link></p>}
  {!refMeasurement&&<div className="mannequin-reference-setup" role="status"><strong>평균 3D 모형 {referenceNeedsInput?'입력 확인':'표시 조건 확인'}</strong><p>{outsideStudyAge?'이 연구의 대상은 18–88세입니다. 해당 연령 밖에서는 평균 모형을 표시하지 않습니다.':referenceNeedsInput?`${referenceMissing.join(' · ')}을 입력하면 내 몸과 문헌 평균을 겹쳐 비교할 수 있습니다.`:reference.available?reference.overlayReason:reference.reason}</p>{referenceNeedsInput&&<Link className="btn btn-secondary" to="/health/profile">평균 모형에 필요한 정보 입력</Link>}</div>}
  <div className="mannequin-display" aria-label="마네킹 표시 선택">{[['overlap','겹쳐보기'],['side-by-side','나란히 비교'],['my','내 몸만'],['reference','평균 비교 모형']].map(([id,title])=><button className={`btn ${display===id?'btn-primary':'btn-ghost'}`} key={id} aria-pressed={display===id} disabled={['side-by-side','reference'].includes(id)&&!refMeasurement} onClick={()=>setDisplay(id)}>{title}</button>)}</div>
  <div className={`mannequin-legend ${display==='side-by-side'&&refMeasurement?'paired':''}`}>{options.showMy&&<span><i/>내 체성분 · {format(m.skeletal_muscle_mass)} kg</span>}{options.showReference&&refMeasurement&&<span><i className="reference"/>문헌 평균 · {format(reference.value)} kg</span>}</div>
  <MuscleComparisonReadout reference={reference} own={m.skeletal_muscle_mass}/>
  {refMeasurement&&options.showMy&&options.showReference&&<p className="mannequin-comparison-hint">{display==='side-by-side'?'왼쪽은 내 몸, 오른쪽은 문헌 평균 골격근량을 반영한 3D 모형입니다.':'내 몸과 문헌 평균 모형의 키·발 위치를 맞춰 같은 자리에 겹쳤습니다.'} 청록색 반투명 신체는 내 몸, 살구색 반투명 신체는 문헌 평균입니다. 두 신체의 색 면과 입체적인 부피를 겹쳐 비교하세요. 얇은 윤곽선은 경계를 구분하는 보조 표시입니다. {reference.differenceKg===0?'골격근량이 같아 두 신체가 같은 크기로 겹칩니다.':reference.differenceKg>0?'내 몸의 청록색 면이 더 바깥으로 드러나는 부분을 확인하세요.':'평균의 살구색 면이 더 바깥으로 드러나는 부분을 확인하세요.'} {display==='overlap'&&'얼굴과 목은 내 모형 하나로 표시합니다.'}</p>}
  <div className="mannequin-focus-picker" role="group" aria-label="부위 확대 선택">
   <strong>자세히 볼 부위</strong><div>{BODY_FOCUS_AREAS.map(area=><button type="button" key={area.id} className={`btn ${focusRegion===area.id?'btn-primary':'btn-ghost'}`} aria-pressed={focusRegion===area.id} onClick={()=>focusArea(area)}>{area.label}</button>)}</div>
   <p aria-live="polite">{focusRegion==='whole'?'부위를 누르면 해당 부위를 크게 보여줍니다.':`${BODY_FOCUS_AREAS.find(a=>a.id===focusRegion).label} 확대 보기 · 드래그로 돌려서 비교하세요.`}</p>
  </div>
  <div ref={sceneElement} className={`mannequin-focus-view ${selected?'has-readout':''}`}>
   <div ref={readoutElement}><SegmentComparisonReadout {...{selected,focusRegion,comparisonData}} totalReference={reference}/></div>
   <BodyScene {...{measurement:m,profile,height,selectedSegment:selected,onSelect:selectSurface,mannequin,focusRegion,focusRevision}} onFocusReset={()=>focusArea(BODY_FOCUS_AREAS[0])} gender={profile.gender} performanceMode="composition_mannequin"/>
  </div>
  <details className="mannequin-settings"><summary>투명도 · 골격 · 표현 설정</summary><div>
   <p className="muted">투명도가 높을수록 모형이 더 비쳐 보입니다.</p>
   <label>내 몸 투명도 {Math.round((1-myOpacity)*100)}%<input aria-label="내 마네킹 투명도" type="range" min="10" max="90" step="1" value={Math.round((1-myOpacity)*100)} onChange={e=>setMyOpacity(Number(((100-Number(e.target.value))/100).toFixed(2)))}/></label>
   <label>평균 투명도 {Math.round((1-referenceOpacity)*100)}%<input aria-label="평균 마네킹 투명도" type="range" min="10" max="90" step="1" value={Math.round((1-referenceOpacity)*100)} onChange={e=>setReferenceOpacity(Number(((100-Number(e.target.value))/100).toFixed(2)))}/></label>
   <label><input type="checkbox" checked={skeleton} onChange={e=>setSkeleton(e.target.checked)}/>골격 구조 보기 (설명용)</label>
   <label><input type="checkbox" checked={referenceWireframe} onChange={e=>setReferenceWireframe(e.target.checked)}/>평균 모형 격자선</label>
   <label><input type="checkbox" checked={referenceContour} onChange={e=>setReferenceContour(e.target.checked)}/>평균 윤곽선 보기</label>
  </div></details>
  <div className="mannequin-reference-card"><h4>골격근량 · 문헌 평균 비교</h4>{reference.available?<>
   <div className="mannequin-mass-comparison"><span>내 측정<strong>{format(m.skeletal_muscle_mass)} <small>kg</small></strong></span><span>문헌 평균<strong>{format(reference.value)} <small>kg</small></strong></span><span>평균과 차이<strong>{signed(reference.differenceKg)} <small>kg</small></strong></span></div>
   <p>성인 {profile.gender==='female'?'여성':'남성'} · 연구 전체 468명 · 18–88세 · 전신 MRI</p>
   <p className="muted">성별에 따른 연구 평균입니다. 나이·키가 같은 한국인 인바디 평균은 아닙니다. 평균 모형은 내 키·체중·체지방을 유지하고 골격근량만 바꿔 표시합니다.</p>
   {!reference.canOverlay&&<p>{reference.overlayReason}</p>}
   <details><summary>논문과 수치 출처</summary><p>{reference.study.citation}</p><p>{reference.study.title}</p><p className="muted">{reference.study.verification}</p><p><a href={reference.study.url} target="_blank" rel="noreferrer">PubMed 논문</a> · <a href={reference.study.transcriptionUrl} target="_blank" rel="noreferrer">수치 확인에 사용한 공개 인용 자료</a></p></details>
  </>:<p>{reference.reason} <Link to="/health/profile">프로필 설정</Link></p>}</div>
  <p className="mannequin-note">체성분 기반 근사 모형입니다. 지방 분포와 얼굴·뼈 모양을 그대로 복원하지는 못합니다. {GIRTH_FIELDS.some(([k])=>Number.isFinite(m[k]))?'입력한 가슴·허리·엉덩이 둘레를 형상에 반영했습니다.':'가슴·허리·엉덩이 둘레를 추가하면 체형을 더 가깝게 맞출 수 있습니다.'}</p>
 </div>;
}
