import LongTermProgress from '../components/LongTermProgress.jsx';
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
    const base = filtered;
    return {
      chartData: base.map((m) => ({
        date: m.measurement_date,
        weight: m.weight,
        muscle: m.skeletal_muscle_mass,
        fatPercent: m.body_fat_percentage,
        bmi:m.bmi??(m.weight&&m.height?Number((m.weight/(m.height/100)**2).toFixed(1)):null),
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

  const first=chartData[0],last=chartData.at(-1);
  const summary=chartData.length<2?'선택 기간에 비교할 두 측정이 없습니다.':[['weight','체중','kg'],['muscle','골격근량','kg'],['fatPercent','체지방률','%p']].filter(([k])=>first[k]!=null&&last[k]!=null).map(([k,label,unit])=>`${label} ${(last[k]-first[k]).toFixed(2)}${unit}`).join(' · ');
  return (
    <>
      <LongTermProgress/><Card title="저장 데이터 기반 변화 요약"><p>{summary}</p><p className="muted">선택 기간의 첫 측정과 마지막 측정 비교입니다. 운동 효과나 건강 상태를 진단하지 않습니다.</p></Card>
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
              <Line type="monotone" dataKey="bmi" name="BMI" stroke="#855bb5" strokeWidth={2} dot={{r:3}}/>
              <Line type="monotone" dataKey="weight" name="체중(kg)" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} connectNulls />
              <Line type="monotone" dataKey="muscle" name="골격근량(kg)" stroke="#1f9d6f" strokeWidth={2} dot={{ r: 3 }} connectNulls />
              <Line type="monotone" dataKey="fatPercent" name="체지방률(%)" stroke="#d6483f" strokeWidth={2} dot={{ r: 3 }} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card title="그래프 수치 확인"><div className="data-table-wrap"><table><caption>선택 기간 체성분 측정값</caption><thead><tr><th>날짜</th><th>체중 kg</th><th>골격근량 kg</th><th>체지방 %</th><th>BMI</th></tr></thead><tbody>{chartData.map((r,i)=><tr key={r.date+i}>{['date','weight','muscle','fatPercent','bmi'].map(k=><td key={k}>{r[k]??'측정 없음'}</td>)}</tr>)}</tbody></table></div></Card>
      <Card title="부위별 제지방량 변화">
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
        <details><summary>부위별 수치 표</summary><div className="data-table-wrap"><table><thead><tr><th>날짜</th>{Object.keys(SEGMENT_COLORS).map(k=><th key={k}>{SEGMENT_LABEL_KO[k]} kg</th>)}</tr></thead><tbody>{segmentData.map((r,i)=><tr key={r.date+i}><td>{r.date}</td>{Object.keys(SEGMENT_COLORS).map(k=><td key={k}>{r[k]??'측정 없음'}</td>)}</tr>)}</tbody></table></div></details>
      </Card>
      <Card title="주간 운동 완료율"><p>해당 주에 저장한 운동 기록 중 완료 비율입니다. 미기록 운동은 포함하지 않습니다.</p><div style={{height:220}}><ResponsiveContainer><LineChart data={(progress.data.workout_weeks||[]).filter(w=>!period.days||Date.now()-new Date(w.date).getTime()<=period.days*86400000)}><XAxis dataKey="date"/><YAxis domain={[0,100]}/><Tooltip/><Line dataKey="completion" name="완료율 %" stroke="#2563eb"/></LineChart></ResponsiveContainer></div>{(progress.data.workout_weeks||[]).map(w=><p key={w.date}>{w.date}: {w.completion}% ({w.completed}/{w.total})</p>)}</Card>
    </>
  );
}
