import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Camera, ScanLine, Check } from "lucide-react";
import { HealthAPI } from "../shared/lib/api.js";
import { PageHead, Card, Field, Notice } from "./ui.jsx";
import { photoData } from "./photos.js";
import { recognizeComposition } from "./ocr.js";
import { today } from "./store.js";
export default function CapturePage() {
  const [photo, setPhoto] = useState(""),
    [form, setForm] = useState({
      weight: "",
      skeletal_muscle_mass: "",
      body_fat_percentage: "",
      height: "",
      measurement_date: today(),
    }),
    [busy, setBusy] = useState(false),
    [progress, setProgress] = useState(0),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [confirmed, setConfirmed] = useState(false),
    [raw, setRaw] = useState(""),
    [saved, setSaved] = useState(false);
  async function pick(file) {
    try {
      setBusy(true);
      setPhoto(await photoData(file, 2400));
      setRaw("");
      setConfirmed(false);
      setSaved(false);
      setNotice("사진을 확인한 뒤 수치 인식을 시작하세요.");
      setError("");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function scan() {
    try {
      setBusy(true);
      setProgress(0);
      setError("");
      const r = await recognizeComposition(photo, setProgress);
      setRaw(r.text);
      setForm((f) => ({ ...f, ...r.values }));
      setNotice(
        "사진과 인식된 수치를 비교해 주세요. 읽지 못한 항목만 직접 보완하면 됩니다.",
      );
      setConfirmed(false);
    } catch {
      setError(
        "사진을 인식하지 못했습니다. 선명하게 다시 찍거나 아래 수치를 보완해 주세요.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function save(e) {
    e.preventDefault();
    try {
      setBusy(true);
      setError("");
      await HealthAPI.createMeasurement({
        measurement_date: form.measurement_date,
        weight: Number(form.weight),
        skeletal_muscle_mass: Number(form.skeletal_muscle_mass),
        body_fat_percentage: form.body_fat_percentage
          ? Number(form.body_fat_percentage)
          : null,
        height: form.height ? Number(form.height) : null,
        segments: [],
        device_name: "사진 인식 후 사용자 확인",
      });
      setSaved(true);
      setNotice("확인한 수치를 저장했습니다. 내 몸 화면에 반영됩니다.");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHead
        eyebrow="CAPTURE → UNDERSTAND"
        title="결과지를 찍고, 내 몸을 이해하세요."
      >
        사진에서 읽은 수치를 확인하면 기존 3D 인체 화면에 연결됩니다.
      </PageHead>
      <div className="gym-two">
        <Card title="결과지 사진">
          <Field label="결과지 촬영·사진 선택">
            <input
              type="file"
              accept="image/*"
              capture="environment"
              disabled={busy}
              onChange={(e) => e.target.files[0] && pick(e.target.files[0])}
            />
          </Field>
          {photo ? (
            <img className="gym-report-photo" src={photo} alt="체성분 결과지" />
          ) : (
            <div className="gym-photo-empty">
              <Camera size={42} />
              <p>항목 이름과 숫자가 함께 보이게 촬영하세요.</p>
            </div>
          )}
          <button
            className="gym-button"
            disabled={!photo || busy}
            onClick={scan}
          >
            <ScanLine size={17} />
            {busy ? `처리 중 ${progress}%` : "사진에서 수치 읽기"}
          </button>
          <p className="gym-muted">
            사진 인식은 기기에서 처리합니다. 원본 사진은 서버로 전송하지
            않습니다.
          </p>
        </Card>
        <Card title="읽은 수치 확인">
          <form onSubmit={save}>
            <Field label="측정일">
              <input
                type="date"
                max={today()}
                required
                value={form.measurement_date}
                onChange={(e) =>
                  setForm({ ...form, measurement_date: e.target.value })
                }
              />
            </Field>
            {[
              ["weight", "체중 (kg)", 20, 300],
              ["skeletal_muscle_mass", "골격근량 (kg)", 1, 100],
              ["body_fat_percentage", "체지방률 (%)", 0, 100],
              ["height", "키 (cm)", 50, 250],
            ].map(([key, label, min, max]) => (
              <Field key={key} label={label}>
                <input
                  type="number"
                  step="0.1"
                  min={min}
                  max={max}
                  required={["weight", "skeletal_muscle_mass"].includes(key)}
                  value={form[key]}
                  onChange={(e) => {
                    setForm({ ...form, [key]: e.target.value });
                    setConfirmed(false);
                    setSaved(false);
                  }}
                />
              </Field>
            ))}
            <label className="gym-check">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
              />
              원본과 숫자·단위를 비교했습니다.
            </label>
            <button
              className="gym-button"
              disabled={busy || !confirmed || saved}
            >
              <Check size={16} />
              확인한 수치 저장
            </button>
          </form>
          <Notice error>{error}</Notice>
          <Notice>{notice}</Notice>
          {saved && (
            <Link className="gym-button secondary" to="/health/body">
              내 3D 인체 보기
            </Link>
          )}
          {raw && (
            <details>
              <summary>인식된 원문 확인</summary>
              <pre className="gym-ocr-text">{raw}</pre>
            </details>
          )}
        </Card>
      </div>
    </>
  );
}
