import React, { useState } from "react";
import { Copy, BookmarkPlus, Undo2 } from "lucide-react";
import { useGym } from "./GymContext.jsx";
import { saveRoutineTemplate } from "./workflow.js";
import { Field, Notice } from "./ui.jsx";
export default function RoutineTemplates({ entries, count, onApply }) {
  const { state, update } = useGym();
  const [name, setName] = useState(""),
    [id, setId] = useState(""),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [undo, setUndo] = useState(null);
  const templates = state.routineTemplates || [];
  async function save() {
    try {
      setBusy(true);
      let created;
      await update((s) => {
        created = saveRoutineTemplate(s, name, entries, count);
      });
      setId(created.id);
      setName("");
      setMessage(
        "개인 정보 없이 운동 구성만 저장했습니다. 다른 회원에게도 적용할 수 있어요.",
      );
      setError("");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  function apply() {
    const t = templates.find((x) => x.id === id);
    if (!t) return;
    setUndo({ entries: structuredClone(entries), count });
    onApply(structuredClone(t.entries), t.count);
    setMessage(
      `‘${t.name}’을 불러왔습니다. 회원에게 맞게 조정한 후 계획을 저장하세요.`,
    );
    setError("");
  }
  return (
    <details className="gym-template-panel">
      <summary>
        <Copy size={18} />
        <span>
          자주 쓰는 루틴 템플릿
          <small>운동을 다시 찾지 않고 빠르게 구성하세요</small>
        </span>
        <span className="gym-pill">{templates.length}개</span>
      </summary>
      <div className="gym-template-body">
        <div>
          <h3>저장한 구성 불러오기</h3>
          <Field label="루틴 템플릿 선택">
            <select value={id} onChange={(e) => setId(e.target.value)}>
              <option value="">템플릿 선택</option>
              {templates.map((t) => (
                <option value={t.id} key={t.id}>
                  {t.name} · {t.entries.length}개 동작
                </option>
              ))}
            </select>
          </Field>
          <button
            className="gym-button secondary small"
            disabled={!id || busy}
            onClick={apply}
          >
            <Copy size={16} />
            운동 구성 적용
          </button>
          {undo && (
            <button
              className="gym-quiet-button"
              onClick={() => {
                onApply(undo.entries, undo.count);
                setUndo(null);
                setMessage("이전 운동 구성으로 되돌렸습니다.");
              }}
            >
              <Undo2 size={14} />
              적용 취소
            </button>
          )}
        </div>
        <div>
          <h3>현재 구성을 템플릿으로</h3>
          <Field label="새 템플릿 이름">
            <input
              maxLength={40}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 전신 기초 · 주 3회"
            />
          </Field>
          <button
            className="gym-button secondary small"
            disabled={busy || !entries.length || !name.trim()}
            onClick={save}
          >
            <BookmarkPlus size={16} />
            {busy ? "저장 중…" : "템플릿 저장"}
          </button>
        </div>
      </div>
      <Notice error>{error}</Notice>
      <Notice>{message}</Notice>
    </details>
  );
}
