import React, { useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { HealthAPI } from '../../shared/lib/api.js';
import { Card, Skeleton, ErrorState, EmptyState } from '../../shared/components/ui.jsx';
import { useApiData } from '../lib/useApiData.js';
import { SEGMENT_LABEL_KO } from '../lib/bodyMapColors.js';

const PERIODS = [
  { id: '1m', label: '1개월', days: 30 },
  { id: '3m', label: '3개월', days: 90 },
  { id: '6m', label: '6개월', days: 180 },
  { id: '1y', label: '1년', days: 365 },
  { id: 'all', label: '전체', days: null },
];

const SEGMENT_COLORS = {
  LEFT_ARM: '#2563eb', RIGHT_ARM: '#60a5fa', TRUNK: '#1f9d6f', LEFT_LEG: '#c07c1e', RIGHT_LEG: '#d6483f',
};

function filterByPeriod(measurements, period) {
  if (!period.days) return measurements;
  const cutoff = Date.now() - period.days * 86400000;
  return measurements.filter((m) => new Date(m.measurement_date).getTime() >= cutoff);
}

export default function ProgressPage() {
  const progress = useApiData(() => HealthAPI.progress(), []);
  const [periodId, setPeriodId] = useState('all');
  const period = PERIODS.find((p) => p.id === periodId) || PERIODS[4];

  const all = progress.data?.measurements || [];

  const { chartData, segmentData } = useMemo(() => {
    const filtered = filterByPeriod(all, period);
    const base = filtered.length ? filtered : all;
    return {
      chartData: base.map((m) => ({
        date: m.measurement_date,
        weight: m.weight,
        muscle: m.skeletal_muscle_mass,
        fatPercent: m.body_fat_percentage,
      })),
      segmentData: base.map((m) => {
        const row = { date: m.measurement_date };
        for (const seg of m.segments || []) row[seg.segment] = seg.lean_mass_kg;
        return row;
      }),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all, periodId]);

  if (progress.loading) return <Card><Skeleton height={260} /></Card>;
  if (progress.error) return <ErrorState message={progress.error.message} onRetry={progress.reload} />;

  if (all.length === 0) {
    return (
      <Card>
        <EmptyState title="변화 추적 데이터가 없어요" description="측정 기록이 2건 이상 쌓이면 변화 그래프를 확인할 수 있어요." />
      </Card>
    );
  }

  return (
    <>
      <Card>
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
          {PERIODS.map((p) => (
            <button key={p.id} className={`btn ${periodId === p.id ? 'btn-primary' : 'btn-ghost'}`} style={{ whiteSpace: 'nowrap' }} onClick={() => setPeriodId(p.id)}>
              {p.label}
            </button>
          ))}
        </div>
        <p className="muted" style={{ marginTop: 8 }}>
          완료한 운동 {progress.data.completed_workout_count ?? 0}회 / 전체 기록 {progress.data.workout_count ?? 0}회
        </p>
      </Card>

      <Card title="체중 · 골격근량 · 체지방률 변화">
        {chartData.length < 2 && <p className="muted" style={{ marginBottom: 8 }}>측정 기록이 더 쌓이면 추세선을 확인할 수 있어요.</p>}
        <div style={{ width: '100%', height: 260 }}>
          <ResponsiveContainer>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="weight" name="체중(kg)" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} connectNulls />
              <Line type="monotone" dataKey="muscle" name="골격근량(kg)" stroke="#1f9d6f" strokeWidth={2} dot={{ r: 3 }} connectNulls />
              <Line type="monotone" dataKey="fatPercent" name="체지방률(%)" stroke="#d6483f" strokeWidth={2} dot={{ r: 3 }} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card title="부위별 근육량 변화">
        <div style={{ width: '100%', height: 260 }}>
          <ResponsiveContainer>
            <LineChart data={segmentData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              {Object.keys(SEGMENT_COLORS).map((seg) => (
                <Line key={seg} type="monotone" dataKey={seg} name={SEGMENT_LABEL_KO[seg]} stroke={SEGMENT_COLORS[seg]} strokeWidth={2} dot={{ r: 3 }} connectNulls />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </>
  );
}
