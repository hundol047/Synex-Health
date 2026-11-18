import { usesSeconds } from "./prescription.js";
import React, { useState, useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Plus,
  Search,
  ArrowUpRight,
  CalendarDays,
  Dumbbell,
  Users,
  Check,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  Trash2,
  Clock,
  MessageCircle,
  SlidersHorizontal,
} from "lucide-react";
import { useGym } from "./GymContext.jsx";
import AppointmentList from "./AppointmentList.jsx";
import RoutineTemplates from "./RoutineTemplates.jsx";
import ExerciseResults from "./ExerciseResults.jsx";
import useMemberSelection from "./useMemberSelection.js";
import {
  registerDraftNavigation,
  hasDraftChangesForPath,
  flushDraftChanges,
} from "../shared/lib/draftNavigation.js";
import { today, freshMember, exercises, validateAppointment, savedPlans, storeWeekPlan, lastEditedPlan } from "./store.js";
import {
  DAYS,
  weekDates,
  weekStats,
  upcoming,
  entryFor,
  editablePlan,
  rescheduleMemberWeeks,
} from "./workflow.js";
import { PageHead, Card, Field, Notice, Empty } from "./ui.jsx";
const goals = ["체력 향상", "체중·건강 관리", "근력 향상", "운동 습관 만들기"];
export function MemberSelect({ value, onChange }) {
  const { state } = useGym();
  return (
    <Field label="담당 회원">
      <select value={value || ""} onChange={(e) => onChange(e.target.value)}>
        <option value="">회원 선택</option>
        {state.members.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name} · {m.goal}
          </option>
        ))}
      </select>
    </Field>
  );
}
function memberLink(route, id) {
  return `/coach/${route}?member=${encodeURIComponent(id)}`;
}
export function Dashboard() {
  const { state } = useGym();
  const dates = weekDates();
  const appointments = state.members
    .flatMap((m) =>
      upcoming(m).map((a) => ({ ...a, name: m.name, memberId: m.id })),
    )
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const todayPT = appointments.filter((a) => a.date === today());
  const pending = state.members.reduce(
    (n, m) => n + m.meals.filter((x) => !x.feedback).length,
    0,
  );
  const days = state.members.reduce((n, m) => n + weekStats(m, dates).days, 0);
  return (
    <>
      <PageHead
        eyebrow="COACH WORKSPACE"
        title="오늘의 코칭을 시작해 볼까요?"
        action={
          <Link className="gym-button" to="/coach/members">
            <Plus size={17} />
            회원 등록
          </Link>
        }
      >
        {new Intl.DateTimeFormat("ko-KR", {
          month: "long",
          day: "numeric",
          weekday: "long",
        }).format(new Date())}{" "}
        · 회원의 변화가 시작되는 공간
      </PageHead>
      <div className="gym-stat-grid">
        {[
          [Users, "담당 회원", state.members.length, "명"],
          [CalendarDays, "오늘 PT", todayPT.length, "회"],
          [Check, "이번 주 운동일", days, "일"],
          [MessageCircle, "피드백 대기", pending, "건"],
        ].map(([Icon, label, n, unit]) => (
          <Card key={label}>
            <span className="gym-stat-label">
              <Icon size={18} />
              {label}
            </span>
            <strong className="gym-stat">
              {n}
              <small>{unit}</small>
            </strong>
            <span className="gym-stat-foot">
              {label === "이번 주 운동일"
                ? "회원별 완료일 합계"
                : "내 기기에 저장된 기록"}
            </span>
          </Card>
        ))}
      </div>
      <div className="gym-dashboard-layout">
        <Card className="gym-schedule-card">
          <div className="gym-section-head">
            <h2>가장 가까운 수업</h2>
            <Link to="/coach/schedule" className="gym-text-link">
              전체 일정 <ArrowUpRight size={15} />
            </Link>
          </div>
          {appointments.length ? (
            appointments.slice(0, 4).map((a, i) => (
              <Link
                className={"gym-appointment " + (!i ? "next" : "")}
                to={memberLink("schedule", a.memberId)}
                key={a.id}
              >
                <div className="gym-appointment-time">
                  <strong>{a.time}</strong>
                  <small>{a.date.slice(5).replace("-", ".")}</small>
                </div>
                <div>
                  <strong>{a.name}</strong>
                  <p>퍼스널 트레이닝 · 60분</p>
                </div>
                <ChevronRight size={18} />
              </Link>
            ))
          ) : (
            <Empty>
              등록된 수업이 없습니다.
              <br />
              <Link to="/coach/schedule" className="gym-text-link">
                첫 PT 등록하기 →
              </Link>
            </Empty>
          )}
          <div className="gym-note">
            PT 일정과 개인 운동일을 함께 배치해, 회원에게 다음 할 일을
            알려주세요.
          </div>
        </Card>
        <Card className="gym-dark gym-action-hero">
          <span className="gym-eyebrow">LESS ADMIN. MORE COACHING.</span>
          <h2>
            계획은 더 빠르게.
            <br />
            코칭은 더 세심하게.
          </h2>
          <p>
            운동 선택부터 세트 조정까지.
            <br />
            회원에게 맞는 계획을 완성하세요.
          </p>
          <Link className="gym-button light" to="/coach/plan">
            루틴 스튜디오 열기 <ArrowUpRight size={18} />
          </Link>
          <Dumbbell className="gym-watermark" size={140} strokeWidth={0.8} />
        </Card>
      </div>
      <Card>
        <div className="gym-section-head">
          <h2>회원의 이번 주</h2>
          <span className="gym-pill">
            {dates[0].slice(5)} — {dates[6].slice(5)}
          </span>
        </div>
        {state.members.length ? (
          <div className="gym-member-roster">
            {state.members.map((m) => {
              const stats = weekStats(m, dates);
              return (
                <Link
                  to={memberLink("members", m.id)}
                  className="gym-roster-item"
                  key={m.id}
                >
                  <span className="gym-avatar">{m.name[0]}</span>
                  <div>
                    <strong>{m.name}</strong>
                    <p>{m.goal}</p>
                  </div>
                  <div
                    className="gym-mini-week"
                    aria-label={`이번 주 ${stats.days}일 완료`}
                  >
                    {dates.map((d, i) => (
                      <span
                        key={d}
                        className={stats.completed.has(d) ? "done" : ""}
                      >
                        {stats.completed.has(d) ? <Check size={11} /> : DAYS[i]}
                      </span>
                    ))}
                  </div>
                  <span className="gym-pill">
                    {stats.target
                      ? `${stats.days}일 / 주 ${stats.target}회`
                      : "이번 주 계획 없음"}
                  </span>
                  <ChevronRight size={16} />
                </Link>
              );
            })}
          </div>
        ) : (
          <Empty>회원 등록 → 루틴 작성 → 계획 공유 순서로 시작해 보세요.</Empty>
        )}
      </Card>
    </>
  );
}
export function Members() {
  const { state, update } = useGym();
  const adding = useRef(false);
  const [addBusy, setAddBusy] = useState(false);
  const [selected, setSelected] = useMemberSelection();
  const [name, setName] = useState(""),
    [goal, setGoal] = useState(goals[0]),
    [query, setQuery] = useState(""),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const [edit, setEdit] = useState(null);
  const m = state.members.find((x) => x.id === selected);
  const stats = m && weekStats(m);
  const filtered = state.members.filter((m) =>
    (m.name + m.goal).includes(query.trim()),
  );
  async function add(e) {
    e.preventDefault();
    if (adding.current) return;
    adding.current = true;
    setAddBusy(true);
    try {
      const person = { ...freshMember(name.trim()), goal };
      if (!person.name) throw Error("회원 이름을 입력하세요.");
      await update((s) => {
        s.members.push(person);
        s.selected = person.id;
      });
      setSelected(person.id);
      setName("");
      setMessage("회원을 등록했습니다. 이제 운동 계획을 만들어 보세요.");
      setError("");
    } catch (e) {
      setError(e.message);
    } finally {
      adding.current = false;
      setAddBusy(false);
    }
  }
  async function save(e) {
    e.preventDefault();
    try {
      if (!edit.name.trim()) throw Error("이름을 입력하세요.");
      await update((s) =>
        Object.assign(
          s.members.find((x) => x.id === selected),
          { name: edit.name.trim(), goal: edit.goal, note: edit.note },
        ),
      );
      setEdit(null);
      setMessage("회원 정보를 저장했습니다.");
      setError("");
    } catch (e) {
      setError(e.message);
    }
  }
  return (
    <>
      <PageHead eyebrow="MEMBER CARE" title="회원의 목표부터, 작은 변화까지.">
        운동과 일정, 피드백을 회원별로 이어서 관리하세요.
      </PageHead>
      <Notice error>{error}</Notice>
      <Notice>{message}</Notice>
      <div className="gym-member-layout">
        <div>
          <Card title={`담당 회원 ${state.members.length}명`}>
            <Field label="회원 검색">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="이름 또는 목표 검색"
              />
            </Field>
            <div className="gym-member-list">
              {filtered.map((x) => (
                <button
                  className={
                    "gym-member-item " + (selected === x.id ? "selected" : "")
                  }
                  key={x.id}
                  onClick={() => {
                    setSelected(x.id);
                    setEdit(null);
                  }}
                >
                  <span className="gym-avatar">{x.name[0]}</span>
                  <span>
                    <strong>{x.name}</strong>
                    <small>{x.goal}</small>
                  </span>
                  <ChevronRight size={15} />
                </button>
              ))}
            </div>
            {!filtered.length && <Empty>조건에 맞는 회원이 없습니다.</Empty>}
          </Card>
          <Card title="새 회원 등록">
            <form onSubmit={add}>
              <Field label="회원 이름">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={40}
                  required
                  placeholder="이름 또는 별명"
                />
              </Field>
              <Field label="운동 목표">
                <select value={goal} onChange={(e) => setGoal(e.target.value)}>
                  {goals.map((g) => (
                    <option key={g}>{g}</option>
                  ))}
                </select>
              </Field>
              <button className="gym-button" disabled={addBusy}>
                <Plus size={16} />
                회원 등록
              </button>
            </form>
          </Card>
        </div>
        <Card className="gym-member-detail">
          {m ? (
            <>
              <div className="gym-profile-heading">
                <span className="gym-avatar large">{m.name[0]}</span>
                <div>
                  <span className="gym-eyebrow">MEMBER PROFILE</span>
                  <h2>{m.name}</h2>
                  <p>{m.goal}</p>
                </div>
                <button
                  className="gym-button secondary small"
                  onClick={() =>
                    setEdit({ name: m.name, goal: m.goal, note: m.note || "" })
                  }
                >
                  정보 수정
                </button>
              </div>
              {edit && (
                <form className="gym-edit-panel" onSubmit={save}>
                  <Field label="이름 수정">
                    <input
                      maxLength={40}
                      required
                      value={edit.name}
                      onChange={(e) =>
                        setEdit({ ...edit, name: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="목표 수정">
                    <select
                      value={edit.goal}
                      onChange={(e) =>
                        setEdit({ ...edit, goal: e.target.value })
                      }
                    >
                      {goals.map((g) => (
                        <option key={g}>{g}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="트레이너 메모 · 이 기기에만 보관">
                    <textarea
                      maxLength={600}
                      value={edit.note}
                      onChange={(e) =>
                        setEdit({ ...edit, note: e.target.value })
                      }
                      placeholder="선호 운동, 상담에서 확인한 내용을 기록하세요."
                    />
                  </Field>
                  <button className="gym-button">정보 저장</button>
                  <button
                    type="button"
                    className="gym-button secondary"
                    onClick={() => setEdit(null)}
                  >
                    취소
                  </button>
                </form>
              )}
              <div className="gym-detail-stats">
                <div>
                  <strong>{stats.days}</strong>
                  <span>이번 주 운동일</span>
                </div>
                <div>
                  <strong>{stats.target || "—"}</strong>
                  <span>이번 주 운동 목표</span>
                </div>
                <div>
                  <strong>{m.meals.filter((x) => !x.feedback).length}</strong>
                  <span>피드백 대기</span>
                </div>
              </div>
              <div className="gym-shortcuts">
                {[
                  ["plan", Dumbbell, "루틴 편집"],
                  ["schedule", CalendarDays, "PT 일정"],
                  ["feedback", MessageCircle, "피드백"],
                ].map(([r, I, t]) => (
                  <Link key={r} to={memberLink(r, m.id)}>
                    <I size={20} />
                    {t}
                    <ArrowUpRight size={15} />
                  </Link>
                ))}
              </div>
              <h3>다음 PT</h3>
              {upcoming(m)[0] ? (
                <div className="gym-note">
                  {upcoming(m)[0].date} · {upcoming(m)[0].time} · 60분
                </div>
              ) : (
                <p>PT 일정을 등록하면 여기에 표시됩니다.</p>
              )}
              <h3>최근 운동</h3>
              {m.logs.slice(0, 4).map((l) => (
                <div className="gym-row" key={l.id}>
                  <span className="gym-avatar">
                    <Check size={18} />
                  </span>
                  <div>
                    <strong>{l.name}</strong>
                    <p>
                      {l.date} · {l.effort}
                    </p>
                  </div>
                  <span className="gym-pill">
                    {l.status === "partial" ? "부분 수행" : "완료"}
                  </span>
                </div>
              ))}
              {!m.logs.length && (
                <Empty>회원이 공유한 운동 기록을 기다리고 있습니다.</Empty>
              )}
              {m.note && (
                <>
                  <h3>트레이너 메모</h3>
                  <p className="gym-note">{m.note}</p>
                </>
              )}
              <Link
                to={memberLink("sharing", m.id)}
                className="gym-button secondary"
              >
                계획·기록 공유 <ArrowUpRight size={16} />
              </Link>
            </>
          ) : (
            <Empty>회원을 선택하면 코칭 현황을 확인할 수 있습니다.</Empty>
          )}
        </Card>
      </div>
    </>
  );
}
export function PlanBuilder() {
  const { state } = useGym();
  const [id, setId] = useMemberSelection();
  const m = state.members.find((m) => m.id === id);
  return (
    <>
      <PageHead
        eyebrow="ROUTINE STUDIO"
        title="회원에게 맞는 운동, 원하는 순서로."
      >
        운동을 찾고, 세트와 휴식을 조정하면 2가지 하루 루틴이 만들어집니다.
      </PageHead>
      <MemberSelect
        value={id}
        onChange={async (value) => {
          if (hasDraftChangesForPath("/coach/plan")) {
            if (
              !window.confirm("작성 중인 루틴을 임시 저장하고 회원을 바꿀까요?")
            )
              return;
            await flushDraftChanges("/coach/plan");
          }
          setId(value);
        }}
      />
      {m ? (
        <PlanEditor key={id} member={m} />
      ) : (
        <Card>
          <Empty>
            먼저 회원을 등록해 주세요.
            <br />
            <Link className="gym-text-link" to="/coach/members">
              회원 등록하러 가기 →
            </Link>
          </Empty>
        </Card>
      )}
    </>
  );
}
function PlanEditor({ member }) {
  const { update } = useGym();
  const saved = lastEditedPlan(member);
  const [query, setQuery] = useState(""),
    [category, setCategory] = useState("all"),
    [count, setCount] = useState(
      member.planDraft?.count ?? saved?.requestedFrequency ?? saved?.frequency ?? 3,
    ),
    [start, setStart] = useState(
      member.planDraft?.start || saved?.dates[0] || weekDates()[0],
    );
  const [entries, setEntries] = useState(
    () =>
      member.planDraft?.entries ||
      saved?.options[0].exercises.map((e) => ({
        ...e,
        rest: e.rest ?? 60,
      })) ||
      [],
  );
  const [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [dirty, setDirty] = useState(Boolean(member.planDraft));
  const draftTimer = useRef(null),
    draftGeneration = useRef(0);
  const [draftStatus, setDraftStatus] = useState(
    member.planDraft ? "임시 저장 복구됨" : "",
  );
  useEffect(() => {
    const generation = ++draftGeneration.current;
    clearTimeout(draftTimer.current);
    if (!dirty || busy) return;
    setDraftStatus("자동 저장 중…");
    draftTimer.current = setTimeout(() => {
      update((s) => {
        if (generation === draftGeneration.current) {
          const m = s.members.find((x) => x.id === member.id);
          if (m) m.planDraft = { entries, count, start };
        }
      })
        .then(() => {
          if (generation === draftGeneration.current)
            setDraftStatus("기기에 임시 저장됨");
        })
        .catch((e) => {
          if (generation === draftGeneration.current) {
            setDraftStatus("자동 저장 재시도 필요");
            setError(e.message);
          }
        });
    }, 450);
    return () => clearTimeout(draftTimer.current);
  }, [dirty, busy, entries, count, start, member.id, update]);
  useEffect(
    () =>
      registerDraftNavigation(
        `gym-plan-${member.id}`,
        dirty,
        () =>
          update((s) => {
            s.members.find((x) => x.id === member.id).planDraft = {
              entries,
              count,
              start,
            };
          }),
        "작성 중인 루틴을 임시 저장한 뒤 이동할까요?",
        "/coach/plan",
      ),
    [dirty, entries, count, start, member.id, update],
  );
  const matches = exercises
    .filter(
      (e) =>
        (category === "all" || e.training_type === category) &&
        (e.name + e.target_muscle?.join(""))
          .replaceAll(" ", "")
          .includes(query.replaceAll(" ", "")),
    )
    .slice(0, 30);
  function changeWeek(value) {
    const stored = savedPlans(member).find(plan => plan.dates.includes(value));
    if (stored && !stored.dates.includes(start)) {
      const previous = savedPlans(member).find(plan => plan.dates.includes(start));
      const changed = !previous || count !== (previous.requestedFrequency ?? previous.frequency)
        || JSON.stringify(entries) !== JSON.stringify(previous.options[0].exercises);
      if (dirty && changed && !window.confirm("작성 중인 변경을 닫고 선택한 주의 저장된 계획을 열까요?")) return;
      setCount(stored.requestedFrequency ?? stored.frequency);
      setEntries(stored.options[0].exercises.map(entry => ({ ...entry, rest: entry.rest ?? 60 })));
    }
    setStart(value);
    setDirty(true);
    setMessage("");
  }
  function edit(fn) {
    setEntries(fn);
    setDirty(true);
    setMessage("");
  }
  function change(id, key, value) {
    edit((xs) => xs.map((e) => (e.id === id ? { ...e, [key]: value } : e)));
  }
  function move(i, delta) {
    edit((xs) => {
      const out = [...xs];
      [out[i], out[i + delta]] = [out[i + delta], out[i]];
      return out;
    });
  }
  async function save() {
    clearTimeout(draftTimer.current);
    draftGeneration.current++;
    try {
      setBusy(true);
      if (!start) throw Error("계획 시작 주를 선택하세요.");
      const p = editablePlan(entries, count, member.appointments, start);
      await update((s) => {
        const m = s.members.find((x) => x.id === member.id);
        storeWeekPlan(m, p);
        m.lastEditedWeek = p.dates[0];
        delete m.planDraft;
        s.selected = member.id;
      });
      setDirty(false);
      setDraftStatus("계획 저장 완료");
      setError("");
      setMessage("계획을 저장했습니다. 공유 센터에서 회원에게 전달하세요.");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  let preview;
  try {
    preview = editablePlan(entries, count, member.appointments, start);
  } catch {
    /* Form errors are announced on save. */
  }
  return (
    <>
      <div className="gym-studio-toolbar">
        <div>
          <span className="gym-pill">{member.name}</span>
          <span className="gym-muted">
            {" "}
            {dirty
              ? draftStatus || "변경한 내용을 저장해 주세요"
              : "저장된 루틴을 이어서 편집할 수 있어요"}
          </span>
        </div>
        <button className="gym-button" disabled={busy} onClick={save}>
          <Check size={17} />
          {busy ? "저장 중…" : "계획 저장"}
        </button>
      </div>
      <RoutineTemplates
        entries={entries}
        count={count}
        onApply={(rows, frequency) => {
          edit(() => rows);
          setCount(frequency);
        }}
      />
      <div className="gym-week-shortcuts">
        <span>계획 주 빠른 설정</span>
        {[
          [0, "이번 주"],
          [1, "다음 주"],
        ].map(([offset, label]) => (
          <button
            key={offset}
            className={
              weekDates(today(), offset)[0] === weekDates(start || today())[0]
                ? "active"
                : ""
            }
            onClick={() => changeWeek(weekDates(today(), offset)[0])}
          >
            {label} <small>{weekDates(today(), offset)[0].slice(5)}</small>
          </button>
        ))}
      </div>
      <Notice error>{error}</Notice>
      <Notice>{message}</Notice>
      {message && !dirty && (
        <Link
          className="gym-button secondary"
          to={memberLink("sharing", member.id)}
        >
          저장한 계획 바로 공유 <ArrowUpRight size={16} />
        </Link>
      )}
      <a className="gym-jump-link" href="#routine-editor">
        선택한 운동 {entries.length}개 · 세트 편집으로 이동 ↓
      </a>
      <div className="gym-studio-layout">
        <Card title="운동 라이브러리">
          <Field label="운동 이름 검색">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="스쿼, 벤치, 등…"
            />
          </Field>
          <div className="gym-segment" aria-label="운동 종류">
            {[
              ["all", "전체"],
              ["equipment", "기구"],
              ["bodyweight", "맨몸"],
            ].map(([v, l]) => (
              <button
                key={v}
                aria-pressed={v === category}
                className={v === category ? "active" : ""}
                onClick={() => setCategory(v)}
              >
                {l}
              </button>
            ))}
          </div>
          <div className="gym-exercise-list">
            {matches.map((e) => {
              const included = entries.some((x) => x.id === e.id);
              return (
                <button
                  className={"gym-exercise " + (included ? "chosen" : "")}
                  key={e.id}
                  disabled={!included && entries.length >= 12}
                  onClick={() =>
                    edit((xs) =>
                      included
                        ? xs.filter((x) => x.id !== e.id)
                        : [...xs, entryFor(e.id)],
                    )
                  }
                >
                  <span className="gym-avatar">
                    <Dumbbell size={17} />
                  </span>
                  <span>
                    <strong>{e.name}</strong>
                    <small>{e.target_muscle?.join(" · ")}</small>
                  </span>
                  {included ? <Check size={17} /> : <Plus size={17} />}
                </button>
              );
            })}
          </div>
          {!matches.length && (
            <Empty>검색어 또는 운동 종류를 바꿔 보세요.</Empty>
          )}
        </Card>
        <div>
          <Card>
            <div className="gym-section-head">
              <h2 id="routine-editor" tabIndex={-1}>
                나의 루틴 구성
              </h2>
              <span className="gym-pill">{entries.length} / 12개</span>
            </div>
            <div className="gym-inline-fields">
              <Field label="주간 운동 횟수">
                <select
                  value={count}
                  onChange={(e) => {
                    setCount(Number(e.target.value));
                    setDirty(true);
                  }}
                >
                  {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                    <option key={n} value={n}>
                      주 {n}회
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="계획 시작 주">
                <input
                  type="date"
                  value={start}
                  onChange={e => changeWeek(e.target.value)}
                  required
                />
              </Field>
            </div>
            {preview && preview.frequency > count && (
              <p className="gym-note" role="status">
                기본 목표는 주 {count}회입니다. 이번 주는 PT가 {preview.ptDays.length}일 있어 총 {preview.frequency}일로 배치합니다.
              </p>
            )}
            {entries.map((e, i) => (
              <article className="gym-plan-entry" key={e.id}>
                <div className="gym-section-head">
                  <div className="gym-entry-title">
                    <span>{String(i + 1).padStart(2, "0")}</span>
                    <strong>{e.name}</strong>
                  </div>
                  <div className="gym-icon-actions">
                    <button
                      aria-label={`${e.name} 위로`}
                      disabled={i === 0}
                      onClick={() => move(i, -1)}
                    >
                      <ArrowUp size={15} />
                    </button>
                    <button
                      aria-label={`${e.name} 아래로`}
                      disabled={i === entries.length - 1}
                      onClick={() => move(i, 1)}
                    >
                      <ArrowDown size={15} />
                    </button>
                    <button
                      aria-label={`${e.name} 삭제`}
                      onClick={() =>
                        edit((xs) => xs.filter((x) => x.id !== e.id))
                      }
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
                <div className="gym-dose-fields">
                  <Field label={`${e.name} 세트`}>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={e.sets}
                      onChange={(v) => change(e.id, "sets", v.target.value)}
                    />
                  </Field>
                  <Field
                    label={
                      usesSeconds(e.dose)
                        ? `${e.name} 시간(초)`
                        : `${e.name} 횟수`
                    }
                  >
                    <input
                      inputMode="text"
                      maxLength={9}
                      value={e.reps}
                      onChange={(v) => change(e.id, "reps", v.target.value)}
                    />
                  </Field>
                  <Field label={`${e.name} 휴식(초)`}>
                    <input
                      type="number"
                      min={0}
                      max={300}
                      step={15}
                      value={e.rest}
                      onChange={(v) => change(e.id, "rest", v.target.value)}
                    />
                  </Field>
                </div>
              </article>
            ))}
            {!entries.length && (
              <Empty>
                <Dumbbell size={30} />
                <br />
                운동 옆의 + 버튼으로 루틴을 채워 보세요.
              </Empty>
            )}
          </Card>
          {preview && (
            <Card title="회원에게 전달될 2가지 루틴">
              <div className="gym-plan-preview">
                {preview.options.map((o) => (
                  <div key={o.id}>
                    <Clock size={18} />
                    <strong>약 {o.minutes}분</strong>
                    <span>{o.name}</span>
                    <small>
                      {o.exercises.reduce((n, e) => n + e.sets, 0)}세트 · 준비
                      시간 포함
                    </small>
                  </div>
                ))}
              </div>
              <div className="gym-week">
                {DAYS.map((d, i) => (
                  <div
                    key={d}
                    className={preview.days.includes(i) ? "active" : ""}
                  >
                    <small>{d}</small>
                    <strong>
                      {preview.ptDays.includes(i)
                        ? "PT"
                        : preview.days.includes(i)
                          ? "운동"
                          : "회복"}
                    </strong>
                  </div>
                ))}
              </div>
              <p>
                PT 우선 배치 · 가벼운 루틴은 동작을 유지하고 세트를 줄입니다.
              </p>
              <Link
                className="gym-text-link"
                to={memberLink("sharing", member.id)}
              >
                저장한 계획 공유하기 <ArrowUpRight size={15} />
              </Link>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
export function Schedule() {
  const { state, update } = useGym();
  const [id, setId] = useMemberSelection();
  const [date, setDate] = useState(today()),
    [time, setTime] = useState("19:00"),
    [calendarDate, setCalendarDate] = useState(today),
    [editing, setEditing] = useState(null),
    [cancelId, setCancelId] = useState(null),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const dateField = useRef(null);
  const [listFocus, setListFocus] = useState(null);
  const dates = weekDates(calendarDate);
  function showWeek(anchor) {
    setCalendarDate(anchor);
    if (editing) return;
    const firstAvailable = weekDates(anchor).find(day => day >= today());
    setDate(anchor >= today() ? anchor : firstAvailable || "");
  }
  function moveWeek(offset) {
    const weekday = dates.indexOf(calendarDate);
    showWeek(weekDates(calendarDate, offset)[weekday]);
  }
  function openAppointment(appointment) {
    setId(appointment.memberId);
    setDate(appointment.date);
    setTime(appointment.time);
    setEditing(appointment.id);
    setListFocus({ id: appointment.id });
    setCalendarDate(appointment.date);
    setError("");
    setMessage("");
    dateField.current?.focus();
  }
  const rows = state.members
    .flatMap((m) =>
      m.appointments.map((a) => ({ ...a, memberId: m.id, name: m.name })),
    )
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  async function save(e) {
    e.preventDefault();
    try {
      setBusy(true);
      if (!id) throw Error("회원을 선택하세요.");
      const appointmentId = editing || crypto.randomUUID();
      await update((s) => {
        const all = s.members.flatMap((m) => m.appointments);
        validateAppointment(all, date, time, editing);
        const m = s.members.find((m) => m.id === id);
        const previousDate = m.appointments.find(a => a.id === editing)?.date;
        m.appointments = m.appointments.filter((a) => a.id !== editing);
        m.appointments.push({ id: appointmentId, date, time });
        rescheduleMemberWeeks(m, [previousDate, date]);
      });
      setEditing(null);
      setCalendarDate(date);
      setListFocus({ id: appointmentId });
      setError("");
      setMessage(
        "PT 일정과 해당 주의 운동 계획을 저장했습니다. 회원에게 최신 계획을 공유하세요.",
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function cancel(a) {
    try {
      await update((s) => {
        const m = s.members.find((x) => x.id === a.memberId);
        m.appointments = m.appointments.filter((x) => x.id !== a.id);
        rescheduleMemberWeeks(m, [a.date]);
      });
      setCancelId(null);
      if (editing === a.id) {
        setEditing(null);
        setCalendarDate(date || today());
      }
      setMessage("PT 일정을 취소하고 운동일을 다시 배치했습니다.");
      setError("");
    } catch (e) {
      setError(e.message);
    }
  }
  return (
    <>
      <PageHead eyebrow="PT CALENDAR" title="수업과 개인 운동, 한 주로 연결.">
        일정을 바꾸면 저장된 루틴의 운동일도 함께 조정합니다.
      </PageHead>
      <Notice error>{error}</Notice>
      <Notice>{message}</Notice>
      <Card>
        <div className="gym-section-head">
          <h2>
            {dates[0].slice(5).replace("-", ".")} —{" "}
            {dates[6].slice(5).replace("-", ".")}
          </h2>
          <div className="gym-icon-actions">
            <button
              aria-label="이전 주"
              onClick={() => moveWeek(-1)}
            >
              <ChevronLeft size={18} />
            </button>
            <button onClick={() => showWeek(today())}>이번 주</button>
            <button
              aria-label="다음 주"
              onClick={() => moveWeek(1)}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
        <div className="gym-calendar">
          {dates.map((d, i) => (
            <div className={d === today() ? "today" : ""} key={d}>
              <button
                type="button"
                className="gym-calendar-date"
                disabled={d < today()}
                aria-label={d + (editing ? " PT 날짜 변경" : " PT 등록")}
                aria-pressed={d === date}
                onClick={() => {
                  setDate(d);
                  setCalendarDate(d);
                  dateField.current?.focus();
                }}
              >
                <span>{DAYS[i]}</span>
                <strong>{Number(d.slice(-2))}</strong>
              </button>
              {rows
                .filter((a) => a.date === d)
                .map((a) => (
                  <button
                    key={a.id}
                    onClick={() => openAppointment(a)}
                  >
                    <strong>{a.time}</strong>
                    <span>{a.name}</span>
                  </button>
                ))}
              {!rows.some((a) => a.date === d) && <small>수업 없음</small>}
            </div>
          ))}
        </div>
      </Card>
      <div className="gym-two">
        <Card title={editing ? "PT 일정 변경" : "PT 바로 등록"}>
          <form onSubmit={save}>
            <MemberSelect
              value={id}
              onChange={(v) => {
                setId(v);
                if (editing) setCalendarDate(date || today());
                setEditing(null);
              }}
            />
            <div className="gym-inline-fields">
              <Field label="PT 날짜">
                <input
                  ref={dateField}
                  type="date"
                  min={today()}
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </Field>
              <Field label="시작 시간 · 60분 수업">
                <input
                  type="time"
                  required
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                />
              </Field>
            </div>
            <button className="gym-button" disabled={busy}>
              {busy ? "저장 중…" : editing ? "변경 저장" : "일정 저장"}
            </button>
            {editing && (
              <button
                type="button"
                className="gym-button secondary"
                onClick={() => {
                  setEditing(null);
                  setCalendarDate(date || today());
                }}
              >
                편집 닫기
              </button>
            )}
          </form>
        </Card>
        <Card title="등록한 PT">
          <AppointmentList rows={rows.filter(a => a.date >= today())} focus={listFocus} empty="등록한 다음 PT가 여기에 표시됩니다.">
            {a => (
              <div className="gym-schedule-row" key={a.id}>
                <div className="gym-row">
                  <span className="gym-avatar">
                    <CalendarDays size={19} />
                  </span>
                  <div>
                    <strong>{a.name}</strong>
                    <p>
                      {a.date} · {a.time}
                    </p>
                  </div>
                  <button
                    className="gym-button secondary small"
                    onClick={() => openAppointment(a)}
                  >
                    변경
                  </button>
                  <button
                    className="gym-icon-button"
                    aria-label={`${a.name} ${a.date} PT 취소`}
                    onClick={() => setCancelId(a.id)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                {cancelId === a.id && (
                  <div className="gym-note">
                    <p>이 PT 일정을 취소할까요?</p>
                    <button
                      className="gym-button small"
                      onClick={() => cancel(a)}
                    >
                      PT 취소 확인
                    </button>
                    <button
                      className="gym-button secondary small"
                      onClick={() => setCancelId(null)}
                    >
                      유지
                    </button>
                  </div>
                )}
              </div>
            )}
          </AppointmentList>
        </Card>
      </div>
    </>
  );
}
export function Feedback() {
  const { state, update } = useGym();
  const [id, setId] = useMemberSelection(),
    [text, setText] = useState({}),
    [filter, setFilter] = useState("pending"),
    [query, setQuery] = useState(""),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(null);
  const m = state.members.find((m) => m.id === id);
  const search = query.trim().toLowerCase();
  const meals = m?.meals.filter(meal =>
    (filter === "all" || !meal.feedback)
    && (!search || [meal.date, meal.note, meal.feedback].some(value => value?.toLowerCase().includes(search)))
  ) || [];
  const draftDirty = ["logs", "meals"].some(type => m?.[type].some(row => {
    const value = text[`${id}/${type}/${row.id}`];
    return value !== undefined && value !== (row.feedbackDraft ?? row.feedback ?? "");
  }));
  useEffect(
    () =>
      registerDraftNavigation(
        `feedback-${id}`,
        draftDirty,
        () => update(s => {
          const member = s.members.find(item => item.id === id);
          if (!member) return;
          for (const type of ["logs", "meals"]) {
            for (const row of member[type]) {
              const value = text[`${id}/${type}/${row.id}`];
              if (value !== undefined) row.feedbackDraft = value;
            }
          }
        }),
        "작성 중인 피드백을 임시 저장하고 이동할까요?",
        "/coach/feedback",
      ),
    [id, draftDirty, text, update],
  );
  function editor(type, row) {
    const key = `${id}/${type}/${row.id}`;
    const workout = type === "logs";
    const label = workout ? "운동 코멘트" : "트레이너 피드백";
    const value = text[key] ?? row.feedbackDraft ?? row.feedback ?? "";
    async function save() {
      try {
        setBusy(key);
        const reply = value.trim();
        if (!reply) throw Error("피드백을 입력해 주세요.");
        await update(s => {
          const member = s.members.find(item => item.id === id);
          const saved = member?.[type].find(item => item.id === row.id);
          if (!saved) throw Error("기록을 다시 선택하세요.");
          saved.feedback = reply;
          delete saved.feedbackDraft;
        });
        setText(drafts => {
          const remaining = { ...drafts };
          delete remaining[key];
          return remaining;
        });
        setError("");
        setMessage("피드백을 저장했습니다. 계획 공유 파일에 함께 담깁니다.");
      } catch (e) {
        setError(e.message);
      } finally {
        setBusy(null);
      }
    }
    return <>
      <Field label={label}>
        <textarea maxLength={600} value={value} disabled={busy === key}
          onChange={event => setText({ ...text, [key]: event.target.value })}
          placeholder={workout ? "수행한 세트를 보고 다음 운동에서 해 볼 한 가지를 알려주세요." : "좋았던 점과 다음 식사에서 해 볼 한 가지를 알려주세요."}/>
      </Field>
      <button className="gym-button" disabled={busy !== null} onClick={save}>
        {busy === key ? "저장 중…" : workout ? "운동 코멘트 저장" : "피드백 저장"}
      </button>
    </>;
  }
  return (
    <>
      <PageHead
        eyebrow="COACHING INBOX"
        title="회원의 운동·식단 기록"
      >
        완료한 세트와 운동 후 느낌을 확인하고, 다음 루틴을 조정하세요.
      </PageHead>
      <MemberSelect
        value={id}
        onChange={async (v) => {
          if (draftDirty) {
            if (!window.confirm("피드백을 임시 저장하고 회원을 바꿀까요?"))
              return;
            await flushDraftChanges("/coach/feedback");
          }
          setId(v);
          setText({});
          setQuery("");
          setMessage("");
        }}
      />
      <Notice error>{error}</Notice>
      <Notice>{message}</Notice>
      <div className="gym-two">
        <Card title="운동 피드백 살펴보기">
          {m?.logs.map((l) => (
            <div className="gym-row" key={l.id}>
              <span className="gym-avatar">
                <Check size={17} />
              </span>
              <div>
                <strong>{l.name}</strong>
                <p>
                  {l.date} · {l.effort}
                </p>
                <p>
                  {l.completedSets !== undefined
                    ? `${l.completedSets}/${l.totalSets}세트 수행`
                    : "운동 기록"}
                  {l.status === "partial" ? " · 부분 수행" : ""}
                </p>
                <ExerciseResults rows={l.exerciseResults}/>
                <details className="gym-workout-feedback">
                  <summary>{l.feedbackDraft != null ? "운동 코멘트 이어 쓰기" : l.feedback ? "운동 코멘트 확인·수정" : "운동 코멘트 작성"}</summary>
                  {editor("logs", l)}
                </details>
              </div>
            </div>
          ))}
          {!m?.logs.length && (
            <Empty>
              회원의 기록을 가져오면 운동량과 부담을 확인할 수 있습니다.
            </Empty>
          )}
          <Link className="gym-text-link" to={memberLink("plan", id)}>
            기록을 보고 다음 루틴 조정 <ArrowUpRight size={15} />
          </Link>
        </Card>
        <Card title={`식단 코칭 ${meals.length}건`}>
          {Boolean(m?.meals.length) && <Field label="식단 기록 검색">
            <input type="search" value={query} onChange={event => setQuery(event.target.value)}
              placeholder="날짜, 회원 메모, 저장한 피드백" />
          </Field>}
          <div className="gym-segment">
            {[
              ["pending", "답변 대기"],
              ["all", "전체 기록"],
            ].map(([v, l]) => (
              <button
                key={v}
                aria-pressed={filter === v}
                className={filter === v ? "active" : ""}
                onClick={() => setFilter(v)}
              >
                {l}
              </button>
            ))}
          </div>
          {meals.map((meal) => (
            <article className="gym-meal" key={meal.id}>
              <div className="gym-section-head">
                <strong>{m.name}님의 식단</strong>
                <span className="gym-pill">
                  {meal.feedback ? "답변 완료" : "대기"}
                </span>
              </div>
              <img
                loading="lazy"
                src={meal.photo}
                alt={`${meal.date} ${m.name}님 식단`}
              />
              <p>
                {meal.date} · {meal.note || "사진으로 남긴 식단"}
              </p>
              {editor("meals", meal)}
            </article>
          ))}
          {!meals.length && search && <Empty>검색 결과가 없습니다. 날짜나 메모를 바꿔 보세요.</Empty>}
          {!meals.length && !search && (
            <Empty>
              {filter === "pending"
                ? "답변을 기다리는 식단이 없습니다."
                : "아직 공유받은 식단이 없습니다."}
              <br />
              <Link className="gym-text-link" to={memberLink("sharing", id)}>
                회원 기록 가져오기 →
              </Link>
            </Empty>
          )}
        </Card>
      </div>
    </>
  );
}
