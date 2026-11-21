import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { mockFetch } from './helpers.js';
import { estimateOneRepMax, personalRecords, regionWeeklySets, measurementTrainingLink, regionsFor } from '../src/health/lib/trainingInsights.js';
import TrainingProgress from '../src/health/components/TrainingProgress.jsx';

const NOW = new Date(2026, 10, 18); // Wednesday 2026-11-18
const set = (reps, weight_kg = null, extra = {}) => ({ reps, weight_kg, kind: 'working', ...extra });
const log = (date, exercise_catalog_id, exercise_name, set_records, extra = {}) => ({ id: date + exercise_catalog_id, date, exercise_catalog_id, exercise_name, set_records, completed: true, pain: 0, difficulty: 'moderate', ...extra });

describe('estimateOneRepMax', () => {
  it('uses Epley only for 1–10 loaded reps', () => {
    expect(estimateOneRepMax(100, 1)).toBe(100);
    expect(estimateOneRepMax(60, 10)).toBe(80);
    expect(estimateOneRepMax(60, 11)).toBeNull();
    expect(estimateOneRepMax(null, 5)).toBeNull();
    expect(estimateOneRepMax(0, 5)).toBeNull();
  });
});

describe('personalRecords', () => {
  it('keeps the best entries, ignores warmups, pain and future dates', () => {
    const logs = [
      log('2026-11-01', 'goblet_squat', '고블릿 스쿼트', [set(10, 16), set(12, 20, { kind: 'warmup' })]),
      log('2026-11-10', 'goblet_squat', '고블릿 스쿼트', [set(5, 24)]),
      log('2026-11-12', 'goblet_squat', '고블릿 스쿼트', [set(3, 40)], { pain: 3 }),
      log('2026-11-30', 'goblet_squat', '고블릿 스쿼트', [set(1, 99)]),
      log('2026-11-15', 'push_up', '푸시업', [set(12), set(15)]),
    ];
    const records = personalRecords(logs, NOW);
    const squat = records.find((r) => r.key === 'goblet_squat');
    expect(squat.heaviest).toEqual({ weight_kg: 24, reps: 5, date: '2026-11-10' });
    expect(squat.e1rm.value).toBe(28);
    expect(squat.sessions).toBe(2);
    const push = records.find((r) => r.key === 'push_up');
    expect(push.reps).toEqual({ reps: 15, date: '2026-11-15' });
    expect(push.heaviest).toBeNull();
    expect(push.recent).toBe(true);
  });
});

describe('region volume and measurement link', () => {
  it('splits working sets by region and current week', () => {
    expect(regionsFor({ exercise_catalog_id: 'sit_stand' })).toEqual(['하체']);
    expect(regionsFor({ exercise_name: '의자 앉았다 일어나기' })).toEqual(['하체']);
    expect(regionsFor({ exercise_name: 'Sit to stand' })).toEqual(['하체']);
    const logs = [
      log('2026-11-17', 'sit_stand', '의자 앉았다 일어나기', [set(10), set(10), set(10)]),
      log('2026-11-05', 'sit_stand', '의자 앉았다 일어나기', [set(10), set(10)]),
      log('2026-09-01', 'sit_stand', '의자 앉았다 일어나기', [set(10)]),
    ];
    const lower = regionWeeklySets(logs, NOW).find((r) => r.region === '하체');
    expect(lower).toMatchObject({ current: 3, previous: 2, average: 0.5 });
  });

  it('flags a low measured region that receives little training', () => {
    const volume = [{ region: '상체', current: 0, previous: 1, average: 0.3 }, { region: '몸통', current: 2, previous: 2, average: 0.5 }, { region: '하체', current: 6, previous: 10, average: 2.5 }];
    const measurement = { measurement_date: '2026-11-01', segments: [
      { segment: 'LEFT_ARM', lean_reference_percent: 84 }, { segment: 'RIGHT_ARM', lean_reference_percent: 95 },
      { segment: 'TRUNK', lean_reference_percent: 101 }, { segment: 'LEFT_LEG', lean_reference_percent: 99 },
    ] };
    const link = measurementTrainingLink(measurement, volume);
    expect(link.status).toBe('ok');
    const upper = link.regions.find((r) => r.region === '상체');
    expect(upper).toMatchObject({ percent: 84, segment: 'LEFT_ARM', focus: true, advice: '훈련 비중 확인', share: 5 });
    expect(link.regions.find((r) => r.region === '하체').advice).toBe('유지');
    expect(measurementTrainingLink({ segments: [] }, volume).status).toBe('no_segments');
  });
});

describe('TrainingProgress insights UI', () => {
  it('shows personal records and the measurement link', async () => {
    const today = new Date();
    const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    mockFetch({ '/api/workouts': [log(iso, 'sit_stand', '의자 앉았다 일어나기', [set(8, 10)])] });
    render(<MemoryRouter><TrainingProgress measurement={{ measurement_date: iso, segments: [{ segment: 'LEFT_LEG', lean_reference_percent: 85 }] }} /></MemoryRouter>);
    expect(await screen.findByRole('heading',{name:'개인 최고 기록'})).toBeTruthy();
    expect(screen.getByRole('list',{name:/운동별 최고 입력 기록/}).textContent).toContain('10 kg × 8회');
    expect(screen.getByText('이번 주 운동한 날')).toBeTruthy();
    expect(screen.getByRole('heading',{name:'측정 결과 ↔ 실제 훈련량'})).toBeTruthy();
    expect(screen.getByText(/85%/)).toBeTruthy();
  });
});
