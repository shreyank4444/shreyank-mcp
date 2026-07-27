import { randomValue, sha256, tokenHash } from "./crypto.js";
import type { Env, OAuthClient, OAuthCode, OAuthToken } from "./types.js";

const ACCESS_TOKEN_TTL_SECONDS = 60 * 60;
const AUTHORIZATION_CODE_TTL_SECONDS = 5 * 60;
const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;
export const PROFILE_SCOPE = "profile:read";

type RegisteredClientInput = {
  client_name?: unknown;
  redirect_uris?: unknown;
  grant_types?: unknown;
  response_types?: unknown;
  scope?: unknown;
  token_endpoint_auth_method?: unknown;
};

type AuthorizationRequest = {
  clientId: string;
  redirectUri: string;
  state?: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  scope: string;
  resource: string;
};

function now() {
  return Math.floor(Date.now() / 1000);
}

function jsonArray(value: string) {
  return JSON.parse(value) as string[];
}

function error(message: string, status = 400) {
  return Response.json({ error: "invalid_request", error_description: message }, { status });
}

function isAllowedScope(scope: string) {
  const scopes = scope.split(" ").filter(Boolean);
  return scopes.length > 0 && scopes.every((item) => item === PROFILE_SCOPE);
}

function isValidRedirectUri(value: string) {
  try {
    const url = new URL(value);
    const isLoopback = ["127.0.0.1", "::1", "localhost"].includes(url.hostname);
    return !url.hash && (url.protocol === "https:" || (url.protocol === "http:" && isLoopback));
  } catch {
    return false;
  }
}

function getMcpUrl(env: Env) {
  return `${env.OAUTH_ISSUER.replace(/\/$/, "")}/mcp`;
}

async function getClient(env: Env, clientId: string) {
  return env.DB.prepare("SELECT * FROM oauth_clients WHERE client_id = ?")
    .bind(clientId)
    .first<OAuthClient>();
}

function clientAllowsRedirect(client: OAuthClient, redirectUri: string) {
  return jsonArray(client.redirect_uris).includes(redirectUri);
}

export function oauthMetadata(env: Env) {
  const issuer = env.OAUTH_ISSUER.replace(/\/$/, "");
  return {
    issuer,
    authorization_endpoint: `${issuer}/authorize`,
    token_endpoint: `${issuer}/token`,
    registration_endpoint: `${issuer}/register`,
    revocation_endpoint: `${issuer}/revoke`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    token_endpoint_auth_methods_supported: ["none"],
    code_challenge_methods_supported: ["S256"],
    scopes_supported: [PROFILE_SCOPE],
  };
}

export function protectedResourceMetadata(env: Env) {
  return {
    resource: getMcpUrl(env),
    authorization_servers: [env.OAUTH_ISSUER.replace(/\/$/, "")],
    scopes_supported: [PROFILE_SCOPE],
    bearer_methods_supported: ["header"],
    resource_documentation: `${env.OAUTH_ISSUER.replace(/\/$/, "")}/`,
  };
}

export async function registerClient(request: Request, env: Env) {
  let input: RegisteredClientInput;
  try {
    input = (await request.json()) as RegisteredClientInput;
  } catch {
    return error("Registration body must be JSON.");
  }

  if (!Array.isArray(input.redirect_uris) || input.redirect_uris.length === 0) {
    return error("redirect_uris must contain at least one URI.");
  }
  if (!input.redirect_uris.every((value): value is string => typeof value === "string" && isValidRedirectUri(value))) {
    return error("redirect_uris must use HTTPS or a localhost loopback HTTP URI without a fragment.");
  }
  if (input.token_endpoint_auth_method !== undefined && input.token_endpoint_auth_method !== "none") {
    return error("Only public clients using token_endpoint_auth_method=none are supported.");
  }

  const grantTypes = input.grant_types ?? ["authorization_code", "refresh_token"];
  const responseTypes = input.response_types ?? ["code"];
  const scope = typeof input.scope === "string" ? input.scope : PROFILE_SCOPE;
  if (
    !Array.isArray(grantTypes) ||
    !grantTypes.every((value) => value === "authorization_code" || value === "refresh_token") ||
    !Array.isArray(responseTypes) ||
    responseTypes.length !== 1 ||
    responseTypes[0] !== "code" ||
    !isAllowedScope(scope)
  ) {
    return error("The requested grant, response type, or scope is unsupported.");
  }

  const clientId = `mcp_${randomValue(24)}`;
  const issuedAt = now();
  await env.DB.prepare(
    "INSERT INTO oauth_clients (client_id, client_name, redirect_uris, grant_types, response_types, scope, client_id_issued_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
  )
    .bind(
      clientId,
      typeof input.client_name === "string" ? input.client_name.slice(0, 200) : null,
      JSON.stringify(input.redirect_uris),
      JSON.stringify(grantTypes),
      JSON.stringify(responseTypes),
      scope,
      issuedAt,
    )
    .run();

  return Response.json(
    {
      client_id: clientId,
      client_id_issued_at: issuedAt,
      client_name: typeof input.client_name === "string" ? input.client_name : undefined,
      redirect_uris: input.redirect_uris,
      grant_types: grantTypes,
      response_types: responseTypes,
      token_endpoint_auth_method: "none",
      scope,
    },
    { status: 201 },
  );
}

export async function startAuthorization(request: Request, env: Env) {
  const url = new URL(request.url);
  const authorization: AuthorizationRequest = {
    clientId: url.searchParams.get("client_id") ?? "",
    redirectUri: url.searchParams.get("redirect_uri") ?? "",
    state: url.searchParams.get("state") ?? undefined,
    codeChallenge: url.searchParams.get("code_challenge") ?? "",
    codeChallengeMethod: url.searchParams.get("code_challenge_method") ?? "",
    scope: url.searchParams.get("scope") ?? PROFILE_SCOPE,
    resource: url.searchParams.get("resource") ?? getMcpUrl(env),
  };
  const client = await getClient(env, authorization.clientId);
  if (!client || !clientAllowsRedirect(client, authorization.redirectUri)) {
    return error("Unknown client_id or redirect_uri.", 400);
  }
  if (
    url.searchParams.get("response_type") !== "code" ||
    authorization.codeChallengeMethod !== "S256" ||
    !authorization.codeChallenge ||
    !isAllowedScope(authorization.scope) ||
    authorization.resource !== getMcpUrl(env)
  ) {
    return error("Authorization requests require response_type=code, S256 PKCE, profile:read, and this MCP resource.");
  }

  // Auto-approve: issue an auth code immediately without requiring identity login.
  const code = randomValue();
  const codeHash = await tokenHash(code, env.OAUTH_TOKEN_HASH_SECRET);
  await env.DB.prepare(
    "INSERT INTO oauth_codes (code_hash, client_id, redirect_uri, code_challenge, scope, resource, github_login, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
  )
    .bind(
      codeHash,
      client.client_id,
      authorization.redirectUri,
      authorization.codeChallenge,
      authorization.scope,
      authorization.resource,
      "anonymous",
      now() + AUTHORIZATION_CODE_TTL_SECONDS,
    )
    .run();

  const redirect = new URL(authorization.redirectUri);
  redirect.searchParams.set("code", code);
  if (authorization.state) redirect.searchParams.set("state", authorization.state);
  return Response.redirect(redirect.toString(), 302);
}

async function issueTokens(env: Env, clientId: string, scope: string, resource: string, identity: string) {
  const accessToken = `at_${randomValue(32)}`;
  const refreshToken = `rt_${randomValue(32)}`;
  const accessHash = await tokenHash(accessToken, env.OAUTH_TOKEN_HASH_SECRET);
  const refreshHash = await tokenHash(refreshToken, env.OAUTH_TOKEN_HASH_SECRET);
  const issuedAt = now();
  await env.DB.batch([
    env.DB.prepare(
      "INSERT INTO oauth_tokens (token_hash, token_type, client_id, scope, resource, github_login, expires_at) VALUES (?, 'access', ?, ?, ?, ?, ?)",
    ).bind(accessHash, clientId, scope, resource, identity, issuedAt + ACCESS_TOKEN_TTL_SECONDS),
    env.DB.prepare(
      "INSERT INTO oauth_tokens (token_hash, token_type, client_id, scope, resource, github_login, expires_at) VALUES (?, 'refresh', ?, ?, ?, ?, ?)",
    ).bind(refreshHash, clientId, scope, resource, identity, issuedAt + REFRESH_TOKEN_TTL_SECONDS),
  ]);
  return {
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: ACCESS_TOKEN_TTL_SECONDS,
    refresh_token: refreshToken,
    scope,
  };
}

export async function token(request: Request, env: Env) {
  const form = await request.formData();
  const grantType = form.get("grant_type");
  const clientId = form.get("client_id");
  if (typeof clientId !== "string" || !(await getClient(env, clientId))) return error("Unknown client_id.", 401);

  if (grantType === "authorization_code") {
    const code = form.get("code");
    const verifier = form.get("code_verifier");
    const redirectUri = form.get("redirect_uri");
    if (typeof code !== "string" || typeof verifier !== "string" || typeof redirectUri !== "string") {
      return error("Authorization code exchange requires code, code_verifier, and redirect_uri.");
    }
    const codeHash = await tokenHash(code, env.OAUTH_TOKEN_HASH_SECRET);
    const storedCode = await env.DB.prepare("SELECT * FROM oauth_codes WHERE code_hash = ?")
      .bind(codeHash)
      .first<OAuthCode>();
    if (
      !storedCode ||
      storedCode.client_id !== clientId ||
      storedCode.redirect_uri !== redirectUri ||
      storedCode.consumed_at !== null ||
      storedCode.expires_at <= now() ||
      (await sha256(verifier)) !== storedCode.code_challenge
    ) {
      return Response.json({ error: "invalid_grant" }, { status: 400 });
    }
    await env.DB.prepare("UPDATE oauth_codes SET consumed_at = ? WHERE code_hash = ?").bind(now(), codeHash).run();
    return Response.json(await issueTokens(env, clientId, storedCode.scope, storedCode.resource, storedCode.github_login));
  }

  if (grantType === "refresh_token") {
    const refreshToken = form.get("refresh_token");
    if (typeof refreshToken !== "string") return error("Refresh token is required.");
    const refreshHash = await tokenHash(refreshToken, env.OAUTH_TOKEN_HASH_SECRET);
    const storedToken = await env.DB.prepare("SELECT * FROM oauth_tokens WHERE token_hash = ?")
      .bind(refreshHash)
      .first<OAuthToken>();
    if (
      !storedToken ||
      storedToken.token_type !== "refresh" ||
      storedToken.client_id !== clientId ||
      storedToken.revoked_at !== null ||
      storedToken.expires_at <= now()
    ) {
      return Response.json({ error: "invalid_grant" }, { status: 400 });
    }
    await env.DB.prepare("UPDATE oauth_tokens SET revoked_at = ? WHERE token_hash = ?").bind(now(), refreshHash).run();
    return Response.json(await issueTokens(env, clientId, storedToken.scope, storedToken.resource, storedToken.github_login));
  }

  return Response.json({ error: "unsupported_grant_type" }, { status: 400 });
}

export async function revoke(request: Request, env: Env) {
  const form = await request.formData();
  const token = form.get("token");
  const clientId = form.get("client_id");
  if (typeof token === "string" && typeof clientId === "string") {
    const hash = await tokenHash(token, env.OAUTH_TOKEN_HASH_SECRET);
    await env.DB.prepare("UPDATE oauth_tokens SET revoked_at = ? WHERE token_hash = ? AND client_id = ?")
      .bind(now(), hash, clientId)
      .run();
  }
  return new Response(null, { status: 200 });
}

export async function verifyAccessToken(value: string, env: Env) {
  const hash = await tokenHash(value, env.OAUTH_TOKEN_HASH_SECRET);
  const storedToken = await env.DB.prepare("SELECT * FROM oauth_tokens WHERE token_hash = ?")
    .bind(hash)
    .first<OAuthToken>();
  if (
    !storedToken ||
    storedToken.token_type !== "access" ||
    storedToken.revoked_at !== null ||
    storedToken.expires_at <= now() ||
    storedToken.resource !== getMcpUrl(env)
  ) {
    return undefined;
  }
  return storedToken;
}
