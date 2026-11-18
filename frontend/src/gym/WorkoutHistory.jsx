import React, { useState } from "react";
import { Check, ChevronDown, Activity, MessageCircle } from "lucide-react";
import { Card, Empty } from "./ui.jsx";
import ExerciseResults from "./ExerciseResults.jsx";
import { workoutHistory } from "./workflow.js";
export default function WorkoutHistory({ member, repliesOnly = false }) {
  const [filter, setFilter] = useState("all"),
    [limit, setLimit] = useState(7);
  const weeks = repliesOnly ? [] : workoutHistory(member);
  const logs = [...member.logs]
    .sort((a, b) => b.date.localeCompare(a.date))
    .filter(
      (l) =>
        repliesOnly ? Boolean(l.feedback) : filter === "all" ||
        (filter === "partial"
          ? l.status === "partial"
          : l.status !== "partial"),
    );
  return (
    <Card title={repliesOnly ? "트레이너의 운동 코멘트" : "나의 운동 기록"}>
      {!repliesOnly && <>
        <div className="gym-history-summary">
          <div>
            <span className="gym-eyebrow">LAST 4 WEEKS</span>
            <strong>
              {weeks.reduce((sum, w) => sum + w.days, 0)}
              <small>일</small>
            </strong>
            <p>최근 4주 운동 완료일</p>
          </div>
          <div className="gym-history-bars" aria-label="주별 운동 완료일">
            {weeks.map((w) => (
              <div key={w.start}>
                <strong>{w.days}일</strong>
                <div>
                  <span style={{ height: `${(w.days / 7) * 100}%` }} />
                </div>
                <small>{w.label}</small>
              </div>
            ))}
          </div>
        </div>
        <div className="gym-segment" aria-label="기록 필터">
          {[
            ["all", "전체"],
            ["complete", "완료"],
            ["partial", "부분 수행"],
          ].map(([value, label]) => (
            <button
              key={value}
              aria-pressed={filter === value}
              className={filter === value ? "active" : ""}
              onClick={() => {
                setFilter(value);
                setLimit(7);
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </>}
      {logs.slice(0, limit).map((l) => (
        <article className="gym-history-entry" key={l.id}>
          <div className="gym-row">
            <span className="gym-avatar">
              {l.status === "partial" ? (
                <Activity size={17} />
              ) : (
                <Check size={17} />
              )}
            </span>
            <div>
              <strong>{l.name}</strong>
              <p>
                {l.date} · {l.effort}
              </p>
              <p>
                {l.completedSets !== undefined
                  ? `${l.completedSets}/${l.totalSets}세트 수행`
                  : "수행 기록"}
                {l.minutes ? ` · 기록 시간 ${l.minutes}분` : ""}
              </p>
              <ExerciseResults rows={l.exerciseResults}/>
            </div>
            <span
              className={"gym-pill " + (l.status === "partial" ? "neutral" : "")}
            >
              {l.status === "partial" ? "부분 수행" : "완료"}
            </span>
          </div>
          {l.feedback && <div className="gym-coach-reply answered">
            <MessageCircle size={16}/>
            <div><strong>트레이너 코멘트</strong><p>{l.feedback}</p></div>
          </div>}
        </article>
      ))}
      {!logs.length && (
        <Empty>
          {filter === "all"
            ? "첫 운동을 마치면 내 기록이 여기에 쌓입니다."
            : "해당하는 기록이 없습니다."}
        </Empty>
      )}
      {logs.length > limit && (
        <button
          className="gym-button secondary gym-full"
          onClick={() => setLimit((n) => n + 7)}
        >
          기록 더 보기 ({logs.length - limit}건)
          <ChevronDown size={16} />
        </button>
      )}
    </Card>
  );
}
