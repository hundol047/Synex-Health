import React, { useState, useEffect, useRef, lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import {
  Check,
  Play,
  ChevronLeft,
  ChevronRight,
  Timer,
  Pause,
  ArrowUpRight,
} from "lucide-react";
import { useGym } from "./GymContext.jsx";
import { exercises } from "./store.js";
import {
  sessionSummary,
  finishSession,
  sessionElapsed,
  pauseSession,
} from "./workflow.js";
import { Card, PageHead, Field, Notice } from "./ui.jsx";
const ExerciseMotion = lazy(
  () => import("../health/components/exercise/ExerciseMotion.jsx"),
);
const formatTime = (secs) =>
  `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;
export default function WorkoutSession() {
  const { state, update } = useGym();
  const session = state.self.session;
  const finishPanel = useRef(null),
    sessionId = session.id;
  const [discarding, setDiscarding] = useState(false);
  const [now, setNow] = useState(Date.now()),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [showDemo, setShowDemo] = useState(false),
    [finishing, setFinishing] = useState(false),
    [effort, setEffort] = useState("적당했어요");
  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, []);
  useEffect(() => {
    const pause = () =>
      update((s) => {
        if (s.self.session?.id === sessionId)
          pauseSession(s.self.session, true);
      }).catch(() => {});
    const hide = () => {
      if (document.hidden) pause();
    };
    document.addEventListener("visibilitychange", hide);
    return () => {
      document.removeEventListener("visibilitychange", hide);
      pause();
    };
  }, [sessionId, update]);
  useEffect(() => {
    if (finishing || discarding)
      requestAnimationFrame(() =>
        finishPanel.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        }),
      );
  }, [finishing, discarding]);
  const e = session.exercises[session.index];
  const source = exercises.find((x) => x.id === e.id);
  const { done, total } = sessionSummary(session);
  const rest = Math.max(0, Math.ceil(((session.restUntil || 0) - now) / 1000));
  async function change(fn) {
    try {
      setBusy(true);
      await update((s) => {
        if (s.self.session?.id === session.id) fn(s.self.session);
      });
      setError("");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function toggle(index) {
    await change((s) => {
      if (s.paused) pauseSession(s, false);
      const key = `${e.id}:${index}`;
      if (s.checked.includes(key)) {
        s.checked = s.checked.filter((x) => x !== key);
        s.restUntil = null;
      } else {
        s.checked.push(key);
        s.restUntil = Date.now() + (e.rest ?? 60) * 1000;
      }
    });
  }
  async function finish() {
    try {
      setBusy(true);
      await update((s) => finishSession(s.self, effort));
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  }
  async function discard() {
    try {
      setBusy(true);
      await update((s) => {
        if (s.self.session?.id === session.id) s.self.session = null;
      });
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  }
  function move(index) {
    setShowDemo(false);
    change((s) => {
      s.index = index;
      s.restUntil = null;
    });
  }
  return (
    <>
      <PageHead eyebrow="YOUR WORKOUT IS IN PROGRESS" title={session.name}>
        진행 상황은 기기에 저장됩니다. 화면을 나갔다 돌아와도 이어서 할 수
        있어요.
      </PageHead>
      <Notice error>{error}</Notice>
      <div className="gym-session-tools">
        <button
          className="gym-button secondary small"
          disabled={busy}
          onClick={() => change((s) => pauseSession(s, !s.paused))}
        >
          {session.paused ? <Play size={16} /> : <Pause size={16} />}{" "}
          {session.paused ? "운동 이어하기" : "잠깐 쉬기"}
        </button>
        <button
          className="gym-quiet-button"
          disabled={busy}
          onClick={() => {
            setDiscarding(true);
            setFinishing(false);
          }}
        >
          이 운동 취소
        </button>
      </div>
      {session.paused && (
        <Notice>
          운동 시간이 일시정지되었습니다. 이어하기를 누르면 다시 시작합니다.
        </Notice>
      )}
      <div className="gym-session-summary">
        <span>
          <Timer size={17} />
          {formatTime(Math.floor(sessionElapsed(session, now) / 1000))}
        </span>
        <span>
          {done} / {total}세트
        </span>
        <span>
          동작 {session.index + 1} / {session.exercises.length}
        </span>
      </div>
      <div
        className="gym-progress-track"
        role="progressbar"
        aria-label="세트 진행률"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={done}
      >
        <span style={{ width: `${(done / total) * 100}%` }} />
      </div>
      <Card className="gym-session-card">
        <div className="gym-session-heading">
          <span className="gym-session-number">
            {String(session.index + 1).padStart(2, "0")}
          </span>
          <div>
            <span className="gym-eyebrow">
              {source?.target_muscle?.join(" · ")}
            </span>
            <h2>{e.name}</h2>
            <p>
              {e.sets}세트 · {e.reps}
              {e.dose === "duration" ? "초" : "회"} · 세트 사이 {e.rest ?? 60}초
              휴식
            </p>
          </div>
        </div>
        <button
          className="gym-button secondary"
          onClick={() => setShowDemo((x) => !x)}
          aria-expanded={showDemo}
        >
          <Play size={17} />
          {showDemo ? "3D 동작 접기" : "3D 동작 시범 보기"}
        </button>
        {showDemo && source && (
          <div className="gym-session-motion">
            <Suspense
              fallback={<p role="status">3D 동작을 준비하고 있어요…</p>}
            >
              <ExerciseMotion
                paused={session.paused}
                exercise={{
                  ...source,
                  exercise_name: source.name,
                  exercise_id: source.id,
                  sets: e.sets,
                  reps: e.reps,
                }}
              />
            </Suspense>
          </div>
        )}
        <div
          className="gym-set-list"
          role="group"
          aria-label="수행한 세트 체크"
        >
          {Array.from({ length: e.sets }, (_, i) => {
            const checked = session.checked.includes(`${e.id}:${i}`);
            return (
              <button
                key={i}
                className={checked ? "complete" : ""}
                aria-pressed={checked}
                disabled={busy}
                onClick={() => toggle(i)}
              >
                <span>{i + 1}세트</span>
                <strong>
                  {e.reps}
                  {e.dose === "duration" ? "초" : "회"}
                </strong>
                <span className="gym-set-check">
                  {checked ? <Check size={18} /> : <span />}
                </span>
                <small>{checked ? "완료" : "수행 후 체크"}</small>
              </button>
            );
          })}
        </div>
        <div className={"gym-rest-panel " + (rest ? "running" : "")}>
          <Timer size={26} />
          <div>
            <strong>
              {session.paused
                ? "일시정지"
                : rest
                  ? formatTime(rest)
                  : session.restUntil
                    ? "휴식 완료"
                    : "나의 속도로, 충분히 쉬어가세요"}
            </strong>
            <p>
              {rest
                ? "호흡을 정리하고 다음 세트를 준비하세요."
                : "휴식은 세트를 체크하면 시작됩니다."}
            </p>
          </div>
          {rest > 0 && (
            <button
              className="gym-button secondary small"
              disabled={busy}
              onClick={() =>
                change((s) => {
                  s.restUntil = null;
                })
              }
            >
              휴식 종료
            </button>
          )}
        </div>
        <div className="gym-session-navigation">
          <button
            className="gym-button secondary"
            disabled={session.index === 0 || busy}
            onClick={() => move(session.index - 1)}
          >
            <ChevronLeft size={16} />
            이전 동작
          </button>
          {session.index < session.exercises.length - 1 ? (
            <button
              className="gym-button"
              disabled={busy}
              onClick={() => move(session.index + 1)}
            >
              다음 동작
              <ChevronRight size={16} />
            </button>
          ) : (
            <button
              className="gym-button"
              disabled={!done || busy}
              onClick={() => {
                setDiscarding(false);
                setFinishing(true);
              }}
            >
              운동 마무리
              <Check size={16} />
            </button>
          )}
        </div>
      </Card>
      <Card title="오늘의 진행 상황">
        <div className="gym-session-exercises">
          {session.exercises.map((x, i) => {
            const n = session.checked.filter((k) =>
              k.startsWith(x.id + ":"),
            ).length;
            return (
              <button
                key={x.id}
                disabled={busy}
                className={session.index === i ? "active" : ""}
                onClick={() => move(i)}
              >
                <span>{x.name}</span>
                <small>
                  {n}/{x.sets}세트
                </small>
                {n === x.sets ? (
                  <Check size={16} />
                ) : (
                  <ChevronRight size={16} />
                )}
              </button>
            );
          })}
        </div>
        <button
          className="gym-button secondary"
          onClick={() => {
            setDiscarding(false);
            setFinishing((x) => !x);
          }}
          disabled={!done || busy}
        >
          여기까지 기록하고 마무리
        </button>
        <Link to="/health" className="gym-text-link">
          저장된 상태로 홈으로 <ArrowUpRight size={15} />
        </Link>
      </Card>
      <div ref={finishPanel} />
      {discarding && (
        <Card title="진행 중인 운동을 취소할까요?" className="gym-finish-card">
          <p>
            현재 체크한 {done}세트는 운동 기록으로 남지 않습니다. 이전에 저장한
            기록은 유지됩니다.
          </p>
          <button className="gym-button" disabled={busy} onClick={discard}>
            기록 없이 운동 취소
          </button>
          <button
            className="gym-button secondary"
            onClick={() => setDiscarding(false)}
          >
            계속 운동하기
          </button>
        </Card>
      )}
      {finishing && (
        <Card title="오늘의 운동은 어땠나요?" className="gym-finish-card">
          <p>
            {done === total
              ? "모든 세트를 수행했어요. 오늘도 수고했어요!"
              : `${total}세트 중 ${done}세트를 수행했어요. 수행한 만큼 부분 기록으로 남깁니다.`}
          </p>
          <Field label="운동 후 느낌">
            <select value={effort} onChange={(e) => setEffort(e.target.value)}>
              <option>적당했어요</option>
              <option>가벼웠어요</option>
              <option>힘들었어요</option>
              <option>통증으로 중단했어요</option>
            </select>
          </Field>
          <button className="gym-button" onClick={finish} disabled={busy}>
            {busy ? "저장 중…" : "운동 기록 저장"}
          </button>
          <button
            className="gym-button secondary"
            disabled={busy}
            onClick={() => setFinishing(false)}
          >
            운동 계속하기
          </button>
        </Card>
      )}
    </>
  );
}
