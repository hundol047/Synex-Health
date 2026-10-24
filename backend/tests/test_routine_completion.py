"""Counselor completion counts distinct planned slots, not repeated log rows."""
from datetime import date
import re
from test_health import client, student_headers, counselor_headers


def completed_payload(routine, exercise):
    payload = {
        'routine_id': routine['id'], 'routine_exercise_id': exercise['exercise_id'],
        'day_number': exercise['day_number'], 'exercise_name': exercise['exercise_name'],
        'date': date.today().isoformat(), 'time_zone': 'UTC', 'completed': True,
        'difficulty': 'moderate', 'expected_revision': 0,
    }
    if exercise['dose_type'] == 'hold':
        payload['timed_sets_seconds'] = [exercise['hold_seconds']] * (exercise['sets'] or 1)
    elif exercise['dose_type'] == 'duration':
        minutes = re.search(r'(\d+(?:\.\d+)?)\s*분', exercise['duration'])
        assert minutes, exercise
        payload['performed_seconds'] = float(minutes[1]) * 60
    else:
        payload['set_records'] = [{'reps': 10, 'kind': 'working'}] * (exercise['sets'] or 1)
    return payload


def test_counselor_completion_deduplicates_repeated_slots(client):
    student = student_headers(client)
    assert client.put('/api/exercise-profile', headers=student, json={
        'days_per_week': 3, 'minutes_per_session': 40, 'experience_level': 'BEGINNER',
        'goal': 'GENERAL_HEALTH', 'exercise_location': 'home', 'available_equipment': [],
    }).status_code == 200
    response = client.post('/api/exercise-routines/generate', headers=student)
    assert response.status_code == 200, response.text
    routine = response.json()
    exercises = routine['exercises']
    assert len(exercises) > 1
    payload = completed_payload(routine, exercises[0])
    first_id = None
    for edit in range(4):
        payload['mutation_id'] = f'repeat-{edit}'
        response = client.post('/api/workouts', headers=student, json=payload)
        assert response.status_code == 200, response.text
        workout = response.json()
        assert workout['completion_status'] == 'completed' and workout['completed']
        assert workout['revision'] == edit + 1
        first_id = first_id or workout['id']
        assert workout['id'] == first_id
        payload['expected_revision'] = workout['revision']
    assert len(client.get('/api/workouts', headers=student).json()) == 1
    counselor = counselor_headers(client)

    def percent():
        response = client.get('/api/counselor/students', headers=counselor)
        assert response.status_code == 200
        return next(row for row in response.json() if row['id'] == 'student-jimin')['routine_completion_percent']

    expected = round(1 / len(exercises) * 100, 1)
    assert percent() == expected
    # Same-day API edits intentionally collapse to one row. Also exercise the historical
    # duplicate-row case so reverting the dashboard to a raw row count actually fails.
    from app.health.router import store
    from app.health.schemas import WorkoutLog
    saved = WorkoutLog.model_validate(workout)
    for duplicate in range(3):
        store.add_workout(saved.model_copy(update={'id': f'historical-repeat-{duplicate}'}))
    assert percent() == expected
    for index, exercise in enumerate(exercises[1:], 1):
        body = completed_payload(routine, exercise)
        body['mutation_id'] = f'slot-{index}'
        response = client.post('/api/workouts', headers=student, json=body)
        assert response.status_code == 200, response.text
        assert response.json()['completion_status'] == 'completed'
    assert percent() == 100.0
