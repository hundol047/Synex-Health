import React, { useState } from "react";
import { Link } from "react-router-dom";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useGym } from "./GymContext.jsx";
import useLocalDay from "./useLocalDay.js";
import { Card } from "./ui.jsx";

const periods = [[7, "7일"], [30, "30일"], [0, "전체"]];
const dayMs = 86400000;
// Map local calendar dates to equally spaced days, including across daylight-saving changes.
const dayNumber = date => Date.parse(date + "T00:00:00Z") / dayMs;
const isoDay = n => new Date(n * dayMs).toISOString().slice(0, 10);
const axisDate = n => isoDay(n).slice(5).replace("-", "/");

export default function WeightTrendPage() {
  const { state } = useGym();
  const today = dayNumber(useLocalDay());
  const [days, setDays] = useState(30);
  const records = Object.entries(state.self.dailyWeights ?? {})
    .map(([date, kg]) => ({ date, day: dayNumber(date), kg }))
    .filter(row => row.day <= today && (!days || row.day > today - days))
    .sort((a, b) => a.day - b.day);
  const first = records[0];
  const last = records.at(-1);
  const change = last ? Number((last.kg - first.kg).toFixed(1)) : 0;
  const end = days ? today : last?.day ?? today;
  const start = days ? today - days + 1 : Math.min(first?.day ?? today, end - 1);
  const ticks = [...new Set([start, Math.round((start + end) / 2), end])];

  return <>
    <div className="gym-page-head"><h1>체중 변화</h1></div>
    <Card className="gym-weight-trend">
      <div className="gym-weight-periods" role="group" aria-label="조회 기간">
        {periods.map(([span, label]) => (
          <button key={span} type="button" aria-pressed={days === span}
            onClick={() => setDays(span)}>{label}</button>
        ))}
      </div>
      {last ? <>
        <div className="gym-weight-figures">
          <div><span>마지막 기록 · {last.date}</span><strong>{last.kg.toFixed(1)} kg</strong></div>
          {records.length > 1 && <div><span>기간 내 변화</span>
            <strong>{change > 0 ? "+" : ""}{change.toFixed(1)} kg</strong></div>}
        </div>
        <div className="gym-weight-plot" role="group" aria-label="날짜별 체중 선 그래프">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={records} margin={{ top: 10, right: 22, bottom: 5, left: 0 }} accessibilityLayer>
              <CartesianGrid vertical={false} stroke="#d8e4f0" strokeDasharray="4 4" />
              <XAxis dataKey="day" type="number" domain={[start, end]} ticks={ticks}
                tickFormatter={axisDate} tick={{ fontSize: 12, fill: "#425b72" }} tickLine={false} />
              <YAxis width={44} domain={[min => Math.floor(min - 0.5), max => Math.ceil(max + 0.5)]}
                tick={{ fontSize: 12, fill: "#425b72" }} tickCount={5} axisLine={false} tickLine={false} />
              <Tooltip labelFormatter={isoDay} formatter={kg => [Number(kg).toFixed(1) + " kg", "체중"]} />
              <Line type="linear" dataKey="kg" stroke="#2364bc" strokeWidth={3} isAnimationActive={false}
                dot={records.length <= 45 ? { r: 4, fill: "#fff", strokeWidth: 2 } : false}
                activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        {records.length === 1 && <p>다른 날짜의 체중을 기록하면 두 점이 선으로 연결됩니다.</p>}
        <details>
          <summary>날짜별 수치 보기 ({records.length}일)</summary>
          <ul>{records.slice().reverse().map(row => <li key={row.date}>
            <time dateTime={row.date}>{row.date}</time><strong>{row.kg.toFixed(1)} kg</strong>
          </li>)}</ul>
        </details>
      </> : <p className="gym-empty">이 기간에 기록한 체중이 없습니다.</p>}
      <Link className="gym-text-link gym-weight-chart-link" to="/health">오늘 화면에서 체중 기록하기</Link>
    </Card>
  </>;
}
