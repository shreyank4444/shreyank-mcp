import { describe, expect, it } from "vitest";

import worker from "../src/worker/index.js";
import { oauthMetadata, protectedResourceMetadata, registerClient } from "../src/worker/oauth.js";
import type { Env } from "../src/worker/types.js";

function createEnv(): Env {
  const database = {
    prepare() {
      return {
        bind() {
          return {
            run: async () => ({ success: true }),
          };
        },
      };
    },
  };
  return {
    DB: database as unknown as D1Database,
    GITHUB_CLIENT_ID: "github-client-id",
    GITHUB_CLIENT_SECRET: "github-client-secret",
    OAUTH_ISSUER: "https://profile.example.workers.dev",
    OAUTH_TOKEN_HASH_SECRET: "test-secret",
  };
}

describe("Worker OAuth and DCR", () => {
  it("publishes MCP OAuth discovery metadata", () => {
    const env = createEnv();

    expect(oauthMetadata(env)).toMatchObject({
      issuer: "https://profile.example.workers.dev",
      registration_endpoint: "https://profile.example.workers.dev/register",
      code_challenge_methods_supported: ["S256"],
    });
    expect(protectedResourceMetadata(env)).toMatchObject({
      resource: "https://profile.example.workers.dev/mcp",
      authorization_servers: ["https://profile.example.workers.dev"],
    });
  });

  it("registers a public PKCE client", async () => {
    const response = await registerClient(
      new Request("https://profile.example.workers.dev/register", {
        method: "POST",
        body: JSON.stringify({
          client_name: "Reviewer IDE",
          redirect_uris: ["http://127.0.0.1:8080/oauth/callback"],
          token_endpoint_auth_method: "none",
        }),
      }),
      createEnv(),
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      client_id: expect.stringMatching(/^mcp_/),
      token_endpoint_auth_method: "none",
      scope: "profile:read",
    });
  });

  it("rejects unsafe DCR redirect URIs", async () => {
    const response = await registerClient(
      new Request("https://profile.example.workers.dev/register", {
        method: "POST",
        body: JSON.stringify({ redirect_uris: ["http://example.com/callback"] }),
      }),
      createEnv(),
    );

    expect(response.status).toBe(400);
  });

  it("advertises OAuth metadata when unauthenticated MCP access is attempted", async () => {
    const env = createEnv();
    const response = await worker.fetch(new Request("https://profile.example.workers.dev/mcp", { method: "POST" }), env);

    expect(response.status).toBe(401);
    expect(response.headers.get("www-authenticate")).toContain("oauth-protected-resource/mcp");
  });
});
