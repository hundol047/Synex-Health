import { describe, expect, it } from "vitest";
import { catalogEntry, guidedExercise } from "../src/gym/prescription.js";
import { exercises } from "../src/gym/store.js";
import { editablePlan } from "../src/gym/workflow.js";
import { buildTempoPlan } from "../src/health/components/exercise/tempoSession.js";

describe("trainer prescription in the member demonstration", () => {
  for (const [id, value, seconds, rest] of [["plank","17–20",17,0],["walk","45",45,180],["wall_sit","3",3,300]]) {
    it(`keeps the planned dose and rest for ${id}`, () => {
      const source = exercises.find(item => item.id === id);
      const entry = {...catalogEntry(source), reps:value, rest, sets:2};
      const saved = editablePlan([entry],3,[]).options[0].exercises[0];
      expect(saved.dose).toBe("duration");
      const plan = buildTempoPlan([guidedExercise(source,saved)]);
      expect(plan.filter(x=>x.kind==="work").map(x=>x.durationMs)).toEqual([seconds*1000,seconds*1000]);
      expect(plan.filter(x=>x.kind==="rest").map(x=>x.durationMs)).toEqual(rest?[rest*1000,rest*1000]:[]);
    });
  }
  it("accepts the previous catalogue hold notation when editing a saved draft", () => {
    const saved=editablePlan([{...catalogEntry(exercises.find(e=>e.id==="plank")),dose:"hold",reps:"10–20초 유지"}],3,[]);
    expect(saved.options[0].exercises[0]).toMatchObject({reps:"10–20",dose:"duration"});
  });
});
