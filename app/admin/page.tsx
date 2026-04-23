import { redirect } from "next/navigation";

import { addTokensAction, setPartnerAction, setPlanAction } from "@/app/admin/actions";
import { getTokenSpendLast30Days, listAdminUsers } from "@/lib/admin-service";
import { requireAdminUser } from "@/lib/auth-guards";
import { PageTransition } from "@/components/page-transition";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default async function AdminPage() {
  const guard = await requireAdminUser();
  if (!guard.ok) {
    redirect(guard.status === 401 ? "/login" : "/playground");
  }

  const users = await listAdminUsers();
  const spend = await getTokenSpendLast30Days();

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
                    <th className="p-3">Партнёр</th>
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
                      <td className="p-3 text-zinc-300">
                        {u.plan === "BUSINESS" ? "TEAM (legacy: BUSINESS в БД)" : u.plan}
                      </td>
                      <td className="p-3 text-zinc-300">{u.tokenBalance}</td>
                      <td className="p-3 text-zinc-300">{u.tokenLimit}</td>
                      <td className="p-3 text-zinc-300">
                        {u.isPartner ? (
                          <span className="rounded-full border border-emerald-400/40 bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-200">
                            Партнёр
                          </span>
                        ) : (
                          <span className="rounded-full border border-white/20 bg-white/5 px-2 py-0.5 text-xs text-zinc-400">
                            Нет
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-2">
                          <form action={addTokensAction} className="flex items-center gap-2">
                            <input type="hidden" name="userId" value={u.id} />
                            <Input name="amount" placeholder="+ токены" className="h-9 w-28 rounded-xl" />
                            <Button size="sm" variant="outline" type="submit">
                              Пополнить
                            </Button>
                          </form>

                          <form action={setPlanAction} className="flex items-center gap-2">
                            <input type="hidden" name="userId" value={u.id} />
                            <select
                              name="plan"
                              defaultValue={u.plan === "BUSINESS" ? "TEAM" : u.plan}
                              className="h-9 rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white"
                            >
                              <option value="FREE">FREE (Starter)</option>
                              <option value="PRO">PRO</option>
                              <option value="TEAM">TEAM (ранее BUSINESS)</option>
                            </select>
                            <Button size="sm" type="submit">
                              Назначить
                            </Button>
                          </form>

                          <form action={setPartnerAction} className="flex items-center gap-2">
                            <input type="hidden" name="userId" value={u.id} />
                            <input type="hidden" name="isPartner" value={u.isPartner ? "false" : "true"} />
                            <Button size="sm" variant="secondary" type="submit">
                              {u.isPartner ? "Снять партнёра" : "Сделать партнёром"}
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

