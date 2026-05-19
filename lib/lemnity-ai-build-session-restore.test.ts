import { describe, expect, it } from "vitest";
import { findDashboardSessionLink, toBuildSessionLinkMeta } from "./lemnity-ai-build-session-restore";
import type { LemnityAiSessionListItem } from "./lemnity-ai-session-links";

const links: LemnityAiSessionListItem[] = [
  {
    project_id: "proj_host",
    session_id: "manus_upstream",
    preview_artifact_id: "artifact_abc",
  },
];

describe("lemnity-ai-build-session-restore", () => {
  it("finds link by host project or upstream session id", () => {
    expect(findDashboardSessionLink(links, "proj_host")?.session_id).toBe("manus_upstream");
    expect(findDashboardSessionLink(links, "manus_upstream")?.project_id).toBe("proj_host");
    expect(findDashboardSessionLink(links, "missing")).toBeUndefined();
  });

  it("maps link meta for restore", () => {
    const row = findDashboardSessionLink(links, "proj_host");
    expect(toBuildSessionLinkMeta(row!)).toEqual({
      hostProjectId: "proj_host",
      upstreamSessionId: "manus_upstream",
      previewArtifactId: "artifact_abc",
    });
  });
});
