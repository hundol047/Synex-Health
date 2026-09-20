import React, { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { HealthAPI } from '../../shared/lib/api.js';
import { Card, StatTile, Skeleton, EmptyState, ErrorState, DemoBadge, Disclaimer } from '../../shared/components/ui.jsx';
import BodyScene from '../components/body3d/BodyScene.jsx';
import { colorsForMode } from '../lib/bodyMapColors.js';
import { useApiData } from '../lib/useApiData.js';

export default function HomePage() {
  const profile = useApiData(() => HealthAPI.getProfile(), []);
  const measurement = useApiData(() => HealthAPI.latestMeasurement(), []);
  const bodyMap = useApiData(() => HealthAPI.bodyMapLatest(), []);

  const [analysis, setAnalysis] = useState({ loading: false, error: null, data: null });
  const runAnalysis = useCallback(async () => {
    setAnalysis({ loading: true, error: null, data: null });
    try {
      const data = await HealthAPI.analyze();
      setAnalysis({ loading: false, error: null, data });
    } catch (error) {
      setAnalysis({ loading: false, error, data: null });
    }
  }, []);

  const noMeasurement = measurement.error?.status === 404;
  const deltas = bodyMap.data?.top_level_deltas;
  const name = profile.data?.name;

  return (
    <>
      <div>
        <h1>{profile.loading ? <Skeleton height={28} width={220} /> : `안녕하세요${name ? `, ${name}님` : ''}`}</h1>
        <p className="muted" style={{ marginTop: 4 }}>오늘도 건강한 하루가 될 거예요.</p>
      </div>

      {measurement.loading ? (
        <Card><Skeleton height={110} /></Card>
      ) : noMeasurement ? (
        <Card title="체성분 데이터">
          <EmptyState
            title="아직 측정 데이터가 없어요"
            description="건강센터에서 측정 후 데이터가 자동으로 연동됩니다."
          />
        </Card>
      ) : measurement.error ? (
        <ErrorState message={measurement.error.message} onRetry={measurement.reload} />
      ) : (
        <Card title="오늘의 체성분" action={measurement.data.source === 'mock' ? <DemoBadge /> : null}>
          <div className="stat-grid">
            <StatTile
              label="체지방률" value={measurement.data.body_fat_percentage} unit="%"
              delta={deltas?.body_fat_percentage_delta ?? null} deltaLabel="지난 측정 대비"
            />
            <StatTile
              label="골격근량" value={measurement.data.skeletal_muscle_mass} unit="kg"
              delta={deltas?.skeletal_muscle_mass_delta ?? null} deltaLabel="지난 측정 대비"
            />
            <StatTile
              label="체중" value={measurement.data.weight} unit="kg"
              delta={deltas?.weight_delta ?? null} deltaLabel="지난 측정 대비"
            />
            <StatTile
              label="기초대사량" value={measurement.data.basal_metabolic_rate} unit="kcal"
              delta={deltas?.basal_metabolic_rate_delta ?? null} deltaLabel="지난 측정 대비"
            />
          </div>
        </Card>
      )}

      {!noMeasurement && (
        <Card title="3D 체형 미리보기" action={<Link className="btn btn-ghost" to="/health/body">자세히 보기</Link>}>
          {bodyMap.loading ? (
            <Skeleton height={200} />
          ) : bodyMap.data ? (
            <BodyScene segmentColors={colorsForMode(bodyMap.data, 'reference')} height={200} interactive={false} />
          ) : (
            <p className="muted">표시할 데이터가 없습니다.</p>
          )}
        </Card>
      )}

      <Link to="/health/workout" className="btn btn-primary btn-block">오늘의 루틴 시작하기</Link>

      <Card
        title="AI 건강 분석"
        action={
          <button className="btn btn-secondary" onClick={runAnalysis} disabled={analysis.loading || noMeasurement}>
            {analysis.loading ? '분석 중...' : 'AI 분석 보기'}
          </button>
        }
      >
        {analysis.error && <ErrorState message={analysis.error.message} onRetry={runAnalysis} />}
        {analysis.data && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <p>{analysis.data.summary}</p>
            {analysis.data.recommendations?.length > 0 && (
              <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--muted)' }}>
                {analysis.data.recommendations.slice(0, 3).map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            )}
          </div>
        )}
        {!analysis.data && !analysis.error && !analysis.loading && (
          <p className="muted">버튼을 눌러 최신 측정 기반 AI 분석을 확인하세요.</p>
        )}
      </Card>

      <Disclaimer>이 앱의 분석 및 시각화 결과는 의학적 진단이 아니며, 참고용 건강 정보입니다.</Disclaimer>
    </>
  );
}
