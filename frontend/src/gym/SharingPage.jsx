import React, { useState, useMemo } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { Download, Upload, Link2 } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { useGym } from "./GymContext.jsx";
import { parseTransfer, applyTransfer, transferFor } from "./store.js";
import useMemberSelection from "./useMemberSelection.js";
import { MemberSelect } from "./CoachPages.jsx";
import { PageHead, Card, Field, Notice } from "./ui.jsx";
async function shareFile(data, name) {
  const text = JSON.stringify(data, null, 2);
  if (Capacitor.isNativePlatform()) {
    const { Filesystem, Directory, Encoding } = await import(
      "@capacitor/filesystem"
    );
    const { Share } = await import("@capacitor/share");
    const saved = await Filesystem.writeFile({
      path: name,
      data: text,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    });
    await Share.share({
      title: "Synex 코칭 공유",
      files: [saved.uri],
      dialogTitle: "공유할 대상을 선택하세요",
    });
    return;
  }
  const url = URL.createObjectURL(
    new Blob([text], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
export default function SharingPage() {
  const { state, update } = useGym();
  const coach = useLocation().pathname.startsWith("/coach");
  const [id, setId, selectionError] = useMemberSelection();
  const [consent, setConsent] = useState(false),
    [preview, setPreview] = useState(null),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const m = coach ? state.members.find((m) => m.id === id) : state.self;
  const packet = useMemo(
    () => (m ? transferFor(state, coach ? "coach" : "member", m) : null),
    [state, coach, m],
  );
  async function send() {
    try {
      setBusy(true);
      if (!m) throw Error("회원을 선택하세요.");
      if (coach && !m.plan) throw Error("운동 계획을 먼저 저장하세요.");
      if (!coach && !m.linkedCoach)
        throw Error("트레이너의 계획 파일을 먼저 가져오세요.");
      await shareFile(
        parseTransfer(JSON.stringify(packet)),
        `Synex-${coach ? "plan" : "records"}-${m.id.slice(0, 8)}.json`,
      );
      setMessage("공유 파일을 준비했습니다. 받는 사람을 확인해 전달하세요.");
      setError("");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function read(file) {
    try {
      if (file.size > 12 * 1024 * 1024)
        throw Error("12MB 이하 파일을 선택하세요.");
      const v = parseTransfer(await file.text());
      if (v.kind !== (coach ? "progress" : "plan"))
        throw Error(
          coach
            ? "회원의 기록 파일을 선택하세요."
            : "트레이너의 계획 파일을 선택하세요.",
        );
      setPreview(v);
      setError("");
    } catch (e) {
      setPreview(null);
      setError(e.message);
    }
  }
  async function accept() {
    try {
      setBusy(true);
      await update((s) =>
        applyTransfer(s, preview, coach ? "coach" : "member"),
      );
      setPreview(null);
      setError("");
      setMessage("가져왔습니다. 운동·PT 일정·피드백 화면에서 확인하세요.");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHead
        eyebrow="COACH ↔ MEMBER"
        title="계획과 실천, 서로에게 이어집니다."
      >
        서로 다른 기기에서는 파일을 공유해 같은 계획과 기록을 확인합니다.
      </PageHead>
      <div className="gym-share-progress">
        <span className="done">01 · 기록 준비</span>
        <span className={m?.plan ? "done" : ""}>02 · 계획 연결</span>
        <span className={m?.logs.length || m?.meals.length ? "done" : ""}>
          03 · 실천과 피드백
        </span>
      </div>
      <div className="gym-note">
        <Link2 size={18} />
        현재 설치본은 기기 저장 버전입니다. 실시간 서버 동기화 대신 공유 파일을
        사용합니다.
      </div>
      <div className="gym-two">
        <Card title={coach ? "계획·PT·피드백 보내기" : "운동·식단 기록 보내기"}>
          {coach && (
            <MemberSelect
              value={id}
              onChange={(value) => {
                setId(value);
                setConsent(false);
                setMessage("");
              }}
            />
          )}
          <Notice error>{selectionError}</Notice>
          <p>
            {coach
              ? "선택한 회원의 계획과 일정, 피드백만 포함됩니다."
              : "나의 운동 기록과 식단 사진이 포함됩니다."}
          </p>
          {packet && (
            <div className="gym-note">
              {coach
                ? `주 ${m.plan?.frequency || 0}회 · PT ${m.appointments.length}건`
                : `운동 ${packet.logs.length}건 · 식단 ${packet.meals.length}건 포함`}
              <br />
              {coach
                ? "선택한 회원을 확인하고 공유하세요."
                : "최근 기록부터 최대 11MB까지 보냅니다. 이전 기록은 기기에 남아 있습니다."}
            </div>
          )}
          <label className="gym-check">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />
            개인 기록이 포함된 파일을 담당 {coach ? "회원" : "트레이너"}에게
            공유하는 데 동의합니다.
          </label>
          <button
            className="gym-button"
            disabled={!consent || busy}
            onClick={send}
          >
            <Download size={17} />
            공유 파일 만들기
          </button>
        </Card>
        <Card title={coach ? "회원 기록 가져오기" : "트레이너 계획 가져오기"}>
          <Field label="Synex 공유 파일 (.json)">
            <input
              type="file"
              accept=".json,application/json"
              disabled={busy}
              onChange={(e) => {
                const file = e.target.files[0];
                e.target.value = "";
                if (file) read(file);
              }}
            />
          </Field>
          {preview && (
            <div className="gym-import-preview">
              <strong>
                {preview.name}님의{" "}
                {preview.kind === "plan" ? "운동 계획" : "실천 기록"}
              </strong>
              <p>
                {preview.kind === "plan"
                  ? `주 ${preview.plan.frequency}회 · PT ${preview.appointments.length}건`
                  : `운동 ${preview.logs.length}건 · 식단 ${preview.meals.length}건`}
              </p>
              <p>이름과 공유한 사람을 확인한 뒤 가져오세요.</p>
              <button className="gym-button" disabled={busy} onClick={accept}>
                <Upload size={16} />
                확인하고 가져오기
              </button>
            </div>
          )}
        </Card>
      </div>
      <Notice error>{error}</Notice>
      <Notice>{message}</Notice>
      <Card title="공유 순서">
        <ol className="gym-howto">
          <li>트레이너가 회원 등록 후 운동 계획과 PT 일정을 저장합니다.</li>
          <li>트레이너가 계획 파일을 공유하고, 회원이 확인 후 가져옵니다.</li>
          <li>
            회원은 운동 완료·식단 사진을 기록하고 기록 파일을 돌려보냅니다.
          </li>
          <li>트레이너는 기록을 확인하고 피드백과 다음 계획을 공유합니다.</li>
        </ol>
      </Card>
    </>
  );
}
