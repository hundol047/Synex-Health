import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, act, cleanup } from "@testing-library/react";
vi.mock("../src/shared/lib/offline.js", () => ({
  loadLocalDocument: vi.fn(),
  saveLocalDocument: vi.fn(),
}));
import {
  saveRoutineTemplate,
  entryFor,
  editablePlan,
  planPeriod,
  weekStats,
  workoutHistory,
  newSession,
  nextIncompleteSet,
  checkSessionSet,
} from "../src/gym/workflow.js";
import { freshMember } from "../src/gym/store.js";
afterEach(cleanup);
describe("repeatable planning and dated member experience", () => {
  it("stores reusable exercise-only snapshots without coupling later edits", () => {
    const state = {};
    const rows = [entryFor("squat")];
    const t = saveRoutineTemplate(state, "전신 기초", rows, 3);
    rows[0].sets = 9;
    expect(t.entries[0].sets).not.toBe(9);
    expect(Object.keys(t).sort()).toEqual(["count", "entries", "id", "name"]);
    expect(() => saveRoutineTemplate(state, "전신 기초", rows, 3)).toThrow();
  });
  it("rejects invalid or empty reusable routine definitions", () => {
    expect(() =>
      saveRoutineTemplate({}, " ", [entryFor("squat")], 3),
    ).toThrow();
    expect(() => saveRoutineTemplate({}, "전신", [], 3)).toThrow();
  });
  it("marks expired and upcoming plans and does not reuse last week target", () => {
    const m = freshMember();
    m.plan = editablePlan([entryFor("squat")], 3, [], "2026-11-02");
    expect(planPeriod(m.plan, "2026-11-13").kind).toBe("past");
    expect(planPeriod(m.plan, "2026-11-01").kind).toBe("upcoming");
    expect(planPeriod(m.plan, "2026-11-06").kind).toBe("current");
    expect(weekStats(m, ["2026-11-09"]).target).toBe(0);
  });
  it("aggregates 4 weeks using distinct full-completion dates", () => {
    const m = freshMember();
    m.logs = [
      { date: "2026-11-10" },
      { date: "2026-11-10" },
      { date: "2026-11-11", status: "partial" },
      { date: "2026-11-02" },
    ];
    const weeks = workoutHistory(m, "2026-11-13");
    expect(weeks).toHaveLength(4);
    expect(weeks.at(-1).days).toBe(1);
    expect(weeks.at(-1).sessions).toBe(3);
    expect(weeks.at(-2).days).toBe(1);
  });
  it("checks the next unfinished set, supports undo and rejects out-of-range indices", () => {
    const p = editablePlan([entryFor("squat")], 3, []),
      s = newSession(p, p.options[0]);
    expect(nextIncompleteSet(s)).toBe(0);
    checkSessionSet(s, 0);
    expect(nextIncompleteSet(s)).toBe(1);
    checkSessionSet(s, 1);
    expect(nextIncompleteSet(s)).toBe(-1);
    checkSessionSet(s, 0);
    expect(nextIncompleteSet(s)).toBe(0);
    expect(() => checkSessionSet(s, 99)).toThrow();
  });
});
