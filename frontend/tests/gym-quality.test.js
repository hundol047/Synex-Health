import { describe, it, expect, vi } from "vitest";
vi.mock("../src/shared/lib/offline.js", () => ({
  loadLocalDocument: vi.fn(),
  saveLocalDocument: vi.fn(),
}));
import {
  editablePlan,
  entryFor,
  reschedulePlan,
  rescheduleMemberWeeks,
  newSession,
  finishSession,
  sessionSummary,
  weekStats,
  weekDates,
} from "../src/gym/workflow.js";
import {
  freshMember,
  weeklyPlan,
  storeWeekPlan,
  savedPlans,
  parseTransfer,
  transferFor,
} from "../src/gym/store.js";
describe("trainer plan editing and member session continuity", () => {
  it("moves a PT between two saved weeks without mixing their prescriptions", () => {
    const member = freshMember();
    const visits = [{date: "2026-11-20"}];
    const earlier = editablePlan([entryFor("squat")], 2, visits, "2026-11-16");
    const later = editablePlan([entryFor("plank")], 4, visits, "2026-11-23");
    storeWeekPlan(member, later);
    storeWeekPlan(member, earlier);
    member.appointments = [{date: "2026-11-24"}];
    rescheduleMemberWeeks(member, ["2026-11-20", "2026-11-24"]);
    expect(savedPlans(member).map(p => [p.id,p.frequency,p.ptDays])).toEqual([
      [earlier.id,2,[]], [later.id,4,[1]],
    ]);
    expect(member.plan.options).toEqual(later.options);
  });
  it("edits a prescription during an extra PT week without raising its usual training target", () => {
    const week = "2026-11-16";
    const appointments = [16, 17, 20, 21].map(day => ({ date: `2026-11-${day}` }));
    const initial = editablePlan([entryFor("squat")], 3, appointments, week);
    expect(initial).toMatchObject({ requestedFrequency: 3, frequency: 4, ptDays: [0, 1, 4, 5] });
    const edits = initial.options[0].exercises.map(e => ({ ...e, reps: "12" }));
    const edited = editablePlan(edits, initial.requestedFrequency, appointments, week);
    const reduced = reschedulePlan(edited, appointments.slice(1));
    expect(reduced).toMatchObject({ requestedFrequency: 3, frequency: 3, days: [1, 4, 5] });
    expect(reduced.options.every(option => option.exercises[0].reps === "12")).toBe(true);
    const lighterWeek = editablePlan(edits, 1, appointments, "2026-11-23");
    expect(lighterWeek).toMatchObject({ requestedFrequency: 1, frequency: 1, ptDays: [] });
  });
  it("preserves customized dose and order while rescheduling PT", () => {
    const rows = [
      { ...entryFor("squat"), sets: 4, reps: "10", rest: 90 },
      entryFor("wall_push"),
    ];
    const plan = editablePlan(rows, 3, [], "2026-11-02");
    const changed = reschedulePlan(plan, [
      { id: "pt", date: "2026-11-04", time: "18:00" },
    ]);
    expect(changed.options[0].exercises).toEqual(rows);
    expect(changed.ptDays).toContain(2);
    expect(changed.options[1].exercises[0].sets).toBe(2);
  });
  it("rejects nonfinite frequency, excess sets and bad rest values", () => {
    expect(() => weeklyPlan(8, [])).toThrow();
    expect(() => weeklyPlan(NaN, [])).toThrow();
    expect(() =>
      editablePlan([{ ...entryFor("squat"), sets: 0 }], 3, []),
    ).toThrow();
    expect(() =>
      editablePlan([{ ...entryFor("squat"), rest: -1 }], 3, []),
    ).toThrow();
    expect(() =>
      editablePlan([{ ...entryFor("squat"), reps: "abc" }], 3, []),
    ).toThrow();
  });
  it("restores the trainer's weekly target after an extra PT day is cancelled", () => {
    const plan = editablePlan([entryFor("plank")], 2, [], "2026-11-16");
    const visits = plan.dates.slice(1, 4).map(date => ({date}));
    const busyWeek = reschedulePlan(plan, visits);
    expect(busyWeek.frequency).toBe(3);
    const reduced = reschedulePlan(busyWeek, [visits[0], visits[0]]);
    expect(reduced).toMatchObject({id: plan.id, ptDays: [1], frequency: 2, requestedFrequency: 2});
    expect(reduced.days).toHaveLength(2);
    expect(reduced.options).toEqual(plan.options);
    expect(reschedulePlan(reduced, [{date: "2026-11-25"}]).ptDays).toEqual([]);
  });
  it("snapshots session exercises so a later plan change cannot erase current progress", () => {
    const p = editablePlan([entryFor("squat")], 3, []);
    const s = newSession(p, p.options[0]);
    s.checked.push("squat:0");
    p.options[0].exercises[0].sets = 9;
    expect(sessionSummary(s)).toEqual({ done: 1, total: 2 });
  });
  it("records partial work honestly and cannot double-save a finished session", () => {
    const p = editablePlan([entryFor("squat")], 3, []);
    const m = freshMember();
    m.session = newSession(p, p.options[0]);
    m.session.checked = ["squat:0"];
    const log = finishSession(m, "힘들었어요");
    expect(log.status).toBe("partial");
    expect(log.completedSets).toBe(1);
    expect(m.session).toBeNull();
    expect(() => finishSession(m, "적당했어요")).toThrow();
    expect(m.logs).toHaveLength(1);
  });
  it("counts unique completed days, excludes partial days and future weeks", () => {
    const dates = weekDates("2026-11-04");
    const m = freshMember();
    m.logs = [
      { date: dates[0] },
      { date: dates[0] },
      { date: dates[1], status: "partial" },
      { date: "2026-11-20" },
    ];
    expect(weekStats(m, dates).days).toBe(1);
  });
  it("retains custom rest and completed set details through sharing", () => {
    const m = freshMember("검증");
    m.plan = editablePlan([{ ...entryFor("squat"), rest: 90 }], 3, []);
    const payload = parseTransfer(
      JSON.stringify(transferFor({ coachId: "a" }, "coach", m)),
    );
    expect(payload.plan.options[0].exercises[0].rest).toBe(90);
    payload.plan.options[0].exercises[0].rest = -100;
    expect(() => parseTransfer(JSON.stringify(payload))).toThrow();
  });
});
