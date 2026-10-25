import React from 'react';
import './tempo.css';
export default function PoseFeedbackDetails({feedback,report}){
 if(!feedback&&!report)return null;
 return <section className="pose-observation" aria-label={report?'촬영 자세 분석 결과':'자세 차이와 힘 사용 안내'}>
  {report&&<><h3>이번 촬영에서 관찰한 자세</h3><p>분석 가능한 구간 {report.observedSeconds}초 · {report.countSupported===false?'자세 관찰 전용 · 자동 횟수 계산 없음':`관찰된 완전한 반복 ${report.reps}회`}</p>{!report.sufficient?<p className="pose-report-empty">분석 가능한 영상이 부족해 결론을 내리지 않았습니다. 전신이 보이게 고정한 뒤 촬영·분석으로 다시 확인하세요.</p>:report.issues.length?<ul>{report.issues.map(issue=><li key={issue.id}><strong>{issue.bodyPart}</strong> · {issue.message}<br/><small>{issue.evidence} · 분석 중 {issue.samples}개 프레임에서 관찰</small></li>)}</ul>:<p>분석한 구간에서 지속된 교정 항목이 없었습니다. 보이지 않은 부위나 분석하지 않은 동작의 정확성을 뜻하지 않습니다.</p>}</>}
  {feedback&&<><h3>{feedback.phase?`${feedback.phase} · 관절 비교`:'운동별 힘 사용 안내'}</h3>{feedback.observations?.length>0&&<dl>{feedback.observations.map(o=><React.Fragment key={o.label}><dt>{o.label}</dt><dd>{o.value}<br/><small>{o.reference}</small></dd></React.Fragment>)}</dl>}{feedback.differences?.map(d=><p key={d.id}><strong>{d.bodyPart}</strong> · {d.action}{d.evidence&&<><br/><small>{d.evidence}</small></>}</p>)}{feedback.viewNote&&<p><small>{feedback.viewNote}</small></p>}<details open><summary>어디에 힘을 줄까요? · {feedback.muscle?.target}</summary><p>{feedback.muscle?.load}</p><p>{feedback.muscle?.avoid}</p>{feedback.breathing&&<p>{feedback.breathing}</p>}<small>힘 사용법은 운동 안내입니다. 카메라로 실제 근육 활성도나 통증을 측정하지 않습니다.</small></details></>}
 </section>;
}
