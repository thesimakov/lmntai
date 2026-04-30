import { describe, expect, it } from "vitest";

import { suggestPublishSubdomain } from "./publish-host";

describe("suggestPublishSubdomain", () => {
  const sandboxId = "461e404a-a631-4cbb-b2f9-f0da2cbbe524";

  it("prefers project- prefix when seed normalizes to a path-like slug", () => {
    const s = suggestPublishSubdomain("src/app.tsx src/components", sandboxId);
    expect(s).toBe(`project-${sandboxId.slice(0, 6).toLowerCase()}`);
  });

  it("keeps readable brand-ish slug when short and not path-like", () => {
    expect(suggestPublishSubdomain("My Coffee Shop", sandboxId)).toBe("my-coffee-shop");
  });
});
