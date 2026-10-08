import {LOCAL_ONLY} from '../../shared/lib/localMode.js';
import React, { useCallback, useMemo, useState, lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Camera, PersonStanding, Activity, ClipboardCheck, Dumbbell, Check } from 'lucide-react';
import { HealthAPI } from '../../shared/lib/api.js';
import { Card, StatTile, Skeleton, EmptyState, ErrorState, DemoBadge, Disclaimer } from '../../shared/components/ui.jsx';
import ReferenceSource from '../components/body3d/ReferenceSource.jsx';
import {signed,valuesFor,referenceValues} from '../components/body3d/overlayMath.js';
import {publishedMuscleReference} from '../lib/publishedMuscleReference.js';
import {referenceMannequinMeasurement} from '../components/body3d/mannequinMath.js';
const BodyScene=lazy(()=>import('../components/body3d/BodyScene.jsx'));
import { colorsForMode } from '../lib/bodyMapColors.js';
import { useApiData } from '../lib/useApiData.js';

export default function HomePage() {
  const profile = useApiData(() => HealthAPI.getProfile(), []);
  const measurement = useApiData(() => HealthAPI.latestMeasurement(), []);
  const routines = useApiData(() => HealthAPI.listRoutines(), []);
  const bodyMap = useApiData(() => HealthAPI.bodyMapLatest(), []);

  const [showPreview,setShowPreview]=useState(false);
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

  const noMeasurement = measurement.error?.status === 404 || (!measurement.loading && !measurement.error && !measurement.data);
  const deltas = bodyMap.data?.top_level_deltas;
  const name = profile.data?.name;
  const average=bodyMap.data?.average_comparison;
  const group=average?.groups?.find(g=>g.id===average.selected_group_id);
  const total=group?.totals?.skeletal_muscle_mass;
  const compositionProfile=useMemo(()=>({...bodyMap.data?.body_profile,...profile.data}),[bodyMap.data?.body_profile,profile.data]);
  const compositionMeasurement=bodyMap.data?.measurement||measurement.data;
  const published=publishedMuscleReference(compositionMeasurement,compositionProfile);
  const referenceMeasurement=useMemo(()=>published.available&&published.canOverlay?referenceMannequinMeasurement(compositionMeasurement,published.value):null,[compositionMeasurement,published.available,published.canOverlay,published.value]);
  const previewMannequin=useMemo(()=>({referenceMeasurement,options:{showMy:true,showReference:!!referenceMeasurement,layout:'side-by-side',myOpacity:.66,referenceOpacity:.22}}),[referenceMeasurement]);
  const overlay=group?{myValues:valuesFor(bodyMap.data?.measurement,'lean'),referenceValues:referenceValues(group,'lean'),metric:'lean',options:{showMy:true,showReference:true,myOpacity:.85,referenceOpacity:.35,referenceStyle:'wireframe',myStyle:'surface'}}:null;
  const hasRoutine = !!routines.data?.length && !routines.data[0].needs_review;
  const nextStep = noMeasurement ? 0 : hasRoutine ? 2 : 1;

  return (
    <div className={LOCAL_ONLY?'health-home personal-home':'health-home'}>
      <div className="home-greeting">
        {LOCAL_ONLY&&<span className="home-eyebrow">나의 건강 공간</span>}
        <h1>{profile.loading ? <Skeleton height={28} width={220} /> : `안녕하세요${name ? `, ${name}님` : ''}`}</h1>
        <p className="muted" style={{ marginTop: 4 }}>{LOCAL_ONLY?'기록을 쌓고, 몸의 변화를 확인하세요.':'오늘도 건강한 하루가 될 거예요.'}</p>
      </div>

      {LOCAL_ONLY&&<div className="home-feature-grid">
        <Link className="home-feature home-feature-coach" to="/health/pose" aria-label="맨몸운동 카메라 코치">
          <div className="home-feature-top"><span className="home-feature-icon"><Camera size={24}/></span><ArrowUpRight size={20} aria-hidden="true"/></div>
          <span className="home-feature-kicker">촬영 42종 · 실시간 교정 7종</span>
          <strong>맨몸운동<br/>촬영·자세 교정</strong>
          <p>위에서 운동 방법을 보고<br/>아래에서 내 동작을 촬영하세요.</p>
          <span className="home-feature-action">촬영 열기 <ArrowUpRight size={15}/></span>
        </Link>
        <Link className="home-feature home-feature-body" to="/health/body" aria-label="내 3D 마네킹 보기">
          <div className="home-feature-top"><span className="home-feature-icon"><PersonStanding size={24}/></span><ArrowUpRight size={20} aria-hidden="true"/></div>
          <span className="home-feature-kicker">체성분으로 보는 내 몸</span>
          <strong>내 3D<br/>마네킹 보기</strong>
          <p>내 측정값을 반영한<br/>신체 형태를 살펴보세요.</p>
          <span className="home-feature-action">내 몸 열기 <ArrowUpRight size={15}/></span>
        </Link>
      </div>}

      <Card title="오늘은 여기서 시작하세요" className="home-next-card">
        {LOCAL_ONLY&&!measurement.loading&&!routines.loading&&!routines.error&&(!measurement.error||noMeasurement)&&<ol className="home-step-track" aria-label="기록과 운동 시작 순서">
          {[{label:'체성분',Icon:Activity},{label:'운동 계획',Icon:ClipboardCheck},{label:'운동 기록',Icon:Dumbbell}].map(({label,Icon},i)=><li key={label} className={i===nextStep?'current':i<nextStep?'complete':''} aria-current={i===nextStep?'step':undefined}><span>{i<nextStep?<Check size={16}/>:<Icon size={16}/>}</span>{label}</li>)}
        </ol>}
        {measurement.loading||routines.loading?<Skeleton height={70}/>:routines.error?<ErrorState message={routines.error.message} onRetry={routines.reload}/>:measurement.error&&!noMeasurement?<ErrorState message={measurement.error.message} onRetry={measurement.reload}/>:<>
        <p>{noMeasurement?'체성분을 입력하면 내 변화와 운동 계획을 확인할 수 있어요.':routines.data?.[0]?.needs_review?'측정값이나 운동 조건이 바뀌었어요. 계획을 먼저 갱신하세요.':!routines.data?.length?'운동 방식과 이용할 기구를 정하고 첫 계획을 만들어 보세요.':'준비된 운동을 하나씩 따라 하고 오늘의 기록을 남겨 보세요.'}</p>
        <Link className="btn btn-primary" to={noMeasurement?'/health/profile':!routines.data?.length||routines.data?.[0]?.needs_review?'/health/routine':'/health/workout'}>{noMeasurement?'1. 체성분 입력하기':routines.data?.[0]?.needs_review?'변경된 조건으로 계획 갱신':!routines.data?.length?'2. 내 운동 계획 만들기':'3. 오늘 운동 시작하기'}{LOCAL_ONLY&&<ArrowUpRight size={18}/>}</Link></>}
        <div className={LOCAL_ONLY?'home-quick-links':'motion-controls'}>{!LOCAL_ONLY&&<><Link className="btn btn-secondary" to="/health/pose">맨몸운동 카메라 코치</Link><Link className="btn btn-secondary" to="/health/body">내 3D 마네킹 보기</Link></>}<Link to="/health/library">맨몸·헬스장 운동 찾기 <ArrowUpRight size={14}/></Link><Link to="/health/progress">내 기록과 변화 보기 <ArrowUpRight size={14}/></Link></div>
      </Card>

      {measurement.loading ? (
        <Card><Skeleton height={110} /></Card>
      ) : noMeasurement ? (
        <Card title="체성분 데이터">
          <EmptyState
            title="아직 측정 데이터가 없어요"
            description="결과지의 측정값을 프로필에서 입력하세요. 공식 장비 연동은 별도 연결이 필요합니다."
          />
        </Card>
      ) : measurement.error ? (
        <ErrorState message={measurement.error.message} onRetry={measurement.reload} />
      ) : (
        <Card title="최근 체성분" className="home-measurements" action={measurement.data.source === 'mock' ? <DemoBadge /> : null}>
          <p className="muted">측정일 {measurement.data.measurement_date} · 이 수치는 해당 날짜에 측정한 기록입니다.</p>
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
        <Card title="내 몸의 변화와 비교" className="home-body-card" action={<Link className="btn btn-ghost" to="/health/body">자세히 보기</Link>}>
          {bodyMap.loading ? (
            <Skeleton height={200} />
          ) : bodyMap.data ? (
            <>{LOCAL_ONLY&&<p>문헌 평균 골격근량 {published.available?`${published.value}kg (${compositionProfile.gender==='female'?'성인 여성':'성인 남성'} · MRI 연구)`:"프로필의 성별·생년월일 설정 후 비교"}</p>}<p>내 골격근량 {measurement.data?.skeletal_muscle_mass??'—'} kg {!LOCAL_ONLY&&<>· 비교군 평균 {total?.reference_value??'자료 없음'}{total?.reference_value!=null?' kg':''}</>}</p>{total?.difference_kg!=null&&<p>{signed(total.difference_kg)} kg · {signed(total.difference_percent)}%</p>}<button type="button" className="btn btn-secondary" aria-expanded={showPreview} onClick={()=>setShowPreview(v=>!v)}>{showPreview?'3D 미리보기 닫기':'3D 미리보기 열기'}</button>{showPreview&&<Suspense fallback={<Skeleton height={200}/>}><BodyScene overlay={LOCAL_ONLY?null:overlay} mannequin={LOCAL_ONLY?previewMannequin:null} gender={compositionProfile.gender} profile={compositionProfile} measurement={compositionMeasurement} segmentColors={{}} height={LOCAL_ONLY?300:200} interactive={false} /></Suspense>}{LOCAL_ONLY&&showPreview&&<p className="muted">{referenceMeasurement?'왼쪽: 내 몸 · 오른쪽: 문헌 평균 골격근량 비교 모형':'내 몸의 3D 모형'}</p>}{LOCAL_ONLY&&!referenceMeasurement&&<Link to="/health/profile">평균 모형에 필요한 정보 입력</Link>}{!LOCAL_ONLY&&<ReferenceSource group={group}/>}</>
          ) : (
            <p className="muted">표시할 데이터가 없습니다.</p>
          )}
        </Card>
      )}

      {(!LOCAL_ONLY||hasRoutine)&&<Link to="/health/workout" className="btn btn-primary btn-block">오늘의 루틴 시작하기</Link>}

      <Card
        title="측정값 해설"
        action={
          <button className="btn btn-secondary" onClick={runAnalysis} disabled={analysis.loading || noMeasurement}>
            {analysis.loading ? '분석 중...' : '측정값 해설 보기'}
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
          <p className="muted">버튼을 눌러 최신 측정 기반 규칙형 해설을 확인하세요.</p>
        )}
      </Card>

      <Disclaimer>이 앱의 분석 및 시각화 결과는 의학적 진단이 아니며, 참고용 건강 정보입니다.</Disclaimer>
    </div>
  );
}
