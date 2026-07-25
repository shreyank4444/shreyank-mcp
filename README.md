# Shreyank Profile MCP Server

A local [Model Context Protocol](https://modelcontextprotocol.io/) server that lets AI agents query Shreyank S's public professional background.

## What it exposes

The server intentionally exposes no phone number or email address. Its four tools are:

| Tool | Purpose |
| --- | --- |
| `get_profile` | Summary, location, public links, and career highlights |
| `list_skills` | Skills grouped by category; optionally filter with `category` |
| `list_projects` | Products, technologies, highlights, and supplied public URLs |
| `search_background` | Case-insensitive search across skills, experience, projects, and education |

## Local stdio server

Prerequisites: [Bun](https://bun.sh/) 1.2+.

```bash
bun install
bun run dev
```

The server communicates over `stdio`; do not open it in a browser. To compile and run JavaScript instead:

```bash
bun run build
bun run start
```

## Connect an MCP client

Build the project first, then add this server entry to an MCP client configuration. Replace `/absolute/path/to/shreyank-mcp` with this repository's absolute path.

```json
{
  "mcpServers": {
    "shreyank-profile": {
      "command": "bun",
      "args": ["run", "start"],
      "cwd": "/absolute/path/to/shreyank-mcp"
    }
  }
}
```

For clients that support a direct command only, use:

```json
{
  "command": "bun",
  "args": ["run", "/absolute/path/to/shreyank-mcp/src/index.ts"]
}
```

This standard `stdio` configuration works with local MCP-capable clients, including Codex and Claude-compatible desktop and coding clients. Refer to your client's MCP settings documentation for the exact configuration file location.

## Deploy the DCR-enabled HTTP server

The Worker adds Streamable HTTP MCP at `https://<worker>.workers.dev/mcp`. It protects profile queries with OAuth 2.1 Authorization Code + PKCE, GitHub sign-in, and Dynamic Client Registration (DCR). A reviewer can use their own GitHub account to authorize an MCP client and receives only the `profile:read` scope.

### 1. Create Cloudflare resources

Authenticate the Wrangler CLI, then create the D1 database:

```bash
bunx wrangler login
bunx wrangler d1 create shreyank-profile-mcp
```

Copy the returned `database_id` into `wrangler.jsonc`, replacing `REPLACE_WITH_YOUR_D1_DATABASE_ID`. Apply the schema locally and remotely:

```bash
bunx wrangler d1 migrations apply shreyank-profile-mcp --local
bunx wrangler d1 migrations apply shreyank-profile-mcp --remote
```

### 2. Create a GitHub OAuth App

Create a GitHub OAuth App and set its Authorization callback URL to:

```text
https://<worker>.workers.dev/oauth/github/callback
```

After the first deployment, use the exact `workers.dev` URL shown by Wrangler. If you use a custom domain, use that stable HTTPS URL consistently for the Worker URL, GitHub callback URL, and OAuth issuer.

### 3. Configure Worker secrets and deploy

Set the public issuer before deployment by adding it as a `vars` entry in `wrangler.jsonc`:

```json
"vars": {
  "OAUTH_ISSUER": "https://<worker>.workers.dev"
}
```

Then store the sensitive values with Wrangler (never commit them):

```bash
bunx wrangler secret put GITHUB_CLIENT_ID
bunx wrangler secret put GITHUB_CLIENT_SECRET
bunx wrangler secret put OAUTH_TOKEN_HASH_SECRET
bunx wrangler deploy
```

Generate `OAUTH_TOKEN_HASH_SECRET` with a password manager or:

```bash
openssl rand -base64 48
```

For local Worker development, create an untracked `.dev.vars` file containing the same values and run:

```bash
bun run dev:worker
```

### 4. Connect a remote MCP client

Use the deployed `/mcp` URL. A DCR-capable client discovers the authorization server, registers itself at `/register`, opens GitHub sign-in, and then uses the issued bearer token automatically.

```bash
codex mcp add shreyank-profile-remote --url https://<worker>.workers.dev/mcp
```

The Worker publishes standard discovery documents at `/.well-known/oauth-authorization-server` and `/.well-known/oauth-protected-resource/mcp`.

## Development

```bash
bun run typecheck
bun run test
bun run build
```

Professional data lives in `src/profile.ts`. Update that file to add or remove information exposed to agents.

## Current scope

The local `stdio` transport remains available for offline development. The public Worker endpoint is read-only and requires a GitHub-authorized `profile:read` token; it does not expose phone number or email address.
