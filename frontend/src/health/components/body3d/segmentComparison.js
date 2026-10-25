const nonnegative=value=>Number.isFinite(value)&&value>=0;
const positive=value=>Number.isFinite(value)&&value>0;

// Report percentages refer to the report's own 100% standard, not a population
// average. Never distribute total skeletal muscle mass across body regions.
export function segmentComparison(comparisonData,segment){
 const row=comparisonData?.measurement?.segments?.find(s=>s.segment===segment);
 const own=nonnegative(row?.lean_mass_kg)?row.lean_mass_kg:null;
 const average=comparisonData?.average_comparison;
 const group=average?.groups?.find(g=>g.id===average.selected_group_id);
 const mean=group?.segments?.[segment]?.lean?.reference_value;
 if(own!==null&&positive(mean)&&group?.metadata?.demo!==true&&group?.metadata?.reference_source){
  return result(own,mean,(own/mean-1)*100,'average','비교군 평균',group.metadata.reference_source);
 }
 const percent=row?.lean_reference_percent;
 if(positive(percent)&&percent<=1000){
  const implied=own!==null&&own>0?own*100/percent:null;
  const standard=positive(implied)?implied:null;
  return result(own,standard,percent-100,'report','결과지 기준','결과지의 근육 분석 기준 대비 %');
 }
 return {available:false,own,missing:own===null?'measurement':'reference'};
}
function result(own,reference,differencePercent,kind,label,source){
 const differenceKg=own!==null&&reference!==null?own-reference:null;
 const direction=Math.abs(differencePercent)<1e-9?'equal':differencePercent<0?'below':'above';
 return {available:true,own,reference,differenceKg,differencePercent,direction,kind,label,source};
}
export const comparisonNumber=value=>Number.isFinite(value)?Number(value.toFixed(2)).toLocaleString('ko-KR',{maximumFractionDigits:2}):'—';
export function differenceText(result){
 if(!result.available)return '부위 비교 정보가 필요해요';
 if(result.direction==='equal')return `${result.label}과 같아요`;
 const kg=result.differenceKg,amount=Math.abs(kg??result.differencePercent),unit=kg===null?'%':'kg';
 const unitLabel=unit==='%'?'%':' kg';
 const value=amount<.01?`0.01${unitLabel} 미만`: `${comparisonNumber(amount)}${unitLabel}`;
 return `${result.label}보다 ${value} ${result.direction==='below'?'적어요':'많아요'}`;
}
