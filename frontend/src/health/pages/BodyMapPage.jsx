import React from 'react';
import { HealthAPI } from '../../shared/lib/api.js';
import { Card, Skeleton, ErrorState, EmptyState } from '../../shared/components/ui.jsx';
import BodyMapWorkspace from '../components/body3d/BodyMapWorkspace.jsx';
import { useApiData } from '../lib/useApiData.js';

export default function BodyMapPage() {
  const { data, loading, error, reload } = useApiData(() => HealthAPI.bodyMapLatest(), []);

  return (
    <Card title="3D 체형 분석">
      {loading ? (
        <Skeleton height={440} />
      ) : error?.status === 404 ? (
        <EmptyState
          title="측정 데이터가 없어요"
          description="건강센터에서 측정 후 3D 체형 분석을 확인할 수 있습니다."
        />
      ) : error ? (
        <ErrorState message={error.message} onRetry={reload} />
      ) : (
        <BodyMapWorkspace comparisonData={data} />
      )}
    </Card>
  );
}
