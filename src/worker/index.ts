import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";

import { createServer } from "../server.js";
import {
  oauthMetadata,
  protectedResourceMetadata,
  registerClient,
  revoke,
  startAuthorization,
  token,
  verifyAccessToken,
} from "./oauth.js";
import type { Env } from "./types.js";

function methodNotAllowed() {
  return Response.json({ error: "method_not_allowed" }, { status: 405 });
}

function unauthorized(env: Env) {
  const issuer = env.OAUTH_ISSUER.replace(/\/$/, "");
  return new Response("Unauthorized", {
    status: 401,
    headers: {
      "WWW-Authenticate": `Bearer resource_metadata="${issuer}/.well-known/oauth-protected-resource/mcp"`,
    },
  });
}

async function handleMcp(request: Request, env: Env) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return unauthorized(env);
  const accessToken = authorization.slice("Bearer ".length);
  const verified = await verifyAccessToken(accessToken, env);
  if (!verified) return unauthorized(env);

  const server = createServer();
  const transport = new WebStandardStreamableHTTPServerTransport({ enableJsonResponse: true });
  await server.connect(transport);
  return transport.handleRequest(request, {
    authInfo: {
      token: accessToken,
      clientId: verified.client_id,
      scopes: verified.scope.split(" "),
      expiresAt: verified.expires_at,
      resource: new URL(verified.resource),
      extra: { identity: verified.github_login },
    },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: { Allow: "GET, POST, OPTIONS" } });
    if (url.pathname === "/") return Response.json({ name: "shreyank-mcp", status: "ok", mcp: "/mcp" });
    if (url.pathname === "/health") return Response.json({ status: "ok" });
    if (url.pathname === "/.well-known/oauth-authorization-server" && request.method === "GET") {
      return Response.json(oauthMetadata(env));
    }
    if (url.pathname === "/.well-known/oauth-protected-resource/mcp" && request.method === "GET") {
      return Response.json(protectedResourceMetadata(env));
    }
    if (url.pathname === "/register") return request.method === "POST" ? registerClient(request, env) : methodNotAllowed();
    if (url.pathname === "/authorize") return request.method === "GET" ? startAuthorization(request, env) : methodNotAllowed();
    if (url.pathname === "/token") return request.method === "POST" ? token(request, env) : methodNotAllowed();
    if (url.pathname === "/revoke") return request.method === "POST" ? revoke(request, env) : methodNotAllowed();
    if (url.pathname === "/mcp") return handleMcp(request, env);
    return new Response("Not found", { status: 404 });
  },
};
