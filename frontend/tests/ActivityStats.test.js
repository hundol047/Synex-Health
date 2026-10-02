import {it,expect} from 'vitest';
import {calendarStats} from '../src/health/components/WorkoutCalendar.jsx';
import {workoutSummary} from '../src/health/lib/workoutProgress.js';
it('counts partial and stopped performance without promoting it to target completion',()=>{
 const logs=[{date:'2026-10-01',completion_status:'partial',performed_seconds:45,actual_minutes:1},{date:'2026-10-02',completion_status:'stopped',pain:2,set_records:[{reps:5}],actual_minutes:2},{date:'2026-10-02',completed:true,sets_completed:1,actual_minutes:3},{date:'2026-09-30',completion_status:'not_started',actual_minutes:10},{date:'2026-09-29',completion_status:'stopped',pain:4,sets_completed:0}];
 expect(calendarStats(logs,new Date(2026,9,2))).toMatchObject({sessions:2,completedDays:1,minutes:6,streak:2});
 expect(workoutSummary(logs,new Date(2026,9,2)).weeks.at(-1)).toMatchObject({days:2,completedDays:1});
});
