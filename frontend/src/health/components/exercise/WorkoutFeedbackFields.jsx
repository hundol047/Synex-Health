import React,{useId} from 'react';
import './workout-record.css';

export default function WorkoutFeedbackFields({rpe, pain, onRpeChange, onPainChange}) {
 const rpeHelp=useId(),painHelp=useId();
 return <fieldset className="workout-feedback-fields">
  <legend>운동 느낌</legend>
  <div className="workout-feedback-grid">
   <label><span>운동 힘듦 (1–10)</span><input aria-label="운동 힘듦 (RPE 1–10)" aria-describedby={rpeHelp} className="text-input" type="number" min="1" max="10" step="1" value={rpe} onChange={e=>onRpeChange(e.target.value)}/><small id={rpeHelp}>1: 아주 가벼움 · 10: 더 할 수 없을 만큼 힘듦</small></label>
   <label><span>통증 (0–10)</span><input aria-label="통증 (0–10)" aria-describedby={painHelp} className="text-input" type="number" min="0" max="10" step="1" required value={pain} onChange={e=>onPainChange(e.target.value)}/><small id={painHelp}>0: 통증 없음 · 10: 견디기 어려운 통증</small></label>
  </div>
 </fieldset>;
}
