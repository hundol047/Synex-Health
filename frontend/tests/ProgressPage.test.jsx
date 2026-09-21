import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { mockFetch } from './helpers.js';
import ProgressPage from '../src/health/pages/ProgressPage.jsx';

function measurement(date, overrides = {}) {
  return {
    id: `MEAS-${date}`, user_id: 'student-jimin', measurement_date: date,
    weight: 56.9, height: 165, bmi: 20.9, skeletal_muscle_mass: 22.3,
    body_fat_mass: 14.9, body_fat_percentage: 26.3, fat_free_mass: 42.0,
    total_body_water: 30.7, basal_metabolic_rate: 1332, visceral_fat_level: 5, smi: 5.8,
    device_name: 'Demo', source: 'mock',
    segments: [{ segment: 'LEFT_ARM', lean_mass_kg: 1.87, lean_reference_percent: 90, fat_mass_kg: 0.57, fat_reference_percent: 105 }],
    ...overrides,
  };
}

describe('ProgressPage', () => {
  it('renders without crashing given a single measurement', async () => {
    mockFetch({ '/api/progress': { measurements: [measurement('2026-06-14')], workout_count: 1, completed_workout_count: 1 } });
    render(<MemoryRouter><ProgressPage /></MemoryRouter>);
    expect(await screen.findByText('체중 · 골격근량 · 체지방률 변화')).toBeTruthy();
    expect(screen.getByText('부위별 제지방량 변화')).toBeTruthy();
  });

  it('renders without crashing given multiple measurements and supports period filtering', async () => {
    mockFetch({
      '/api/progress': {
        measurements: [measurement('2026-04-01'), measurement('2026-05-01'), measurement('2026-06-14')],
        workout_count: 5, completed_workout_count: 4,
      },
    });
    render(<MemoryRouter><ProgressPage /></MemoryRouter>);
    expect(await screen.findByText('체중 · 골격근량 · 체지방률 변화')).toBeTruthy();
    expect(screen.getByRole('button', { name: '1개월' })).toBeTruthy();
    expect(screen.getByText(/완료한 운동 4회/)).toBeTruthy();
  });

  it('shows an empty state when there is no measurement history', async () => {
    mockFetch({ '/api/progress': { measurements: [], workout_count: 0, completed_workout_count: 0 } });
    render(<MemoryRouter><ProgressPage /></MemoryRouter>);
    expect(await screen.findByText('변화 추적 데이터가 없어요')).toBeTruthy();
  });
});
