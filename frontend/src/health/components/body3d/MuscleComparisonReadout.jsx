import React from 'react';
import './mannequin.css';
export const COMPARISON_OPACITY=Object.freeze({myOpacity:.38,referenceOpacity:.12});
export default function MuscleComparisonReadout({reference,own}){
 if(!reference?.available||!Number.isFinite(own))return null;
 const diff=reference.differenceKg,max=Math.max(own,reference.value,1),format=n=>Number(n.toFixed(2));
 const description=diff===0?'문헌 평균과 골격근량이 같아요':`문헌 평균보다 ${format(Math.abs(diff))} kg ${diff>0?'많아요':'적어요'}`;
 return <div className="muscle-comparison-readout" aria-label="내 골격근량과 평균의 차이" data-difference={diff>0?'above':diff<0?'below':'equal'}>
  <strong>{description}</strong>{diff!==0&&<span>비교 기준 대비 {Math.abs(reference.differencePercent)}% {diff>0?'많음':'적음'}</span>}
  <div className="muscle-comparison-row"><span>내 골격근량</span><div><i style={{width:`${own/max*100}%`}}/></div><b>{format(own)} kg</b></div>
  <div className="muscle-comparison-row reference"><span>문헌 평균</span><div><i style={{width:`${reference.value/max*100}%`}}/></div><b>{reference.value} kg</b></div>
  <small>전체 골격근량의 차이입니다. 3D 윤곽은 수치를 반영한 근사 형상이며 부위별 근육량의 실측 차이는 아닙니다.</small>
 </div>;
}
