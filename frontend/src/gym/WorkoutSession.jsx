import React, { useState, useEffect, useRef, useMemo } from "react";
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
import { exercises, stopReasons } from "./store.js";
import {
  sessionSummary,
  finishSession,
  sessionElapsed,
  pauseSession,
  clearSessionRest,
  moveSessionExercise,
  nextIncompleteSet,
  nextIncompleteExercise,
  checkSessionSet,
} from "./workflow.js";
import { Card, PageHead, Field, Notice } from "./ui.jsx";
import { useExerciseDisplay } from "../health/components/exercise/exerciseDisplay.js";
import WorkoutDemo from "./WorkoutDemo.jsx";
import { guidedExercise, usesSeconds, doseValue } from "./prescription.js";
import { HealthAPI } from "../shared/lib/api.js";
import { useApiData } from "../health/lib/useApiData.js";
const formatTime = (secs) =>
  `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;
export default function WorkoutSession() {
  const demoDisplay = useExerciseDisplay();
  const { state, update } = useGym();
  const session = state.self.session;
  const { data: measurement } = useApiData(HealthAPI.latestMeasurement);
  const { data: memberProfile } = useApiData(HealthAPI.getProfile);
  const avatarProfile = useMemo(() => memberProfile ? {
    height_cm: memberProfile.height,
    gender: memberProfile.gender,
  } : undefined, [memberProfile]);
  const finishPanel = useRef(null),
    sessionId = session.id;
  const [discarding, setDiscarding] = useState(false);
  const [now, setNow] = useState(Date.now()),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [showDemo, setShowDemo] = useState(false),
    [finishing, setFinishing] = useState(false),
    [stopReason, setStopReason] = useState(""),
    [stopExercise, setStopExercise] = useState(""),
    [questionText, setQuestionText] = useState(session.questionDraft?.text ?? ""),
    [questionExercise, setQuestionExercise] = useState(session.questionDraft?.exerciseId ?? ""),
    [effort, setEffort] = useState("적당했어요");
  useEffect(() => {
    if (session.paused || session.completedAt != null) return;
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, [session.paused, session.completedAt]);
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
  const demonstration = useMemo(() => guidedExercise(source, e), [source, e]);
  const { done, total } = sessionSummary(session);
  const nextSet = nextIncompleteSet(session);
  const allDone = done === total;
  const nextExercise = nextSet < 0 && !allDone ? nextIncompleteExercise(session) : -1;
  const restSeconds = e.rest ?? 60;
  const restMs = session.paused ? session.restRemaining || 0 : (session.restUntil || 0) - now;
  const rest = allDone ? 0 : Math.max(0, Math.min(restSeconds, Math.ceil(restMs / 1000)));
  const nextAction = nextSet >= 0 ? `${nextSet + 1}세트를 시작하세요.` :
    nextExercise >= 0 ? `다음 운동은 ${session.exercises[nextExercise].name}입니다.` : "운동 기록을 저장하세요.";
  let restTitle = "세트 사이 휴식";
  let restHint = `세트 완료를 누르면 ${restSeconds}초 휴식을 시작합니다.`;
  if (allDone) {
    restTitle = "모든 세트 완료";
    restHint = "운동을 마무리하고 오늘의 기록을 저장하세요.";
  } else if (rest > 0) {
    restTitle = formatTime(rest);
    restHint = session.paused ? "운동을 이어가면 남은 휴식도 계속됩니다." : "호흡을 정리하세요. 준비되면 휴식을 끝낼 수 있어요.";
  } else if (restSeconds === 0) {
    restTitle = "세트 사이 휴식 없음";
    restHint = nextAction;
  } else if (session.restUntil) {
    restTitle = "휴식 완료";
    restHint = nextAction;
  }
  async function change(fn) {
    try {
      setBusy(true);
      await update((s) => {
        if (s.self.session?.id === session.id) fn(s.self.session);
      });
      setNow(Date.now());
      setError("");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function toggle(index) {
    await change((s) => checkSessionSet(s, index));
  }
  function saveQuestionDraft(text, exerciseId) {
    update(s => {
      const active = s.self.session;
      if (active?.id !== sessionId) return;
      if (text || exerciseId) active.questionDraft = { text, exerciseId };
      else delete active.questionDraft;
    }).catch(e => setError(e.message));
  }
  async function finish() {
    try {
      setBusy(true);
      await update(s => {
        if (s.self.session?.id !== sessionId) throw Error("현재 운동 기록을 다시 확인하세요.");
        const stopped = finishing === "stop";
        finishSession(s.self, stopped ? stopReason : effort, Date.now(),
          { text: questionText, exerciseId: questionExercise }, stopped ? stopExercise : undefined);
      });
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
    if (index !== session.index) change((s) => moveSessionExercise(s, index));
  }
  return (
    <>
      <PageHead eyebrow="YOUR WORKOUT IS IN PROGRESS" title={session.name}>
        진행 상황은 기기에 저장됩니다. 화면을 나갔다 돌아와도 이어서 할 수
        있어요.
      </PageHead>
      <Notice error>{error}</Notice>
      <div className="gym-session-tools">
        {!allDone && <button
          className="gym-button secondary small"
          disabled={busy}
          onClick={() => change((s) => pauseSession(s, !s.paused))}
        >
          {session.paused ? <Play size={16} /> : <Pause size={16} />}{" "}
          {session.paused ? "운동 이어하기" : "잠깐 쉬기"}
        </button>}
        {!allDone && <button className="gym-button secondary small" disabled={busy}
          onClick={() => {
            setDiscarding(false);
            setStopExercise(e.id);
            setFinishing("stop");
            change(s => pauseSession(s, true));
          }}>중단 사유 기록</button>}
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
      {session.paused && !allDone && (
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
      <div className="gym-workout-action">
        <div>
          <span className={rest ? "gym-active-rest" : undefined}>{rest ? `${session.paused ? "휴식 일시정지" : "휴식 중"} · ${formatTime(rest)}` : allDone ? "모든 세트 완료" : "지금 할 운동"}</span>
          <strong>{e.name}</strong>
          <small>
            {nextSet >= 0
              ? `${nextSet + 1} / ${e.sets}세트 · ${doseValue(e.reps)}${usesSeconds(e.dose ?? source?.dose_type) ? "초" : "회"}`
              : nextAction}
          </small>
        </div>
        {session.paused && nextSet >= 0 ? (
          <button className="gym-button" disabled={busy}
            onClick={() => change((s) => pauseSession(s, false))}>
            <Play size={17} />운동 이어하기
          </button>
        ) : rest > 0 && nextSet >= 0 ? (
          <button className="gym-button" disabled={busy}
            onClick={() => change(clearSessionRest)}>
            <ChevronRight size={17} />휴식 건너뛰기
          </button>
        ) : nextSet >= 0 ? (
          <button
            className="gym-button"
            disabled={busy}
            onClick={() => toggle(nextSet)}
          >
            <Check size={17} />
            {nextSet + 1}세트 완료
          </button>
        ) : nextExercise >= 0 ? (
          <button
            className="gym-button"
            disabled={busy}
            onClick={() => move(nextExercise)}
          >
            다음 미완료 동작
            <ChevronRight size={17} />
          </button>
        ) : (
          <button
            className="gym-button"
            disabled={busy}
            onClick={() => {
              setDiscarding(false);
              setFinishing(true);
            }}
          >
            운동 마무리
            <Check size={17} />
          </button>
        )}
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
              {e.sets}세트 · {doseValue(e.reps)}
              {usesSeconds(e.dose ?? source?.dose_type) ? "초" : "회"} · {restSeconds ? `세트 사이 ${restSeconds}초 휴식` : "세트 사이 휴식 없음"}
            </p>
          </div>
        </div>
        <button
          className="gym-button secondary"
          disabled={!demonstration?.motion_id}
          aria-haspopup="dialog"
          onClick={() => setShowDemo(true)}
          aria-expanded={showDemo}
        >
          <Play size={17} />
          {demoDisplay === "3d" ? "3D" : "2D"} 동작 시범 보기
        </button>
        {showDemo && demonstration && (
          <WorkoutDemo exercise={demonstration} entry={e} paused={session.paused}
            measurement={measurement ?? undefined} profile={avatarProfile}
            resume={() => change(s => pauseSession(s, false))} onClose={() => setShowDemo(false)}/>
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
                  {doseValue(e.reps)}
                  {usesSeconds(e.dose ?? source?.dose_type) ? "초" : "회"}
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
            <strong>{restTitle}</strong>
            <p>{restHint}</p>
          </div>
          {rest > 0 && (
            <button
              className="gym-button secondary small"
              disabled={busy}
              onClick={() => change(clearSessionRest)}
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
        <Card title={finishing === "stop" ? "어느 동작에서 멈췄나요?" : "오늘의 운동은 어땠나요?"} className="gym-finish-card">
          <p>
            {done === total
              ? "모든 세트를 수행했어요. 오늘도 수고했어요!"
              : `${total}세트 중 ${done}세트를 수행했어요. 수행한 만큼 부분 기록으로 남깁니다.`}
          </p>
          {finishing === "stop" ? <>
            <Field label="중단한 동작">
              <select value={stopExercise} onChange={event => setStopExercise(event.target.value)}>
                {session.exercises.map(ex => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
              </select>
            </Field>
            <Field label="중단 이유">
              <select value={stopReason} onChange={event => setStopReason(event.target.value)}>
                <option value="">이유를 선택하세요</option>
                {stopReasons.map(reason => <option key={reason}>{reason}</option>)}
              </select>
            </Field>
          </> : <Field label="운동 후 느낌">
            <select value={effort} onChange={(e) => setEffort(e.target.value)}>
              <option>적당했어요</option>
              <option>가벼웠어요</option>
              <option>힘들었어요</option>
              <option>통증으로 중단했어요</option>
            </select>
          </Field>}
          <details className="gym-question-form" open={session.questionDraft ? true : undefined}>
            <summary>코치에게 질문 남기기 (선택)</summary>
            <Field label="질문할 동작">
              <select value={questionExercise} onChange={event => {
                setQuestionExercise(event.target.value);
                saveQuestionDraft(questionText, event.target.value);
              }}>
                <option value="">운동 전체</option>
                {session.exercises.map(ex => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
              </select>
            </Field>
            <Field label="코치에게 물어볼 내용">
              <textarea maxLength={400} value={questionText} onChange={event => setQuestionText(event.target.value)}
                onBlur={() => saveQuestionDraft(questionText, questionExercise)}
                placeholder="예: 의자에서 일어날 때 발을 어디에 두면 좋을까요?" />
            </Field>
            <p className="gym-muted">질문은 운동 기록과 함께 저장됩니다. 기록 파일을 공유하면 코치가 확인할 수 있어요.</p>
          </details>
          <button className="gym-button" onClick={finish} disabled={busy || (finishing === "stop" && (!stopReason || allDone))}>
            {busy ? "저장 중…" : finishing === "stop" ? "중단 기록 저장" : "운동 기록 저장"}
          </button>
          <button
            className="gym-button secondary"
            disabled={busy}
            onClick={() => {
              setFinishing(false);
              if (finishing === "stop") change(s => pauseSession(s, false));
            }}
          >
            운동 계속하기
          </button>
        </Card>
      )}
    </>
  );
}
