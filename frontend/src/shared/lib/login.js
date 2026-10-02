export function selectLoginConfig(provider, native, redirectUri) {
  if (!provider) throw Error('로그인 연결을 준비 중입니다.');
  const allowed = provider.redirect_urls || [provider.redirect_url];
  if (!allowed.includes(redirectUri)) throw Error('현재 앱의 로그인 주소가 등록되지 않았습니다. 운영자에게 문의해 주세요.');
  const client = native ? provider.native_client_id || provider.client_id : provider.client_id;
  if (!client || !provider.issuer?.startsWith('https://')) throw Error('로그인 서버 설정을 확인해 주세요.');
  return {...provider, client_id: client};
}

export function authorizationParameters(config, {state, challenge, redirectUri}) {
  const params = new URLSearchParams({response_type: 'code', client_id: config.client_id,
    redirect_uri: redirectUri, scope: config.refresh_enabled ? 'openid profile offline_access' : 'openid profile',
    state, code_challenge: challenge, code_challenge_method: 'S256'});
  if (config.audience) params.set('audience', config.audience);
  return params;
}

export function validateLoginRequest(raw, received, redirectUri, now = Date.now()) {
  let saved;
  try { saved = JSON.parse(raw); } catch { /* Corrupt storage is a failed login. */ }
  if (!saved || !saved.state || saved.state !== received.searchParams.get('state') ||
      !Number.isFinite(saved.created) || saved.created > now || now - saved.created > 600000 ||
      saved.redirect_uri !== redirectUri || typeof saved.verifier !== 'string' || saved.verifier.length < 43) {
    throw Error('로그인 요청이 만료되었거나 유효하지 않습니다. 다시 로그인해 주세요.');
  }
  selectLoginConfig(saved.config, false, redirectUri);
  return saved;
}
