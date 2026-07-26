import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { describe, expect, it } from "vitest";

import { createServer } from "../src/server.js";

describe("MCP server", () => {
  it("lists and invokes every public tool", async () => {
    const server = createServer();
    const client = new Client({ name: "profile-mcp-test-client", version: "0.1.0" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

    const tools = await client.listTools();
    expect(tools.tools.map((tool) => tool.name).sort()).toEqual([
      "get_profile",
      "list_projects",
      "list_skills",
      "search_background",
    ]);

    for (const [name, args] of [
      ["get_profile", {}],
      ["list_skills", { category: "Proficient" }],
      ["list_projects", {}],
      ["search_background", { query: "React" }],
    ] as const) {
      const result = await client.callTool({ name, arguments: args });
      expect(result.isError).not.toBe(true);
      expect(result.structuredContent).toBeDefined();
    }

    await Promise.all([client.close(), server.close()]);
  });
});
