import React, { lazy, Suspense, useState } from 'react';
import { Play } from 'lucide-react';
import { getMotionGuide } from './motionGuide.js';
import './exercise-experience.css';
const ThumbnailFallback = lazy(() => import('./ExerciseThumbnailFallback.jsx'));

// Bundled screenshots use the actual standard instructor and equipment.
// Browsing the 74 cards starts no WebGL contexts and no animation loops.
export function ExerciseThumbnail({ exercise }) {
  const id = exercise.motion_id, [failedId, setFailedId] = useState(null);
  const name = exercise.exercise_name || exercise.name;
  if (!getMotionGuide(id)) return <span className="exercise-preview-unavailable">동작 안내 준비 중</span>;
  if (failedId === id) return <Suspense fallback={<span className="exercise-preview-unavailable">대표 자세 준비 중</span>}><ThumbnailFallback exercise={exercise}/></Suspense>;
  return <img key={id} className="exercise-thumbnail" src={`${import.meta.env.BASE_URL}exercise-thumbnails/${id}.webp`} alt={`${name} 대표 자세`} width="280" height="270" loading="lazy" decoding="async" onError={() => setFailedId(id)}/>;
}

export default function ExercisePreview({ exercise, onOpen }) {
  return <button className="exercise-preview exercise-studio-preview" onClick={onOpen} type="button" aria-label={`${exercise.exercise_name || exercise.name} 자세히 보기`} data-testid="exercise-preview">
    <ExerciseThumbnail exercise={exercise}/><span><Play size={11} fill="currentColor"/> {getMotionGuide(exercise.motion_id) ? '3D 동작 보기' : '시범 준비 중'}</span>
  </button>;
}
