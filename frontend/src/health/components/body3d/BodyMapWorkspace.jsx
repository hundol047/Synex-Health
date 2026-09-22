import React, { useMemo, useState } from 'react';
import BodyTools from './BodyTools.jsx';
import BodyScene from './BodyScene.jsx';
import { resolveBodyProfile } from './bodyProfiles.js';
import SegmentDetailPanel from './SegmentDetailPanel.jsx';
import { MODES, STATUS_COLORS, colorsForMode, SEGMENT_LABEL_KO } from '../../lib/bodyMapColors.js';
import { Disclaimer } from '../../../shared/components/ui.jsx';

const LEGEND_BY_MODE = {
  muscle: [['within', '기준 범위'], ['above', '기준보다 높음'], ['below', '기준보다 낮음'], ['far_below', '큰 차이']],
  fat: [['above', '감소'], ['within', '변화 적음'], ['below', '증가'], ['far_below', '큰 폭 증가']],
  balance: [['above', '균형/높은 쪽'], ['within', '균형'], ['below', '낮은 쪽'], ['far_below', '큰 차이']],
  reference: [['within', '기준 범위'], ['above', '기준보다 높음'], ['below', '기준보다 낮음'], ['far_below', '큰 차이']],
  previous: [['above', '증가'], ['within', '변화 적음'], ['below', '감소'], ['far_below', '큰 폭 감소']],
};

export default function BodyMapWorkspace({ comparisonData, height = 440, defaultMode = 'reference' }) {
  const [layer,setLayer]=useState('body');
  const [slice,setSlice]=useState({enabled:false,axis:'horizontal',position:0});
  const [mode, setMode] = useState(defaultMode);
  const [selectedSegment, setSelectedSegment] = useState(null);
  const [hovered, setHovered] = useState(null);

  const segmentColors = useMemo(() => colorsForMode(comparisonData, mode), [comparisonData, mode]);

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 10, paddingBottom: 2 }}>
        {MODES.map((m) => (
          <button key={m.id} className={`btn ${mode === m.id ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ whiteSpace: 'nowrap' }} onClick={() => setMode(m.id)}>
            {m.label}
          </button>
        ))}
      </div>

      <p className="muted" style={{fontSize:'.8rem'}}>{resolveBodyProfile(comparisonData?.body_profile?.gender).label} · 측정값 기반 설명용 체형 · 누락한 수치는 표준 비율 사용</p>
      {Object.values(comparisonData?.reference_comparison||{}).some(r=>r.source==='demo') && <p className="motion-cautions">현재 기준 비교에는 예시 기준값이 포함되어 있습니다. 실제 건강 상태 판정에 사용하지 마세요.</p>}
      <BodyTools {...{layer,setLayer,slice,setSlice}}/>
      <BodyScene measurement={comparisonData?.measurement} profile={comparisonData?.body_profile} layer={layer} slice={slice}
        gender={comparisonData?.body_profile?.gender || 'unspecified'}
        height={height}
        segmentColors={segmentColors}
        selectedSegment={hovered || selectedSegment}
        onSelect={setSelectedSegment}
        onHover={setHovered}
      />

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 10 }}>
        {LEGEND_BY_MODE[mode].map(([status, label]) => (
          <span key={status} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '.75rem', color: 'var(--muted)' }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: STATUS_COLORS[status], display: 'inline-block' }} />
            {label}
          </span>
        ))}
      </div>

      <div style={{ marginTop: 10 }}>
        <Disclaimer>
          색상은 질병 또는 의학적 위험도를 의미하지 않으며, 체성분 비교를 쉽게 이해하기 위한 시각적 표현입니다.
          측정 가능한 5개 부위(왼팔·오른팔·몸통·왼다리·오른다리) 기준이며, 개별 근육 데이터는 표시하지 않습니다.
        </Disclaimer>
      </div>

      <SegmentDetailPanel segment={selectedSegment} comparisonData={comparisonData} onClose={() => setSelectedSegment(null)} />
    </div>
  );
}
