import { catalogEntry } from "./prescription.js";
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
      state.revision = (state.revision || 0) + 1;
      await saveLocalDocument(state, "synex-gym-v1");
      window.dispatchEvent(
        new CustomEvent("synex-gym-change", { detail: structuredClone(state) }),
      );
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
export function saveDailyWeight(member, date, value) {
  if (!validDate(date) || date > today())
    throw Error("오늘 또는 지난 날짜를 선택해 주세요.");
  const kg = Number(value);
  if (!Number.isFinite(kg) || kg < 20 || kg > 300 || !Number.isInteger(kg * 10))
    throw Error("체중은 20~300 kg 범위에서 소수점 한 자리까지 입력해 주세요.");
  member.dailyWeights ??= {};
  member.dailyWeights[date] = kg;
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
export function scheduleWeek(dates, requestedFrequency, appointments) {
  const booked = new Set(appointments.map(appointment => appointment.date));
  const ptDays = dates.flatMap((date, index) => booked.has(date) ? [index] : []);
  const frequency = Math.max(requestedFrequency, ptDays.length);
  return { requestedFrequency, frequency, ptDays, days: weeklyPlan(frequency, ptDays) };
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
  const entries = ids.map((id) => {
    const e = exercises.find((e) => e.id === id);
    if (!e) throw Error("운동 정보를 다시 선택하세요.");
    return catalogEntry(e);
  });
  return {
    id: uuid(),
    updatedAt: new Date().toISOString(),
    dates,
    ...scheduleWeek(dates, Number(count), appointments),
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
function validateExerciseResults(log) {
  const rows = log.exerciseResults;
  if (rows === undefined) return;
  const invalid = () => { throw Error("동작별 세트 기록을 확인해 주세요."); };
  if (!Array.isArray(rows) || !rows.length || rows.length > 20) invalid();
  let planned = 0, done = 0;
  for (const row of rows) {
    limitedText(row.name, 80);
    limitedText(row.target, 64);
    if (!Number.isInteger(row.sets) || row.sets < 1 || row.sets > 20 ||
        !Number.isInteger(row.rest) || row.rest < 0 || row.rest > 300 ||
        !Array.isArray(row.completed) || row.completed.length > row.sets ||
        new Set(row.completed).size !== row.completed.length ||
        row.completed.some(n => !Number.isInteger(n) || n < 1 || n > row.sets)) invalid();
    planned += row.sets;
    done += row.completed.length;
  }
  if (planned !== log.totalSets || done !== log.completedSets) invalid();
}
export const MAX_TRANSFER_BYTES = 12 * 1024 * 1024;

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
  if (raw.length > MAX_TRANSFER_BYTES || new TextEncoder().encode(raw).length > MAX_TRANSFER_BYTES)
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
      !Array.isArray(v.appointments)
    )
      throw Error("운동 계획 형식이 올바르지 않습니다.");
    if (v.createdAt !== undefined &&
        (typeof v.createdAt !== "string" || !Number.isFinite(Date.parse(v.createdAt))))
      throw Error("공유 파일의 생성일을 확인하세요.");
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
      (p.requestedFrequency !== undefined && (!Number.isInteger(p.requestedFrequency) ||
        p.requestedFrequency < 1 || p.requestedFrequency > p.frequency)) ||
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
        if (e.dose !== undefined && !["duration", "hold", "reps"].includes(e.dose))
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
    function validateReplies(replies) {
      if (!Array.isArray(replies)) throw Error("피드백 형식 오류");
      for (const reply of replies) {
        limitedText(reply.id, 80);
        limitedText(reply.feedback, 600);
      }
    }
    validateReplies(v.feedback);
    if (v.workoutFeedback !== undefined) validateReplies(v.workoutFeedback);
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
      validateExerciseResults(l);
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
function transferHeader(member, coachId, kind) {
  return {
    format: "synex-gym-transfer",
    version: 1,
    kind,
    coachId,
    memberId: member.id,
    name: member.name,
    createdAt: new Date().toISOString(),
  };
}

export function progressPackets(member, day = "") {
  const header = transferHeader(member, member.linkedCoach, "progress");
  const empty = () => ({ ...header, logs: [], meals: [] });
  const encoder = new TextEncoder();
  const jsonSize = value => encoder.encode(JSON.stringify(value)).length;
  const baseSize = jsonSize(empty());
  const logs = day ? member.logs.filter(log => log.date === day) : member.logs;
  const meals = day ? member.meals.filter(meal => meal.date.slice(0, 10) === day) : member.meals;
  const packets = [];
  let logIndex = 0;
  let mealIndex = 0;
  do {
    const packet = empty();
    let bytes = baseSize;
    while (logIndex < logs.length && packet.logs.length < 500) {
      const { feedback, feedbackDraft, ...log } = logs[logIndex];
      const size = jsonSize(log) + Number(packet.logs.length > 0);
      if (bytes + size > 11 * 1024 * 1024 && packet.logs.length) break;
      packet.logs.push(log);
      bytes += size;
      logIndex++;
    }
    while (mealIndex < meals.length && packet.meals.length < 100) {
      const { id, date, note, photo } = meals[mealIndex];
      // Base64 photo data is ASCII. Measure the small JSON fields without copying the photo.
      const size = jsonSize({ id, date, note, photo: "" }) + photo.length + Number(packet.meals.length > 0);
      if (bytes + size > 11 * 1024 * 1024 && (packet.logs.length || packet.meals.length)) break;
      packet.meals.push({ id, date, note, photo });
      bytes += size;
      mealIndex++;
    }
    packets.push(packet);
  } while (logIndex < logs.length || mealIndex < meals.length);
  return packets;
}

function savedReplies(rows) {
  return rows.filter(row => row.feedback).map(({ id, feedback }) => ({ id, feedback }));
}

export function transferFor(state, role, member, plan = member.plan) {
  if (role !== "coach") return progressPackets(member)[0];
  return {
    ...transferHeader(member, state.coachId, "plan"),
    plan,
    appointments: member.appointments,
    feedback: savedReplies(member.meals),
    workoutFeedback: savedReplies(member.logs),
  };
}
// The most recent calendar week stays in plan so existing single-plan saves are readable.
export function savedPlans(member) {
  return member.plan ? [...(member.earlierPlans ?? []), member.plan] : [];
}

export function storeWeekPlan(member, plan) {
  const ordered = [...savedPlans(member).filter(item => item.dates[0] !== plan.dates[0]), plan]
    .sort((a, b) => a.dates[0].localeCompare(b.dates[0]));
  member.plan = ordered.pop();
  member.earlierPlans = ordered;
}

export function lastEditedPlan(member) {
  return savedPlans(member).find(plan => plan.dates[0] === member.lastEditedWeek) ?? member.plan;
}

export function planForDay(plans, day) {
  return plans.find(plan => plan.dates[6] >= day) ?? plans.at(-1);
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
    const stored = new Map(m.logs.map(log => [log.id, log]));
    const incoming = v.logs.map(({ feedback, feedbackDraft, ...log }) => {
      const previous = stored.get(log.id);
      if (previous?.feedback) log.feedback = previous.feedback;
      if (previous?.feedbackDraft !== undefined) log.feedbackDraft = previous.feedbackDraft;
      if (!log.exerciseResults && previous?.exerciseResults &&
          log.completedSets === previous.completedSets && log.totalSets === previous.totalSets)
        return { ...log, exerciseResults: previous.exerciseResults };
      return log;
    });
    m.logs = merge(m.logs, incoming).sort((a, b) => b.date.localeCompare(a.date));
    const savedMeals = new Map(m.meals.map(meal => [meal.id, meal]));
    m.meals = merge(
      m.meals,
      v.meals.map((x) => ({
        ...x,
        feedback: savedMeals.get(x.id)?.feedback || "",
        feedbackDraft: savedMeals.get(x.id)?.feedbackDraft,
      })),
    ).sort((a, b) => b.date.localeCompare(a.date));
    state.selected = m.id;
  } else {
    if (v.kind !== "plan")
      throw Error("트레이너가 보낸 계획 파일을 선택하세요.");
    const m = state.self;
    if (m.linkedCoach && (m.linkedCoach !== v.coachId || m.id !== v.memberId))
      throw Error("다른 회원의 계획입니다. 현재 연결을 먼저 확인하세요.");
    const plans = savedPlans(m);
    const week = v.plan.dates[0];
    const previous = plans.find(plan => plan.dates[0] === week);
    const currentPlanTime = Date.parse(previous?.updatedAt);
    const lastSharedAt = m.lastCoachShareAt ?? m.plan?.updatedAt;
    const weekShares = m.weekShareTimes ?? (m.plan ? { [m.plan.dates[0]]: lastSharedAt } : {});
    const lastSnapshot = Date.parse(lastSharedAt);
    const incomingPlanTime = Date.parse(v.plan.updatedAt);
    const sharedAt = v.createdAt ?? v.plan.updatedAt;
    if (incomingPlanTime < currentPlanTime)
      throw Error("현재 계획보다 오래된 파일입니다. 최신 계획을 받아주세요.");
    if (incomingPlanTime === currentPlanTime && Date.parse(sharedAt) < Date.parse(weekShares[week]))
      throw Error("이미 받은 파일보다 더 오래된 공유 파일입니다. 최신 일정과 피드백을 유지했습니다.");
    storeWeekPlan(m, v.plan);
    m.weekShareTimes = { ...weekShares, [week]: sharedAt };
    m.id = v.memberId;
    m.linkedCoach = v.coachId;
    // Appointments and feedback describe the whole member, even in a file for one week.
    if (Date.parse(sharedAt) < lastSnapshot) return;
    m.lastCoachShareAt = sharedAt;
    m.name = v.name;
    m.appointments = v.appointments;
    if (v.workoutFeedback?.length) {
      const replies = new Map(v.workoutFeedback.map(reply => [reply.id, reply.feedback]));
      m.logs = m.logs.map(log => replies.get(log.id) ? { ...log, feedback: replies.get(log.id) } : log);
    }
    const replies = new Map(v.feedback.map(reply => [reply.id, reply.feedback]));
    m.meals = m.meals.map(meal => ({
      ...meal,
      feedback: replies.get(meal.id) || meal.feedback || "",
    }));
  }
}
