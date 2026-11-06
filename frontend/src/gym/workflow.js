import { exercises, makePlan, today, validDate } from "./store.js";
export const DAYS = ["월", "화", "수", "목", "금", "토", "일"];
export function dateKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function weekDates(anchor = today(), offset = 0) {
  const d = new Date(anchor + "T12:00:00");
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7) + offset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const x = new Date(d);
    x.setDate(x.getDate() + i);
    return dateKey(x);
  });
}
export function weekStats(member, dates = weekDates()) {
  const logs = member.logs.filter((l) => dates.includes(l.date));
  const completed = new Set(
    logs.filter((l) => l.status !== "partial").map((l) => l.date),
  );
  return {
    logs,
    completed,
    days: completed.size,
    target: member.plan?.frequency || 0,
  };
}
export const upcoming = (member) =>
  member.appointments
    .filter(
      (a) => new Date(a.date + "T" + a.time).getTime() + 3600000 > Date.now(),
    )
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
export function entryFor(id) {
  const e = exercises.find((x) => x.id === id);
  if (!e) throw Error("운동을 다시 선택해 주세요.");
  return {
    id: e.id,
    name: e.name,
    sets: e.sets || 2,
    reps: e.dose_type === "duration" ? "30" : String(e.reps || "8–12"),
    dose: e.dose_type,
    rest: e.rest ?? 60,
  };
}
export function editablePlan(entries, count, appointments, start) {
  if (start && !validDate(start)) throw Error("계획 시작 날짜를 선택하세요.");
  if (entries.length < 1 || entries.length > 12)
    throw Error("운동을 1~12개 선택해 주세요.");
  if (new Set(entries.map((e) => e.id)).size !== entries.length)
    throw Error("같은 운동은 한 번만 추가해 주세요.");
  for (const e of entries) {
    if (
      !Number.isInteger(Number(e.sets)) ||
      Number(e.sets) < 1 ||
      Number(e.sets) > 10
    )
      throw Error("세트 수는 1~10으로 입력하세요.");
    if (
      !/^\d{1,3}(?:\s*[-–~]\s*\d{1,3})?$/.test(String(e.reps)) ||
      Number(String(e.reps).split(/[-–~]/)[0]) < 1
    )
      throw Error("횟수·시간은 1 이상의 숫자 또는 범위로 입력하세요.");
    const dose = String(e.reps).split(/[-–~]/).map(Number);
    if (dose.length === 2 && dose[0] > dose[1])
      throw Error("횟수 범위는 작은 값부터 입력하세요.");
    if (
      !Number.isInteger(Number(e.rest)) ||
      Number(e.rest) < 0 ||
      Number(e.rest) > 300
    )
      throw Error("휴식은 0~300초로 설정하세요.");
  }
  const p = makePlan(
    entries.map((e) => e.id),
    Number(count),
    appointments,
    start,
  );
  const rows = entries.map((e) => ({
    ...entryFor(e.id),
    sets: Number(e.sets),
    reps: String(e.reps),
    rest: Number(e.rest),
  }));
  const short = rows.map((e) => ({
    ...e,
    sets: Math.max(1, Math.ceil(e.sets / 2)),
  }));
  const minutes = (xs) =>
    Math.max(
      1,
      Math.ceil(
        xs.reduce(
          (sum, e) =>
            sum +
            e.sets *
              (e.dose === "duration" ? Number(e.reps.split(/[-–~]/)[0]) : 45) +
            Math.max(0, e.sets - 1) * e.rest,
          0,
        ) / 60,
      ) + 3,
    );
  p.options = [
    {
      id: "standard",
      name: "오늘의 기본 루틴",
      minutes: minutes(rows),
      exercises: rows,
    },
    {
      id: "short",
      name: "가볍게 이어가기",
      minutes: minutes(short),
      exercises: short,
    },
  ];
  return p;
}
export function reschedulePlan(plan, appointments) {
  if (!plan) return null;
  return editablePlan(
    plan.options[0].exercises.map((e) => ({ ...e, rest: e.rest ?? 60 })),
    Math.max(
      plan.frequency,
      new Set(
        appointments
          .filter((a) => weekDates(plan.dates[0]).includes(a.date))
          .map((a) => a.date),
      ).size,
    ),
    appointments,
    plan.dates[0],
  );
}
export function newSession(plan, option) {
  return {
    id: crypto.randomUUID(),
    planId: plan.id,
    optionId: option.id,
    name: option.name,
    exercises: structuredClone(option.exercises),
    date: today(),
    startedAt: Date.now(),
    runningSince: Date.now(),
    elapsedMs: 0,
    paused: false,
    checked: [],
    index: 0,
    restUntil: null,
  };
}
export const setKeys = (session) =>
  session.exercises.flatMap((e) =>
    Array.from({ length: e.sets }, (_, i) => `${e.id}:${i}`),
  );
export function sessionSummary(session) {
  const keys = setKeys(session);
  return {
    total: keys.length,
    done: keys.filter((k) => session.checked.includes(k)).length,
  };
}
export function finishSession(member, effort, now = Date.now()) {
  const s = member.session;
  if (!s) throw Error("진행 중인 운동이 없습니다.");
  const { total, done } = sessionSummary(s);
  if (!done) throw Error("수행한 세트를 1개 이상 체크해 주세요.");
  const log = {
    id: s.id,
    date: s.date,
    planId: s.planId,
    optionId: s.optionId,
    name: s.name,
    effort,
    status: done === total ? "complete" : "partial",
    completedSets: done,
    totalSets: total,
    minutes: Math.max(1, Math.round(sessionElapsed(s, now) / 60000)),
  };
  if (!member.logs.some((l) => l.id === s.id)) member.logs.unshift(log);
  member.session = null;
  return log;
}

export function sessionElapsed(session, now = Date.now()) {
  return Math.max(
    0,
    (session.elapsedMs || 0) +
      (session.paused ? 0 : now - (session.runningSince ?? session.startedAt)),
  );
}
export function pauseSession(session, paused, now = Date.now()) {
  if (Boolean(session.paused) === paused) return;
  if (paused) {
    session.elapsedMs = sessionElapsed(session, now);
    session.restRemaining = Math.max(0, (session.restUntil || 0) - now);
    session.restUntil = null;
    session.runningSince = null;
  } else {
    session.runningSince = now;
    session.restUntil = session.restRemaining
      ? now + session.restRemaining
      : null;
    session.restRemaining = 0;
  }
  session.paused = paused;
}
