import { notFound } from "next/navigation";

import { SharePreviewClient } from "./share-preview-client";
import { isSandboxLinkPublic } from "@/lib/sandbox-share-db";
import { sandboxManager } from "@/lib/sandbox-manager";

type SharePageProps = {
  params: { sandboxId: string };
};

export default async function PublicSharePage({ params }: SharePageProps) {
  const id = params.sandboxId;
  if (!id?.trim()) {
    notFound();
  }
  let ok = false;
  try {
    ok = (await isSandboxLinkPublic(id)) && sandboxManager.hasSandbox(id);
  } catch {
    notFound();
  }
  if (!ok) {
    notFound();
  }
  return <SharePreviewClient sandboxId={id} />;
}
