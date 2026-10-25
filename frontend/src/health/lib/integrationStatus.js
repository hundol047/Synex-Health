// Directory availability and a user's successful import are different states.
export function schoolStatusLabel(status) {
  return ({connected:'기관 연결 확인됨',pending:'기관 연결 준비 중',error:'기관 연결 확인 필요',not_connected:'기관 미연결'})[status] || '연결 상태 미확인';
}
export function measurementConnection(status, localOnly=false) {
  if(localOnly)return {label:'기기 전용 · 자동 연동 없음',canSync:false};
  const state=status?.operational_state;
  const label=({DISCONNECTED:'기관 미연결',UNMAPPED:'측정 계정 연결 필요',CONFIGURED:'학교 인증·측정 계정 연결 필요',AUTHENTICATED:'측정 계정 연결 필요',MAPPED:'측정 기록 가져오기 가능',SYNCED:'측정 기록 연결됨',ERROR:'가져오기 실패 · 다시 확인 필요'})[state] || '연결 상태 미확인';
  return {label,canSync:['MAPPED','SYNCED','ERROR'].includes(state)&&['pending','connected','error'].includes(status?.status)};
}
