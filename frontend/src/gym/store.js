import { loadLocalDocument, saveLocalDocument } from "../shared/lib/offline.js";
import catalog from "../shared/lib/localCatalog.json";
export const COACH_BUILD = import.meta.env.VITE_APP_AUDIENCE === "coach";
export const exercises = catalog.filter((e) => e.auto_recommend !== false);
export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const uuid = () => crypto.randomUUID();
export const freshMember = (name = "나") => ({
  id: uuid(),
  name,
  goal: "체력 향상",
  plan: null,
  appointments: [],
  logs: [],
  meals: [],
  benefit: { type: "prevent", reminders: false },
  linkedCoach: null,
});
const initial = () => ({
  version: 1,
  coachId: uuid(),
  gymName: "나의 트레이닝 공간",
  members: [],
  self: freshMember(),
  selected: null,
});
let queue = Promise.resolve();
export async function readGym() {
  return (await loadLocalDocument("synex-gym-v1")) || initial();
}
export function mutateGym(fn) {
  const task = queue
    .catch(() => {})
    .then(async () => {
      const state = await readGym();
      await fn(state);
      await saveLocalDocument(state, "synex-gym-v1");
      window.dispatchEvent(new Event("synex-gym-change"));
      return state;
    });
  queue = task;
  return task;
}
export async function ensureGym() {
  return mutateGym(() => {});
}
export function validDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;
  const d = new Date(value + "T12:00:00");
  return (
    Number.isFinite(d.getTime()) &&
    d.getFullYear() === Number(value.slice(0, 4)) &&
    d.getMonth() + 1 === Number(value.slice(5, 7)) &&
    d.getDate() === Number(value.slice(8))
  );
}
export function validateAppointment(rows, date, time, id) {
  if (!validDate(date) || !/^\d{2}:\d{2}$/.test(time))
    throw Error("PT 날짜와 시간을 선택하세요.");
  const stamp = Date.parse(date + "T" + time);
  if (
    !Number.isFinite(stamp) ||
    new Date(stamp).getHours() !== Number(time.slice(0, 2)) ||
    new Date(stamp).getMinutes() !== Number(time.slice(3)) ||
    stamp <= Date.now()
  )
    throw Error("지금 이후의 올바른 PT 날짜와 시간을 선택하세요.");
  if (
    rows.some(
      (a) =>
        a.id !== id &&
        Math.abs(Date.parse(a.date + "T" + a.time) - stamp) < 60 * 60 * 1000,
    )
  )
    throw Error("앞뒤 60분 이내에 다른 PT가 있습니다. 시간을 조정하세요.");
}
export function weeklyPlan(count, ptDays = []) {
  if (!Number.isInteger(count) || count < 1 || count > 7)
    throw Error("주간 운동 횟수를 확인하세요.");
  const selected = [...new Set(ptDays.filter((x) => x >= 0 && x < 7))].sort();
  if (selected.length > count)
    throw Error("PT 일수 이상으로 주간 운동 횟수를 선택하세요.");
  while (selected.length < count) {
    let best = -1,
      score = -1;
    for (let d = 0; d < 7; d++) {
      if (selected.includes(d)) continue;
      const distance = selected.length
        ? Math.min(...selected.map((s) => Math.abs(s - d)))
        : d === 0
          ? 8
          : 0;
      if (distance > score) {
        best = d;
        score = distance;
      }
    }
    selected.push(best);
  }
  return selected.sort((a, b) => a - b);
}
export function makePlan(ids, count, appointments, startDate) {
  if (!Number.isInteger(Number(count)) || count < 1 || count > 7)
    throw Error("주간 운동 횟수는 1~7회로 선택하세요.");
  if (!ids.length) throw Error("운동을 1개 이상 선택하세요.");
  const future = appointments
    .filter((a) => a.date >= today())
    .sort((a, b) => a.date.localeCompare(b.date));
  if (startDate && !validDate(startDate))
    throw Error("계획 시작 날짜를 확인해 주세요.");
  const start = new Date(
    (startDate || future[0]?.date || today()) + "T12:00:00",
  );
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const ptDays = dates.flatMap((d, i) =>
    appointments.some((a) => a.date === d) ? [i] : [],
  );
  const days = weeklyPlan(Number(count), ptDays);
  const entries = ids.map((id) => {
    const e = exercises.find((e) => e.id === id);
    if (!e) throw Error("운동 정보를 다시 선택하세요.");
    return {
      id: e.id,
      name: e.name,
      sets: e.sets || 2,
      reps: e.reps || "8–12",
      dose: e.dose_type,
    };
  });
  return {
    id: uuid(),
    updatedAt: new Date().toISOString(),
    frequency: Number(count),
    dates,
    days,
    ptDays,
    options: [
      {
        id: "standard",
        name: "오늘의 기본 루틴",
        minutes: 40,
        exercises: entries,
      },
      {
        id: "short",
        name: "짧고 가볍게",
        minutes: 20,
        exercises: entries.slice(0, Math.max(1, Math.ceil(entries.length / 2))),
      },
    ],
  };
}
function limitedText(v, max = 200) {
  if (typeof v !== "string" || v.length > max)
    throw Error("공유 파일의 글자 수나 형식이 맞지 않습니다.");
  return v;
}
export function parseTransfer(raw) {
  try {
    return parseTransferData(raw);
  } catch (e) {
    if (e instanceof TypeError)
      throw Error(
        "공유 파일 형식이 올바르지 않습니다. 최신 Synex 파일을 선택하세요.",
      );
    throw e;
  }
}
function parseTransferData(raw) {
  if (raw.length > 12 * 1024 * 1024)
    throw Error("12MB 이하의 공유 파일을 선택하세요.");
  let v;
  try {
    v = JSON.parse(raw);
  } catch {
    throw Error("Synex 공유 파일(.json)을 선택하세요.");
  }
  if (
    v?.format !== "synex-gym-transfer" ||
    v.version !== 1 ||
    !["plan", "progress"].includes(v.kind)
  )
    throw Error("지원하는 Synex 공유 파일이 아닙니다.");
  limitedText(v.memberId, 80);
  limitedText(v.coachId, 80);
  limitedText(v.name, 40);
  if (v.kind === "plan") {
    if (
      !v.plan ||
      !Array.isArray(v.plan.options) ||
      v.plan.options.length !== 2 ||
      !Array.isArray(v.appointments) ||
      v.appointments.length > 100
    )
      throw Error("운동 계획 형식이 올바르지 않습니다.");
    const p = v.plan;
    limitedText(p.id, 80);
    if (
      typeof p.updatedAt !== "string" ||
      !Number.isFinite(Date.parse(p.updatedAt))
    )
      throw Error("계획 저장일을 확인하세요.");
    if (
      !Number.isInteger(p.frequency) ||
      p.frequency < 1 ||
      p.frequency > 7 ||
      !Array.isArray(p.days) ||
      p.days.some((d) => !Number.isInteger(d) || d < 0 || d > 6) ||
      !Array.isArray(p.ptDays) ||
      !Array.isArray(p.dates) ||
      p.dates.length !== 7 ||
      p.dates.some((d) => !validDate(d)) ||
      p.ptDays.some((d) => !Number.isInteger(d) || d < 0 || d > 6) ||
      new Set(p.days).size !== p.days.length ||
      p.days.length !== p.frequency
    )
      throw Error("주간 계획을 확인해 주세요.");
    if (new Set(p.options.map((o) => o?.id)).size !== 2)
      throw Error("루틴 구분을 확인해 주세요.");
    p.options.forEach((o) => {
      if (
        !o ||
        !Number.isFinite(o.minutes) ||
        o.minutes < 1 ||
        o.minutes > 1440
      )
        throw Error("루틴 시간을 확인해 주세요.");
      limitedText(o.id, 40);
      limitedText(o.name, 40);
      if (
        !Array.isArray(o.exercises) ||
        !o.exercises.length ||
        o.exercises.length > 20 ||
        new Set(o.exercises.map((e) => e?.id)).size !== o.exercises.length
      )
        throw Error("운동 개수를 확인해 주세요.");
      o.exercises.forEach((e) => {
        if (!e || !exercises.some((x) => x.id === e.id))
          throw Error("지원하지 않는 운동입니다.");
        limitedText(e.name, 80);
        if (!Number.isInteger(e.sets) || e.sets < 1 || e.sets > 20)
          throw Error("세트 수가 올바르지 않습니다.");
        if (!["string", "number"].includes(typeof e.reps))
          throw Error("운동 횟수 형식을 확인하세요.");
        limitedText(String(e.reps), 40);
        if (e.dose !== undefined && !["duration", "reps"].includes(e.dose))
          throw Error("운동 단위를 확인하세요.");
        if (
          e.rest !== undefined &&
          (!Number.isInteger(e.rest) || e.rest < 0 || e.rest > 300)
        )
          throw Error("휴식 시간을 확인하세요.");
      });
    });
    v.appointments.forEach((a) => {
      limitedText(a.id, 80);
      if (!validDate(a.date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(a.time))
        throw Error("PT 일정 형식 오류");
    });
    if (!Array.isArray(v.feedback) || v.feedback.length > 100)
      throw Error("피드백 형식 오류");
    v.feedback.forEach((f) => {
      limitedText(f.id, 80);
      limitedText(f.feedback, 600);
    });
  } else {
    if (
      !Array.isArray(v.logs) ||
      v.logs.length > 500 ||
      !Array.isArray(v.meals) ||
      v.meals.length > 100
    )
      throw Error("기록 개수를 확인해 주세요.");
    v.logs.forEach((l) => {
      limitedText(l.id, 80);
      limitedText(l.date, 10);
      limitedText(l.name, 80);
      limitedText(l.effort, 20);
      if (!validDate(l.date)) throw Error("운동 기록 날짜를 확인하세요.");
      if (l.status !== undefined && !["partial", "complete"].includes(l.status))
        throw Error("운동 완료 상태를 확인하세요.");
      for (const key of ["minutes", "completedSets", "totalSets"])
        if (
          l[key] !== undefined &&
          (!Number.isInteger(l[key]) || l[key] < 0 || l[key] > 100000)
        )
          throw Error("운동량 형식을 확인하세요.");
    });
    v.meals.forEach((m) => {
      limitedText(m.id, 80);
      limitedText(m.note, 500);
      limitedText(m.date, 40);
      if (
        typeof m.photo !== "string" ||
        !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(m.photo) ||
        m.photo.length > 1500000
      )
        throw Error("식단 사진 형식 오류");
    });
  }
  return v;
}
export function transferFor(state, role, member) {
  const packet = {
    format: "synex-gym-transfer",
    version: 1,
    kind: role === "coach" ? "plan" : "progress",
    coachId: role === "coach" ? state.coachId : member.linkedCoach,
    memberId: member.id,
    name: member.name,
    createdAt: new Date().toISOString(),
    ...(role === "coach"
      ? {
          plan: member.plan,
          appointments: member.appointments,
          feedback: member.meals.slice(0, 100).map((m) => ({
            id: m.id,
            feedback: m.feedback || "",
          })),
        }
      : {
          logs: member.logs.slice(0, 500),
          meals: member.meals.slice(0, 100).map(({ feedback, ...m }) => m),
        }),
  };
  if (role !== "coach") {
    const photos = packet.meals;
    packet.meals = [];
    let bytes = new TextEncoder().encode(JSON.stringify(packet)).length;
    for (const meal of photos) {
      const size = new TextEncoder().encode(JSON.stringify(meal)).length + 1;
      if (bytes + size > 11 * 1024 * 1024) break;
      packet.meals.push(meal);
      bytes += size;
    }
  }
  return packet;
}
export function applyTransfer(state, v, role) {
  if (role === "coach") {
    if (v.kind !== "progress" || v.coachId !== state.coachId)
      throw Error("이 트레이너에게 보내진 회원 기록이 아닙니다.");
    const m = state.members.find((m) => m.id === v.memberId);
    if (!m) throw Error("등록된 회원의 기록인지 확인하세요.");
    const merge = (old, rows) => [
      ...new Map([...old, ...rows].map((x) => [x.id, x])).values(),
    ];
    m.logs = merge(m.logs, v.logs).sort((a, b) => b.date.localeCompare(a.date));
    m.meals = merge(
      m.meals,
      v.meals.map((x) => ({
        ...x,
        feedback: m.meals.find((y) => y.id === x.id)?.feedback || "",
        feedbackDraft: m.meals.find((y) => y.id === x.id)?.feedbackDraft,
      })),
    ).sort((a, b) => b.date.localeCompare(a.date));
    state.selected = m.id;
  } else {
    if (v.kind !== "plan")
      throw Error("트레이너가 보낸 계획 파일을 선택하세요.");
    const m = state.self;
    if (m.linkedCoach && (m.linkedCoach !== v.coachId || m.id !== v.memberId))
      throw Error("다른 회원의 계획입니다. 현재 연결을 먼저 확인하세요.");
    if (m.plan?.updatedAt && v.plan.updatedAt < m.plan.updatedAt)
      throw Error("현재 계획보다 오래된 파일입니다. 최신 계획을 받아주세요.");
    m.id = v.memberId;
    m.name = v.name;
    m.linkedCoach = v.coachId;
    m.plan = v.plan;
    m.appointments = v.appointments;
    m.meals = m.meals.map((x) => ({
      ...x,
      feedback:
        v.feedback.find((y) => y.id === x.id)?.feedback || x.feedback || "",
    }));
  }
}
