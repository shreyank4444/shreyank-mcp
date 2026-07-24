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

## Run locally

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

## Development

```bash
bun run typecheck
bun run test
bun run build
```

Professional data lives in `src/profile.ts`. Update that file to add or remove information exposed to agents.

## Current scope

This version is local-only. HTTP transport, deployment, authentication, Dynamic Client Registration (DCR), and repository publishing are intentionally not included.
