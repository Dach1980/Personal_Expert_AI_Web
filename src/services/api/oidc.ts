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

type IdTokenClaims = {
  iss?: string;
  aud?: string | string[];
  exp?: number;
  nonce?: string;
};

type JwkSet = { keys: JsonWebKey[] & Array<JsonWebKey & { kid?: string; alg?: string; use?: string }> };

let tokens: TokenSet | null = null;
let expiresAt = 0;
let refreshInFlight: Promise<string> | null = null;
let jwks: JwkSet | null = null;

const SESSION_MARKER = 'pea.oidc.session';
const SILENT_ATTEMPT = 'pea.oidc.silent_attempted';

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

function base64UrlToBytes(value: string): Uint8Array {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
}

function decodeJwtPart<T>(value: string): T {
  return JSON.parse(new TextDecoder().decode(base64UrlToBytes(value))) as T;
}

async function challengeFor(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

async function verifyIdToken(idToken: string, expectedNonce: string): Promise<void> {
  const base = requireConfig();
  const [encodedHeader, encodedClaims, encodedSignature] = idToken.split('.');
  if (!encodedHeader || !encodedClaims || !encodedSignature) {
    throw new Error('Некорректный ID token.');
  }

  const header = decodeJwtPart<{ alg?: string; kid?: string }>(encodedHeader);
  const claims = decodeJwtPart<IdTokenClaims>(encodedClaims);
  if (header.alg !== 'RS256' || !header.kid) {
    throw new Error('ID token использует неподдерживаемый алгоритм подписи.');
  }
  if (claims.iss !== base) throw new Error('Issuer ID token не совпадает с Keycloak.');
  const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (!audiences.includes(clientId)) throw new Error('Audience ID token не совпадает с клиентом.');
  if (typeof claims.exp !== 'number' || claims.exp <= Math.floor(Date.now() / 1000)) {
    throw new Error('Срок действия ID token истёк.');
  }
  if (claims.nonce !== expectedNonce) throw new Error('Проверка nonce OIDC не пройдена.');

  if (!jwks) {
    const response = await fetch(`${base}/protocol/openid-connect/certs`, {
      headers: { Accept: 'application/json' },
      credentials: 'omit',
    });
    if (!response.ok) throw new Error('Не удалось получить ключи подписи Keycloak.');
    jwks = await response.json() as JwkSet;
  }
  const key = jwks.keys.find((candidate) => candidate.kid === header.kid && (!candidate.alg || candidate.alg === 'RS256'));
  if (!key) {
    jwks = null;
    throw new Error('Ключ подписи ID token отсутствует в JWKS Keycloak.');
  }

  const cryptoKey = await crypto.subtle.importKey(
    'jwk',
    key,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify'],
  );
  const signedContent = new TextEncoder().encode(`${encodedHeader}.${encodedClaims}`);
  const valid = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    base64UrlToBytes(encodedSignature),
    signedContent,
  );
  if (!valid) throw new Error('Подпись ID token недействительна.');
}

async function redirectToAuthorization(prompt?: 'none'): Promise<void> {
  const base = requireConfig();
  const verifier = randomVerifier();
  const challenge = await challengeFor(verifier);
  const state = randomVerifier();
  const nonce = randomVerifier();
  sessionStorage.setItem('pea.oidc.state', state);
  sessionStorage.setItem('pea.oidc.verifier', verifier);
  sessionStorage.setItem('pea.oidc.nonce', nonce);
  const parameters: Record<string, string> = {
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid profile email',
    state,
    nonce,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  };
  if (prompt) parameters.prompt = prompt;
  const authorization = new URL(`${base}/protocol/openid-connect/auth`);
  authorization.search = new URLSearchParams(parameters).toString();
  window.location.assign(authorization.toString());
}

function cleanCallbackUrl(url: URL): void {
  for (const key of ['code', 'state', 'session_state', 'error', 'error_description', 'iss']) {
    url.searchParams.delete(key);
  }
  window.history.replaceState({}, document.title, url.pathname + url.search + url.hash);
}

export async function initializeOidc(): Promise<void> {
  const url = new URL(window.location.href);
  const code = url.searchParams.get('code');
  const authError = url.searchParams.get('error');

  if (authError) {
    const expectedState = sessionStorage.getItem('pea.oidc.state');
    const actualState = url.searchParams.get('state');
    sessionStorage.removeItem('pea.oidc.state');
    sessionStorage.removeItem('pea.oidc.verifier');
    sessionStorage.removeItem('pea.oidc.nonce');
    cleanCallbackUrl(url);

    if (authError === 'login_required' && expectedState && actualState === expectedState &&
        sessionStorage.getItem(SILENT_ATTEMPT) === '1') {
      sessionStorage.removeItem(SILENT_ATTEMPT);
      sessionStorage.removeItem(SESSION_MARKER);
      return;
    }
    throw new Error('Keycloak отклонил вход или пользователь отменил авторизацию.');
  }

  if (code) {
    const expectedState = sessionStorage.getItem('pea.oidc.state');
    const verifier = sessionStorage.getItem('pea.oidc.verifier');
    const expectedNonce = sessionStorage.getItem('pea.oidc.nonce');
    const actualState = url.searchParams.get('state');
    sessionStorage.removeItem('pea.oidc.state');
    sessionStorage.removeItem('pea.oidc.verifier');
    sessionStorage.removeItem('pea.oidc.nonce');
    if (!expectedState || !actualState || actualState !== expectedState || !verifier || !expectedNonce) {
      cleanCallbackUrl(url);
      throw new Error('Проверка состояния OIDC не пройдена.');
    }

    const response = await fetch(`${requireConfig()}/protocol/openid-connect/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      credentials: 'omit',
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        redirect_uri: redirectUri,
        code,
        code_verifier: verifier,
      }),
    });
    cleanCallbackUrl(url);
    if (!response.ok) throw new Error('Keycloak не подтвердил вход.');
    const received = await response.json() as TokenSet;
    if (!received.access_token || !received.id_token || !received.expires_in) {
      throw new Error('Keycloak вернул неполный набор токенов.');
    }
    try {
      await verifyIdToken(received.id_token, expectedNonce);
    } catch (error) {
      tokens = null;
      sessionStorage.removeItem(SESSION_MARKER);
      throw error;
    }
    tokens = received;
    expiresAt = Date.now() + received.expires_in * 1000;
    sessionStorage.setItem(SESSION_MARKER, '1');
    sessionStorage.removeItem(SILENT_ATTEMPT);
    return;
  }

  // Tokens remain memory-only. After a reload, use a top-level prompt=none
  // round-trip against the Keycloak SSO session instead of persisting refresh tokens.
  if (sessionStorage.getItem(SESSION_MARKER) === '1' &&
      sessionStorage.getItem(SILENT_ATTEMPT) !== '1') {
    sessionStorage.setItem(SILENT_ATTEMPT, '1');
    await redirectToAuthorization('none');
  }
}

export async function beginLogin(): Promise<void> {
  sessionStorage.removeItem(SILENT_ATTEMPT);
  await redirectToAuthorization();
}

async function refreshAccessToken(): Promise<string> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    if (!tokens?.refresh_token) {
      tokens = null;
      sessionStorage.removeItem(SESSION_MARKER);
      throw new Error('Срок сессии истёк. Войдите повторно.');
    }
    const response = await fetch(`${requireConfig()}/protocol/openid-connect/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      credentials: 'omit',
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: clientId,
        refresh_token: tokens.refresh_token,
      }),
    });
    if (!response.ok) {
      tokens = null;
      expiresAt = 0;
      sessionStorage.removeItem(SESSION_MARKER);
      throw new Error('Срок сессии истёк. Войдите повторно.');
    }
    const previousRefreshToken = tokens.refresh_token;
    const refreshed = await response.json() as TokenSet;
    if (!refreshed.access_token || !refreshed.expires_in) {
      tokens = null;
      sessionStorage.removeItem(SESSION_MARKER);
      throw new Error('Keycloak вернул неполный ответ обновления сессии.');
    }
    tokens = {
      ...refreshed,
      refresh_token: refreshed.refresh_token ?? previousRefreshToken,
      id_token: refreshed.id_token ?? tokens.id_token,
    };
    expiresAt = Date.now() + refreshed.expires_in * 1000;
    return tokens.access_token;
  })();
  try {
    return await refreshInFlight;
  } finally {
    refreshInFlight = null;
  }
}

export async function getAccessToken(): Promise<string> {
  if (!tokens?.access_token) throw new Error('Требуется авторизация.');
  if (Date.now() < expiresAt - 60_000) return tokens.access_token;
  return refreshAccessToken();
}

export function endLoginSession(): void {
  const base = requireConfig();
  const idToken = tokens?.id_token;
  tokens = null;
  expiresAt = 0;
  refreshInFlight = null;
  sessionStorage.removeItem(SESSION_MARKER);
  sessionStorage.removeItem(SILENT_ATTEMPT);
  const logout = new URL(`${base}/protocol/openid-connect/logout`);
  const parameters = new URLSearchParams({
    client_id: clientId,
    post_logout_redirect_uri: redirectUri,
  });
  if (idToken) parameters.set('id_token_hint', idToken);
  logout.search = parameters.toString();
  window.location.assign(logout.toString());
}
