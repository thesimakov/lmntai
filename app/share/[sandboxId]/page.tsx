import { notFound } from "next/navigation";

import { SharePreviewClient } from "./share-preview-client";
import { isSandboxLinkPublic } from "@/lib/sandbox-share-db";
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
  return <SharePreviewClient sandboxId={id} />;
}
