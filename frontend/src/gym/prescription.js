// Shared plans use seconds for both a static hold and a timed movement.
// The catalogue motion still determines whether the demonstration moves.
export function usesSeconds(dose) {
  return dose === "duration" || dose === "hold";
}

export function doseValue(value) {
  return String(value ?? "").trim().replace(/\s*초(?:\s*유지)?$/, "");
}

export function catalogEntry(exercise) {
  const dose = exercise.dose_type;
  return {
    id: exercise.id,
    name: exercise.name,
    sets: exercise.sets || 2,
    reps: dose === "duration" ? "30" : doseValue(exercise.reps || "8–12"),
    dose: usesSeconds(dose) ? "duration" : "reps",
    rest: exercise.rest ?? 60,
  };
}

export function guidedExercise(source, entry) {
  if (!source) return null;
  const timed = usesSeconds(entry.dose ?? source.dose_type);
  const minimum = Number.parseInt(entry.reps, 10);
  const seconds = timed && Number.isFinite(minimum) ? minimum : undefined;
  return {
    ...source,
    exercise_id: source.id,
    exercise_name: source.name,
    sets: entry.sets,
    reps: entry.reps,
    coachRestSeconds: entry.rest ?? 60,
    hold_seconds: seconds,
    duration_seconds: seconds,
  };
}
