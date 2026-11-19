import React from "react";
import { exercises } from "./store.js";

export default function WorkoutQuestion({ question }) {
  if (!question) return null;
  const exercise = exercises.find(item => item.id === question.exerciseId);
  return <div className="gym-workout-question">
    <strong>코치에게 남긴 질문 · {exercise?.name ?? "운동 전체"}</strong>
    <p>{question.text}</p>
  </div>;
}
