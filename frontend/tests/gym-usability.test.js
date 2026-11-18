import { describe, it, expect, vi, afterEach } from "vitest";
vi.mock("../src/shared/lib/offline.js", () => ({
  loadLocalDocument: vi.fn(),
  saveLocalDocument: vi.fn(),
}));
import {
  MAX_TRANSFER_BYTES,
  validDate,
  validateAppointment,
  freshMember,
  transferFor,
  progressPackets,
  parseTransfer,
  applyTransfer,
  savedPlans,
  planForDay,
} from "../src/gym/store.js";
import {
  entryFor,
  editablePlan,
  newSession,
  pauseSession,
  checkSessionSet,
  clearSessionRest,
  moveSessionExercise,
  nextIncompleteExercise,
  sessionElapsed,
  finishSession,
} from "../src/gym/workflow.js";
afterEach(() => vi.useRealTimers());
const sample = () => {
  const m = freshMember("검증");
  m.plan = editablePlan([entryFor("squat")], 3, []);
  return m;
};
describe("gym usability regressions", () => {
  it("rejects rollover calendar dates and elapsed PT times", () => {
    expect(validDate("2026-02-30")).toBe(false);
    expect(validDate("2028-02-29")).toBe(true);
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-06T15:00:00"));
    expect(() => validateAppointment([], "2026-11-06", "14:59")).toThrow();
    expect(() => validateAppointment([], "2026-11-06", "16:00")).not.toThrow();
    expect(() => validateAppointment([], "2026-11-06", "24:00")).toThrow();
  });
  it("stops workout and rest clocks during a pause and resumes without counting the gap", () => {
    const m = sample();
    m.session = newSession(m.plan, m.plan.options[0]);
    const start = m.session.startedAt;
    m.session.runningSince = start;
    m.session.restUntil = start + 90000;
    pauseSession(m.session, true, start + 10000);
    expect(sessionElapsed(m.session, start + 70000)).toBe(10000);
    expect(m.session.restRemaining).toBe(80000);
    pauseSession(m.session, false, start + 70000);
    expect(m.session.restUntil).toBe(start + 150000);
    expect(sessionElapsed(m.session, start + 75000)).toBe(15000);
  });
  it("counts active time when finishing a paused workout", () => {
    const m = sample();
    m.session = newSession(m.plan, m.plan.options[0]);
    const start = m.session.startedAt;
    m.session.runningSince = start;
    m.session.checked = ["squat:0"];
    pauseSession(m.session, true, start + 120000);
    expect(finishSession(m, "적당했어요", start + 3600000).minutes).toBe(2);
  });
  it("returns the checked set numbers and prescription at workout time to the trainer", () => {
    const member = freshMember("회원");
    member.linkedCoach = "coach";
    const squat = { ...entryFor("squat"), sets: 3, reps: "9", rest: 45 };
    const plank = { ...entryFor("plank"), sets: 2, reps: "25", rest: 0 };
    const plan = editablePlan([squat, plank], 3, []);
    member.session = newSession(plan, plan.options[0]);
    checkSessionSet(member.session, 2);
    const log = finishSession(member, "힘들었어요");
    expect(log.exerciseResults.map(r => [r.target, r.rest, r.completed])).toEqual([
      ["9회", 45, [3]], ["25초", 0, []],
    ]);
    const packet = transferFor({}, "member", member);
    const coach = { coachId: "coach", members: [{ ...freshMember(), id: member.id }] };
    const imported = parseTransfer(JSON.stringify(packet));
    applyTransfer(coach, imported, "coach");
    const legacy = structuredClone(imported);
    delete legacy.logs[0].exerciseResults;
    applyTransfer(coach, parseTransfer(JSON.stringify(legacy)), "coach");
    expect(coach.members[0].logs).toEqual([log]);
    const bad = structuredClone(packet);
    bad.logs[0].exerciseResults[0].completed = [3, 3];
    expect(() => parseTransfer(JSON.stringify(bad))).toThrow();
    bad.logs[0].exerciseResults[0].completed = [];
    expect(() => parseTransfer(JSON.stringify(bad))).toThrow();
  });
  it("returns separate workout and meal replies, retains drafts on retries, and reads older plans", () => {
    const member = sample();
    member.linkedCoach = "coach";
    const log = { id: "shared-id", date: "2026-11-17", name: "기초 루틴", effort: "적당했어요" };
    const meal = { id: log.id, date: log.date, note: "점심", photo: "data:image/png;base64,AA==" };
    member.logs = [{ ...log, feedback: "첫 운동 코멘트", feedbackDraft: "운동 초안" }];
    member.meals = [{ ...meal, feedback: "식단 코멘트", feedbackDraft: "식단 초안" }];
    const coach = { coachId: "coach", members: [member] };
    const recipient = { self: { ...freshMember(), logs: [log], meals: [meal] } };
    const file = () => parseTransfer(JSON.stringify(transferFor(coach, "coach", member)));
    const first = file();
    first.createdAt = "2026-11-18T09:00:01Z";
    expect(JSON.stringify(first)).not.toContain("초안");
    applyTransfer(recipient, first, "member");
    expect(recipient.self.logs[0].feedback).toBe("첫 운동 코멘트");
    expect(recipient.self.meals[0].feedback).toBe("식단 코멘트");
    const returned = parseTransfer(JSON.stringify(progressPackets(recipient.self)[0]));
    expect(returned.logs[0]).toEqual(log);
    returned.logs[0].feedback = "이전 코멘트";
    returned.logs[0].feedbackDraft = "이전 초안";
    applyTransfer(coach, returned, "coach");
    expect(member.logs[0]).toMatchObject({ feedback: "첫 운동 코멘트", feedbackDraft: "운동 초안" });
    member.logs[0].feedback = "수정한 운동 코멘트";
    const revised = file();
    revised.createdAt = "2026-11-18T09:00:02Z";
    applyTransfer(recipient, revised, "member");
    expect(() => applyTransfer(recipient, first, "member")).toThrow(/오래된/);
    const legacy = { ...first, createdAt: "2026-11-18T09:00:03Z" };
    delete legacy.workoutFeedback;
    applyTransfer(recipient, parseTransfer(JSON.stringify(legacy)), "member");
    expect(recipient.self.logs[0].feedback).toBe("수정한 운동 코멘트");
    expect(() => parseTransfer(JSON.stringify({ ...first, workoutFeedback: [{ id: log.id, feedback: "가".repeat(601) }] }))).toThrow();
  });
  it("keeps the latest coaching feedback when earlier exports of the same plan arrive later", () => {
    const member = sample();
    member.meals.push({ id: "meal", feedback: "첫 메모" });
    const coach = { coachId: "coach" };
    const old = structuredClone(transferFor(coach, "coach", member));
    old.createdAt = "2026-11-18T16:00:00+09:00";
    member.meals[0].feedback = "수정한 메모";
    const latest = transferFor(coach, "coach", member);
    latest.createdAt = "2026-11-18T07:30:00Z";
    const recipient = { self: { ...freshMember(), meals: [{ id: "meal" }] } };
    const receive = packet => applyTransfer(recipient, parseTransfer(JSON.stringify(packet)), "member");
    receive(old);
    receive(latest);
    expect(() => receive(old)).toThrow(/더 오래된 공유 파일/);
    receive(latest);
    expect(recipient.self.meals).toEqual([{ id: "meal", feedback: "수정한 메모" }]);
  });
  it("keeps prescriptions by week without overwriting newer shared appointments or feedback", () => {
    const member = sample();
    const packet = (week, reps, time) => {
      member.plan = editablePlan([{ ...entryFor("squat"), reps }], 3, [], week);
      member.plan.updatedAt = time;
      return structuredClone({ ...transferFor({ coachId: "coach" }, "coach", member), createdAt: time });
    };
    const first = packet("2026-11-16", "8", "2026-11-16T10:00:00Z");
    member.appointments = [{ id:"pt", date:"2026-11-26", time:"15:00" }];
    member.meals = [{ id:"meal", feedback:"최신 메모" }];
    const next = packet("2026-11-23", "14", "2026-11-18T12:00:00Z");
    const revised = packet("2026-11-16", "9", "2026-11-17T12:00:00Z");
    revised.appointments = [];
    revised.feedback = [{ id:"meal", feedback:"이전 메모" }];
    const recipient = { self: { ...freshMember(), meals:[{ id:"meal" }] } };
    const read = file => applyTransfer(recipient, parseTransfer(JSON.stringify(file)), "member");
    read(next);
    read(first);
    read(first);
    read(revised);
    expect(() => read(first)).toThrow(/오래된/);
    const plans = savedPlans(recipient.self);
    expect(plans).toHaveLength(2);
    expect(planForDay(plans, "2026-11-22").options[0].exercises[0].reps).toBe("9");
    expect(planForDay(plans, "2026-11-23").options[0].exercises[0].reps).toBe("14");
    expect(recipient.self.appointments).toEqual(next.appointments);
    expect(recipient.self.meals[0].feedback).toBe("최신 메모");
  });
  it("shares a full PT calendar and applies later reschedules and cancellations", () => {
    const member = sample();
    member.appointments = Array.from({ length: 130 }, (_, index) => {
      const date = new Date(Date.UTC(2026, 0, index + 1)).toISOString().slice(0, 10);
      return { id: `pt-${index}`, date, time: "19:00" };
    });
    const recipient = { self: freshMember() };
    const receive = () => {
      const raw = JSON.stringify(transferFor({ coachId: "coach" }, "coach", member));
      applyTransfer(recipient, parseTransfer(raw), "member");
    };
    receive();
    expect(recipient.self.appointments).toEqual(member.appointments);
    member.appointments.pop();
    member.appointments.at(-1).time = "16:30";
    receive();
    expect(recipient.self.appointments).toEqual(member.appointments);
    member.appointments.at(-1).time = "26:00";
    expect(receive).toThrow(/PT 일정/);
    expect(recipient.self.appointments.at(-1).time).toBe("16:30");
  });
  it("applies the file limit to UTF-8 bytes", () => {
    const raw = "한".repeat(Math.floor(MAX_TRANSFER_BYTES / 3) + 1);
    expect(() => parseTransfer(raw)).toThrow(/12MB/);
  });
  it("returns every saved meal reply, including a comment on an older photo", () => {
    const member = sample();
    member.meals = Array.from({ length: 125 }, (_, index) => ({
      id: `meal-${index}`,
      feedback: index < 3 ? "" : `코칭 ${index}`,
      feedbackDraft: "저장 전 메모",
      photo: "local photo",
    }));
    const packet = transferFor({ coachId: "coach" }, "coach", member);
    expect(packet.feedback).toHaveLength(122);
    expect(packet.feedback.at(-1)).toEqual({ id: "meal-124", feedback: "코칭 124" });
    const recipient = { self: { ...freshMember(), meals: member.meals.map(({ id }) => ({ id })) } };
    const receive = file => applyTransfer(recipient, parseTransfer(JSON.stringify(file)), "member");
    receive(packet);
    receive(packet);
    expect(recipient.self.meals.at(-1).feedback).toBe("코칭 124");
    const olderFormat = { ...packet, feedback: [{ id: "meal-124", feedback: "" }] };
    receive(olderFormat);
    expect(recipient.self.meals.at(-1).feedback).toBe("코칭 124");
  });
  it("reads earlier files without an export date and rejects malformed dates", () => {
    const member = sample();
    const legacy = transferFor({ coachId: "coach" }, "coach", member);
    delete legacy.createdAt;
    const recipient = { self: freshMember() };
    applyTransfer(recipient, parseTransfer(JSON.stringify(legacy)), "member");
    expect(recipient.self.plan).toEqual(member.plan);
    expect(() => parseTransfer(JSON.stringify({ ...legacy, createdAt: "invalid" }))).toThrow(/생성일/);
  });
  it("keeps rest on the selected exercise and clears a frozen rest when changing exercise", () => {
    const plan = editablePlan([entryFor("squat"), entryFor("plank")], 3, []);
    const s = newSession(plan, plan.options[0]);
    const start = s.startedAt;
    s.exercises[0].rest = 90;
    checkSessionSet(s, 0, start);
    moveSessionExercise(s, 0);
    expect(s.restUntil).toBe(start + 90000);
    pauseSession(s, true, start + 10000);
    moveSessionExercise(s, 0);
    expect(s.restRemaining).toBe(80000);
    moveSessionExercise(s, 1);
    pauseSession(s, false, start + 60000);
    expect(s.restUntil).toBeNull();
    expect(s.checked).toEqual(["squat:0"]);
  });
  it("finds skipped sets across the end of a plan and ends rest after the final set", () => {
    const plan = editablePlan([entryFor("squat"), entryFor("plank")], 3, []);
    const s = newSession(plan, plan.options[0]);
    s.exercises.forEach(e => { e.sets = 1; e.rest = 90; });
    moveSessionExercise(s, 1);
    checkSessionSet(s, 0, s.startedAt);
    expect(s.restUntil).toBe(s.startedAt + 90000);
    expect(nextIncompleteExercise(s)).toBe(0);
    moveSessionExercise(s, 0);
    checkSessionSet(s, 0);
    expect(nextIncompleteExercise(s)).toBe(-1);
    expect(s.restUntil).toBeNull();
    expect(s.restRemaining).toBe(0);
    checkSessionSet(s, 0);
    moveSessionExercise(s, 1);
    expect(nextIncompleteExercise(s)).toBe(0);
    const member = { session: s, logs: [] };
    expect(finishSession(member, "적당했어요").status).toBe("partial");
  });
  it("stops time on the last checked set and counts only resumed work after an undo", () => {
    const m = sample();
    const s = newSession(m.plan, m.plan.options[0]);
    s.exercises[0].sets = 1;
    m.session = s;
    const start = s.runningSince = s.startedAt;
    checkSessionSet(s, 0, start + 70000);
    expect(sessionElapsed(s, start + 300000)).toBe(70000);
    pauseSession(s, true, start + 300000);
    checkSessionSet(s, 0, start + 350000);
    expect(sessionElapsed(s, start + 380000)).toBe(70000);
    pauseSession(s, false, start + 390000);
    checkSessionSet(s, 0, start + 420000);
    expect(sessionElapsed(s, start + 700000)).toBe(100000);
    expect(finishSession(m, "적당했어요", start + 800000).minutes).toBe(2);
  });
  it("respects zero rest, supports older prescriptions, and can end a frozen rest", () => {
    const m = sample();
    const s = newSession(m.plan, m.plan.options[0]);
    const start = s.startedAt;
    delete s.exercises[0].rest;
    checkSessionSet(s, 0, start);
    expect(s.restUntil).toBe(start + 60000);
    pauseSession(s, true, start + 2000);
    clearSessionRest(s);
    expect(s.paused).toBe(true);
    pauseSession(s, false, start + 8000);
    expect(s.restUntil).toBeNull();
    s.exercises[0].rest = 0;
    checkSessionSet(s, 1, start + 9000);
    expect(s.restUntil).toBeNull();
    pauseSession(s, true, start + 12000);
    checkSessionSet(s, 1, start + 18000);
    expect(s.paused).toBe(true);
    expect(s.checked).toEqual(["squat:0"]);
  });
  it("rejects render-breaking objects and empty workout lists in imported plans", () => {
    const m = sample(),
      v = transferFor({ coachId: "coach" }, "coach", m);
    v.plan.options[0].minutes = {};
    expect(() => parseTransfer(JSON.stringify(v))).toThrow();
    v.plan.options[0].minutes = 10;
    v.plan.options[0].exercises = [];
    expect(() => parseTransfer(JSON.stringify(v))).toThrow();
  });
  it("rejects object-valued reps and out-of-range appointments", () => {
    const m = sample(),
      v = transferFor({ coachId: "coach" }, "coach", m);
    v.plan.options[0].exercises[0].reps = {};
    expect(() => parseTransfer(JSON.stringify(v))).toThrow();
    v.plan.options[0].exercises[0].reps = "12";
    v.appointments = [{ id: "x", date: "2026-11-06", time: "99:99" }];
    expect(() => parseTransfer(JSON.stringify(v))).toThrow();
  });
  it("keeps recent photo exports within the import limit without deleting stored meals", () => {
    const m = sample();
    m.linkedCoach = "coach";
    m.meals = Array.from({ length: 12 }, (_, i) => ({
      id: String(i),
      date: "2026-11-06",
      note: "식단",
      photo: "data:image/jpeg;base64," + "A".repeat(1100000),
    }));
    const v = transferFor({}, "member", m);
    expect(new TextEncoder().encode(JSON.stringify(v)).length).toBeLessThan(
      12 * 1024 * 1024,
    );
    expect(v.meals.length).toBeLessThan(m.meals.length);
    expect(m.meals).toHaveLength(12);
    expect(() => parseTransfer(JSON.stringify(v))).not.toThrow();
  });
  it("sends every meal and workout once across compatible files and can resend a chosen day", () => {
    const member = freshMember("회원");
    member.linkedCoach = "coach";
    const dates = ["2026-11-17", "2026-11-16"];
    member.logs = Array.from({ length: 501 }, (_, i) => ({
      id: `log-${i}`, date: dates[Number(i === 500)], name: "운동", effort: "적당",
    }));
    member.meals = Array.from({ length: 101 }, (_, i) => ({
      id: `meal-${i}`, date: dates[Number(i === 100)], note: "식단",
      photo: "data:image/jpeg;base64,AA==", feedbackDraft: "초안",
    }));
    const packets = progressPackets(member);
    expect(packets.map(p => [p.logs.length, p.meals.length])).toEqual([[500, 100], [1, 1]]);
    expect(packets.flatMap(p => p.meals.map(m => m.id))).toEqual(member.meals.map(m => m.id));
    const recipient = { coachId: "coach", members: [{ ...freshMember(), id: member.id }] };
    for (const packet of [packets[1], packets[0], packets[1]]) {
      const json = JSON.stringify(packet);
      expect(json).not.toContain("초안");
      applyTransfer(recipient, parseTransfer(json), "coach");
    }
    expect(recipient.members[0].meals).toHaveLength(101);
    expect(recipient.members[0].logs).toHaveLength(501);
    const [day] = progressPackets(member, dates[1]);
    expect(day.meals.map(m => m.id)).toEqual(["meal-100"]);
    expect(day.logs.map(l => l.id)).toEqual(["log-500"]);
    expect(progressPackets(member, "2026-10-01")[0]).toMatchObject({ logs: [], meals: [] });
  });
  it("keeps large photo batches under 11 MiB and includes the final photo", () => {
    const member = freshMember("회원");
    member.linkedCoach = "coach";
    member.meals = Array.from({ length: 12 }, (_, i) => ({
      id: String(i), date: "2026-11-17", note: "김치".repeat(140),
      photo: "data:image/jpeg;base64," + "A".repeat(1100000),
    }));
    const packets = progressPackets(member);
    expect(packets.map(p => p.meals.length)).toEqual([10, 2]);
    expect(packets.at(-1).meals.at(-1).id).toBe("11");
    for (const p of packets) {
      const json = JSON.stringify(p);
      expect(new TextEncoder().encode(json).length).toBeLessThanOrEqual(11 * 1024 * 1024);
      expect(() => parseTransfer(json)).not.toThrow();
    }
  });
  it("rejects reversed repetition ranges", () => {
    expect(() =>
      editablePlan([{ ...entryFor("squat"), reps: "12-8" }], 3, []),
    ).toThrow();
  });
});
