import { Analytics, type AnalyticsRecentItem } from "@/components/dashboard/analytics";
import { PageTransition } from "@/components/page-transition";
import { getSafeServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

export default async function AnalyticsPage() {
  const session = await getSafeServerSession();
  const email = session?.user?.email;
  if (!email) {
    return null;
  }

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

  const chartData = buckets.map((b) => ({
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

  const recent: AnalyticsRecentItem[] = recentRows.map((r) => ({
    id: r.id,
    model: r.model,
    totalTokens: r.totalTokens,
    createdAt: r.createdAt.toISOString()
  }));

  return (
    <PageTransition>
      <Analytics
        chartData={chartData}
        recentGenerations={recent}
        statValues={{
          requests: reqCount,
          tokens: sumTotal,
          avgTokensPerRequest: avgPerRequest,
          completionSharePercent: completionPct
        }}
      />
    </PageTransition>
  );
}
