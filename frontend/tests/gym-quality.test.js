import { describe, it, expect, vi } from "vitest";
vi.mock("../src/shared/lib/offline.js", () => ({
  loadLocalDocument: vi.fn(),
  saveLocalDocument: vi.fn(),
}));
import {
  editablePlan,
  entryFor,
  reschedulePlan,
  newSession,
  finishSession,
  sessionSummary,
  weekStats,
  weekDates,
} from "../src/gym/workflow.js";
import {
  freshMember,
  weeklyPlan,
  parseTransfer,
  transferFor,
} from "../src/gym/store.js";
describe("trainer plan editing and member session continuity", () => {
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
