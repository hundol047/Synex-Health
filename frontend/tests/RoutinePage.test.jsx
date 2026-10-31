import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
    expect(screen.getByText('1일차 · 2개 운동')).toBeTruthy();
    expect(screen.getByText('2일차 · 1개 운동')).toBeTruthy();
    expect(screen.getByText(routine.summary)).toBeTruthy();
  });

  it('shows an empty state with a call to action when no routine exists yet', async () => {
    mockFetch({ '/api/exercise-routines': [] });
    render(<MemoryRouter><RoutinePage /></MemoryRouter>);

    expect(await screen.findByText('아직 생성된 루틴이 없어요')).toBeTruthy();
    expect(screen.getByText('내 운동 계획 만들기')).toBeTruthy();
  });

  it('re-checks conditions and saves period and focus regions before generating', async () => {
    const calls = [];
    let profile = { goal: 'GENERAL_HEALTH', experience_level: 'INTERMEDIATE', days_per_week: 3, minutes_per_session: 30,
      training_mode: 'mixed', exercise_location: 'home', available_equipment: [], limitations: [], preferences: [], focus_regions: [],
      plan_unit: 'week', plan_length: 4 };
    mockFetch({
      '/api/exercise-profile': ({ options }) => {
        if (options.method === 'PUT') { const body = JSON.parse(options.body); calls.push(['PUT', body]); profile = { ...profile, ...body }; }
        return profile;
      },
      '/api/exercise-routines/generate': () => { calls.push(['GENERATE']); return routine; },
      '/api/exercise-routines': [],
      '/api/adaptive': [],
    });
    render(<MemoryRouter><RoutinePage /></MemoryRouter>);

    fireEvent.click(await screen.findByText('내 운동 계획 만들기'));
    expect(await screen.findByText('루틴 생성 전 운동 조건 확인')).toBeTruthy();
    expect(screen.getByLabelText('운동 목적').value).toBe('GENERAL_HEALTH');
    // Experience is shown but edited only on the profile screen.
    expect(screen.getByText('중급')).toBeTruthy();
    expect(screen.queryByLabelText('규칙적으로 운동한 기간')).toBeNull();
    expect(calls).toEqual([]);

    fireEvent.click(screen.getByRole('radio', { name: '하루' }));
    expect(screen.queryByLabelText('루틴 기간 길이')).toBeNull();
    expect(screen.queryByLabelText('주당 운동 일수')).toBeNull();
    fireEvent.click(screen.getByRole('radio', { name: '개월' }));
    fireEvent.change(screen.getByLabelText('루틴 기간 길이'), { target: { value: '3' } });

    const focus = (label) => screen.getByText(label, { selector: 'label' }).querySelector('input');
    for (const label of ['하체 앞쪽', '등', '복부·코어']) fireEvent.click(focus(label));

    fireEvent.click(screen.getByText('이 조건으로 루틴 생성'));
    await waitFor(() => expect(calls.map((c) => c[0])).toEqual(['PUT', 'GENERATE']));
    expect(calls[0][1]).toMatchObject({ plan_unit: 'month', plan_length: 3, focus_regions: ['squat', 'pull', 'core'] });
    expect(calls[0][1]).not.toHaveProperty('experience_detail');
  });

  it('groups a monthly plan into months, weeks and days with the current week open', async () => {
    const created = new Date(Date.now() - 9 * 86400000).toISOString();
    mockFetch({ '/api/exercise-routines': [{ ...routine, created_at: created, period_unit: 'month', period_length: 2, duration_weeks: 8 }], '/api/adaptive': [] });
    render(<MemoryRouter><RoutinePage /></MemoryRouter>);

    expect(await screen.findByRole('button', { name: /1개월차/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /2개월차/ }).getAttribute('aria-expanded')).toBe('false');
    expect(screen.getByRole('button', { name: /2주차/ }).getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByText('이번 주')).toBeTruthy();
    expect(screen.getByRole('button', { name: /1주차/ }).getAttribute('aria-expanded')).toBe('false');
    // Only the open week mounts its day cards.
    expect(screen.getAllByText('1일차 · 2개 운동')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: /2개월차/ }));
    expect(screen.getByRole('button', { name: /8주차/ })).toBeTruthy();
  });

  it('shows a one-day plan without week groups', async () => {
    mockFetch({ '/api/exercise-routines': [{ ...routine, period_unit: 'day', period_length: 1, duration_weeks: 0, days_per_week: 1 }], '/api/adaptive': [] });
    render(<MemoryRouter><RoutinePage /></MemoryRouter>);
    expect(await screen.findByText('하루 루틴')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /주차/ })).toBeNull();
    expect(screen.getByText('1일차 · 2개 운동')).toBeTruthy();
  });
});

