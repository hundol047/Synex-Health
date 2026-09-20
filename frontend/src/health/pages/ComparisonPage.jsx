import React, { useState } from 'react';
import { HealthAPI } from '../../shared/lib/api.js';
import { Card, Skeleton, ErrorState, EmptyState, Badge } from '../../shared/components/ui.jsx';
import BodyMapWorkspace from '../components/body3d/BodyMapWorkspace.jsx';
import { SEGMENT_LABEL_KO } from '../lib/bodyMapColors.js';
import { useApiData } from '../lib/useApiData.js';

const STATUS_LABEL = {
  within: '기준 범위 내', above: '기준보다 높음', below: '기준보다 낮음',
  far_below: '기준과 큰 차이', no_reference: '기준 데이터 없음', no_measurement: '측정 없음',
};
const STATUS_TONE = {
  within: 'success', above: 'blue', below: 'warning', far_below: 'danger',
  no_reference: 'blue', no_measurement: 'blue',
};

const TABS = [
  { id: 'reference', label: '기준 비교' },
  { id: 'lr', label: '좌우 비교' },
  { id: 'previous', label: '이전 비교' },
];

function fmtDelta(v, unit = 'kg') {
  if (v == null) return '측정 없음';
  return `${v > 0 ? '+' : ''}${v}${unit}`;
}

export default function ComparisonPage() {
  const [tab, setTab] = useState('reference');
  const comparison = useApiData(() => HealthAPI.bodyMapComparison(), []);
  const measurements = useApiData(() => HealthAPI.listMeasurements(), []);

  if (comparison.loading) return <Card><Skeleton height={300} /></Card>;
  if (comparison.error?.status === 404) {
    return (
      <Card>
        <EmptyState title="비교할 데이터가 없어요" description="측정 데이터가 1건 이상 있어야 비교할 수 있습니다." />
      </Card>
    );
  }
  if (comparison.error) return <ErrorState message={comparison.error.message} onRetry={comparison.reload} />;

  const data = comparison.data;
  const list = measurements.data || [];
  const currentM = list.find((m) => m.id === data.current_measurement_id);
  const prevM = list.find((m) => m.id === data.previous_measurement_id);

  return (
    <>
      <Card>
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
          {TABS.map((t) => (
            <button key={t.id} className={`btn ${tab === t.id ? 'btn-primary' : 'btn-ghost'}`} style={{ whiteSpace: 'nowrap' }} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
      </Card>

      {tab === 'reference' && (
        <Card title="기준 비교 (부위별 근육 기준 대비)">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {Object.entries(data.reference_comparison || {}).map(([seg, ref]) => (
              <div key={seg} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--line)' }}>
                <span>{SEGMENT_LABEL_KO[seg] || seg}</span>
                <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {ref?.reference_percent != null && <span className="muted">{ref.reference_percent}%</span>}
                  <Badge tone={STATUS_TONE[ref?.status] || 'blue'}>{STATUS_LABEL[ref?.status] || ref?.status || '데이터 없음'}</Badge>
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {tab === 'lr' && (
        <Card title="좌우 비교">
          {['arm', 'leg'].map((part) => {
            const b = data.left_right_balance?.[part];
            return (
              <div key={part} style={{ marginBottom: 18 }}>
                <h3 style={{ marginBottom: 8 }}>{part === 'arm' ? '팔' : '다리'}</h3>
                {!b ? <p className="muted">데이터 없음</p> : (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                      <span>왼쪽 {b.left_kg != null ? `${b.left_kg} kg` : '—'}</span>
                      <span>오른쪽 {b.right_kg != null ? `${b.right_kg} kg` : '—'}</span>
                    </div>
                    <p className="muted" style={{ marginTop: 4 }}>
                      차이 {b.diff_percent != null ? `${b.diff_percent}%` : '측정 없음'}
                    </p>
                  </>
                )}
              </div>
            );
          })}
          {data.balance_delta != null && (
            <p className="muted">지난 측정 대비 균형 변화: {fmtDelta(data.balance_delta, '%')}</p>
          )}
        </Card>
      )}

      {tab === 'previous' && (
        <Card title="이전 비교">
          <p className="muted" style={{ marginBottom: 12 }}>
            {prevM?.measurement_date || '이전'} ◀── ─── ▶ {currentM?.measurement_date || '현재'}
          </p>
          {!data.previous_measurement_id ? (
            <EmptyState title="첫 측정입니다" description="비교할 이전 측정 데이터가 아직 없습니다." />
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 18 }}>
                {(data.segment_deltas || []).map((s) => (
                  <div key={s.segment} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--line)' }}>
                    <span>{SEGMENT_LABEL_KO[s.segment] || s.segment}</span>
                    <span className="muted">근육 {fmtDelta(s.lean_mass_delta_kg)} · 지방 {fmtDelta(s.fat_mass_delta_kg)}</span>
                  </div>
                ))}
              </div>
              <BodyMapWorkspace comparisonData={data} defaultMode="previous" />
            </>
          )}
        </Card>
      )}
    </>
  );
}
