import json
from .schemas import ReferenceRange
from .reference import production_eligible,metadata

def validate(data):
    rows=[ReferenceRange.model_validate(r) for r in data['references']]
    if not rows:raise ValueError('No reference records supplied')
    ids=set();groups={}
    for row in rows:
        if row.id in ids:raise ValueError('Duplicate record ID')
        ids.add(row.id)
        if not production_eligible(row):raise ValueError(f'{row.id}: provenance, permission, review, units or dates are incomplete')
        if row.lean_mean is None and row.fat_mean is None:raise ValueError(f'{row.id}: no published mean')
        group=json.dumps(metadata(row),sort_keys=True)
        segments=groups.setdefault(group,set())
        if row.segment in segments:raise ValueError('Duplicate segment within cohort')
        segments.add(row.segment)
        for field in ('lean','fat'):
            mean,lo,hi=(getattr(row,f'{field}_{x}') for x in ('mean','lower','upper'))
            if mean is not None and ((lo is not None and mean<lo) or (hi is not None and mean>hi)):
                raise ValueError(f'{row.id}: mean outside supplied bounds')
    for i,a in enumerate(rows):
        if a.bmi_max is not None and a.bmi_max>100:raise ValueError('Invalid BMI')
        if not a.measurement_device or a.measurement_device not in a.compatible_device_names:raise ValueError('Unsupported device')
        for b in rows[i+1:]:
            if (a.dataset_id,a.version,a.gender,a.segment,a.measurement_device)!=(b.dataset_id,b.version,b.gender,b.segment,b.measurement_device):continue
            overlap=all((getattr(a,lo) is None or getattr(b,hi) is None or getattr(a,lo)<=getattr(b,hi)) and (getattr(b,lo) is None or getattr(a,hi) is None or getattr(b,lo)<=getattr(a,hi)) for lo,hi in [('age_min','age_max'),('height_min','height_max'),('bmi_min','bmi_max'),('weight_min','weight_max')])
            if overlap:raise ValueError('Overlapping cohort ranges for same segment/device/version')
    return rows

