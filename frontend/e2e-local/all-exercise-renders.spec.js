import { test, expect } from '@playwright/test';
import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import catalog from '../src/shared/lib/localCatalog.json' with { type: 'json' };

test('all 74 exercises render an actual mobile 3D surface and complete their motion cycle offline', async ({ page }, info) => {
  test.setTimeout(600000);
  const errors = [], apiRequests = [], remoteRequests = [], report = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => {
    const url = new URL(request.url());
    if (url.pathname.startsWith('/api/')) apiRequests.push(url.pathname);
    if (url.protocol.startsWith('http') && !['127.0.0.1', 'localhost'].includes(url.hostname)) remoteRequests.push(url.hostname);
  });
  await page.addInitScript(() => localStorage.setItem('synex-personal-onboarding-v1', 'done'));
  await page.setViewportSize({ width: 393, height: 852 });
  await page.goto('/health/library');
  await expect(page.getByRole('heading', { name: '운동 라이브러리 · 74개' })).toBeVisible();
  for (const exercise of catalog) {
    await page.getByLabel('운동·근육 검색').fill(exercise.name);
    await page.getByRole('button', { name: `${exercise.name} 동작 보기`, exact: true }).click();
    const stage = page.getByRole('region', { name: '선택한 운동 시범' });
    const canvas = stage.locator('canvas');
    await expect(canvas).toHaveAttribute('data-exercise-rendered', exercise.motion_id);
    expect(Number(await canvas.getAttribute('data-exercise-vertices'))).toBeGreaterThan(10000);
    await expect(page.locator('canvas')).toHaveCount(1);
    const images = [];
    for (const phase of [0, 25, 50]) {
      await stage.getByLabel('동작 구간', { exact: true }).fill(String(phase));
      await expect(canvas).toHaveAttribute('data-exercise-progress', String(phase / 100));
      await canvas.evaluate(element => element.scrollIntoView({ block: 'center', behavior: 'instant' }));
      expect(await canvas.evaluate(element => {
        const rect = element.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        return [rect.top + 2, rect.bottom - 2].every(y => element.contains(document.elementFromPoint(x, y)));
      }), `${exercise.motion_id} screenshot is unobstructed`).toBe(true);
      const rendered = await canvas.screenshot({ path: info.outputPath(`${exercise.motion_id}-${phase}.png`) });
      images.push(createHash('sha256').update(rendered).digest('hex'));
    }
    if (!['plank', 'wall_sit', 'knee_side_plank'].includes(exercise.motion_id)) expect(new Set(images).size, `${exercise.motion_id} changes the rendered pose`).toBeGreaterThan(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    report.push({ id: exercise.motion_id, vertices: Number(await canvas.getAttribute('data-exercise-vertices')), width: (await canvas.boundingBox()).width, frameHashes: images });
    await stage.getByRole('button', { name: '선택한 운동 시범 닫기' }).click();
    await expect(page.locator('canvas')).toHaveCount(0);
  }
  expect(report).toHaveLength(74);
  expect(errors).toEqual([]);
  expect(apiRequests).toEqual([]);
  expect(remoteRequests).toEqual([]);
  await writeFile(info.outputPath('all-74-render-verification.json'), JSON.stringify({ exercises: report, errors, apiRequests, remoteRequests }, null, 2));
});
