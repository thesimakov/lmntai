import { notFound } from "next/navigation";

import { SharePreviewClient } from "./share-preview-client";
import { getSandboxShareHeaderBranding, isSandboxLinkPublic } from "@/lib/sandbox-share-db";
import { sandboxManager } from "@/lib/sandbox-manager";

type SharePageProps = {
  params: Promise<{ sandboxId: string }>;
};

export default async function PublicSharePage({ params }: SharePageProps) {
  const { sandboxId: id } = await params;
  if (!id?.trim()) {
    notFound();
  }
  let ok = false;
  try {
    const pub = await isSandboxLinkPublic(id);
    if (!pub) ok = false;
    else if (id.startsWith("artifact_")) ok = true;
    else ok = await sandboxManager.hasSandboxPersistent(id);
  } catch {
    notFound();
  }
  if (!ok) {
    notFound();
  }
  const { showLemnityBranding } = await getSandboxShareHeaderBranding(id);
  return <SharePreviewClient sandboxId={id} showLemnityBranding={showLemnityBranding} />;
}
