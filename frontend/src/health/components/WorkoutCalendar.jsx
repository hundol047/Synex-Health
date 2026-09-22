import React,{useState} from 'react';
const iso=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
export function calendarStats(workouts,today=new Date()){
 const completed=workouts.filter(w=>w.completed),dates=new Set(completed.map(w=>w.date)),end=iso(today),week=new Date(today);week.setDate(week.getDate()-((week.getDay()+6)%7));
 let streak=0,cursor=new Date(today);if(!dates.has(iso(cursor)))cursor.setDate(cursor.getDate()-1);while(dates.has(iso(cursor))){streak++;cursor.setDate(cursor.getDate()-1);}
 const weeks=new Set([...dates].map(value=>{const d=new Date(value+'T12:00:00');d.setDate(d.getDate()-((d.getDay()+6)%7));return iso(d);})),months=new Set([...dates].map(d=>d.slice(0,7)));
 let weeklyStreak=0,monthlyStreak=0,w=new Date(week),mo=new Date(today.getFullYear(),today.getMonth(),1);
 if(!weeks.has(iso(w)))w.setDate(w.getDate()-7);while(weeks.has(iso(w))){weeklyStreak++;w.setDate(w.getDate()-7);}
 if(!months.has(iso(mo).slice(0,7)))mo.setMonth(mo.getMonth()-1);while(months.has(iso(mo).slice(0,7))){monthlyStreak++;mo.setMonth(mo.getMonth()-1);}
 return {weeklyStreak,monthlyStreak,sessions:dates.size,exercises:completed.length,week:[...dates].filter(d=>d>=iso(week)&&d<=end).length,month:[...dates].filter(d=>d.slice(0,7)===end.slice(0,7)).length,streak,minutes:completed.reduce((s,w)=>s+(w.actual_minutes||0),0)};
}
export default function WorkoutCalendar({workouts=[],routine}){
 const [month,setMonth]=useState(iso(new Date()).slice(0,7));const [year,m]=month.split('-').map(Number),first=new Date(year,m-1,1),count=new Date(year,m,0).getDate(),stats=calendarStats(workouts);
 const weekdays=['월','화','수','목','금','토','일'],planned=new Set((routine?.schedule||[]).map(s=>s.split('·')[1]?.trim()));
 return <section className="card"><h2>운동 캘린더</h2><label>조회 월 <input type="month" value={month} onChange={e=>{if(e.target.value)setMonth(e.target.value);}}/></label><p>✓ 완료 · ○ 예정 · ! 통증 · − 미완료 · 빈칸은 휴식/기록 없음</p><div className="workout-calendar">{weekdays.map(d=><strong key={d}>{d}</strong>)}{Array.from({length:(first.getDay()+6)%7},(_,i)=><span key={'empty'+i}/>)}{Array.from({length:count},(_,i)=>{const day=iso(new Date(year,m-1,i+1)),logs=workouts.filter(w=>w.date===day),scheduled=planned.has(weekdays[(new Date(year,m-1,i+1).getDay()+6)%7])&&day>=(routine?.created_at||'9999').slice(0,10);const symbol=logs.some(w=>w.difficulty==='pain')?'!':logs.some(w=>w.completed)?'✓':scheduled?(day>=iso(new Date())?'○':'−'):logs.length?'−':'';return <div key={day} aria-label={`${day} ${symbol}`} className={symbol==='✓'?'calendar-done':''}>{i+1}<strong>{symbol}</strong></div>;})}</div><p>연속 운동 {stats.streak}일 · 이번 주 {stats.week}일 · 이번 달 {stats.month}일</p><p>연속 활동 주 {stats.weeklyStreak}주 · 연속 활동 월 {stats.monthlyStreak}개월</p><p>총 {stats.sessions}일 / {stats.exercises}개 운동 · 기록된 실제 시간 {stats.minutes}분</p><p>주간 목표 달성률 {routine?Math.min(100,Math.round(stats.week/routine.days_per_week*100)):'—'}% (활동 일수 기준)</p></section>;
}
