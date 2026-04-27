import { Prisma } from "@prisma/client";

import { Analytics, type AnalyticsRecentItem } from "@/components/dashboard/analytics";
import { PageTransition } from "@/components/page-transition";
import { getSafeServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAuthDatabaseUserMessage } from "@/lib/prisma-auth-errors";

/** Ключ дня в локальном часовом поясе сервера (корзины графика). */
function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** 7 дней: подписи дня недели (коротко) + дата-метка для ведра. */
function buildLast7DayBuckets() {
  const out: { label: string; key: string }[] = [];
  for (let i = 6; i >= 0; i -= 1) {
    const s = new Date();
    s.setHours(0, 0, 0, 0);
    s.setDate(s.getDate() - i);
    out.push({
      label: s.toLocaleDateString("ru-RU", { weekday: "short" }),
      key: localDateKey(s)
    });
  }
  return out;
}

function analyticsLoadErrorMessage(err: unknown): string {
  const fromAuth = getAuthDatabaseUserMessage(err);
  if (fromAuth) return fromAuth;
  if (err instanceof Prisma.PrismaClientInitializationError) {
    return "База данных недоступна. В корне проекта: npm run db:up (или docker compose up -d db), затем при необходимости npm run db:migrate.";
  }
  if (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    (err.code === "P1000" || err.code === "P1001" || err.code === "P1017")
  ) {
    return "База данных недоступна. Убедитесь, что PostgreSQL запущен (порт в DATABASE_URL, локально обычно 5433).";
  }
  return "Не удалось загрузить аналитику. Проверьте подключение к PostgreSQL и переменную DATABASE_URL.";
}

export default async function AnalyticsPage() {
  const session = await getSafeServerSession();
  const email = session?.user?.email;
  if (!email) {
    return null;
  }

  let chartData: { name: string; tokens: number }[];
  let recent: AnalyticsRecentItem[];
  let statValues: {
    requests: number;
    tokens: number;
    avgTokensPerRequest: number;
    completionSharePercent: number;
  };

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return null;
    }

    const now = new Date();
    const thirtyAgo = new Date(now);
    thirtyAgo.setDate(thirtyAgo.getDate() - 30);

    const buckets = buildLast7DayBuckets();
    const weekStart = new Date();
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(weekStart.getDate() - 6);

    const [agg30, logsWeek, recentRows] = await Promise.all([
      prisma.tokenUsageLog.aggregate({
        where: { userId: user.id, createdAt: { gte: thirtyAgo } },
        _count: { id: true },
        _sum: { totalTokens: true, promptTokens: true, completionTokens: true }
      }),
      prisma.tokenUsageLog.findMany({
        where: { userId: user.id, createdAt: { gte: weekStart } },
        select: { totalTokens: true, createdAt: true }
      }),
      prisma.tokenUsageLog.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, model: true, totalTokens: true, createdAt: true }
      })
    ]);

    const byDay = new Map<string, number>();
    for (const log of logsWeek) {
      const k = localDateKey(new Date(log.createdAt));
      byDay.set(k, (byDay.get(k) ?? 0) + log.totalTokens);
    }

    chartData = buckets.map((b) => ({
      name: b.label,
      tokens: byDay.get(b.key) ?? 0
    }));

    const reqCount = agg30._count.id;
    const sumTotal = agg30._sum.totalTokens ?? 0;
    const sumPrompt = agg30._sum.promptTokens ?? 0;
    const sumComp = agg30._sum.completionTokens ?? 0;

    const avgPerRequest = reqCount > 0 ? Math.round(sumTotal / reqCount) : 0;
    const totalTC = sumPrompt + sumComp;
    const completionPct =
      totalTC > 0 ? Math.min(100, Math.round((100 * sumComp) / totalTC)) : 0;

    recent = recentRows.map((r) => ({
      id: r.id,
      model: r.model,
      totalTokens: r.totalTokens,
      createdAt: r.createdAt.toISOString()
    }));

    statValues = {
      requests: reqCount,
      tokens: sumTotal,
      avgTokensPerRequest: avgPerRequest,
      completionSharePercent: completionPct
    };
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.error("[analytics] database error:", err);
    }
    return (
      <PageTransition>
        <div className="mx-auto max-w-lg rounded-2xl border border-amber-500/30 bg-amber-500/[0.06] p-6 text-sm">
          <h2 className="text-base font-semibold text-foreground">Аналитика недоступна</h2>
          <p className="mt-2 whitespace-pre-wrap text-muted-foreground">{analyticsLoadErrorMessage(err)}</p>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <Analytics
        chartData={chartData}
        recentGenerations={recent}
        statValues={statValues}
      />
    </PageTransition>
  );
}
