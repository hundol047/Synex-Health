import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { mockFetch } from './helpers.js';

vi.mock('../src/health/components/body3d/BodyScene.jsx', () => ({
  default: () => <div data-testid="body-scene-mock" />,
}));

import BodyMapPage from '../src/health/pages/BodyMapPage.jsx';

const comparison = {
  current_measurement_id: 'MEAS-1',
  previous_measurement_id: 'MEAS-0',
  top_level_deltas: { weight_delta: -0.3 },
  segment_deltas: [
    { segment: 'LEFT_ARM', label: '왼팔', lean_mass_delta_kg: 0.05, fat_mass_delta_kg: -0.04, current_lean_kg: 1.87, current_fat_kg: 0.57 },
  ],
  left_right_balance: { arm: { left_kg: 1.87, right_kg: 1.95, diff_percent: -4.1 } },
  balance_delta: -3.9,
  reference_comparison: { LEFT_ARM: { status: 'within', reference_percent: 90, source: 'demo' } },
};

beforeEach(() => {
  mockFetch({ '/api/body-map/latest': comparison });
});

describe('BodyMapPage', () => {
  it('loads comparison data and lets the user switch view modes', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><BodyMapPage /></MemoryRouter>);

    const referenceBtn = await screen.findByRole('button', { name: '기준 비교' });
    const previousBtn = screen.getByRole('button', { name: '이전 비교' });
    expect(referenceBtn.className).toContain('btn-primary');

    await user.click(previousBtn);
    expect(previousBtn.className).toContain('btn-primary');
    expect(referenceBtn.className).not.toContain('btn-primary');
  });
});
