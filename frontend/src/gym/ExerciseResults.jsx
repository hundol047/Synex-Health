import React from "react";

export default function ExerciseResults({ rows }) {
  if (!rows?.length) return null;
  return (
    <details className="gym-exercise-results">
      <summary>동작별 기록</summary>
      <ul>
        {rows.map((row, index) => (
          <li key={index}>
            <strong>{row.name} · {row.completed.length}/{row.sets}세트</strong>
            <p>목표 {row.target} · {row.rest ? `휴식 ${row.rest}초` : "휴식 없음"}</p>
            <p>{row.completed.length ? `완료한 세트 · ${row.completed.join(", ")}번` : "완료한 세트 없음"}</p>
          </li>
        ))}
      </ul>
    </details>
  );
}
