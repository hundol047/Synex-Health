import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { mockFetch } from './helpers.js';
import RoutinePage from '../src/health/pages/RoutinePage.jsx';

const routine = {
  id: 'ROUTINE-1', user_id: 'student-jimin', created_at: '2026-06-14T00:00:00Z',
  based_on_measurement_id: 'MEAS-1', goal: '좌우 균형 개선', summary: '왼팔 근력 보강에 집중하는 6주 프로그램입니다.',
  duration_weeks: 6, days_per_week: 2,
  exercises: [
    { day_number: 1, exercise_name: '스쿼트', sets: 2, reps: '10-12', duration: null, rest_seconds: 60, reason: '하체 균형 개선' },
    { day_number: 1, exercise_name: '덤벨 로우', sets: 3, reps: '8-10', duration: null, rest_seconds: 45, reason: '왼팔 근력 보강' },
    { day_number: 2, exercise_name: '플랭크', sets: null, reps: null, duration: '30초 x 3', rest_seconds: 30, reason: '코어 안정화' },
  ],
  generated_by: 'deterministic',
};

describe('RoutinePage', () => {
  it('renders the latest routine\'s exercises grouped by day', async () => {
    mockFetch({ '/api/exercise-routines': [routine] });
    render(<MemoryRouter><RoutinePage /></MemoryRouter>);

    expect(await screen.findByText('스쿼트')).toBeTruthy();
    expect(screen.getByText('덤벨 로우')).toBeTruthy();
    expect(screen.getByText('플랭크')).toBeTruthy();
    expect(screen.getByText('Day 1')).toBeTruthy();
    expect(screen.getByText('Day 2')).toBeTruthy();
    expect(screen.getByText(routine.summary)).toBeTruthy();
  });

  it('shows an empty state with a call to action when no routine exists yet', async () => {
    mockFetch({ '/api/exercise-routines': [] });
    render(<MemoryRouter><RoutinePage /></MemoryRouter>);

    expect(await screen.findByText('아직 생성된 루틴이 없어요')).toBeTruthy();
    expect(screen.getByText('오늘의 루틴 시작하기')).toBeTruthy();
  });
});
