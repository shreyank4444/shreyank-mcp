# Deploying the Shreyank Profile MCP Server

This guide deploys the DCR-enabled remote MCP server to Cloudflare Workers. The result is a public HTTPS MCP endpoint that reviewers can add to Codex or another MCP-capable client, authenticate with GitHub, and use to query the public profile tools.

## What you will create

- A Cloudflare Worker hosting Streamable HTTP MCP at `https://<worker>.workers.dev/mcp`.
- A Cloudflare D1 database storing dynamically registered clients, authorization transactions, authorization codes, and hashed OAuth tokens.
- A GitHub OAuth App used to authenticate reviewers before granting `profile:read` access.

The local `stdio` MCP server remains available and does not require Cloudflare or GitHub credentials.

## Prerequisites

Before starting, ensure you have:

- A Cloudflare account with permission to create Workers and D1 databases.
- A GitHub account that can create an OAuth App.
- Bun 1.2+ installed.
- This repository’s dependencies installed:

  ```bash
  cd /Users/shreyank/Sites/shreyank-mcp
  bun install
  ```

## 1. Authenticate Wrangler

Log in to Cloudflare from the repository directory:

```bash
bunx wrangler login
```

Your browser opens a Cloudflare authorization page. Complete the login and return to the terminal.

## 2. Create the D1 database

Create the database that stores OAuth and DCR state:

```bash
bunx wrangler d1 create shreyank-profile-mcp
```

Wrangler prints a `database_id`. Copy it into `wrangler.jsonc`, replacing this placeholder:

```json
"database_id": "REPLACE_WITH_YOUR_D1_DATABASE_ID"
```

Apply the D1 migration to the remote database:

```bash
bunx wrangler d1 migrations apply shreyank-profile-mcp --remote
```

Optional: create a local D1 database for `wrangler dev`:

```bash
bunx wrangler d1 migrations apply shreyank-profile-mcp --local
```

## 3. Determine the stable Worker URL

The Worker is named `shreyank-profile-mcp`. Cloudflare will assign a URL in this form:

```text
https://shreyank-profile-mcp.<your-subdomain>.workers.dev
```

Use this same base URL consistently in the next steps. If you intend to use a custom domain, configure it first and use that custom domain instead. Changing the issuer URL later requires updating the GitHub callback URL and redeploying.

## 4. Create the GitHub OAuth App

1. In GitHub, open **Settings → Developer settings → OAuth Apps → New OAuth App**.
2. Enter a name such as `Shreyank Profile MCP`.
3. Set the homepage URL to your Worker base URL.
4. Set the authorization callback URL to:

   ```text
   https://shreyank-profile-mcp.<your-subdomain>.workers.dev/oauth/github/callback
   ```

5. Create the app.
6. Copy the **Client ID** and generate/copy a **Client secret**.

Do not commit either credential to the repository.

## 5. Configure the OAuth issuer and secrets

Add the final base URL to `wrangler.jsonc` under a top-level `vars` section:

```json
"vars": {
  "OAUTH_ISSUER": "https://shreyank-profile-mcp.<your-subdomain>.workers.dev"
}
```

Set the three Worker secrets. Each command prompts you for its value:

```bash
bunx wrangler secret put GITHUB_CLIENT_ID
bunx wrangler secret put GITHUB_CLIENT_SECRET
bunx wrangler secret put OAUTH_TOKEN_HASH_SECRET
```

Generate the hash secret with a password manager or:

```bash
openssl rand -base64 48
```

For local Worker development, create an untracked `.dev.vars` file:

```dotenv
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
OAUTH_TOKEN_HASH_SECRET=your-generated-secret
OAUTH_ISSUER=http://localhost:8787
```

Run the local Worker with:

```bash
bun run dev:worker
```

GitHub callback testing requires a public HTTPS URL; use the deployed Worker for the complete login flow.

## 6. Deploy the Worker

Run a local bundle check first:

```bash
bunx wrangler deploy --dry-run
```

Deploy to Cloudflare:

```bash
bunx wrangler deploy
```

Copy the URL Wrangler prints. It must exactly match `OAUTH_ISSUER` and the GitHub OAuth App callback URL. If it differs, correct the issuer and callback URL, then deploy again.

## 7. Verify deployment

Replace `<worker-url>` below with the deployed HTTPS base URL.

Check the health endpoint:

```bash
curl https://<worker-url>/health
```

Expected response:

```json
{"status":"ok"}
```

Check OAuth authorization-server discovery:

```bash
curl https://<worker-url>/.well-known/oauth-authorization-server
```

Confirm the response contains `authorization_endpoint`, `token_endpoint`, and `registration_endpoint`.

Check MCP protected-resource metadata:

```bash
curl https://<worker-url>/.well-known/oauth-protected-resource/mcp
```

Confirm that `resource` ends with `/mcp` and that `authorization_servers` lists your Worker base URL.

Check that the protected MCP endpoint advertises authorization metadata:

```bash
curl -i -X POST https://<worker-url>/mcp
```

Expected result: `401 Unauthorized` with a `WWW-Authenticate` header containing `resource_metadata`.

## 8. Connect Codex as a reviewer

Add the remote MCP server:

```bash
codex mcp add shreyank-profile-remote --url https://<worker-url>/mcp
```

Start a new Codex session. The first tool call should open a browser sign-in flow:

```text
Call the get_profile tool from shreyank-profile-remote.
```

Sign in to GitHub and complete authorization. The client will dynamically register, receive `profile:read` access, and invoke the tool. Repeat with:

```text
Use search_background from shreyank-profile-remote to find Shreyank's experience with WebSockets.
```

## Troubleshooting

| Problem | Resolution |
| --- | --- |
| `database_id` error during deploy | Replace the placeholder in `wrangler.jsonc` with the ID returned by `wrangler d1 create`. |
| GitHub reports a callback mismatch | Make the callback URL in the GitHub OAuth App exactly `<OAUTH_ISSUER>/oauth/github/callback`. |
| Client cannot discover OAuth | Confirm the Worker is public and that both `/.well-known` endpoints return JSON over HTTPS. |
| Client gets `401 Unauthorized` repeatedly | Remove and re-add the MCP server, then complete the GitHub sign-in flow in a new client session. |
| GitHub login fails after deployment | Re-enter `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` with `wrangler secret put`, then redeploy. |
| Local `wrangler dev` cannot complete login | GitHub OAuth requires the registered public HTTPS callback URL; test login against the deployed Worker. |

## Security notes

- The remote MCP server is read-only and issues only the `profile:read` scope.
- DCR clients are public OAuth clients and must use PKCE with `S256`.
- Access tokens and refresh tokens are stored in D1 only as keyed hashes.
- Phone number and email are not returned by any MCP tool.
- Never add `.dev.vars`, OAuth secrets, or Cloudflare credentials to Git.
