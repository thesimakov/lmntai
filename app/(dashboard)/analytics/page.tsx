import { getServerSession } from "next-auth";

import { Analytics } from "@/components/dashboard/analytics";
import { PageTransition } from "@/components/page-transition";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function last7Days() {
  const days: { day: string; date: Date }[] = [];
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const label = d.toLocaleDateString("ru-RU", { weekday: "short" });
    days.push({ day: label, date: d });
  }
  return days;
}

export default async function AnalyticsPage() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) {
    return null;
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return null;

  const totalTokens = await prisma.tokenUsageLog.aggregate({
    where: { userId: user.id },
    _sum: { totalTokens: true },
  });

  const days = last7Days();
  const start = new Date(days[0].date);
  start.setHours(0, 0, 0, 0);

  const logs = await prisma.tokenUsageLog.findMany({
    where: { userId: user.id, createdAt: { gte: start } },
    select: { createdAt: true },
  });

  const byDay = new Map<string, number>();
  for (const item of logs) {
    const key = item.createdAt.toLocaleDateString("ru-RU", { weekday: "short" });
    byDay.set(key, (byDay.get(key) ?? 0) + 1);
  }

  const chartData = days.map((d) => ({ name: d.day, projects: byDay.get(d.day) ?? 0 }));

  return (
    <PageTransition>
      <Analytics
        chartData={chartData}
        statValues={{
          projects: logs.length,
          tokens: totalTokens._sum.totalTokens ?? 0,
          time: "—",
          efficiency: "—",
        }}
      />
    </PageTransition>
  );
}
