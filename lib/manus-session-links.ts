import { prisma } from "@/lib/prisma";
import { normalizeUsage, type TokenUsage } from "@/lib/token-billing";

export type ManusListSessionItem = {
  session_id: string;
  title?: string | null;
  latest_message?: string | null;
  latest_message_at?: number | null;
  status?: string | null;
  unread_message_count?: number | null;
  is_shared?: boolean | null;
};

function toDateFromUnix(value: number | null | undefined): Date | null {
  if (!value || !Number.isFinite(value) || value <= 0) return null;
  return new Date(value * 1000);
}

export function asManusListItem(link: {
  manusSessionId: string;
  title: string | null;
  latestMessage: string | null;
  latestMessageAt: Date | null;
  status: string;
  unreadMessageCount: number;
  isShared: boolean;
}): ManusListSessionItem {
  return {
    session_id: link.manusSessionId,
    title: link.title ?? null,
    latest_message: link.latestMessage ?? null,
    latest_message_at: link.latestMessageAt ? Math.floor(link.latestMessageAt.getTime() / 1000) : null,
    status: link.status,
    unread_message_count: link.unreadMessageCount,
    is_shared: link.isShared
  };
}

export async function createManusSessionLink(userId: string, manusSessionId: string) {
  const existing = await prisma.manusSessionLink.findUnique({
    where: { manusSessionId }
  });
  if (existing) {
    if (existing.userId !== userId) {
      throw new Error("MANUS_SESSION_ALREADY_OWNED");
    }
    return existing;
  }
  return prisma.manusSessionLink.create({
    data: {
      userId,
      manusSessionId
    }
  });
}

export async function listManusSessionsForUser(userId: string) {
  const rows = await prisma.manusSessionLink.findMany({
    where: { userId },
    orderBy: [{ updatedAt: "desc" }]
  });
  return rows.map(asManusListItem);
}

export async function getManusSessionForUser(userId: string, manusSessionId: string) {
  return prisma.manusSessionLink.findFirst({
    where: { userId, manusSessionId }
  });
}

export async function ensureManusSessionOwnership(userId: string, manusSessionId: string) {
  const row = await getManusSessionForUser(userId, manusSessionId);
  if (!row) {
    throw new Error("MANUS_SESSION_NOT_FOUND");
  }
  return row;
}

export async function deleteManusSessionForUser(userId: string, manusSessionId: string) {
  await prisma.manusSessionLink.deleteMany({
    where: { userId, manusSessionId }
  });
}

export async function syncManusSessionSummary(input: {
  userId: string;
  manusSessionId: string;
  title?: string | null;
  latestMessage?: string | null;
  latestMessageAt?: number | Date | null;
  status?: string | null;
  unreadMessageCount?: number | null;
  isShared?: boolean | null;
}) {
  const latestAt =
    input.latestMessageAt instanceof Date
      ? input.latestMessageAt
      : typeof input.latestMessageAt === "number"
        ? toDateFromUnix(input.latestMessageAt)
        : null;

  await prisma.manusSessionLink.upsert({
    where: { manusSessionId: input.manusSessionId },
    update: {
      userId: input.userId,
      title: input.title ?? undefined,
      latestMessage: input.latestMessage ?? undefined,
      latestMessageAt: latestAt ?? undefined,
      status: input.status ?? undefined,
      unreadMessageCount:
        typeof input.unreadMessageCount === "number" ? Math.max(0, Math.floor(input.unreadMessageCount)) : undefined,
      isShared: typeof input.isShared === "boolean" ? input.isShared : undefined
    },
    create: {
      userId: input.userId,
      manusSessionId: input.manusSessionId,
      title: input.title ?? null,
      latestMessage: input.latestMessage ?? null,
      latestMessageAt: latestAt ?? null,
      status: input.status ?? "pending",
      unreadMessageCount:
        typeof input.unreadMessageCount === "number" ? Math.max(0, Math.floor(input.unreadMessageCount)) : 0,
      isShared: Boolean(input.isShared)
    }
  });
}

export async function chargeManusChatUsage(input: {
  userId: string;
  manusSessionId: string;
  eventId: string;
  usage: Partial<TokenUsage> | null | undefined;
  model: string;
}): Promise<
  | { charged: true; usage: TokenUsage }
  | { charged: false; usage: TokenUsage; reason: "zero" | "duplicate" | "insufficient_balance" }
> {
  const usage = normalizeUsage(input.usage);
  if (usage.total_tokens <= 0) {
    return { charged: false, usage, reason: "zero" };
  }

  const res = await prisma.$transaction(async (tx) => {
    const existing = await tx.manusChatCharge.findUnique({
      where: {
        manusSessionId_eventId: {
          manusSessionId: input.manusSessionId,
          eventId: input.eventId
        }
      }
    });
    if (existing) {
      return { charged: false as const, usage, reason: "duplicate" as const };
    }

    const updated = await tx.user.updateMany({
      where: { id: input.userId, tokenBalance: { gte: usage.total_tokens } },
      data: { tokenBalance: { decrement: usage.total_tokens } }
    });
    if (updated.count === 0) {
      return { charged: false as const, usage, reason: "insufficient_balance" as const };
    }

    await tx.manusChatCharge.create({
      data: {
        userId: input.userId,
        manusSessionId: input.manusSessionId,
        eventId: input.eventId,
        model: input.model,
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens
      }
    });

    await tx.tokenUsageLog.create({
      data: {
        userId: input.userId,
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens,
        model: input.model
      }
    });

    return { charged: true as const, usage };
  });

  return res;
}
