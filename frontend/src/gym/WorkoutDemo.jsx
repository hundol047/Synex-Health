import React, { lazy, Suspense, useEffect, useRef } from "react";
import { X } from "lucide-react";
import { doseValue, usesSeconds } from "./prescription.js";

const ExerciseMotion = lazy(() => import("../health/components/exercise/ExerciseMotion.jsx"));

export default function WorkoutDemo({ exercise, entry, paused, resume, onClose }) {
  const dialog = useRef(null);
  useEffect(() => {
    const element = dialog.current;
    const opener = document.activeElement;
    element.showModal();
    return () => {
      element.close();
      opener?.focus({ preventScroll: true });
    };
  }, []);

  return (
    <dialog ref={dialog} className="gym-demo-dialog" aria-labelledby="demo-exercise-name"
      onCancel={event => { event.preventDefault(); onClose(); }}>
      <header className="gym-demo-header">
        <div>
          <h2 id="demo-exercise-name">{exercise.exercise_name}</h2>
          <p>{entry.sets}세트 · {doseValue(entry.reps)}{usesSeconds(entry.dose ?? exercise.dose_type) ? "초" : "회"} · 휴식 {exercise.coachRestSeconds}초</p>
        </div>
        <button type="button" className="gym-menu-button" aria-label="시범 닫기" onClick={onClose}><X size={22}/></button>
      </header>
      <section className="gym-demo-content">
        {paused && <button className="gym-button secondary" onClick={resume}>운동 이어하기</button>}
        <Suspense fallback={<p role="status">운동 시범을 준비하고 있어요…</p>}>
          <ExerciseMotion exercise={exercise} paused={paused}/>
        </Suspense>
      </section>
    </dialog>
  );
}
