import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { getProfile, listProjects, listSkills, searchBackground } from "./queries.js";
import { skills, type SkillCategory } from "./profile.js";

const skillCategorySchema = z.enum(Object.keys(skills) as [SkillCategory, ...SkillCategory[]]);

function toolResult(data: Record<string, unknown>) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
    structuredContent: data,
  };
}

export function createServer() {
  const server = new McpServer({ name: "shreyank-profile-mcp", version: "0.1.0" });

  server.registerTool(
    "get_profile",
    {
      title: "Get Shreyank's profile",
      description: "Returns Shreyank S's professional summary, location, public links, and career highlights.",
    },
    async () => toolResult({ profile: getProfile() }),
  );

  server.registerTool(
    "list_skills",
    {
      title: "List Shreyank's skills",
      description: "Lists professional skills, optionally filtered to a single category.",
      inputSchema: { category: skillCategorySchema.optional() },
    },
    async ({ category }) => toolResult({ skills: listSkills(category) }),
  );

  server.registerTool(
    "list_projects",
    {
      title: "List Shreyank's projects",
      description: "Lists products Shreyank has worked on, including technologies and outcomes.",
    },
    async () => toolResult({ projects: listProjects() }),
  );

  server.registerTool(
    "search_background",
    {
      title: "Search Shreyank's background",
      description: "Searches skills, experience, projects, and education for relevant professional background.",
      inputSchema: {
        query: z.string().trim().min(1).describe("Term to search for, such as React, fintech, or education."),
        limit: z.number().int().min(1).max(25).default(10).optional(),
      },
    },
    async ({ query, limit }) => toolResult({ results: searchBackground(query, limit) }),
  );

  return server;
}
