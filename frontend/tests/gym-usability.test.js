import { describe, it, expect, vi, afterEach } from "vitest";
vi.mock("../src/shared/lib/offline.js", () => ({
  loadLocalDocument: vi.fn(),
  saveLocalDocument: vi.fn(),
}));
import {
  validDate,
  validateAppointment,
  freshMember,
  transferFor,
  parseTransfer,
  applyTransfer,
} from "../src/gym/store.js";
import {
  entryFor,
  editablePlan,
  newSession,
  pauseSession,
  checkSessionSet,
  clearSessionRest,
  moveSessionExercise,
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
  it("rejects reversed repetition ranges", () => {
    expect(() =>
      editablePlan([{ ...entryFor("squat"), reps: "12-8" }], 3, []),
    ).toThrow();
  });
});
