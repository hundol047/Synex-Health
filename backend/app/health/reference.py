"""Coherent cohort means. Never derive a mean from a reference band or device percentage."""
import hashlib
import json
import os
from datetime import date
from .schemas import Segment, SEGMENT_LABEL_KO


def delta(value, mean):
    valid = value is not None and mean is not None
    return {'user_value': value, 'reference_value': mean,
            'difference_kg': round(value - mean, 3) if valid else None,
            'difference_percent': round((value - mean) / mean * 100, 1) if valid and mean > 0 else None}


def production_eligible(r):
    from urllib.parse import urlparse
    try:
        reviewed=date.fromisoformat(r.reviewed_at or '')
        effective=date.fromisoformat(r.effective_date or '')
    except ValueError:
        return False
    url=urlparse(r.source_url or '')
    return (r.source.strip().lower() not in ('demo','mock','placeholder') and r.gender in ('male','female')
            and r.unit=='kg' and 18 <= r.age_min <= r.age_max <= 120
            and url.scheme=='https' and bool(url.hostname) and reviewed<=date.today() and effective<=date.today()
            and bool(r.dataset_id and r.reference_population and r.publication and r.sample_size and r.version
                     and r.license_note and r.reviewed_by and r.measurement_method and r.compatible_device_names))


def metadata(r):
    return {'source_url':r.source_url,'measurement_method':r.measurement_method,'compatible_device_names':r.compatible_device_names,
            'dataset_id': r.dataset_id, 'reference_population': r.reference_population,
            'reference_source': r.source, 'publication': r.publication, 'sample_size': r.sample_size,
            'sex': r.gender, 'age_range': [r.age_min, r.age_max],
            'height_range': [r.height_min, r.height_max], 'BMI_range': [r.bmi_min, r.bmi_max],
            'weight_range': [r.weight_min, r.weight_max], 'version': r.version,
            'effective_date': r.effective_date, 'demo': r.source.lower() in ('demo', 'mock', 'placeholder')}


def average_comparison(user, measurement, references):
    unavailable = {'available': False, 'selected_group_id': None, 'groups': [],
                   'message': '현재 조건에 맞는 비교군 데이터가 충분하지 않습니다.'}
    if not measurement or user.gender not in ('male', 'female'): return unavailable
    age = None
    if user.birth_date:
        try:
            b, at = date.fromisoformat(user.birth_date), date.fromisoformat(measurement.measurement_date)
            age = at.year - b.year - ((at.month, at.day) < (b.month, b.day))
        except ValueError: pass
    height = measurement.height or user.height
    bmi = measurement.bmi
    if bmi is None and measurement.weight and height: bmi = measurement.weight / (height / 100) ** 2
    strict = os.getenv('APP_ENV') == 'production' or os.getenv('AUTH_MODE', 'demo') != 'demo'
    buckets = {}
    for r in references:
        if r.gender != user.gender or r.unit != 'kg': continue
        meta = metadata(r)
        if strict and not production_eligible(r): continue
        if r.compatible_device_names and measurement.device_name.casefold().strip() not in {n.casefold().strip() for n in r.compatible_device_names}: continue
        if r.effective_date and r.effective_date > date.today().isoformat(): continue
        values = [(age,r.age_min,r.age_max), (height,r.height_min,r.height_max),
                  (bmi,r.bmi_min,r.bmi_max), (measurement.weight,r.weight_min,r.weight_max)]
        if any((lo is not None or hi is not None) and (v is None or lo is not None and v < lo or hi is not None and v > hi)
               for v,lo,hi in values): continue
        key = json.dumps(meta, sort_keys=True)
        buckets.setdefault(key, []).append(r)
    groups = []
    measured = {s.segment: s for s in measurement.segments}
    for key, refs in buckets.items():
        # Ambiguous duplicate rows cannot silently overwrite one another.
        if len({r.segment for r in refs}) != len(refs): continue
        meta = json.loads(key)
        rows = {}
        for r in refs:
            m = measured.get(r.segment)
            rows[r.segment.value] = {'lean': delta(m.lean_mass_kg if m else None, r.lean_mean),
                                    'fat': delta(m.fat_mass_kg if m else None, r.fat_mean)}
        if not any(v[k]['difference_kg'] is not None for v in rows.values() for k in ('lean','fat')): continue
        def total_mean(field):
            means = {getattr(r, field) for r in refs if getattr(r,field) is not None}
            return next(iter(means)) if len(means) == 1 else None
        groups.append({'id': hashlib.sha256(key.encode()).hexdigest()[:20], 'metadata': meta, 'segments': rows,
                       'totals': {'skeletal_muscle_mass': delta(measurement.skeletal_muscle_mass, total_mean('skeletal_muscle_mean')),
                                  'body_fat_mass': delta(measurement.body_fat_mass, total_mean('body_fat_mean'))}})
    groups.sort(key=lambda g: (g['metadata']['demo'],
                g['metadata']['age_range'][1]-g['metadata']['age_range'][0],
                not any(v is not None for v in g['metadata']['height_range']),
                not any(v is not None for v in g['metadata']['BMI_range']+g['metadata']['weight_range']),g['id']))
    return {'available': bool(groups), 'selected_group_id': groups[0]['id'] if groups else None,
            'groups': groups, 'message': None if groups else unavailable['message']}


def selected_group(comparison):
    if not comparison: return None
    return next((g for g in comparison.get('groups', []) if g['id'] == comparison.get('selected_group_id')), None)


def comparison_explanations(comparison):
    group = selected_group(comparison)
    if not group: return []
    rows = [(s,v['lean']) for s,v in group['segments'].items() if v['lean']['difference_percent'] is not None]
    rows.sort(key=lambda item: abs(item[1]['difference_percent']), reverse=True)
    demo = '예시 비교군' if group['metadata']['demo'] else '선택된 비교군'
    return [f'{SEGMENT_LABEL_KO[Segment(s)]} 제지방량은 {demo} 평균보다 {abs(v["difference_kg"]):g}kg '
            f'({abs(v["difference_percent"]):g}%) {"높습니다" if v["difference_kg"]>0 else "낮습니다" if v["difference_kg"]<0 else "같습니다"}. '
            '참고 비교이며 건강 상태나 근력을 직접 진단하지 않습니다.' for s,v in rows[:3]]
