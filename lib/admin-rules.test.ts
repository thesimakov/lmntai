import { describe, expect, it } from "vitest";

import { ADMIN_SECTION_RULES, canAccessAdminSection } from "@/lib/admin-rules";

describe("admin section rules", () => {
  it("allows manager with users.read to users/settings only", () => {
    const users = ADMIN_SECTION_RULES.find((x) => x.id === "users");
    const settings = ADMIN_SECTION_RULES.find((x) => x.id === "settings");
    const tariffs = ADMIN_SECTION_RULES.find((x) => x.id === "tariffs");
    expect(users && canAccessAdminSection("MANAGER", ["users.read"], users)).toBe(true);
    expect(settings && canAccessAdminSection("MANAGER", ["settings"], settings)).toBe(true);
    expect(tariffs && canAccessAdminSection("MANAGER", ["tariffs"], tariffs)).toBe(false);
  });

  it("allows admin to all sections", () => {
    for (const section of ADMIN_SECTION_RULES) {
      expect(canAccessAdminSection("ADMIN", [], section)).toBe(true);
    }
  });
});
