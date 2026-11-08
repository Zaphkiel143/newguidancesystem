import { createHash, randomBytes } from "crypto";

// "Continue with Microsoft": sign in through the school's Microsoft Entra ID
// (the same account people use for STI eLMS and Outlook). Off until STI IT
// registers E-Gabay as an app in their tenant and these are set (ENTRA-SETUP.md):
//
// ENTRA_TENANT_ID       the school's Directory (tenant) ID
// ENTRA_CLIENT_ID       the app registration's Application (client) ID
// ENTRA_CLIENT_SECRET   a client secret made for that app registration
// ENTRA_REDIRECT_URI    optional; defaults to <site>/api/auth/entra/callback

export function entraConfigured() {
  return Boolean(process.env.ENTRA_TENANT_ID && process.env.ENTRA_CLIENT_ID && process.env.ENTRA_CLIENT_SECRET);
}

const authority = () => `https://login.microsoftonline.com/${process.env.ENTRA_TENANT_ID}`;

export function entraRedirectUri(origin: string) {
  return process.env.ENTRA_REDIRECT_URI || `${origin}/api/auth/entra/callback`;
}

const base64url = (buf: Buffer) => buf.toString("base64url");

// state stops forged callbacks, nonce ties the ID token to this attempt, and
// the PKCE verifier means a stolen authorization code is useless on its own.
export function newEntraAttempt() {
  const verifier = base64url(randomBytes(32));
  return {
    state: base64url(randomBytes(16)),
    nonce: base64url(randomBytes(16)),
    verifier,
    challenge: base64url(createHash("sha256").update(verifier).digest()),
  };
}

export function entraAuthorizeUrl(a: { state: string; nonce: string; challenge: string; redirectUri: string; loginHint?: string }) {
  const url = new URL(`${authority()}/oauth2/v2.0/authorize`);
  url.search = new URLSearchParams({
    client_id: process.env.ENTRA_CLIENT_ID!,
    response_type: "code",
    redirect_uri: a.redirectUri,
    response_mode: "query",
    scope: "openid profile email",
    state: a.state,
    nonce: a.nonce,
    code_challenge: a.challenge,
    code_challenge_method: "S256",
    ...(a.loginHint ? { login_hint: a.loginHint } : {}),
  }).toString();
  return url.toString();
}

// Trades the authorization code for an ID token and returns the signed-in
// person's email. The token comes straight from Microsoft's token endpoint
// over TLS, authenticated with the client secret, so its claims are checked
// but its signature isn't (OpenID Connect Core 3.1.3.7).
export async function entraEmailFromCode(a: { code: string; verifier: string; nonce: string; redirectUri: string }): Promise<string | null> {
  const res = await fetch(`${authority()}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.ENTRA_CLIENT_ID!,
      client_secret: process.env.ENTRA_CLIENT_SECRET!,
      grant_type: "authorization_code",
      code: a.code,
      redirect_uri: a.redirectUri,
      code_verifier: a.verifier,
      scope: "openid profile email",
    }),
  });
  if (!res.ok) {
    console.error("Entra token exchange failed:", res.status, await res.text().catch(() => ""));
    return null;
  }
  const { id_token } = (await res.json()) as { id_token?: string };
  const payload = id_token?.split(".")[1];
  if (!payload) return null;
  const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Record<string, unknown>;

  const tenant = process.env.ENTRA_TENANT_ID!;
  const issuerOk = typeof claims.iss === "string" && claims.iss.startsWith("https://login.microsoftonline.com/") && (claims.tid === tenant || claims.iss.includes(tenant));
  if (claims.aud !== process.env.ENTRA_CLIENT_ID || !issuerOk || claims.nonce !== a.nonce) return null;
  if (typeof claims.exp !== "number" || claims.exp * 1000 < Date.now()) return null;

  const email = [claims.email, claims.preferred_username, claims.upn].find((v): v is string => typeof v === "string" && v.includes("@"));
  return email ? email.trim().toLowerCase() : null;
}
