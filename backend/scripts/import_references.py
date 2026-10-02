"""Validate a licensed, independently reviewed cohort export; dry-run by default.
Run: PYTHONPATH=. python scripts/import_references.py path.json [--apply]
Expected JSON: {"references": [ReferenceRange, ...]}. Never supplies synthetic production means.
"""
import argparse,json,sys
from pathlib import Path
from app.health.schemas import ReferenceRange
from app.health.reference import production_eligible,metadata


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
    return rows


def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('input');parser.add_argument('--apply',action='store_true');args=parser.parse_args()
    rows=validate(json.loads(Path(args.input).read_text()))
    if args.apply:
        from app.health.store import HealthStore
        store=HealthStore()
        datasets={r.dataset_id for r in rows}
        existing=store.list_reference_ranges()
        foreign={r.id for r in existing if r.dataset_id not in datasets}
        if any(r.id in foreign for r in rows):raise ValueError('Record ID belongs to another dataset')
        with store.connect() as db:
            for old in existing:
                if old.dataset_id in datasets:db.execute('DELETE FROM reference_ranges WHERE id=?',(old.id,))
            for row in rows:db.execute('INSERT INTO reference_ranges VALUES (?,?)',(row.id,row.model_dump_json()))
    print(json.dumps({'status':'imported' if args.apply else 'validated_only','records':len(rows),'datasets':sorted({r.dataset_id for r in rows})}))

if __name__=='__main__':
    try:main()
    except (ValueError,KeyError,OSError) as e:print(f'REFERENCE IMPORT BLOCKED: {e}',file=sys.stderr);sys.exit(1)
