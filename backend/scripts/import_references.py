"""Validate a licensed, independently reviewed cohort export; dry-run by default.
Run: PYTHONPATH=. python scripts/import_references.py path.json [--apply]
Expected JSON: {"references": [ReferenceRange, ...]}. Never supplies synthetic production means.
"""
import argparse,json,sys
from pathlib import Path
from app.health.schemas import ReferenceRange
from app.health.reference import production_eligible,metadata


from app.health.reference_validation import validate


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
