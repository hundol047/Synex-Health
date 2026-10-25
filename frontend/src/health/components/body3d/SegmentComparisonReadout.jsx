import React from 'react';
import {Link} from 'react-router-dom';
import {BODY_FOCUS_AREAS} from './mannequinFocus.js';
import {segmentComparison,comparisonNumber,differenceText} from './segmentComparison.js';

const labels={TRUNK:'몸통',LEFT_ARM:'왼팔',RIGHT_ARM:'오른팔',LEFT_LEG:'왼다리',RIGHT_LEG:'오른다리'};
export default function SegmentComparisonReadout({selected,focusRegion,comparisonData,totalReference}){
 if(!selected)return null;
 const area=BODY_FOCUS_AREAS.find(a=>a.id===focusRegion),label=area?.segment===selected?area.label:labels[selected];
 const hips=focusRegion==='hips',trunkPart=selected==='TRUNK'&&label!=='몸통'&&!hips;
 const result=hips?{available:false,own:null}:segmentComparison(comparisonData,selected);
 const total=totalReference?.available?totalReference:null;
 const percentDelta=Math.abs(result.differencePercent),percentText=percentDelta>0&&percentDelta<.01?'0.01% 미만':`${comparisonNumber(percentDelta)}%`;
 return <section className={`segment-comparison-readout ${result.available?result.direction:'missing'}`} role="status" aria-label="선택 부위 수치 비교">
  <div className="segment-comparison-heading"><strong>{label} 선택</strong><span>{trunkPart?'몸통 전체 분석 값':hips?'별도 측정 없음':'근육 분석 (제지방)'}</span></div>
  <p className="segment-comparison-difference">{hips?'엉덩이만의 비교 수치는 없어요':differenceText(result)}</p>
  {trunkPart&&<p className="segment-comparison-scope">{label}만의 수치가 아닌 몸통 전체 비교입니다.</p>}
  {result.available?<>
   <div className="segment-comparison-values"><span>내 측정 <b>{result.own===null?'미입력':`${comparisonNumber(result.own)} kg`}</b></span><span>{result.label} <b>{result.reference===null?'100%':`${result.kind==='report'?'약 ':''}${comparisonNumber(result.reference)} kg`}</b></span></div>
   <p className="segment-comparison-source">{result.direction==='equal'?'차이 0%':`${percentText} ${result.direction==='below'?'적음':'많음'}`} · {result.kind==='report'?'결과지 기준(100%)이며 문헌 평균과 다릅니다.':`출처: ${result.source}`}</p>
  </>:<>
   {result.own!==null&&<p className="segment-comparison-source">내 근육 분석 값 {comparisonNumber(result.own)} kg · 비교 기준 미입력</p>}
   <p className="segment-comparison-source">{hips?'결과지는 보통 좌우 팔·다리와 몸통 수치를 제공합니다.':'결과지의 ‘부위별 근육 분석’에서 kg와 %를 입력하세요.'}</p>
   {total&&<p className="segment-comparison-total">전신 참고 · 골격근량은 문헌 평균{total.differenceKg===0?'과 같아요':`보다 ${comparisonNumber(Math.abs(total.differenceKg))} kg ${total.differenceKg<0?'적어요':'많아요'}`}. (해당 부위 차이 아님)</p>}
   {!hips&&<Link className="segment-comparison-input" to="/health/profile#segment-measurements">부위 수치 입력하기 →</Link>}
  </>}
 </section>;
}
