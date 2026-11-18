import { useSyncExternalStore } from 'react';

const preferenceKey = 'synex-exercise-demo-dimension';
const listeners = new Set();
let display;

function currentDisplay() {
  if (display === undefined) {
    display = '3d';
    try {
      if (localStorage.getItem(preferenceKey) === '2d') display = '2d';
    } catch { /* The current app session can still remember the choice. */ }
  }
  return display;
}

function publish(next) {
  if (next === currentDisplay()) return;
  display = next;
  listeners.forEach(listener => listener());
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useExerciseDisplay() {
  return useSyncExternalStore(subscribe, currentDisplay, () => '3d');
}

export function toggleExerciseDisplay() {
  const next = currentDisplay() === '3d' ? '2d' : '3d';
  publish(next);
  try {
    localStorage.setItem(preferenceKey, next);
  } catch { /* The choice is already active for this session. */ }
}

export function reportUnavailableRenderer() {
  // An unavailable renderer may recover. Only an explicit choice is persisted.
  if (currentDisplay() === '3d') publish('fallback');
}
