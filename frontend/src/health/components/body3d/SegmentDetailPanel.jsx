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
      <Row label="현재 근육량(제지방)" value={segDelta?.current_lean_kg != null ? `${segDelta.current_lean_kg} kg` : '측정 없음'} />
      <Row label="현재 체지방량" value={segDelta?.current_fat_kg != null ? `${segDelta.current_fat_kg} kg` : '측정 없음'} />
      <Row label="기준 대비" value={ref?.reference_percent != null ? `${ref.reference_percent}%` : '기준 데이터 없음'} />
      <Row label="지난 측정 대비 변화(근육)" value={segDelta?.lean_mass_delta_kg != null ? `${segDelta.lean_mass_delta_kg > 0 ? '+' : ''}${segDelta.lean_mass_delta_kg} kg` : '이전 측정 없음'} />
      <Row label="지난 측정 대비 변화(체지방)" value={segDelta?.fat_mass_delta_kg != null ? `${segDelta.fat_mass_delta_kg > 0 ? '+' : ''}${segDelta.fat_mass_delta_kg} kg` : '이전 측정 없음'} />
      <div style={{ marginTop: 14 }}>
        <h3 style={{ marginBottom: 6 }}>AI 분석</h3>
        <p className="muted">{aiNote || `${label} 부위는 위 수치를 기준으로 판단합니다. 상세 설명은 AI 건강 코칭에서 "AI 분석 생성"을 눌러 확인하세요.`}</p>
      </div>
    </Modal>
  );
}
