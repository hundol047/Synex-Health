import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { mockFetch } from './helpers.js';

// The 3D canvas needs a real WebGL context, which jsdom doesn't provide -- stub it out for
// component tests so we can exercise the surrounding page logic without touching Three.js.
vi.mock('../src/health/components/body3d/BodyScene.jsx', () => ({
  default: () => <div data-testid="body-scene-mock" />,
}));

import HomePage from '../src/health/pages/HomePage.jsx';

beforeEach(() => {
  mockFetch({
    '/api/health/profile': { id: 'student-jimin', name: '김지민', gender: 'female', height: 165, role: 'student' },
    '/api/body-composition/latest': {
      id: 'MEAS-1', user_id: 'student-jimin', measurement_date: '2026-06-14',
      weight: 56.9, height: 165, bmi: 20.9, skeletal_muscle_mass: 22.3,
      body_fat_mass: 14.9, body_fat_percentage: 26.3, fat_free_mass: 42.0,
      total_body_water: 30.7, basal_metabolic_rate: 1332, visceral_fat_level: 5,
      smi: 5.8, device_name: 'Demo Health Center Scale', source: 'mock', segments: [],
    },
    '/api/body-map/latest': {
      current_measurement_id: 'MEAS-1', previous_measurement_id: 'MEAS-0',
      top_level_deltas: { weight_delta: -0.3, skeletal_muscle_mass_delta: 0.6, body_fat_percentage_delta: -1.5, basal_metabolic_rate_delta: 22 },
      segment_deltas: [], left_right_balance: {}, balance_delta: -3.9, reference_comparison: {},
    },
  });
});

describe('HomePage', () => {
  it('renders the greeting and today\'s stats from mocked API data', async () => {
    render(<MemoryRouter><HomePage /></MemoryRouter>);

    expect(await screen.findByText(/김지민님/)).toBeTruthy();
    expect(await screen.findByText('체지방률')).toBeTruthy();
    expect(screen.getByText('26.3%')).toBeTruthy();
    expect(screen.getByText('오늘의 루틴 시작하기')).toBeTruthy();
    expect(await screen.findByTestId('body-scene-mock')).toBeTruthy();
  });
});
