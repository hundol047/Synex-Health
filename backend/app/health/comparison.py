"""Measurement comparison math: segment deltas, left/right balance, and reference-range comparison.

Every function here only computes from what was actually measured -- if a segment or a reference
range is missing, the corresponding output field is None, never a fabricated estimate (section 6 of
the product brief). This module has no I/O; it is pure so it's straightforward to unit test.
"""
from __future__ import annotations
from .schemas import BodyCompositionMeasurement, Segment, SEGMENT_LABEL_KO, ReferenceRange

TOP_LEVEL_FIELDS = ['weight', 'skeletal_muscle_mass', 'body_fat_mass', 'body_fat_percentage',
                     'fat_free_mass', 'total_body_water', 'basal_metabolic_rate', 'visceral_fat_level', 'smi']


def _segment_map(m: BodyCompositionMeasurement) -> dict[Segment, dict]:
    return {s.segment: s for s in m.segments}


def segment_delta(previous: BodyCompositionMeasurement | None, current: BodyCompositionMeasurement,
                   segment: Segment) -> dict:
    cur = _segment_map(current).get(segment)
    prev = _segment_map(previous).get(segment) if previous else None
    lean_delta = None
    fat_delta = None
    if cur and cur.lean_mass_kg is not None and prev and prev.lean_mass_kg is not None:
        lean_delta = round(cur.lean_mass_kg - prev.lean_mass_kg, 2)
    if cur and cur.fat_mass_kg is not None and prev and prev.fat_mass_kg is not None:
        fat_delta = round(cur.fat_mass_kg - prev.fat_mass_kg, 2)
    return {'segment': segment.value, 'label': SEGMENT_LABEL_KO[segment], 'lean_mass_delta_kg': lean_delta,
            'fat_mass_delta_kg': fat_delta, 'current_lean_kg': cur.lean_mass_kg if cur else None,
            'current_fat_kg': cur.fat_mass_kg if cur else None}


def top_level_deltas(previous: BodyCompositionMeasurement | None, current: BodyCompositionMeasurement) -> dict:
    out = {}
    for f in TOP_LEVEL_FIELDS:
        cur_v = getattr(current, f)
        prev_v = getattr(previous, f) if previous else None
        out[f'{f}_delta'] = round(cur_v - prev_v, 2) if (cur_v is not None and prev_v is not None) else None
    return out


def left_right_balance(current: BodyCompositionMeasurement) -> dict:
    """Left/right symmetry for arm and leg pairs, expressed as a signed % difference
    ((left-right)/right*100) on lean mass -- positive means the left side measured higher.
    balance_delta compares this measurement's overall asymmetry (arm+leg) against a previous
    measurement's, when supplied via balance_delta_vs()."""
    seg = _segment_map(current)
    out = {}
    for label, left_key, right_key in [('arm', Segment.LEFT_ARM, Segment.RIGHT_ARM), ('leg', Segment.LEFT_LEG, Segment.RIGHT_LEG)]:
        l, r = seg.get(left_key), seg.get(right_key)
        if l and r and l.lean_mass_kg is not None and r.lean_mass_kg not in (None, 0):
            diff_pct = round((l.lean_mass_kg - r.lean_mass_kg) / r.lean_mass_kg * 100, 1)
        else:
            diff_pct = None
        out[label] = {'left_kg': l.lean_mass_kg if l else None, 'right_kg': r.lean_mass_kg if r else None,
                       'diff_percent': diff_pct}
    return out


def balance_delta_vs(previous: BodyCompositionMeasurement | None, current: BodyCompositionMeasurement) -> float | None:
    if previous is None:
        return None
    cur_bal = left_right_balance(current)
    prev_bal = left_right_balance(previous)
    cur_total = sum(abs(cur_bal[k]['diff_percent']) for k in cur_bal if cur_bal[k]['diff_percent'] is not None)
    prev_total = sum(abs(prev_bal[k]['diff_percent']) for k in prev_bal if prev_bal[k]['diff_percent'] is not None)
    if not cur_bal or not prev_bal:
        return None
    return round(cur_total - prev_total, 1)


def reference_comparison(current: BodyCompositionMeasurement, ranges: dict[Segment, ReferenceRange]) -> dict:
    """Per-segment comparison against ReferenceRange, using each segment's own
    lean_reference_percent when the device already reports it, otherwise deriving a status label
    from the registered ReferenceRange (lean_lower/lean_upper). Never invents a reference value when
    neither is available -- status is 'no_reference' in that case."""
    seg = _segment_map(current)
    out = {}
    for s in Segment:
        m = seg.get(s)
        r = ranges.get(s)
        if m is None:
            out[s.value] = {'status': 'no_measurement'}
            continue
        pct = m.lean_reference_percent
        if pct is None and r and r.lean_mean and m.lean_mass_kg is not None:
            pct = round(m.lean_mass_kg / r.lean_mean * 100, 1)
        if pct is None:
            status = 'no_reference'
        elif pct >= 110:
            status = 'above'
        elif pct >= 90:
            status = 'within'
        elif pct >= 75:
            status = 'below'
        else:
            status = 'far_below'
        out[s.value] = {'status': status, 'reference_percent': pct, 'source': r.source if r else None}
    return out


def describe_change(previous: BodyCompositionMeasurement | None, current: BodyCompositionMeasurement) -> str:
    """Section 22's adaptive-routine change note: a factual, Korean one-liner describing what
    changed since the previous measurement, used to justify why the regenerated routine differs.
    Never invents a trend when there's no previous measurement to compare against."""
    if previous is None:
        return ''
    deltas = top_level_deltas(previous, current)
    bd = balance_delta_vs(previous, current)
    parts = []
    sm = deltas.get('skeletal_muscle_mass_delta')
    if sm is not None and abs(sm) >= 0.1:
        parts.append(f'골격근량이 {abs(sm)}kg {"증가" if sm > 0 else "감소"}했습니다')
    bf = deltas.get('body_fat_percentage_delta')
    if bf is not None and abs(bf) >= 0.2:
        parts.append(f'체지방률이 {abs(bf)}%p {"감소" if bf < 0 else "증가"}했습니다')
    if bd is not None and abs(bd) >= 1:
        parts.append('좌우 불균형이 감소했습니다' if bd < 0 else '좌우 불균형이 다소 증가했습니다')
    if not parts:
        return '지난 측정과 큰 차이는 없었습니다.'
    return ', '.join(parts) + '.'


def full_comparison(previous: BodyCompositionMeasurement | None, current: BodyCompositionMeasurement,
                     ranges: dict[Segment, ReferenceRange]) -> dict:
    return {
        'current_measurement_id': current.id,
        'previous_measurement_id': previous.id if previous else None,
        'top_level_deltas': top_level_deltas(previous, current),
        'segment_deltas': [segment_delta(previous, current, s) for s in Segment],
        'left_right_balance': left_right_balance(current),
        'balance_delta': balance_delta_vs(previous, current),
        'reference_comparison': reference_comparison(current, ranges),
    }
