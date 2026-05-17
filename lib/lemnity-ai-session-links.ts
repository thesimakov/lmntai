import { prisma } from "@/lib/prisma";
import { upsertProjectCell } from "@/lib/project-context";
import { normalizeUsage, type TokenUsage } from "@/lib/token-billing";

export type LemnityAiSessionListItem = {
  project_id: string;
  session_id: string;
  title?: string | null;
  latest_message?: string | null;
  latest_message_at?: number | null;
  status?: string | null;
  unread_message_count?: number | null;
  is_shared?: boolean | null;
  created_at?: string | null;
  preview_artifact_id?: string | null;
};

function toDateFromUnix(value: number | null | undefined): Date | null {
  if (!value || !Number.isFinite(value) || value <= 0) return null;
  return new Date(value * 1000);
}

export function asLemnityAiListItem(link: {
  projectId: string;
  manusSessionId: string;
  title: string | null;
  latestMessage: string | null;
  latestMessageAt: Date | null;
  status: string;
  unreadMessageCount: number;
  isShared: boolean;
  createdAt: Date;
  previewArtifactId: string | null;
}): LemnityAiSessionListItem {
  return {
    project_id: link.projectId,
    session_id: link.manusSessionId,
    title: link.title ?? null,
    latest_message: link.latestMessage ?? null,
    latest_message_at: link.latestMessageAt ? Math.floor(link.latestMessageAt.getTime() / 1000) : null,
    status: link.status,
    unread_message_count: link.unreadMessageCount,
    is_shared: link.isShared,
    created_at: link.createdAt.toISOString(),
    preview_artifact_id: link.previewArtifactId
  };
}

/**
 * Связывает upstream-сессию с пользователем.
 * Если передан `hostProjectId` (реальный `Project.id` из дашборда), связь попадает в ту же строку —
 * превью `/api/sandbox/{projectId}` и `previewArtifactId` совпадают с проектом в билдере.
 */
export async function createLemnityAiSessionLink(
  userId: string,
  upstreamSessionId: string,
  opts?: { hostProjectId?: string | null }
) {
  const hostPid = opts?.hostProjectId?.trim() || "";

  const existingByManus = await prisma.manusSessionLink.findUnique({
    where: { manusSessionId: upstreamSessionId }
  });
  if (existingByManus) {
    if (existingByManus.userId !== userId) {
      throw new Error("LEMNITY_AI_SESSION_ALREADY_OWNED");
    }
    return existingByManus;
  }

  if (hostPid) {
    await prisma.manusSessionLink.deleteMany({
      where: { userId, projectId: hostPid }
    });
  } else {
    try {
      await upsertProjectCell({
        projectId: upstreamSessionId,
        ownerId: userId,
        name: "Lemnity AI Session"
      });
    } catch (error) {
      if (error instanceof Error && error.message === "PROJECT_OWNERSHIP_CONFLICT") {
        throw new Error("LEMNITY_AI_SESSION_ALREADY_OWNED");
      }
      throw error;
    }
  }

  return prisma.manusSessionLink.create({
    data: {
      projectId: hostPid || upstreamSessionId,
      userId,
      manusSessionId: upstreamSessionId
    }
  });
}

export async function listLemnityAiSessionsForUser(userId: string) {
  const rows = await prisma.manusSessionLink.findMany({
    where: { userId },
    orderBy: [{ updatedAt: "desc" }]
  });
  return rows.map(asLemnityAiListItem);
}

/** Одна привязка Lemnity AI ↔ Project (ManusSessionLink.projectId = Project.id). */
export async function listLemnityAiSessionsForProject(userId: string, projectId: string) {
  const row = await prisma.manusSessionLink.findFirst({
    where: { userId, projectId }
  });
  return row ? [asLemnityAiListItem(row)] : [];
}

export async function getLemnityAiSessionForUser(userId: string, upstreamSessionId: string) {
  return prisma.manusSessionLink.findFirst({
    where: { userId, manusSessionId: upstreamSessionId }
  });
}

export async function ensureLemnityAiSessionOwnership(userId: string, upstreamSessionId: string) {
  const access = await resolveLemnityAiSessionAccess(userId, upstreamSessionId);
  if (!access) {
    throw new Error("LEMNITY_AI_SESSION_NOT_FOUND");
  }
  return access.link;
}

/**
 * Разрешает доступ к сессии моста по id из URL (manusSessionId) или по projectId дашборда.
 * На кастомном домене middleware задаёт x-project-id опубликованного проекта, а путь — upstream session id.
 */
export async function resolveLemnityAiSessionAccess(
  userId: string,
  pathSessionId: string,
  headerProjectId?: string
): Promise<{ link: NonNullable<Awaited<ReturnType<typeof getLemnityAiSessionForUser>>>; upstreamSessionId: string } | null> {
  const pathId = pathSessionId.trim();
  if (!pathId) return null;

  const headerId = headerProjectId?.trim() || "";

  let link = await getLemnityAiSessionForUser(userId, pathId);
  if (link) {
    return { link, upstreamSessionId: link.manusSessionId };
  }

  link = await prisma.manusSessionLink.findFirst({
    where: { userId, projectId: pathId }
  });
  if (link) {
    return { link, upstreamSessionId: link.manusSessionId };
  }

  if (headerId && headerId !== pathId) {
    link = await prisma.manusSessionLink.findFirst({
      where: { userId, projectId: headerId, manusSessionId: pathId }
    });
    if (link) {
      return { link, upstreamSessionId: link.manusSessionId };
    }
    link = await prisma.manusSessionLink.findFirst({
      where: { userId, projectId: headerId }
    });
    if (link && (link.manusSessionId === pathId || link.projectId === pathId)) {
      return { link, upstreamSessionId: link.manusSessionId };
    }

    const ownedHeader = await prisma.project.findFirst({
      where: { id: headerId, ownerId: userId },
      select: { id: true }
    });
    if (ownedHeader) {
      try {
        link = await createLemnityAiSessionLink(userId, pathId, { hostProjectId: ownedHeader.id });
        return { link, upstreamSessionId: link.manusSessionId };
      } catch (error) {
        if (error instanceof Error && error.message === "LEMNITY_AI_SESSION_ALREADY_OWNED") {
          link = await getLemnityAiSessionForUser(userId, pathId);
          if (link) {
            return { link, upstreamSessionId: link.manusSessionId };
          }
        }
        throw error;
      }
    }
  }

  const ownedProject = await prisma.project.findFirst({
    where: { id: pathId, ownerId: userId },
    select: { id: true }
  });
  if (ownedProject) {
    try {
      link = await createLemnityAiSessionLink(userId, pathId, { hostProjectId: ownedProject.id });
      return { link, upstreamSessionId: link.manusSessionId };
    } catch (error) {
      if (error instanceof Error && error.message === "LEMNITY_AI_SESSION_ALREADY_OWNED") {
        link = await getLemnityAiSessionForUser(userId, pathId);
        if (link) {
          return { link, upstreamSessionId: link.manusSessionId };
        }
      }
      throw error;
    }
  }

  return null;
}

export function lemnityAiUpstreamPathForSession(
  path: string[],
  effectiveUpstreamSessionId: string
): string {
  if (path[0] === "sessions" && path.length >= 2 && path[1] !== effectiveUpstreamSessionId) {
    return `/${["sessions", effectiveUpstreamSessionId, ...path.slice(2)].join("/")}`;
  }
  return `/${path.join("/")}`;
}

/** HTML-артефакт превью (artifact_…) должен совпадать с привязкой сессии пользователя. */
export async function ensureUserCanEditLemnityArtifact(userId: string, artifactId: string) {
  if (!artifactId.startsWith("artifact_")) {
    throw new Error("LEMNITY_AI_ARTIFACT_INVALID");
  }
  const row = await prisma.manusSessionLink.findFirst({
    where: { userId, previewArtifactId: artifactId }
  });
  if (!row) {
    throw new Error("LEMNITY_AI_ARTIFACT_FORBIDDEN");
  }
  return row;
}

export async function deleteLemnityAiSessionForUser(userId: string, upstreamSessionId: string) {
  const { count } = await prisma.manusSessionLink.deleteMany({
    where: { userId, manusSessionId: upstreamSessionId }
  });
  return count;
}

export async function syncLemnityAiSessionSummary(input: {
  userId: string;
  upstreamSessionId: string;
  title?: string | null;
  latestMessage?: string | null;
  latestMessageAt?: number | Date | null;
  status?: string | null;
  unreadMessageCount?: number | null;
  isShared?: boolean | null;
  previewArtifactId?: string | null;
}) {
  const latestAt =
    input.latestMessageAt instanceof Date
      ? input.latestMessageAt
      : typeof input.latestMessageAt === "number"
        ? toDateFromUnix(input.latestMessageAt)
        : null;

  const previewArtifactId =
    typeof input.previewArtifactId === "string" && input.previewArtifactId.trim()
      ? input.previewArtifactId.trim()
      : undefined;

  const existingLink = await prisma.manusSessionLink.findUnique({
    where: { manusSessionId: input.upstreamSessionId }
  });
  const dashboardLinked =
    Boolean(existingLink && existingLink.projectId !== input.upstreamSessionId);

  if (!dashboardLinked) {
    try {
      await upsertProjectCell({
        projectId: input.upstreamSessionId,
        ownerId: input.userId,
        name: input.title?.trim() || "Lemnity AI Session"
      });
    } catch (error) {
      if (error instanceof Error && error.message === "PROJECT_OWNERSHIP_CONFLICT") {
        throw new Error("LEMNITY_AI_SESSION_ALREADY_OWNED");
      }
      throw error;
    }
  }

  await prisma.manusSessionLink.upsert({
    where: { manusSessionId: input.upstreamSessionId },
    update: {
      userId: input.userId,
      title: input.title ?? undefined,
      latestMessage: input.latestMessage ?? undefined,
      latestMessageAt: latestAt ?? undefined,
      status: input.status ?? undefined,
      unreadMessageCount:
        typeof input.unreadMessageCount === "number" ? Math.max(0, Math.floor(input.unreadMessageCount)) : undefined,
      isShared: typeof input.isShared === "boolean" ? input.isShared : undefined,
      ...(previewArtifactId !== undefined ? { previewArtifactId } : {})
    },
    create: {
      projectId: input.upstreamSessionId,
      userId: input.userId,
      manusSessionId: input.upstreamSessionId,
      title: input.title ?? null,
      latestMessage: input.latestMessage ?? null,
      latestMessageAt: latestAt ?? null,
      status: input.status ?? "pending",
      unreadMessageCount:
        typeof input.unreadMessageCount === "number" ? Math.max(0, Math.floor(input.unreadMessageCount)) : 0,
      isShared: Boolean(input.isShared),
      previewArtifactId: previewArtifactId ?? null
    }
  });
}

export async function chargeLemnityAiChatUsage(input: {
  projectId: string;
  userId: string;
  upstreamSessionId: string;
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
        projectId_eventId: {
          projectId: input.projectId,
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
        projectId: input.projectId,
        userId: input.userId,
        manusSessionId: input.upstreamSessionId,
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
        projectId: input.projectId,
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
