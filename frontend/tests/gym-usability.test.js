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
} from "../src/gym/store.js";
import {
  entryFor,
  editablePlan,
  newSession,
  pauseSession,
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
