import React from 'react';
import { Modal } from '../../../shared/components/ui.jsx';
import { SEGMENT_LABEL_KO } from '../../lib/bodyMapColors.js';

function Row({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
      <span className="muted">{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default function SegmentDetailPanel({ segment, comparisonData, onClose, aiNote }) {
  if (!segment) return null;
  const label = SEGMENT_LABEL_KO[segment];
  const segDelta = (comparisonData?.segment_deltas || []).find((s) => s.segment === segment);
  const ref = comparisonData?.reference_comparison?.[segment];

  return (
    <Modal open={!!segment} onClose={onClose} title={label}>
      <Row label="현재 부위 제지방량" value={segDelta?.current_lean_kg != null ? `${segDelta.current_lean_kg} kg` : '측정 없음'} />
      <Row label="현재 체지방량" value={segDelta?.current_fat_kg != null ? `${segDelta.current_fat_kg} kg` : '측정 없음'} />
      <Row label="이전 제지방량" value={segDelta?.current_lean_kg!=null&&segDelta?.lean_mass_delta_kg!=null?`${(segDelta.current_lean_kg-segDelta.lean_mass_delta_kg).toFixed(2)} kg`:'이전 측정 없음'}/>
      <Row label="좌우 차이" value={(()=>{const pair=segment.includes('ARM')?'arm':segment.includes('LEG')?'leg':null;const difference=comparisonData?.left_right_balance?.[pair]?.diff_percent;return difference!=null?`${difference}% (왼쪽−오른쪽, 오른쪽 기준)`:'비교 없음';})()}/>
      <Row label="측정일" value={comparisonData?.measurement?.measurement_date||'확인 불가'}/>
      <Row label="측정 출처" value={comparisonData?.measurement?.source||'확인 불가'}/>
      <Row label="참고 범위" value={ref?.lower!=null&&ref?.upper!=null?`${ref.lower}–${ref.upper} ${ref.unit}`:'등록된 범위 없음'}/>
      <Row label="기준 출처·버전" value={ref?.reference_source?`${ref.reference_source} · ${ref.reference_version||'미등록'}`:ref?.source||'없음'}/>
      {ref?.publication&&<p className="muted">{ref.publication} · 적용일 {ref.effective_date||'미등록'}</p>}
      <Row label="기준 대비" value={ref?.reference_percent != null ? `${ref.reference_percent}%` : '기준 데이터 없음'} />
      <Row label="지난 측정 대비 변화(제지방)" value={segDelta?.lean_mass_delta_kg != null ? `${segDelta.lean_mass_delta_kg > 0 ? '+' : ''}${segDelta.lean_mass_delta_kg} kg` : '이전 측정 없음'} />
      <Row label="지난 측정 대비 변화(체지방)" value={segDelta?.fat_mass_delta_kg != null ? `${segDelta.fat_mass_delta_kg > 0 ? '+' : ''}${segDelta.fat_mass_delta_kg} kg` : '이전 측정 없음'} />
      <div style={{ marginTop: 14 }}>
        <h3 style={{ marginBottom: 6 }}>AI 분석</h3>
        <p className="muted">{aiNote || `${label} 부위는 위 수치를 기준으로 판단합니다. 상세 설명은 AI 건강 코칭에서 "AI 분석 생성"을 눌러 확인하세요.`}</p>
      </div>
    </Modal>
  );
}
