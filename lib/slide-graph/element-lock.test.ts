import { describe, it, expect } from "vitest";
import { isSlideElementLocked } from "./element-lock";
import type { SlideElement } from "./types";

const base: SlideElement = { id: "e1", type: "heading", content: "Hi" };

describe("isSlideElementLocked", () => {
  it("treats missing locked as unlocked (active on canvas)", () => {
    expect(isSlideElementLocked(base)).toBe(false);
  });

  it("respects locked: false", () => {
    expect(isSlideElementLocked({ ...base, locked: false })).toBe(false);
  });

  it("respects locked: true", () => {
    expect(isSlideElementLocked({ ...base, locked: true })).toBe(true);
  });
});
