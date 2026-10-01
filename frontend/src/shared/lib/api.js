import {cacheResponse,cachedResponse,queueWorkout,syncWorkouts,clearOffline,offlineEpoch,prepareWorkout,acknowledgeWorkout} from './offline.js';
import { getAccessToken,refreshAccessToken } from './session.js';
export const BASE = import.meta.env.VITE_API_BASE || '';

// Demo-mode identity switch (see backend/app/services/auth.py's get_current_user docstring):
// X-Synex-Demo-User lets the same browser preview the student and counselor experiences without a
// real login flow. Stored in localStorage purely as a per-browser UI convenience (which role is
// currently selected) -- it is never treated as an auth credential; AUTH_MODE=oidc ignores it
// entirely server-side.
const DEMO_USER_KEY = 'synex-health-demo-user';
export function getDemoUser() {
  try { return localStorage.getItem(DEMO_USER_KEY) || 'student-jimin'; } catch { return 'student-jimin'; }
}
export async function setDemoUser(id) {
  await clearOffline();
  try { localStorage.setItem(DEMO_USER_KEY, id); } catch {}
}

export async function api(path, body, { method, signal, headers, offlineRetry=false } = {}) {
  const requestEpoch=offlineEpoch();
  const m = method || (body === undefined ? 'GET' : 'POST');
  const workout = path === '/api/workouts' && m === 'POST';
  if (workout && !offlineRetry) { body = prepareWorkout(body); await queueWorkout(body); }
  if (requestEpoch !== offlineEpoch()) throw Error('계정이 변경되었습니다. 다시 시도하세요.');
  const options = {
    method: m,
    headers: { 'Content-Type': 'application/json', ...(import.meta.env.VITE_RELEASE_BUILD==='true'?{}:{'X-Synex-Demo-User':getDemoUser()}), ...(getAccessToken() ? {Authorization: `Bearer ${getAccessToken()}`} : {}), ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal, credentials: 'include',
  };
  let response;
  try{response=await fetch(BASE+path,options);}catch(error){
    if(error.name==='AbortError'||requestEpoch!==offlineEpoch())throw error;
    if(m==='GET'){const cached=cachedResponse(path);if(cached!==undefined){window.dispatchEvent(new Event('synex-cache-used'));return cached;}}
    if(path==='/api/workouts'&&m==='POST'&&!offlineRetry)return {...body,id:`pending-${body.mutation_id}`,pending_sync:true};
    throw Error('네트워크에 연결할 수 없습니다. 연결 후 다시 시도하세요.');
  }
  if(response.status===401&&await refreshAccessToken()){if(requestEpoch!==offlineEpoch())throw Error('계정이 변경되었습니다.');options.headers.Authorization=`Bearer ${getAccessToken()}`;response=await fetch(BASE+path,options);}
  if (!response.ok) {
    if (response.status === 401) window.dispatchEvent(new Event('synex-session-expired'));
    let data;
    try { data = await response.json(); } catch {}
    const err = new Error(typeof data?.detail === 'string' ? data.detail : data?.detail?.message || `요청 실패 (${response.status}). 서버 연결을 확인하십시오.`);
    err.status = response.status; err.data = data;
    throw err;
  }
  if (response.status === 204) return null;
  const data=await response.json();if(workout&&!offlineRetry&&requestEpoch===offlineEpoch())await acknowledgeWorkout(body);if(m==='GET'&&requestEpoch===offlineEpoch())cacheResponse(path,data);return data;
}

export const HealthAPI = {
  adaptiveHistory: () => api('/api/adaptive-history'),
  schools: () => api('/api/schools'),
  selectSchool: (selection) => api('/api/health/school', selection, {method:'PUT'}),
  requestSchool: (name) => api('/api/schools/request', {name}),
  getProfile: () => api('/api/health/profile'),
  updateProfile: (patch) => api('/api/health/profile', patch, { method: 'PUT' }),

  listMeasurements: () => api('/api/body-composition'),
  createMeasurement: (payload) => api('/api/body-composition', payload),
  latestMeasurement: () => api('/api/body-composition/latest'),
  getMeasurement: (id) => api(`/api/body-composition/${id}`),

  bodyMapLatest: () => api('/api/body-map/latest'),
  bodyMapComparison: () => api('/api/body-map/comparison'),

  progress: () => api('/api/progress'),

  analyze: () => api('/api/health-agent/analyze', {}),
  chat: (message, sessionId) => api('/api/health-agent/chat', { message, session_id: sessionId }),

  getExerciseProfile: () => api('/api/exercise-profile'),
  updateExerciseProfile: (patch) => api('/api/exercise-profile', patch, { method: 'PUT' }),
  listRoutines: () => api('/api/exercise-routines'),
  generateRoutine: () => api('/api/exercise-routines/generate', {}),
  getRoutine: (id) => api(`/api/exercise-routines/${id}`),

  exerciseAlternatives: (routine, exercise) => api(`/api/exercise-routines/${encodeURIComponent(routine)}/alternatives/${encodeURIComponent(exercise)}`),
  replaceExercise: (routine, exercise, replacement) => api(`/api/exercise-routines/${encodeURIComponent(routine)}/replace/${encodeURIComponent(exercise)}/${encodeURIComponent(replacement)}`, {}),
  listWorkouts: () => api('/api/workouts'),
  createWorkout: (payload) => api('/api/workouts', payload),

  counselorStudents: () => api('/api/counselor/students'),
  counselorStudentDetail: (id) => api(`/api/counselor/students/${id}`),
  addCounselorNote: (id, note) => api(`/api/counselor/students/${id}/notes`, { note }),

  healthStatus: () => api('/api/health/status'),
};

export const syncPendingWorkouts=()=>syncWorkouts(body=>api('/api/workouts',body,{offlineRetry:true}));
