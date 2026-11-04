const issuer = import.meta.env.VITE_OIDC_ISSUER?.replace(/\/$/, '');
const clientId = import.meta.env.VITE_OIDC_CLIENT_ID || 'pea-web';
const redirectUri =
  import.meta.env.VITE_OIDC_REDIRECT_URI ||
  `${window.location.origin}${import.meta.env.BASE_URL}`;

type TokenSet = {
  access_token: string;
  refresh_token?: string;
  id_token?: string;
  expires_in: number;
};

let tokens: TokenSet | null = null;
let expiresAt = 0;

function requireConfig(): string {
  if (!issuer) throw new Error('Не настроен VITE_OIDC_ISSUER.');
  return issuer;
}

function randomVerifier(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(48));
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

async function challengeFor(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

export async function initializeOidc(): Promise<void> {
  const url = new URL(window.location.href);
  const code = url.searchParams.get('code');
  const authError = url.searchParams.get('error');
  if (authError) {
    url.searchParams.delete('error');
    url.searchParams.delete('error_description');
    window.history.replaceState({}, document.title, url.pathname + url.search + url.hash);
    throw new Error('Keycloak отклонил вход или пользователь отменил авторизацию.');
  }
  if (!code) return;

  const expectedState = sessionStorage.getItem('pea.oidc.state');
  const verifier = sessionStorage.getItem('pea.oidc.verifier');
  const actualState = url.searchParams.get('state');
  const expectedNonce = sessionStorage.getItem('pea.oidc.nonce');
  sessionStorage.removeItem('pea.oidc.state');
  sessionStorage.removeItem('pea.oidc.verifier');
  sessionStorage.removeItem('pea.oidc.nonce');
  if (!expectedState || !actualState || actualState !== expectedState || !verifier || !expectedNonce) {
    throw new Error('Проверка состояния OIDC не пройдена.');
  }

  const response = await fetch(`${requireConfig()}/protocol/openid-connect/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      redirect_uri: redirectUri,
      code,
      code_verifier: verifier,
    }),
  });
  if (!response.ok) throw new Error('Keycloak не подтвердил вход.');
  tokens = await response.json() as TokenSet;
  if (!tokens.id_token) throw new Error('Keycloak не вернул ID token.');
  const encodedClaims = tokens.id_token.split('.')[1]?.replace(/-/g, '+').replace(/_/g, '/');
  if (!encodedClaims) throw new Error('Некорректный ID token.');
  const claims = JSON.parse(atob(encodedClaims)) as { nonce?: string };
  if (claims.nonce !== expectedNonce) {
    tokens = null;
    throw new Error('Проверка nonce OIDC не пройдена.');
  }
  expiresAt = Date.now() + tokens.expires_in * 1000;
  url.searchParams.delete('code');
  url.searchParams.delete('state');
  url.searchParams.delete('session_state');
  window.history.replaceState({}, document.title, url.pathname + url.search + url.hash);
}

export async function beginLogin(): Promise<void> {
  const base = requireConfig();
  const verifier = randomVerifier();
  const challenge = await challengeFor(verifier);
  const state = randomVerifier();
  const nonce = randomVerifier();
  sessionStorage.setItem('pea.oidc.state', state);
  sessionStorage.setItem('pea.oidc.verifier', verifier);
  sessionStorage.setItem('pea.oidc.nonce', nonce);
  const authorization = new URL(`${base}/protocol/openid-connect/auth`);
  authorization.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid profile email',
    state,
    nonce,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  }).toString();
  window.location.assign(authorization.toString());
}

export async function getAccessToken(): Promise<string> {
  if (!tokens?.access_token) throw new Error('Требуется авторизация.');
  if (Date.now() < expiresAt - 60_000) return tokens.access_token;
  if (!tokens.refresh_token) {
    tokens = null;
    throw new Error('Срок сессии истёк. Войдите повторно.');
  }
  const response = await fetch(`${requireConfig()}/protocol/openid-connect/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: clientId,
      refresh_token: tokens.refresh_token,
    }),
  });
  if (!response.ok) {
    tokens = null;
    throw new Error('Срок сессии истёк. Войдите повторно.');
  }
  tokens = await response.json() as TokenSet;
  expiresAt = Date.now() + tokens.expires_in * 1000;
  return tokens.access_token;
}

export function endLoginSession(): void {
  const base = requireConfig();
  tokens = null;
  expiresAt = 0;
  const logout = new URL(`${base}/protocol/openid-connect/logout`);
  logout.search = new URLSearchParams({
    client_id: clientId,
    post_logout_redirect_uri: redirectUri,
  }).toString();
  window.location.assign(logout.toString());
}
