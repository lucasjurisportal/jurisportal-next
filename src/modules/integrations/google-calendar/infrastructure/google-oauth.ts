const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
export const GOOGLE_CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events.owned";

function requireEnv(name: "GOOGLE_CALENDAR_CLIENT_ID" | "GOOGLE_CALENDAR_CLIENT_SECRET" | "GOOGLE_CALENDAR_REDIRECT_URI") {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name}_MISSING`);
  return value;
}

export function googleOAuthConfig() {
  return {
    clientId: requireEnv("GOOGLE_CALENDAR_CLIENT_ID"),
    clientSecret: requireEnv("GOOGLE_CALENDAR_CLIENT_SECRET"),
    redirectUri: requireEnv("GOOGLE_CALENDAR_REDIRECT_URI"),
  };
}

export function buildGoogleAuthorizationUrl(state: string) {
  const { clientId, redirectUri } = googleOAuthConfig();
  const url = new URL(AUTH_URL);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", GOOGLE_CALENDAR_SCOPE);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("state", state);
  return url.toString();
}

type TokenResponse = {
  access_token: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
};

async function parseTokenResponse(response: Response): Promise<TokenResponse> {
  const body = await response.json().catch(() => null) as TokenResponse | { error?: string; error_description?: string } | null;
  if (!response.ok || !body || !("access_token" in body)) {
    const reason = body && "error" in body ? `${body.error ?? "oauth_error"}: ${body.error_description ?? ""}` : `HTTP_${response.status}`;
    throw new Error(`GOOGLE_OAUTH_TOKEN_FAILED:${reason}`);
  }
  return body;
}

export async function exchangeGoogleAuthorizationCode(code: string) {
  const { clientId, clientSecret, redirectUri } = googleOAuthConfig();
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
    cache: "no-store",
  });
  return parseTokenResponse(response);
}

export async function refreshGoogleAccessToken(refreshToken: string) {
  const { clientId, clientSecret } = googleOAuthConfig();
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
    }),
    cache: "no-store",
  });
  return parseTokenResponse(response);
}

export async function revokeGoogleToken(token: string) {
  const response = await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    cache: "no-store",
  });
  if (!response.ok && response.status !== 400) throw new Error(`GOOGLE_TOKEN_REVOKE_FAILED:${response.status}`);
}
