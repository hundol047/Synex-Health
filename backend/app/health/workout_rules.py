"""Date boundaries and reported-performance status, independent of server timezone."""
from datetime import datetime, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
import re


def workout_zone(name):
    try:
        return ZoneInfo(name)
    except (ZoneInfoNotFoundError, ValueError, TypeError):
        raise ValueError('올바른 시간대를 선택하세요.')


def today_in_zone(name):
    return datetime.now(timezone.utc).astimezone(workout_zone(name)).date()


def created_day(value, zone):
    parsed = datetime.fromisoformat(value.replace('Z', '+00:00'))
    return parsed.replace(tzinfo=parsed.tzinfo or timezone.utc).astimezone(workout_zone(zone)).date()


def completion(req, exercise):
    if req.pain or req.difficulty == 'pain':
        return 'stopped'
    if exercise.dose_type == 'hold':
        amounts = req.timed_sets_seconds
        done = sum(s >= (exercise.hold_seconds or 1) for s in amounts)
        performed = any(s > 0 for s in amounts)
        enough = done >= (exercise.sets or 1)
    elif exercise.dose_type == 'duration':
        performed = (req.performed_seconds or 0) > 0
        target = re.search(r'(\d+(?:\.\d+)?)\s*분', exercise.duration or '')
        enough = bool(target) and (req.performed_seconds or 0) >= float(target[1]) * 60
    else:
        done = sum(s.kind == 'working' and s.reps > 0 for s in req.set_records) if req.set_records else (req.sets_completed or 0)
        if not req.set_records and req.reps_completed and re.fullmatch(r'[0\s,]+', req.reps_completed):
            done = 0
        performed = done > 0
        enough = done >= (exercise.sets or 1)
    if not performed:
        return 'not_started'
    return 'completed' if enough and req.completed else 'partial'
