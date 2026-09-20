import React, { useState } from 'react';
import { HealthAPI } from '../../shared/lib/api.js';
import { Card, Skeleton, ErrorState, EmptyState, Badge, Disclaimer } from '../../shared/components/ui.jsx';
import BodyMapWorkspace from '../components/body3d/BodyMapWorkspace.jsx';
import { useApiData } from '../lib/useApiData.js';

function fmtDelta(v, unit = '%') {
  if (v == null) return null;
  return `${v > 0 ? '+' : ''}${v}${unit}`;
}

function StudentDetail({ studentId, onClose }) {
  const detail = useApiData(() => HealthAPI.counselorStudentDetail(studentId), [studentId]);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState(null);
  const [saveError, setSaveError] = useState(null);

  const actualNotes = notes ?? detail.data?.counselor_notes ?? [];

  async function saveNote() {
    const text = note.trim();
    if (!text) return;
    setSaving(true);
    setSaveError(null);
    try {
      const created = await HealthAPI.addCounselorNote(studentId, text);
      setNotes([...(actualNotes || []), created]);
      setNote('');
    } catch (error) {
      setSaveError(error);
    } finally {
      setSaving(false);
    }
  }

  if (detail.loading) return <Card><Skeleton height={240} /></Card>;
  if (detail.error) return <ErrorState message={detail.error.message} onRetry={detail.reload} />;

  const d = detail.data;

  return (
    <Card title={`${d.user?.name || studentId} 상세`} action={<button className="btn btn-ghost" onClick={onClose}>닫기</button>}>
      <Disclaimer>
        아래 내용은 AI가 작성한 참고용 요약이며 의학적 진단이 아닙니다. 상담사의 판단과 직접 작성한 메모로 보완해 주세요.
      </Disclaimer>

      {d.comparison ? (
        <div style={{ marginTop: 14 }}>
          <BodyMapWorkspace comparisonData={d.comparison} height={340} />
        </div>
      ) : (
        <p className="muted" style={{ marginTop: 14 }}>비교할 체형 데이터가 아직 없습니다.</p>
      )}

      {d.latest_analysis && (
        <div style={{ marginTop: 14 }}>
          <h3>AI 분석 요약</h3>
          <p className="muted">{d.latest_analysis.summary}</p>
        </div>
      )}

      <div style={{ marginTop: 14 }}>
        <h3>루틴 / 운동 기록</h3>
        <p className="muted">루틴 {d.routines?.length ?? 0}건 · 운동 기록 {d.workouts?.length ?? 0}건</p>
      </div>

      <div style={{ marginTop: 18 }}>
        <h3>상담사 메모</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
          {(actualNotes || []).length === 0 && <p className="muted">작성된 메모가 없습니다.</p>}
          {(actualNotes || []).map((n) => (
            <div key={n.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
              <p style={{ margin: 0 }}>{n.note}</p>
              <span className="muted" style={{ fontSize: '.7rem' }}>{n.created_at}</span>
            </div>
          ))}
        </div>
        {saveError && <ErrorState message={saveError.message} onRetry={saveNote} />}
        <textarea
          className="text-input"
          style={{ marginTop: 10, minHeight: 80, resize: 'vertical' }}
          placeholder="상담 메모를 입력하세요"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <button className="btn btn-primary" style={{ marginTop: 8 }} onClick={saveNote} disabled={saving || !note.trim()}>
          {saving ? '저장 중...' : '메모 저장'}
        </button>
      </div>
    </Card>
  );
}

export default function CounselorDashboardPage() {
  const students = useApiData(() => HealthAPI.counselorStudents(), []);
  const [selectedId, setSelectedId] = useState(null);

  if (students.loading) return <Card><Skeleton height={260} /></Card>;
  if (students.error) return <ErrorState message={students.error.message} onRetry={students.reload} />;

  const list = students.data || [];

  return (
    <>
      <Card title="학생 관리">
        <Disclaimer>
          본인에게 배정된 학교에서 공유에 동의한 학생만 표시됩니다. 아래 지표는 참고용 요약입니다. 의학적 진단이 아니며, 필요 시 학생과의 상담 및 재측정을 안내해 주세요.
        </Disclaimer>
        {list.length === 0 ? (
          <EmptyState title="등록된 학생 데이터가 없어요" />
        ) : (
          <div style={{ overflowX: 'auto', marginTop: 12 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.875rem' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--muted)' }}>
                  <th style={{ padding: '6px 8px' }}>이름</th>
                  <th style={{ padding: '6px 8px' }}>최근 측정일</th>
                  <th style={{ padding: '6px 8px' }}>골격근량</th>
                  <th style={{ padding: '6px 8px' }}>체지방률</th>
                  <th style={{ padding: '6px 8px' }}>이번 주 완료율</th>
                  <th style={{ padding: '6px 8px' }}></th>
                </tr>
              </thead>
              <tbody>
                {list.map((s) => (
                  <tr key={s.id} style={{ borderTop: '1px solid var(--line)', cursor: 'pointer' }} onClick={() => setSelectedId(s.id)}>
                    <td style={{ padding: '10px 8px', fontWeight: 700 }}>
                      {s.name}
                      {s.needs_remeasurement && <span style={{ marginLeft: 6 }}><Badge tone="warning">재측정 필요</Badge></span>}
                    </td>
                    <td style={{ padding: '10px 8px' }}>{s.latest_measurement_date || '측정되지 않음'}</td>
                    <td style={{ padding: '10px 8px' }}>{s.skeletal_muscle_mass != null ? `${s.skeletal_muscle_mass} kg` : '—'}</td>
                    <td style={{ padding: '10px 8px' }}>
                      {s.body_fat_percentage != null ? `${s.body_fat_percentage}%` : '—'}
                      {fmtDelta(s.body_fat_percentage_delta) && (
                        <span className="muted" style={{ marginLeft: 4 }}>({fmtDelta(s.body_fat_percentage_delta)})</span>
                      )}
                    </td>
                    <td style={{ padding: '10px 8px' }}>{s.routine_completion_percent != null ? `${Math.round(s.routine_completion_percent)}%` : '—'}</td>
                    <td style={{ padding: '10px 8px' }}>
                      <button className="btn btn-ghost" onClick={(e) => { e.stopPropagation(); setSelectedId(s.id); }}>상세보기</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {selectedId && <StudentDetail studentId={selectedId} onClose={() => setSelectedId(null)} />}
    </>
  );
}
