"""Offline mapping check: no network, database writes, secrets or health values printed."""
import argparse
import json
from pathlib import Path
from app.health.providers.json_contract import JsonMeasurementContract
from app.health.schemas import BodyCompositionCreateRequest


def validate(config, response, subject):
    contract = JsonMeasurementContract(config)
    request = contract.request(subject)
    rows = contract.readings(response)
    if len(rows) > 1000:
        raise ValueError('Too many measurements')
    ids = set()
    for row in rows:
        contract.verify_subject(row, subject)
        external_id, values = contract.normalize(row)
        if not external_id or len(external_id) > 200 or external_id in ids:
            raise ValueError('Invalid or duplicate measurement ID')
        ids.add(external_id)
        BodyCompositionCreateRequest(**values)
    more = contract.next_request(response, request) is not None
    return {'status': 'sample_valid', 'records': len(rows), 'more_pages': more,
            'live_connection_verified': False}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--registry', type=Path, required=True)
    parser.add_argument('--institution', required=True)
    parser.add_argument('--sample', type=Path, required=True)
    parser.add_argument('--subject', required=True, help='Fictional account ID from the redacted sample')
    args = parser.parse_args()
    try:
        registry = json.loads(args.registry.read_text())
        response = json.loads(args.sample.read_text())
        result = validate(registry[args.institution]['contract'], response, args.subject)
    except (OSError, ValueError, KeyError, TypeError, IndexError, OverflowError):
        parser.exit(1, '검증 실패: 공식 명세의 경로·필수 항목·단위·날짜·대상 계정을 확인하세요. 데이터는 저장하지 않았습니다.\n')
    print(json.dumps(result))


if __name__ == '__main__':
    main()
