import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { SharePreviewClient } from "./[sandboxId]/share-preview-client";
import { resolveProjectFromHeaders } from "@/lib/project-domain-resolution";
import { getSandboxShareHeaderBranding, isSandboxLinkPublic } from "@/lib/sandbox-share-db";
import { sandboxManager } from "@/lib/sandbox-manager";

export default async function ProjectShareByDomainPage() {
  const h = await headers();
  const project = await resolveProjectFromHeaders(h);
  if (!project) {
    notFound();
  }

  const isPublic = await isSandboxLinkPublic(project.id);
  const exists = await sandboxManager.hasSandboxPersistent(project.id);
  if (!isPublic || !exists) {
    notFound();
  }

  const { showLemnityBranding } = await getSandboxShareHeaderBranding(project.id);
  return <SharePreviewClient showLemnityBranding={showLemnityBranding} />;
}
