import { describe, it, expect } from "vitest";
import { buildComponentGraphPrompt } from "./prompt";

describe("buildComponentGraphPrompt", () => {
  it("returns system + user messages", () => {
    const msgs = buildComponentGraphPrompt("Build a SaaS landing");
    expect(msgs).toHaveLength(2);
    expect(msgs[0].role).toBe("system");
    expect(msgs[1].role).toBe("user");
    expect(msgs[1].content).toContain("SaaS landing");
  });

  it("system prompt includes DESIGN PRESETS", () => {
    const msgs = buildComponentGraphPrompt("any");
    expect(msgs[0].content).toContain("DESIGN PRESETS");
    expect(msgs[0].content).toContain("Modern SaaS");
    expect(msgs[0].content).toContain("#7C3AED");
  });

  it("system prompt includes VISUAL RICHNESS RULES", () => {
    const msgs = buildComponentGraphPrompt("any");
    expect(msgs[0].content).toContain("VISUAL RICHNESS");
    expect(msgs[0].content).toContain("gradient");
    expect(msgs[0].content).toContain("boxShadow");
  });

  it("system prompt lists Stats, Logos, Team, Timeline node types", () => {
    const msgs = buildComponentGraphPrompt("any");
    for (const t of ["Stats", "Logos", "Team", "Timeline"]) {
      expect(msgs[0].content).toContain(t);
    }
  });
});
