import React from 'react';
export function cohortLabel(meta){if(!meta)return '비교군 없음';const range=(a,unit)=>a?.some(v=>v!=null)?`${a[0]??'제한 없음'}–${a[1]??'제한 없음'}${unit}`:null;return [meta.sex==='female'?'여성':'남성',range(meta.age_range,'세'),range(meta.height_range,'cm'),range(meta.BMI_range,' BMI'),range(meta.weight_range,'kg')].filter(Boolean).join(' · ');}
export default function ReferenceSource({group}){
 if(!group)return <p className="muted">현재 조건에 맞는 비교군 데이터가 충분하지 않습니다.</p>;
 const m=group.metadata;
 return <details className="reference-source"><summary>비교 기준 출처 보기</summary>
  {m.demo&&<p className="motion-cautions">DEMO · 시연용 예시 기준값입니다. 실제 인구 평균이 아닙니다.</p>}
  <dl>{Object.entries({'Dataset':m.dataset_id,'Population':m.reference_population,'비교 조건':cohortLabel(m),'Source':m.reference_source,'Publication':m.publication,'Sample size':m.sample_size,'Version':m.version,'Effective date':m.effective_date}).map(([k,v])=><div key={k}><dt>{k}</dt><dd>{v??'미등록'}</dd></div>)}</dl>
  <p className="muted">표시되지 않은 조건은 데이터셋이 지원하지 않습니다. 연령은 측정일 기준입니다.</p>
 </details>;
}
