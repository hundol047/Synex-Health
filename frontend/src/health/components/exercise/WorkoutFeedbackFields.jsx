import React from 'react';
import './workout-record.css';

export default function WorkoutFeedbackFields({rpe, pain, onRpeChange, onPainChange}) {
 return <fieldset className="workout-feedback-fields">
  <legend>운동 느낌</legend>
  <div className="workout-feedback-grid">
   <label><span>운동 힘듦 (RPE 1–10)</span><input className="text-input" type="number" min="1" max="10" step="1" value={rpe} onChange={e=>onRpeChange(e.target.value)}/></label>
   <label><span>통증 (0–10)</span><input className="text-input" type="number" min="0" max="10" step="1" required value={pain} onChange={e=>onPainChange(e.target.value)}/></label>
  </div>
 </fieldset>;
}
