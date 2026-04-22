import type { NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { withApiLogging } from "@/lib/with-api-logging";

async function postBillingWebhook(req: NextRequest) {
  const payload = (await req.json().catch(() => null)) as
    | {
        email?: string;
        tokens?: number;
        event?: string;
      }
    | null;

  // Заглушка платёжного шлюза
  const email = payload?.email;
  const tokens = payload?.tokens ?? 0;

  if (!email || !tokens) {
    return Response.json({ ok: true, message: "Webhook received (noop)" });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return new Response("User not found", { status: 404 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { tokenBalance: { increment: tokens } }
  });

  return Response.json({ ok: true });
}

export const POST = withApiLogging("/api/billing/webhook", postBillingWebhook);

