import { describe, expect, it } from "vitest";

import { getProfile, listProjects, listSkills, searchBackground } from "../src/queries.js";

describe("profile queries", () => {
  it("returns only approved public profile details", () => {
    const result = getProfile();

    expect(result.name).toBe("Shreyank S");
    expect(result.links.github).toBe("https://github.com/shreyank4444");
    expect(JSON.stringify(result)).not.toMatch(/98862|gmail\.com/);
  });

  it("filters skills by category", () => {
    expect(listSkills("Expert")).toEqual({
      Expert: expect.arrayContaining(["React", "React Native (Expo)", "TypeScript"]),
    });
  });

  it("returns all listed projects", () => {
    expect(listProjects()).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: "Surge Credit" })]),
    );
  });

  it("searches background without case sensitivity", () => {
    expect(searchBackground("WEBSOCKETS")).toEqual(
      expect.arrayContaining([expect.objectContaining({ title: "WebSockets" })]),
    );
  });

  it("caps the number of search results", () => {
    expect(searchBackground("typescript", 1)).toHaveLength(1);
  });
});
