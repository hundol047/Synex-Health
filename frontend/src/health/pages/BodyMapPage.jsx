import React from 'react';
import {Link} from 'react-router-dom';
import { HealthAPI, api } from '../../shared/lib/api.js';
import { Card, Skeleton, ErrorState, EmptyState } from '../../shared/components/ui.jsx';
import BodyMapWorkspace from '../components/body3d/BodyMapWorkspace.jsx';
import { useApiData } from '../lib/useApiData.js';

export default function BodyMapPage() {
  const profile=useApiData(()=>HealthAPI.getProfile(),[]);
  const routines = useApiData(() => HealthAPI.listRoutines(), []);
  const { data, loading, error, reload } = useApiData(() => HealthAPI.bodyMapLatest(), []);

  return (
    <Card title="3D 체형 분석">
      {loading ? (
        <Skeleton height={440} />
      ) : error?.status === 404 ? (
        <EmptyState
          title="측정 데이터가 없어요"
          description={<span>인바디 결과지의 키·체중·체지방률·골격근량을 입력하세요. <Link className="btn btn-primary" to="/health/profile">측정값 입력하기</Link></span>}
        />
      ) : error ? (
        <ErrorState message={error.message} onRetry={reload} />
      ) : (
        <BodyMapWorkspace defaultMode="mannequin" comparisonData={{...data,body_profile:{...data?.body_profile,birth_date:profile.data?.birth_date||data?.body_profile?.birth_date}}} routine={routines.data?.[0]} onGroupChange={async group_id=>{await api('/api/body-map/reference-group',{group_id},{method:'PUT'});await Promise.all([reload(),routines.reload()]);}} />
      )}
    </Card>
  );
}
