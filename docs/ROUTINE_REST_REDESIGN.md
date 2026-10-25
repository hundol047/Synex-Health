# Personal routine composition and rest redesign

Reviewed official product pages on 2026-10-25:

| Product | Publicly described behavior | Applied here |
| --- | --- | --- |
| [Fitbod](https://fitbod.me/) | Plans consider goals, equipment, schedule, preferences, training history and recovery | Reserve balanced strength movements before optional cardio; respect the time budget and available equipment |
| [Strong](https://www.strong.app/) | Custom timers, workout logging, supersets, scheduling and RPE | Keep adjustable set rest and skip controls; distinguish transition from set recovery |
| [Nike Training Club](https://www.nike.com/ntc-app) | Progressive programs, varied workouts and recovery guidance | Clearly label full-body versus recovery sessions and show the complete session count |

These are product comparisons, not medical evidence or claims of equivalent personalization. The rest durations below are Synex product defaults, not competitors' published algorithms.

## Corrected failures

Previously a 10-minute fat-management plan allocated all ten minutes to walking before considering strength exercises. Missing sets also made continuous cardio repeat twice. The timer appended rest after the final exercise, then inserted another preparation countdown at each transition.

The device planner now reserves squat, push, pull, hinge and core movements first. It distributes extra sets within the actual motion playback budget, then adds optional cardio only if time remains. Recovery sessions contain multiple movements and are explicitly labelled. Suggested weekdays separate the three main strength sessions when more weekly activity days are requested.

Light bodyweight set rest defaults to 30 seconds; other bodyweight defaults to 45–60 seconds; equipment defaults to 60–90 seconds. Movement transitions default to 20 seconds for bodyweight and 30 seconds for equipment. The existing 10–120-second set-rest adjustment and skip control remain. Only the initial movement has a five-second preparation countdown. The final exercise completes immediately without mandatory rest. Manual set recording likewise does not impose a final-set rest.

Daily estimates include manual warmup (one or two minutes), actual motion duration, initial preparation, set rest and transitions. Post-workout recommended stretching is separate and disclosed in the UI. Changing playback speed or rest changes the guided duration. Availability above 60 minutes does not force unnecessary volume; cautious profiles cap at 30 minutes. This remains a basic local rule-based plan, not an individualized training prescription. Existing pain and safety gates remain.

Old device-basic-v1 plans are marked for regeneration rather than deleting measurements or workout records. New plans identify device-balanced-v2.

## Verification

Regression coverage checks the original ten-minute fat-management failure, 315 combinations of duration, week frequency, experience and location, gym equipment selection, recovery-day variety, playback budget consistency, single-set continuous cardio, final-rest removal, voice introductions and manual progression. Browser checks cover actual personal-mode generation, automatic playback, manual multi-set completion and persistence.

Local validation: 465 frontend tests passed; seven targeted browser scenarios passed at mobile sizes, including the original ten-minute failure and manual multi-set saving; personal production build passed. These checks are browser/simulation validation, not a claim of physical-phone or training-outcome validation.
