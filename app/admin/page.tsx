import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { PageTransition } from "@/components/page-transition";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Plan } from "@/lib/token-manager";

async function isAdmin(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  return user?.role === "ADMIN";
}

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) redirect("/login");

  const allowed = await isAdmin(email);
  if (!allowed) redirect("/playground");

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      name: true,
      plan: true,
      role: true,
      tokenBalance: true,
      tokenLimit: true
    }
  });

  const last30 = new Date();
  last30.setDate(last30.getDate() - 30);
  const spend = await prisma.tokenUsageLog.aggregate({
    where: { createdAt: { gte: last30 } },
    _sum: { totalTokens: true }
  });

  return (
    <PageTransition>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold">Админ-панель</h1>
          <p className="text-sm text-zinc-400">Управление тарифами и балансами токенов.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Статистика</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-zinc-300">
            Расход токенов за 30 дней: <span className="text-white">{spend._sum.totalTokens ?? 0}</span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Пользователи</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-2xl border border-white/10">
              <table className="w-full text-sm">
                <thead className="bg-white/5 text-left text-zinc-400">
                  <tr>
                    <th className="p-3">Email</th>
                    <th className="p-3">План</th>
                    <th className="p-3">Баланс</th>
                    <th className="p-3">Лимит</th>
                    <th className="p-3">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-t border-white/10">
                      <td className="p-3 text-zinc-200">
                        {u.email}{" "}
                        {u.role === "ADMIN" ? (
                          <span className="ml-2 rounded-full border border-fuchsia-400/40 bg-fuchsia-500/15 px-2 py-0.5 text-xs text-fuchsia-200">
                            ADMIN
                          </span>
                        ) : null}
                      </td>
                      <td className="p-3 text-zinc-300">{u.plan}</td>
                      <td className="p-3 text-zinc-300">{u.tokenBalance}</td>
                      <td className="p-3 text-zinc-300">{u.tokenLimit}</td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-2">
                          <form
                            action={async (formData) => {
                              "use server";
                              const amount = Number(formData.get("amount") ?? 0);
                              if (!Number.isFinite(amount) || amount <= 0) return;
                              await prisma.user.update({
                                where: { id: u.id },
                                data: { tokenBalance: { increment: amount } }
                              });
                            }}
                            className="flex items-center gap-2"
                          >
                            <Input name="amount" placeholder="+ токены" className="h-9 w-28 rounded-xl" />
                            <Button size="sm" variant="outline" type="submit">
                              Пополнить
                            </Button>
                          </form>

                          <form
                            action={async (formData) => {
                              "use server";
                              const plan = String(formData.get("plan") ?? "") as Plan;
                              if (!["FREE", "PRO", "BUSINESS"].includes(plan)) return;
                              const limit = plan === "FREE" ? 20_000 : plan === "PRO" ? 300_000 : 2_000_000;
                              await prisma.user.update({
                                where: { id: u.id },
                                data: { plan, tokenLimit: limit, tokenBalance: limit }
                              });
                            }}
                            className="flex items-center gap-2"
                          >
                            <select
                              name="plan"
                              defaultValue={u.plan}
                              className="h-9 rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white"
                            >
                              <option value="FREE">FREE</option>
                              <option value="PRO">PRO</option>
                              <option value="BUSINESS">BUSINESS</option>
                            </select>
                            <Button size="sm" type="submit">
                              Назначить
                            </Button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
}

