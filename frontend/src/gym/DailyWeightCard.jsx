import React, { useState } from "react";
import { Link } from "react-router-dom";
import { TrendingUp } from "lucide-react";
import { useGym } from "./GymContext.jsx";
import { Card, Field, Notice } from "./ui.jsx";
import { saveDailyWeight } from "./store.js";

export default function DailyWeightCard({ day }) {
  const { state, update } = useGym();
  const [date, setDate] = useState(day);
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const member = state.self;
  const history = member.dailyWeights ?? {};
  const saved = history[date];
  const value = draft ?? saved ?? "";
  const dates = Object.keys(history).sort().reverse();

  function selectDate(next) {
    setDate(next);
    setDraft(null);
    setError("");
    setMessage("");
  }
  async function save(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await update(current => {
        if (current.self.id !== member.id) throw Error("회원이 변경되었습니다. 다시 입력해 주세요.");
        saveDailyWeight(current.self, date, value);
      });
      setDraft(null);
      setMessage(date + " 체중 " + Number(value) + " kg을 저장했어요.");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card title="매일 체중 기록" className="gym-weight-card">
      <form onSubmit={save}>
        <Field label="기록 날짜">
          <input type="date" required max={day} value={date} disabled={busy}
            onChange={e => selectDate(e.target.value)} />
        </Field>
        <Field label="체중 (kg)">
          <input type="number" inputMode="decimal" min="20" max="300" step="0.1"
            placeholder="예: 68.5" required value={value} disabled={busy}
            onChange={e => { setDraft(e.target.value); setError(""); setMessage(""); }} />
        </Field>
        <button className="gym-button" disabled={busy || !date || value === "" || Number(value) === saved}>
          {saved == null ? "체중 저장" : "체중 수정"}
        </button>
      </form>
      <Link className="gym-text-link gym-weight-chart-link" to="/health/weight-trend">
        <TrendingUp size={18} /> 체중 변화 그래프 보기
      </Link>
      <Notice error>{error}</Notice>
      <Notice>{message}</Notice>
      {dates.length > 0 && (
        <details>
          <summary>지난 체중 기록 ({dates.length}일)</summary>
          <ul>
            {dates.map(d => <li key={d}>
              <button type="button" disabled={busy} onClick={() => selectDate(d)} aria-label={d + " 체중 불러오기"}>
                <time dateTime={d}>{d}</time><strong>{history[d]} kg</strong>
              </button>
            </li>)}
          </ul>
        </details>
      )}
    </Card>
  );
}
