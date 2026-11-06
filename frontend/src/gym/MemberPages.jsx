import React, { useState } from "react";
import { Link } from "react-router-dom";
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
import { today } from "./store.js";
import {
  DAYS,
  weekDates,
  weekStats,
  upcoming,
  newSession,
} from "./workflow.js";
import { PageHead, Card, Empty, Field, Notice } from "./ui.jsx";
import { photoData } from "./photos.js";
import WorkoutSession from "./WorkoutSession.jsx";
import { HealthAPI } from "../shared/lib/api.js";
import { useApiData } from "../health/lib/useApiData.js";
export function MemberHome() {
  const { state } = useGym();
  const m = state.self;
  const dates = weekDates();
  const stats = weekStats(m, dates);
  const next = upcoming(m)[0];
  const feedback = m.meals.find((x) => x.feedback);
  const todayDone = m.logs.some(
    (l) => l.date === today() && l.status !== "partial",
  );
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
                : m.plan
                  ? "오늘의 루틴,\n내 컨디션에 맞게."
                  : "작은 시작이\n큰 변화를 만듭니다."}
          </h2>
          <p>
            {m.plan
              ? `${m.plan.options[0].exercises.length}개 동작 · 주 ${m.plan.frequency}회 트레이너 계획`
              : "결과지를 올리고, 나에게 맞는 운동을 시작하세요."}
          </p>
          <Link
            className="gym-button light"
            to={m.plan || m.session ? "/health/my-plan" : "/health/capture"}
          >
            <Play size={17} />
            {m.session
              ? "진행 중인 운동 이어서 하기"
              : todayDone
                ? "오늘 기록 살펴보기"
                : m.plan
                  ? "오늘 운동 시작"
                  : "내 몸부터 알아보기"}
          </Link>
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
                (d === today() ? "today " : "") +
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
            <h2>다음 PT</h2>
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
                <span>체중</span>
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
        <Link to="/health/coaching" className="gym-feedback-banner">
          <span className="gym-avatar">
            <MessageCircle size={21} />
          </span>
          <div>
            <small>담당 트레이너의 피드백</small>
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
export function MyPlan() {
  const { state, update } = useGym();
  const m = state.self;
  const [selected, setSelected] = useState("standard"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const plan = m.plan;
  const option =
    plan?.options.find((o) => o.id === selected) || plan?.options[0];
  async function start() {
    try {
      setBusy(true);
      await update((s) => {
        if (s.self.session) return;
        s.self.session = newSession(plan, option);
      });
      setError("");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  if (m.session) return <WorkoutSession />;
  return (
    <>
      <PageHead eyebrow="MY ROUTINE" title="오늘의 컨디션에 맞게 골라요.">
        트레이너가 구성한 동작을, 내 속도로 하나씩 수행하세요.
      </PageHead>
      <Notice error>{error}</Notice>
      {!plan ? (
        <Card>
          <Empty>
            <Dumbbell size={32} />
            <br />
            아직 전달받은 운동 계획이 없어요.
          </Empty>
          <Link className="gym-button" to="/health/sharing">
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
                    {e.sets}세트 · {e.reps}
                    {e.dose === "duration" ? "초" : "회"} · 휴식 {e.rest ?? 60}
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
              disabled={busy}
            >
              <Play size={18} />
              {busy ? "준비 중…" : "이 루틴으로 운동 시작"}
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
      <Card title="최근 나의 운동">
        {m.logs.length ? (
          m.logs.slice(0, 7).map((l) => (
            <div className="gym-row" key={l.id}>
              <span className="gym-avatar">
                <Check size={17} />
              </span>
              <div>
                <strong>{l.name}</strong>
                <p>
                  {l.date} · {l.effort}
                </p>
              </div>
              <span className="gym-pill">
                {l.completedSets !== undefined
                  ? `${l.completedSets}/${l.totalSets}세트`
                  : l.status === "partial"
                    ? "부분 수행"
                    : "완료"}
              </span>
            </div>
          ))
        ) : (
          <Empty>첫 운동을 마치면 이곳에 기록이 쌓입니다.</Empty>
        )}
      </Card>
    </>
  );
}
export function Coaching() {
  const { state, update } = useGym();
  const m = state.self;
  const [photo, setPhoto] = useState(""),
    [note, setNote] = useState(""),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [tab, setTab] = useState("all");
  async function upload(file) {
    try {
      setBusy(true);
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
                onChange={(e) => e.target.files[0] && upload(e.target.files[0])}
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
          {upcoming(m).map((a) => (
            <div className="gym-appointment" key={a.id}>
              <div className="gym-appointment-time">
                <strong>{a.time}</strong>
                <small>{a.date.slice(5)}</small>
              </div>
              <div>
                <strong>퍼스널 트레이닝</strong>
                <p>담당 트레이너와 60분</p>
              </div>
            </div>
          ))}
          {!upcoming(m).length && (
            <Empty>최신 계획을 가져오면 예정된 PT가 표시됩니다.</Empty>
          )}
          <Link to="/health/sharing" className="gym-button secondary">
            계획·피드백 가져오기 <ArrowUpRight size={15} />
          </Link>
          <p className="gym-muted">
            기록 공유는 직접 파일을 전달하는 방식입니다.
          </p>
        </Card>
      </div>
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
