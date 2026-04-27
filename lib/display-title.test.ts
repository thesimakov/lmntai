import { describe, expect, it } from "vitest";

import { sanitizeProjectTitleForUser } from "./display-title";

describe("sanitizeProjectTitleForUser", () => {
  it("strips React/TypeScript stack suffix (RU)", () => {
    expect(sanitizeProjectTitleForUser("Eco интернет-магазин — UI на React+TypeScript")).toBe(
      "Eco интернет-магазин"
    );
  });

  it("strips parenthetical stack", () => {
    expect(sanitizeProjectTitleForUser("Shop (React+TypeScript)")).toBe("Shop");
  });

  it("keeps innocuous titles", () => {
    expect(sanitizeProjectTitleForUser("Лендинг для курсов")).toBe("Лендинг для курсов");
  });
});
