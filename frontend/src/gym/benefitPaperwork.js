export const nhis = {
  guide: "https://www.nhis.or.kr/nhis/together/wbhaea01000m01.do?mode=view&articleNo=11007988",
  apply: "https://www.nhis.or.kr/nhis/healthin/retrieveHealthInIncvPartAply.do",
  points: "https://www.nhis.or.kr/nhis/healthin/retrieveHealthInIncvPointList.do",
};

export function applicationPacket(type, route, assessment) {
  const forms = [type];
  if (type === "manage" && route === "clinic") forms.push("clinic");
  if (assessment) forms.push("assessment");
  return forms;
}

export function applicationChecklist(type, route, child) {
  if (route === "online") return ["공단에서 본인인증 후 전자 신청서를 작성하세요. 건강정보 이해능력 평가는 선택입니다."];
  const items = [type === "prevent" ? "예방형 참여 신청서 앞·뒷면" : "관리형 참여 신청서 및 위임장 앞·뒷면"];
  if (child) items.push("법정대리인 신분증 사본, 미성년자 본인 기준 기본증명서 또는 가족관계증명서 등 대리권 증빙");
  else items.push(route === "visit" ? "본인 신분증 지참 · 지사에서 확인하면 사본 제출 생략 가능" : "본인 신분증 사본");
  if (type === "prevent") items.push("일반건강검진 통보서 · 공단이 결과를 확인할 수 있으면 생략");
  if (route === "clinic") items.push("의원 제출용 개인정보 수집·이용 및 제공 동의서");
  if (route === "fax") items.push("관할 지사 팩스번호를 확인해 전송한 뒤 작성한 원본은 본인이 보관");
  return items;
}
