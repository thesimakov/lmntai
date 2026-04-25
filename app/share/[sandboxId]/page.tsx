import { notFound } from "next/navigation";

import { SharePreviewClient } from "./share-preview-client";
import { getSandboxShareHeaderBranding, isSandboxLinkPublic } from "@/lib/sandbox-share-db";
import { hasSandboxInRegistry } from "@/lib/sandbox-stores";

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
    ok = (await isSandboxLinkPublic(id)) && hasSandboxInRegistry(id);
  } catch {
    notFound();
  }
  if (!ok) {
    notFound();
  }
  const { showLemnityBranding } = await getSandboxShareHeaderBranding(id);
  return <SharePreviewClient sandboxId={id} showLemnityBranding={showLemnityBranding} />;
}
