import React from 'react';
import { EXPERIENCE_INDICATORS, EXPERIENCE_LABELS, deriveExperienceLevel } from '../lib/exerciseProfileOptions.js';

// Detailed self-reported indicators that decide the experience level (초급/중급/고급).
export default function ExperienceDetail({ detail, savedLevel, onChange, idPrefix = 'exp' }) {
  const answers = detail || {};
  const derived = deriveExperienceLevel(answers);
  const answered = EXPERIENCE_INDICATORS.filter((x) => answers[x.key] != null).length;
  return (
    <div className="experience-detail">
      <div className="experience-detail-head">
        <label className="field-label" style={{ margin: 0 }}>운동 경험</label>
        <span className={`experience-level ${derived ? 'set' : ''}`} aria-live="polite">
          {derived ? `${EXPERIENCE_LABELS[derived]} 단계` : `${answered}/${EXPERIENCE_INDICATORS.length} 선택 · 현재 ${EXPERIENCE_LABELS[savedLevel] || '초급'}`}
        </span>
      </div>
      <p className="muted" style={{ margin: '2px 0 8px' }}>두 항목을 모두 고르면 단계가 자동으로 정해집니다. 운동을 시작한 지 6개월이 안 됐으면 자주 운동해도 중급까지만 정해집니다.</p>
      <div className="profile-grid">
        {EXPERIENCE_INDICATORS.map((indicator) => (
          <div key={indicator.key}>
            <label className="field-label" htmlFor={`${idPrefix}-${indicator.key}`}>{indicator.label}</label>
            <select id={`${idPrefix}-${indicator.key}`} className="text-input" value={answers[indicator.key] ?? ''}
              onChange={(e) => onChange({ ...answers, [indicator.key]: e.target.value || null })}>
              <option value="">선택하세요</option>
              {indicator.options.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}
