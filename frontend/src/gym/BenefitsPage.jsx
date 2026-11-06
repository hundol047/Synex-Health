import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ShieldCheck,
  ArrowUpRight,
  Footprints,
  CalendarCheck,
  Wallet,
} from "lucide-react";
import { useGym } from "./GymContext.jsx";
import { PageHead, Card, Field, Notice } from "./ui.jsx";
const official = "https://www.nhis.or.kr/nhis/healthin/healthIncvInt.do";
export default function BenefitsPage() {
  const { state, update } = useGym();
  const coach = useLocation().pathname.startsWith("/coach");
  const [type, setType] = useState(state.self.benefit.type || "prevent"),
    [consent, setConsent] = useState(false),
    [notice, setNotice] = useState(""),
    [opened, setOpened] = useState(false);
  const prevent = type === "prevent";
  return (
    <>
      <PageHead
        eyebrow="HEALTH BENEFITS"
        title="건강을 챙기는 나에게, 실천의 보상."
      >
        국민건강보험공단 건강생활실천지원금 · 나에게 맞는 참여 경로를
        확인하세요.
      </PageHead>
      <div className="gym-benefit-tabs" role="group" aria-label="지원금 유형">
        <button
          className={prevent ? "active" : ""}
          onClick={() => setType("prevent")}
        >
          예방형 · 건강검진
        </button>
        <button
          className={!prevent ? "active" : ""}
          onClick={() => setType("manage")}
        >
          관리형 · 만성질환 관리
        </button>
      </div>
      <div className="gym-two">
        <Card className="gym-dark">
          <span className="gym-eyebrow">
            {prevent ? "2년" : "1년"} 최대 적립
          </span>
          <strong className="gym-points">
            {prevent ? "120,000" : "80,000"}
            <small>포인트</small>
          </strong>
          <p>
            {prevent
              ? "만 20~64세 · 국가건강검진 결과 · 참여지역 기준"
              : "고혈압·당뇨병 · 일차의료 만성질환관리 등록·케어플랜"}
          </p>
          <div className="gym-note">
            {prevent
              ? "BMI 25 이상이며 혈압 120/80mmHg 이상 또는 공복혈당 100mg/dL 이상 등 공단 기준을 확인하세요."
              : "등록한 의원의 케어플랜에 따라 걷기·자가측정·교육과 상담을 실천합니다."}
          </div>
          <small>
            인정 활동과 유형별 조건에 따라 적립 · 실제 자격과 포인트는 공단에서
            확정
          </small>
        </Card>
        <Card title="시넥스에서 시작하는 간편인증">
          <span className="gym-pill">인증 서비스 연동 준비 중</span>
          <p>
            인증 → 대상 조회 → 참여 신청 → 진행 상황 확인을 하나의 흐름으로
            준비하고 있습니다.
          </p>
          <button className="gym-button" onClick={() => setOpened(true)}>
            <ShieldCheck size={18} />
            간편인증 시작
          </button>
          {opened && (
            <div className="gym-auth-panel">
              <h3>인증 연결 준비</h3>
              <p>
                현재 설치본은 인증업체·공단과 연결되기 전입니다. 인증 요청이나
                개인정보 전송은 발생하지 않습니다.
              </p>
              <p className="gym-muted">
                정식 연결 후 인증 승인과 서버 검증을 거쳐 대상 조회를
                진행합니다.
              </p>
              <button
                className="gym-button secondary"
                onClick={() => setOpened(false)}
              >
                확인
              </button>
            </div>
          )}
          <a
            href={official}
            target="_blank"
            rel="noreferrer"
            className="gym-text-link"
          >
            현재 공단 공식 참여 안내 보기 <ArrowUpRight size={15} />
          </a>
        </Card>
      </div>
      <Card title="참여 이후, 이렇게 이어집니다">
        <div className="gym-policy-steps">
          {[
            [ShieldCheck, "대상 확인·신청", "공식 기준과 유형 확인"],
            [Footprints, "건강활동 실천", "유형별 활동·걷기·케어플랜"],
            [CalendarCheck, "적립 내역 확인", "공식 인정 실적과 잔액 확인"],
            [Wallet, "포인트 사용", "지정 온라인몰·관리형 진료비"],
          ].map(([Icon, t, b], i) => (
            <div key={t}>
              <span className="gym-avatar">
                <Icon size={21} />
              </span>
              <small>0{i + 1}</small>
              <h3>{t}</h3>
              <p>{b}</p>
            </div>
          ))}
        </div>
      </Card>
      {!coach && (
        <Card title="나의 실천 준비">
          <label className="gym-check">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />
            선택한 유형과 실천 준비 상태를 이 기기에 저장합니다.
          </label>
          <button
            className="gym-button"
            disabled={!consent}
            onClick={async () => {
              try {
                await update((s) => {
                  s.self.benefit = { ...s.self.benefit, type, reminders: true };
                });
                setNotice(
                  "실천 준비 상태를 저장했습니다. 운동 알림은 아래에서 직접 설정하세요.",
                );
              } catch (e) {
                setNotice(e.message);
              }
            }}
          >
            나의 실천 준비 저장
          </button>
          <Link to="/health/connections" className="gym-text-link">
            운동 알림 설정 <ArrowUpRight size={15} />
          </Link>
          <Notice>{notice}</Notice>
          <p className="gym-muted">
            트레이너 기록은 코칭에 활용합니다. 지원금 적립은 공단의 인정·인증
            기준에 따릅니다.
          </p>
        </Card>
      )}
    </>
  );
}
