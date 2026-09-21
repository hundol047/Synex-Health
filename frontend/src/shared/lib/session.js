// Access tokens are kept only in memory, never localStorage.
let accessToken = '';
export const getAccessToken = () => accessToken;
export function setAccessToken(value) { accessToken = value; }
