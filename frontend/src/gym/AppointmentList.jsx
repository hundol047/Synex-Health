import React, { useState } from "react";
import { Empty, Field } from "./ui.jsx";

const pageSize = 8;

export default function AppointmentList({ rows, focus, empty, children }) {
  const [selection, setSelection] = useState(null);
  if (!rows.length) return <Empty>{empty}</Empty>;

  const pages = Math.ceil(rows.length / pageSize);
  const focusedIndex = focus ? rows.findIndex(row => row.id === focus.id) : -1;
  const page = selection && selection.focus === focus
    ? Math.min(selection.page, pages - 1)
    : Math.floor(Math.max(0, focusedIndex) / pageSize);
  const start = page * pageSize;

  return <>
    {pages > 1 && <Field label={`PT 일정 구간 · 전체 ${rows.length}건`}>
      <select value={page} onChange={event => setSelection({ focus, page: Number(event.target.value) })}>
        {Array.from({ length: pages }, (_, index) => {
          const first = index * pageSize;
          const end = Math.min(first + pageSize, rows.length) - 1;
          return <option key={index} value={index}>
            {first + 1}–{end + 1}번 · {rows[first].date} ~ {rows[end].date}
          </option>;
        })}
      </select>
    </Field>}
    {rows.slice(start, start + pageSize).map(children)}
  </>;
}
