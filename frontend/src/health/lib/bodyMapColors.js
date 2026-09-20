// Maps body-map API data (backend/app/health/comparison.py's full_comparison() shape) to a
// per-segment color for each of the five view modes (section 10-12 of the product brief). Colors
// are configurable constants here, not hardcoded per-component, so they're easy to re-theme.
export const MODES = [
  { id: 'muscle', label: '부위 제지방' },
  { id: 'fat', label: '체지방' },
  { id: 'balance', label: '좌우 균형' },
  { id: 'reference', label: '기준 비교' },
  { id: 'previous', label: '이전 비교' },
];

export const STATUS_COLORS = {
  above: '#2563eb',   // blue -- higher than the comparison basis
  within: '#1f9d6f',  // green -- within reference band
  below: '#e08a2b',   // orange -- relatively lower
  far_below: '#d6483f', // red -- large difference
  no_reference: '#c9d3e4',
  no_measurement: '#e2e8f3',
  neutral: '#9fb0c8',
};

const SEGMENTS = ['LEFT_ARM', 'RIGHT_ARM', 'TRUNK', 'LEFT_LEG', 'RIGHT_LEG'];

function deltaColor(delta, { positiveIsGood = true, smallThreshold = 0.05, largeThreshold = 0.3 } = {}) {
  if (delta == null) return STATUS_COLORS.no_measurement;
  const magnitude = Math.abs(delta);
  const good = positiveIsGood ? delta > 0 : delta < 0;
  if (magnitude < smallThreshold) return STATUS_COLORS.within;
  if (magnitude < largeThreshold) return good ? STATUS_COLORS.above : STATUS_COLORS.below;
  return good ? STATUS_COLORS.above : STATUS_COLORS.far_below;
}

/** comparisonData: the object returned by GET /api/body-map/latest (or /comparison). */
export function colorsForMode(comparisonData, mode) {
  const colors = {};
  if (!comparisonData) return colors;
  const segDeltas = Object.fromEntries((comparisonData.segment_deltas || []).map((s) => [s.segment, s]));
  const refComparison = comparisonData.reference_comparison || {};
  const balance = comparisonData.left_right_balance || {};

  for (const seg of SEGMENTS) {
    if (mode === 'reference') {
      const status = refComparison[seg]?.status || 'no_reference';
      colors[seg] = STATUS_COLORS[status] || STATUS_COLORS.neutral;
    } else if (mode === 'previous') {
      const d = segDeltas[seg];
      const delta = d ? d.lean_mass_delta_kg : null;
      colors[seg] = deltaColor(delta, { positiveIsGood: true, smallThreshold: 0.03, largeThreshold: 0.15 });
    } else if (mode === 'muscle') {
      const status = refComparison[seg]?.status || 'no_reference';
      colors[seg] = STATUS_COLORS[status] || STATUS_COLORS.neutral;
    } else if (mode === 'fat') {
      const d = segDeltas[seg];
      const delta = d ? d.fat_mass_delta_kg : null;
      // for fat mass, a decrease (negative delta) is the "good"/blue direction
      colors[seg] = deltaColor(delta, { positiveIsGood: false, smallThreshold: 0.03, largeThreshold: 0.15 });
    } else if (mode === 'balance') {
      if (seg === 'LEFT_ARM' || seg === 'RIGHT_ARM') {
        const diff = balance.arm?.diff_percent;
        colors[seg] = balanceColor(seg, diff);
      } else if (seg === 'LEFT_LEG' || seg === 'RIGHT_LEG') {
        const diff = balance.leg?.diff_percent;
        colors[seg] = balanceColor(seg, diff);
      } else {
        colors[seg] = STATUS_COLORS.neutral;
      }
    }
  }
  return colors;
}

function balanceColor(segment, diffPercent) {
  if (diffPercent == null) return STATUS_COLORS.no_measurement;
  const isLeft = segment.startsWith('LEFT');
  const magnitude = Math.abs(diffPercent);
  // diffPercent = (left-right)/right*100 -- positive means left is higher.
  const thisSideIsHigher = isLeft ? diffPercent > 0 : diffPercent < 0;
  if (magnitude < 3) return STATUS_COLORS.within;
  if (thisSideIsHigher) return magnitude > 10 ? STATUS_COLORS.above : STATUS_COLORS.within;
  return magnitude > 10 ? STATUS_COLORS.far_below : STATUS_COLORS.below;
}

export const SEGMENT_LABEL_KO = {
  LEFT_ARM: '왼팔', RIGHT_ARM: '오른팔', TRUNK: '몸통', LEFT_LEG: '왼다리', RIGHT_LEG: '오른다리',
};
