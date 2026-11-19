import { usesSeconds, doseValue } from "./prescription.js";
import React, { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ArrowUpRight,
  Camera,
  PersonStanding,
  CalendarDays,
  Check,
  ChevronRight,
  Play,
  Clock,
  Flame,
  MessageCircle,
  Dumbbell,
  ShieldCheck,
} from "lucide-react";
import { useGym } from "./GymContext.jsx";
import useLocalDay, { useCalendarClock } from "./useLocalDay.js";
import { today, planForDay, savedPlans } from "./store.js";
import {
  DAYS,
  weekDates,
  weekStats,
  upcoming,
  dateKey,
  appointmentStatus,
  newSession,
  entryFor,
  planPeriod,
} from "./workflow.js";
import { PageHead, Card, Empty, Field, Notice } from "./ui.jsx";
import { photoData } from "./photos.js";
import DailyWeightCard from "./DailyWeightCard.jsx";
import WorkoutHistory from "./WorkoutHistory.jsx";
import AppointmentList from "./AppointmentList.jsx";
import PlanPeriodNotice from "./PlanPeriodNotice.jsx";
import WorkoutSession from "./WorkoutSession.jsx";
import { HealthAPI } from "../shared/lib/api.js";
import { useApiData } from "../health/lib/useApiData.js";
export function MemberHome() {
  const { state } = useGym();
  const m = state.self;
  const now = useCalendarClock(m.appointments);
  const day = dateKey(now);
  const plan = planForDay(savedPlans(m), day);
  const future = plan?.dates[0] > day;
  const dates = weekDates(day);
  const stats = weekStats(m, dates);
  const next = upcoming(m, now)[0];
  const mealReply = m.meals.find(meal => meal.feedback);
  const workoutReply = m.logs.find(log => log.feedback);
  const showWorkoutReply = workoutReply && (!mealReply || workoutReply.date >= mealReply.date);
  const feedback = showWorkoutReply ? workoutReply : mealReply;
  const todayDone = m.logs.some(
    (l) => l.date === day && l.status !== "partial",
  );
  const firstWorkout = !plan && !m.session;
  const { data: measure } = useApiData(() => HealthAPI.latestMeasurement(), []);
  return (
    <>
      <PageHead
        eyebrow="YOUR DAY, YOUR PACE"
        title={
          m.name === "나"
            ? "오늘의 나를, 한 걸음 더."
            : `${m.name}님, 오늘도 한 걸음.`
        }
      >
        꾸준한 운동과 가까운 코칭으로, 나의 변화를 만들어 가세요.
      </PageHead>
      <section className="gym-today-hero">
        <div>
          <span className="gym-eyebrow">
            {m.session
              ? "KEEP GOING"
              : todayDone
                ? "WELL DONE"
                : "TODAY’S MOVEMENT"}
          </span>
          <h2>
            {m.session
              ? "멈췄던 곳부터\n이어서 운동해요."
              : todayDone
                ? "오늘도 해냈어요.\n나의 페이스를 지켜요."
                : plan
                  ? (future ? "다음 운동을\n미리 살펴보세요." : "오늘의 루틴,\n내 컨디션에 맞게.")
                  : "오늘 할 운동을\n골라 보세요."}
          </h2>
          <p>
            {plan
              ? `${plan.options[0].exercises.length}개 동작 · 주 ${plan.frequency}회 트레이너 계획`
              : "코치가 보낸 계획을 열거나 직접 루틴을 골라 시작하세요."}
          </p>
          <Link
            className="gym-button light"
            to={firstWorkout ? "/health/sharing#import" : "/health/my-plan"}
          >
            <Play size={17} />
            {firstWorkout ? "받은 계획 열기" : m.session
              ? "진행 중인 운동 이어서 하기"
              : todayDone
                ? "오늘 기록 살펴보기"
                : future ? "예정된 계획 미리보기" : "오늘 운동 시작"}
          </Link>
          {firstWorkout && <Link className="gym-button light" to="/health/my-plan">내 루틴 직접 고르기</Link>}
        </div>
        <div
          className="gym-week-orbit"
          aria-label={`이번 주 ${stats.days}일 운동 완료`}
        >
          <div>
            <strong>
              {stats.days}
              <small>일</small>
            </strong>
            <span>이번 주 운동</span>
          </div>
          <svg viewBox="0 0 120 120" aria-hidden="true">
            <circle cx="60" cy="60" r="53" />
            <circle
              cx="60"
              cy="60"
              r="53"
              strokeDasharray={`${Math.min(1, stats.days / (stats.target || 7)) * 333} 333`}
            />
          </svg>
        </div>
      </section>
      <DailyWeightCard key={m.id + day} day={day} />
      <PlanPeriodNotice plan={plan} />
      <Card className="gym-week-card">
        <div className="gym-section-head">
          <h2>이번 주, 나의 리듬</h2>
          <span className="gym-pill">
            {stats.target ? `주 ${stats.target}회 계획` : "기록을 시작하세요"}
          </span>
        </div>
        <div className="gym-week-track">
          {dates.map((d, i) => (
            <div
              key={d}
              className={
                (d === day ? "today " : "") +
                (stats.completed.has(d) ? "done" : "")
              }
            >
              <small>{DAYS[i]}</small>
              <span>
                {stats.completed.has(d) ? (
                  <Check size={18} />
                ) : (
                  Number(d.slice(-2))
                )}
              </span>
              <i />
            </div>
          ))}
        </div>
      </Card>
      <div className="gym-two">
        <Card>
          <div className="gym-section-head">
            <h2>{next && appointmentStatus(next, now) === "active" ? "진행 중인 PT" : "다음 PT"}</h2>
            <CalendarDays size={20} />
          </div>
          {next ? (
            <>
              <strong className="gym-date">
                {next.date.slice(5).replace("-", "월 ")}일
              </strong>
              <p>{next.time} · 담당 트레이너와 60분</p>
            </>
          ) : (
            <p>
              트레이너의 계획 파일을 가져오면 PT 일정을 함께 확인할 수 있어요.
            </p>
          )}
          <Link className="gym-text-link" to="/health/coaching">
            일정과 코칭 보기 <ChevronRight size={15} />
          </Link>
        </Card>
        <Card>
          <div className="gym-section-head">
            <h2>내 몸의 변화</h2>
            <PersonStanding size={20} />
          </div>
          {measure?.weight ? (
            <div className="gym-body-metrics">
              <div>
                <strong>
                  {measure.weight}
                  <small>kg</small>
                </strong>
                <span>체성분 측정 체중</span>
              </div>
              <div>
                <strong>
                  {measure.skeletal_muscle_mass ?? "—"}
                  <small>kg</small>
                </strong>
                <span>골격근량</span>
              </div>
            </div>
          ) : (
            <p>체성분 결과지를 사진으로 올리고 내 몸을 3D로 살펴보세요.</p>
          )}
          <Link
            to={measure?.weight ? "/health/body" : "/health/capture"}
            className="gym-text-link"
          >
            {measure?.weight ? "3D로 내 몸 보기" : "결과지 사진 올리기"}{" "}
            <ArrowUpRight size={15} />
          </Link>
        </Card>
      </div>
      {feedback && (
        <Link to={showWorkoutReply ? "/health/coaching#workout-feedback" : "/health/coaching"} className="gym-feedback-banner">
          <span className="gym-avatar">
            <MessageCircle size={21} />
          </span>
          <div>
            <small>{showWorkoutReply ? "담당 트레이너의 운동 코멘트" : "담당 트레이너의 식단 피드백"}</small>
            <p>{feedback.feedback}</p>
          </div>
          <ChevronRight size={19} />
        </Link>
      )}
      <div className="gym-feature-grid">
        {[
          [
            Camera,
            "결과지 사진 인식",
            "찍고, 확인하면 저장까지.",
            "/health/capture",
          ],
          [
            PersonStanding,
            "3D로 내 몸 이해",
            "돌려 보고, 지난 기록과 비교.",
            "/health/body",
          ],
          [
            Dumbbell,
            "내 캐릭터와 운동",
            "실제 3D 시범으로 동작 익히기.",
            "/health/library",
          ],
          [
            ShieldCheck,
            "나의 건강 혜택",
            "참여 조건과 실천 절차 한눈에.",
            "/health/benefits",
          ],
        ].map(([I, t, p, to]) => (
          <Link to={to} key={to}>
            <span className="gym-feature-icon">
              <I size={24} />
            </span>
            <h3>{t}</h3>
            <p>{p}</p>
            <ArrowUpRight size={19} />
          </Link>
        ))}
      </div>
      <Link to="/health/profile" className="gym-text-link">
        내 목표·운동 경험·기구 설정 <ArrowUpRight size={15} />
      </Link>
    </>
  );
}
const starterRoutines = [
  { id: "chair", name: "의자로 시작하기", movements: ["march", "sit_stand", "scapular"] },
  { id: "standing", name: "서서 하는 맨몸 운동", movements: ["standing_march", "step_touch", "wall_push"] },
];
export function MyPlan() {
  const { state, update } = useGym();
  const m = state.self;
  const [selected, setSelected] = useState("standard"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const day = useLocalDay();
  const plans = savedPlans(m);
  const defaultPlan = planForDay(plans, day);
  const [preview, setPreview] = useState(null);
  const previewWeek = preview?.defaultWeek === defaultPlan?.dates[0] ? preview?.week : null;
  const plan = plans.find(item => item.dates[0] === previewWeek) ?? defaultPlan;
  const future = plan?.dates[0] > day;
  const option =
    plan?.options.find((o) => o.id === selected) || plan?.options[0];
  async function start() {
    try {
      setBusy(true);
      await update((s) => {
        if (s.self.session) return;
        const latest = savedPlans(s.self);
        const current = previewWeek
          ? latest.find(item => item.dates[0] === previewWeek)
          : planForDay(latest, today());
        if (!current || current.id !== plan.id || current.updatedAt !== plan.updatedAt)
          throw Error("운동 계획이 바뀌었어요. 새 처방을 확인하고 시작해 주세요.");
        if (current.dates[0] > today())
          throw Error(`${current.dates[0]}부터 시작할 수 있어요.`);
        s.self.session = newSession(current, current.options.find(item => item.id === option.id));
      });
      setError("");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function startPersonal(routine) {
    setBusy(true);
    setError("");
    try {
      await update(s => {
        if (s.self.session) return;
        const exercises = routine.movements.map(id => ({ ...entryFor(id), sets: 1 }));
        s.self.session = newSession({ id: "personal" }, { ...routine, exercises });
      });
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  if (m.session) return <WorkoutSession />;
  return (
    <>
      <PageHead eyebrow="MY ROUTINE" title="오늘의 컨디션에 맞게 골라요.">
        {plan ? "트레이너가 구성한 동작을, 내 속도로 하나씩 수행하세요." : "루틴을 고르면 동작별 시범을 보며 운동할 수 있어요."}
      </PageHead>
      <Notice error>{error}</Notice>
      {plans.length > 1 && (
        <Field label="운동 계획 주 선택">
          <select value={plan.dates[0]} onChange={event => {
            setPreview({ week: event.target.value, defaultWeek: defaultPlan.dates[0] });
            setError("");
          }}>
            {plans.map(item => {
              const period = planPeriod(item, day);
              const label = { current: "이번 주", upcoming: "예정", past: "지난 계획" }[period.kind];
              return <option key={item.dates[0]} value={item.dates[0]}>{item.dates[0]} · {label}</option>;
            })}
          </select>
        </Field>
      )}
      <PlanPeriodNotice plan={plan} />
      {!plan ? (
        <Card>
          <h2>내 루틴 직접 고르기</h2>
          {starterRoutines.map(routine => <div key={routine.id} className="gym-starter-routine">
            <h3>{routine.name}</h3>
            <p>{routine.movements.map(id => entryFor(id).name).join(" · ")} / 각 1세트</p>
            <button className="gym-button" disabled={busy} onClick={() => startPersonal(routine)}>{routine.name} 시작</button>
          </div>)}
          <Link className="gym-button secondary" to="/health/sharing#import">
            트레이너 계획 가져오기 <ArrowUpRight size={16} />
          </Link>
          <Link className="gym-button secondary" to="/health/routine">
            내 루틴 직접 만들기
          </Link>
        </Card>
      ) : (
        <>
          <div className="gym-choice-grid">
            {plan.options.map((o) => (
              <button
                className={"gym-option " + (option.id === o.id ? "active" : "")}
                aria-pressed={option.id === o.id}
                key={o.id}
                onClick={() => setSelected(o.id)}
              >
                <span className="gym-option-top">
                  <Clock size={17} />
                  <span>약 {o.minutes}분</span>
                  {option.id === o.id && <Check size={18} />}
                </span>
                <strong>{o.name}</strong>
                <p>
                  {o.exercises.length}개 동작 ·{" "}
                  {o.exercises.reduce((n, e) => n + e.sets, 0)}세트
                </p>
                <small>
                  {o.id === "standard"
                    ? "계획대로 차근차근"
                    : "세트는 가볍게, 습관은 꾸준히"}
                </small>
              </button>
            ))}
          </div>
          <Card>
            <div className="gym-section-head">
              <h2>{option.name}</h2>
              <span className="gym-pill">{option.exercises.length}개 동작</span>
            </div>
            {option.exercises.map((e, i) => (
              <div className="gym-row" key={e.id}>
                <span className="gym-avatar">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <strong>{e.name}</strong>
                  <p>
                    {e.sets}세트 · {doseValue(e.reps)}
                    {usesSeconds(e.dose) ? "초" : "회"} · 휴식 {e.rest ?? 60}
                    초
                  </p>
                </div>
                <Link
                  className="gym-text-link"
                  to={`/health/library?exercise=${encodeURIComponent(e.id)}`}
                >
                  시범 <Play size={14} />
                </Link>
              </div>
            ))}
            <div className="gym-note">
              세트별로 체크하면 진행 상황이 저장됩니다. 운동 중 다른 화면을 보고
              돌아와도 이어서 할 수 있어요.
            </div>
            <button
              className="gym-button gym-full"
              onClick={start}
              disabled={busy || future}
            >
              <Play size={18} />
              {future ? `${plan.dates[0]}부터 시작` : busy ? "준비 중…" : "이 루틴으로 운동 시작"}
            </button>
          </Card>
          <Card title="계획된 주간 일정">
            <div className="gym-week">
              {DAYS.map((d, i) => (
                <div className={plan.days.includes(i) ? "active" : ""} key={d}>
                  <small>
                    {d} · {Number(plan.dates[i].slice(-2))}
                  </small>
                  <strong>
                    {plan.ptDays.includes(i)
                      ? "PT"
                      : plan.days.includes(i)
                        ? "운동"
                        : "회복"}
                  </strong>
                </div>
              ))}
            </div>
            <p>
              {plan.dates[0]} 시작 주 · 계획 조정은 담당 트레이너와 상의해
              주세요.
            </p>
          </Card>
        </>
      )}
      <WorkoutHistory member={m} />
    </>
  );
}
export function Coaching() {
  const { state, update } = useGym();
  const m = state.self;
  const now = useCalendarClock(m.appointments);
  const { hash } = useLocation();
  const repliesRef = useRef(null);
  const hasReplies = m.logs.some(log => log.feedback);
  useEffect(() => {
    if (hasReplies && hash === "#workout-feedback") {
      repliesRef.current?.focus({ preventScroll: true });
      repliesRef.current?.scrollIntoView({ block: "start" });
    }
  }, [hash, hasReplies]);
  const [photo, setPhoto] = useState(""),
    [note, setNote] = useState(""),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [tab, setTab] = useState("all");
  async function upload(file) {
    try {
      setBusy(true);
      setMessage("");
      setPhoto("");
      setPhoto(await photoData(file));
      setError("");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function save(e) {
    e.preventDefault();
    try {
      if (!photo) throw Error("식단 사진을 선택하세요.");
      setBusy(true);
      await update((s) =>
        s.self.meals.unshift({
          id: crypto.randomUUID(),
          photo,
          note: note.trim(),
          date: today(),
          feedback: "",
        }),
      );
      setPhoto("");
      setNote("");
      setError("");
      setMessage(
        "식단을 저장했어요. 공유 센터에서 트레이너에게 기록을 보내세요.",
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const meals = m.meals.filter((x) => tab === "all" || x.feedback);
  return (
    <>
      <PageHead
        eyebrow="STAY CLOSE TO YOUR COACH"
        title="사진 한 장으로, 가까워지는 코칭."
      >
        식단은 간단하게 남기고, 트레이너의 피드백을 이어가세요.
      </PageHead>
      <Notice error>{error}</Notice>
      <Notice>{message}</Notice>
      <div className="gym-two">
        <Card title="오늘의 식단 남기기">
          <form onSubmit={save}>
            <label className="gym-photo-picker">
              <Camera size={30} />
              <strong>
                {photo ? "사진 다시 선택" : "사진으로 간단하게 기록"}
              </strong>
              <span>촬영하거나 앨범에서 골라 주세요</span>
              <input
                type="file"
                accept="image/*"
                aria-label="음식 사진 선택"
                disabled={busy}
                onChange={event => {
                  const file = event.target.files[0];
                  event.target.value = "";
                  if (file) upload(file);
                }}
              />
            </label>
            {photo && (
              <img
                className="gym-photo"
                src={photo}
                alt="저장할 식단 미리보기"
              />
            )}
            <Field label="짧은 메모 · 선택">
              <textarea
                value={note}
                maxLength={500}
                onChange={(e) => setNote(e.target.value)}
                placeholder="점심 먹고 운동하러 가요."
              />
            </Field>
            <button className="gym-button gym-full" disabled={busy || !photo}>
              {busy ? "사진 준비 중…" : "식단 저장하기"}
            </button>
          </form>
        </Card>
        <Card title="나의 PT 일정">
          <AppointmentList rows={upcoming(m, now)} empty="최신 계획을 가져오면 예정된 PT가 표시됩니다.">
            {a => (
            <div className="gym-appointment" key={a.id}>
              <div className="gym-appointment-time">
                <strong>{a.time}</strong>
                <small>{a.date.slice(5)}</small>
              </div>
              <div>
                <strong>{appointmentStatus(a, now) === "active" ? "PT 수업 중" : "퍼스널 트레이닝"}</strong>
                <p>담당 트레이너와 60분</p>
              </div>
            </div>
            )}
          </AppointmentList>
          <Link to="/health/sharing" className="gym-button secondary">
            계획·피드백 가져오기 <ArrowUpRight size={15} />
          </Link>
          <p className="gym-muted">
            기록 공유는 직접 파일을 전달하는 방식입니다.
          </p>
        </Card>
      </div>
      {hasReplies && <div id="workout-feedback" ref={repliesRef} tabIndex={-1} aria-label="받은 운동 코멘트">
        <WorkoutHistory member={m} repliesOnly/>
      </div>}
      <div className="gym-section-head">
        <h2 className="gym-section-title">내 식단과 코칭</h2>
        <div className="gym-segment">
          {[
            ["all", "전체"],
            ["feedback", "답변 받은 식단"],
          ].map(([v, l]) => (
            <button
              className={tab === v ? "active" : ""}
              key={v}
              aria-pressed={tab === v}
              onClick={() => setTab(v)}
            >
              {l}
            </button>
          ))}
        </div>
      </div>
      <div className="gym-meals-grid">
        {meals.map((item) => (
          <Card key={item.id} className="gym-feed-card">
            <img
              loading="lazy"
              className="gym-photo"
              src={item.photo}
              alt={`${item.date} 식단 사진`}
            />
            <span className="gym-pill">{item.date}</span>
            <p>{item.note || "사진으로 남긴 나의 한 끼"}</p>
            <div
              className={"gym-coach-reply " + (item.feedback ? "answered" : "")}
            >
              <MessageCircle size={17} />
              <div>
                <strong>
                  {item.feedback ? "트레이너 피드백" : "피드백 대기"}
                </strong>
                <p>
                  {item.feedback ||
                    "기록을 공유한 뒤, 트레이너의 답변을 받아보세요."}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>
      {!meals.length && (
        <Card>
          <Empty>
            {tab === "feedback"
              ? "아직 도착한 피드백이 없습니다."
              : "사진 한 장으로 오늘의 식단을 남겨보세요."}
          </Empty>
        </Card>
      )}
    </>
  );
}
