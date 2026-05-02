import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { SharePreviewClient } from "./[sandboxId]/share-preview-client";
import { prisma } from "@/lib/prisma";
import { isBuiltInPublishHost, normalizeHost } from "@/lib/publish-domain";
import { resolveProjectFromHeaders } from "@/lib/project-domain-resolution";
import { getSandboxShareHeaderBranding } from "@/lib/sandbox-share-db";
import { sandboxManager } from "@/lib/sandbox-manager";

export default async function ProjectShareByDomainPage() {
  const h = await headers();
  const project = await resolveProjectFromHeaders(h);
  if (!project) {
    notFound();
  }

  const share = await prisma.sandboxShare.findUnique({
    where: { projectId: project.id },
    select: { isPublic: true, sandboxId: true }
  });
  if (!share?.isPublic) {
    notFound();
  }

  const storageId = share.sandboxId;
  if (!storageId.startsWith("artifact_")) {
    const ok = await sandboxManager.hasSandboxPersistent(storageId);
    if (!ok) {
      notFound();
    }
  }

  const { showLemnityBranding } = await getSandboxShareHeaderBranding(storageId);
  const rawHost = h.get("x-project-host") ?? h.get("x-forwarded-host") ?? h.get("host");
  const hostNorm = normalizeHost(rawHost);
  const showPublicPreviewHeader = !hostNorm || !isBuiltInPublishHost(hostNorm);

  return (
    <SharePreviewClient
      sandboxId={storageId}
      showLemnityBranding={showLemnityBranding}
      showPublicPreviewHeader={showPublicPreviewHeader}
    />
  );
}
