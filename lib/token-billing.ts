import { normalizePlanId } from "@/lib/plan-config";
import { prisma } from "@/lib/prisma";
import { fetchUserStarterPaidUntilById } from "@/lib/user-starter-paid-until-raw";
import { ensurePaidPlanCalendarMonthCredits } from "@/lib/token-monthly-rollover";
import {
  isStarterCabinetBlocked,
  starterDailyTokenCap,
  startOfLocalCalendarDay,
  type StarterCabinetGateUser,
} from "@/lib/starter-plan";

export type TokenUsage = {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
};

export type ChargeResult =
  | { ok: true; charged: true; usage: TokenUsage }
  | { ok: true; charged: false; usage: TokenUsage; reason: "zero" }
  | { ok: true; charged: false; usage: TokenUsage; reason: "insufficient_balance"; balance: number };

function positiveInt(value: number) {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.floor(value);
}

export function normalizeUsage(usage: Partial<TokenUsage> | null | undefined): TokenUsage {
  const prompt = positiveInt(usage?.prompt_tokens ?? 0);
  const completion = positiveInt(usage?.completion_tokens ?? 0);
  const totalRaw = positiveInt(usage?.total_tokens ?? 0);
  const total = totalRaw > 0 ? totalRaw : prompt + completion;
  return {
    prompt_tokens: prompt,
    completion_tokens: completion,
    total_tokens: total
  };
}

export function estimateUsageFromText(prompt: string, completion: string): TokenUsage {
  // Консервативная оценка: ~4 символа на токен.
  const promptTokens = Math.max(1, Math.ceil(prompt.length / 4));
  const completionTokens = Math.max(1, Math.ceil(completion.length / 4));
  return {
    prompt_tokens: promptTokens,
    completion_tokens: completionTokens,
    total_tokens: promptTokens + completionTokens
  };
}

export async function chargeTokensSafely(input: {
  userId: string;
  projectId?: string;
  usage: Partial<TokenUsage> | null | undefined;
  model: string;
}): Promise<ChargeResult> {
  const usage = normalizeUsage(input.usage);
  if (usage.total_tokens <= 0) {
    return { ok: true, charged: false, usage, reason: "zero" };
  }

  const picked = await prisma.user.findUnique({
    where: { id: input.userId },
    select: {
      role: true,
      tokenBalance: true,
      plan: true,
      createdAt: true,
    }
  });

  let roleRow: (StarterCabinetGateUser & { tokenBalance: number }) | null = picked
    ? {
        ...picked,
        starterPaidUntil: await fetchUserStarterPaidUntilById(input.userId),
      }
    : null;

  const planEarly = normalizePlanId(roleRow?.plan ?? "FREE");
  if (
    roleRow &&
    roleRow.role !== "ADMIN" &&
    (planEarly === "PRO" || planEarly === "TEAM")
  ) {
    await ensurePaidPlanCalendarMonthCredits(input.userId);
    const bal = await prisma.user.findUnique({
      where: { id: input.userId },
      select: { tokenBalance: true },
    });
    roleRow = { ...roleRow, tokenBalance: bal?.tokenBalance ?? roleRow.tokenBalance };
  }
  if (roleRow?.role === "ADMIN") {
    await prisma.tokenUsageLog.create({
      data: {
        userId: input.userId,
        projectId: input.projectId ?? null,
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens,
        model: input.model
      }
    });
    return { ok: true, charged: true, usage } as const;
  }

  const planGate = normalizePlanId(roleRow?.plan ?? "FREE");
  if (planGate === "FREE" && roleRow) {
    const gateUser = roleRow;
    if (isStarterCabinetBlocked(gateUser)) {
      return {
        ok: true,
        charged: false,
        usage,
        reason: "insufficient_balance",
        balance: typeof roleRow.tokenBalance === "number" ? roleRow.tokenBalance : 0,
      };
    }

    const result = await prisma.$transaction(async (tx) => {
      const gate = gateUser;
      const cap = starterDailyTokenCap(gate);
      const startDay = startOfLocalCalendarDay();
      const agg = await tx.tokenUsageLog.aggregate({
        where: { userId: input.userId, createdAt: { gte: startDay } },
        _sum: { totalTokens: true },
      });
      const usedToday = agg._sum.totalTokens ?? 0;
      if (usedToday + usage.total_tokens > cap) {
        const balance = Math.max(0, cap - usedToday);
        return { ok: true, charged: false, usage, reason: "insufficient_balance", balance } as const;
      }
      await tx.tokenUsageLog.create({
        data: {
          userId: input.userId,
          projectId: input.projectId ?? null,
          promptTokens: usage.prompt_tokens,
          completionTokens: usage.completion_tokens,
          totalTokens: usage.total_tokens,
          model: input.model,
        },
      });
      const newUsed = usedToday + usage.total_tokens;
      await tx.user.update({
        where: { id: input.userId },
        data: {
          tokenBalance: Math.max(0, cap - newUsed),
          tokenLimit: cap,
        },
      });
      return { ok: true, charged: true, usage } as const;
    });

    return result;
  }

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.user.updateMany({
      where: { id: input.userId, tokenBalance: { gte: usage.total_tokens } },
      data: { tokenBalance: { decrement: usage.total_tokens } }
    });
    if (updated.count === 0) {
      const row = await tx.user.findUnique({
        where: { id: input.userId },
        select: { tokenBalance: true }
      });
      const balance = typeof row?.tokenBalance === "number" ? row.tokenBalance : 0;
      return { ok: true, charged: false, usage, reason: "insufficient_balance", balance } as const;
    }
    await tx.tokenUsageLog.create({
      data: {
        userId: input.userId,
        projectId: input.projectId ?? null,
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens,
        model: input.model
      }
    });
    return { ok: true, charged: true, usage } as const;
  });

  return result;
}
