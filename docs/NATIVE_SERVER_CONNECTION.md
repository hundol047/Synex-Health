# Native server connection

The automated debug APK previously had no VITE_API_BASE. Relative /api URLs therefore targeted the packaged WebView origin, not the hosted API. Native startup now shows a server setup screen before mounting login when no API origin exists. A user-entered HTTPS origin is accepted only after /api/health/status identifies service synex-health and status ok. Only the public origin is saved; credentials and health values are not stored by this screen. Reload binds the existing offline account to the resolved origin.

Release builds never use a runtime override. Configure GitHub repository variable VITE_API_BASE for native CI or use the signed release workflow's production variable. Web/browser CI keeps its local API base and never points integration writes at a real hosted account.

The API must actually be running with suitable CORS for the registered native WebView origins, PostgreSQL/auth configuration for production, general public OIDC client settings and optional school OIDC settings. A static-only website or GitHub URL is insufficient. Entering an origin does not deploy an API or provision authentication.

The existing Vercel project synex-health was discovered, but access to its lumident team was denied by the connected Vercel account. Actual deployed API/SSO readiness cannot be claimed without authorized deployment access and a real login check. Reconnect Vercel with access to that team or provide a known deployed API origin; no secrets are needed in chat.
