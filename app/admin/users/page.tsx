import { redirect } from "next/navigation";

import {
  addTokensAction,
  createUserAction,
  deleteUserAction,
  setPartnerAction
} from "@/app/admin/actions";
import { AdminUserPlanForm } from "@/components/admin/admin-user-plan-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getTokenSpendLast30Days, listAdminUsers } from "@/lib/admin-service";
import { requireStaffPermission } from "@/lib/auth-guards";
import { normalizePlanId } from "@/lib/plan-config";
import { canAccessStaff, parsePermissionList, type StaffPermission } from "@/lib/staff-permissions";
import { USER_VIRTUAL_STORAGE_LIMIT_BYTES } from "@/lib/user-virtual-storage";

function canDo(user: { role: string; adminPermissions: unknown }, perm: StaffPermission) {
  return canAccessStaff(
    user.role,
    user.role === "MANAGER" ? parsePermissionList(user.adminPermissions) : null,
    perm,
    false
  );
}

function formatStorage(used: bigint | null | undefined, limit: bigint | null | undefined) {
  const usedValue = Number(used ?? 0n);
  const limitValue = Number(limit ?? USER_VIRTUAL_STORAGE_LIMIT_BYTES);
  const usedMb = (usedValue / (1024 * 1024)).toFixed(1);
  const limitMb = (limitValue / (1024 * 1024)).toFixed(0);
  return `${usedMb} / ${limitMb} MB`;
}

export default async function AdminUsersPage() {
  const g = await requireStaffPermission("users.read");
  if (!g.ok) {
    redirect(g.status === 401 ? "/login" : "/playground");
  }
  const { user: me } = g.data;
  const canWrite = canDo(me, "users.write");
  const canDelete = canDo(me, "users.delete");

  const users = await listAdminUsers();
  const spend = await getTokenSpendLast30Days();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Пользователи</h1>
        <p className="text-sm text-muted-foreground">Email, баланс, план, виртуальная папка (1 GiB), действия. Расход токенов за 30 дн.:{" "}
          <span className="text-foreground">{spend._sum.totalTokens ?? 0}</span>
        </p>
      </div>

      {canWrite ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Добавить пользователя</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createUserAction} className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              <Input name="email" type="email" required placeholder="email" />
              <Input name="password" type="password" required minLength={8} placeholder="Пароль" />
              <Input name="name" placeholder="Имя" />
              <select
                name="plan"
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                defaultValue="FREE"
              >
                <option value="FREE">FREE</option>
                <option value="PRO">PRO</option>
                <option value="TEAM">TEAM</option>
              </select>
              <select
                name="role"
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                defaultValue="USER"
              >
                <option value="USER">Пользователь</option>
                {me.role === "ADMIN" ? <option value="ADMIN">Администратор</option> : null}
              </select>
              <Input
                name="tokenBalance"
                type="number"
                min={0}
                defaultValue={10_000}
                placeholder="Баланс токенов"
              />
              <div className="md:col-span-2">
                <Button type="submit">Создать</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Список</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead className="bg-muted/50 text-left text-muted-foreground">
                <tr>
                  <th className="p-2">Email</th>
                  <th className="p-2">План</th>
                  <th className="p-2">Баланс</th>
                  <th className="p-2">Лимит</th>
                  <th className="p-2">Вирт.папка</th>
                  <th className="p-2">Партнёр</th>
                  <th className="p-2">Действия</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-t border-border">
                    <td className="p-2 text-foreground">
                      {u.email}{" "}
                      {u.role === "ADMIN" ? (
                        <span className="ml-1 rounded border border-primary/30 bg-primary/10 px-1.5 text-xs font-medium text-primary">
                          ADMIN
                        </span>
                      ) : null}
                      {u.role === "MANAGER" ? (
                        <span className="ml-1 rounded border border-amber-300 bg-amber-50 px-1.5 text-xs font-medium text-amber-900">
                          MANAGER
                        </span>
                      ) : null}
                    </td>
                    <td className="p-2 text-muted-foreground">{normalizePlanId(u.plan)}</td>
                    <td className="p-2 text-muted-foreground">{u.tokenBalance}</td>
                    <td className="p-2 text-muted-foreground">{u.tokenLimit}</td>
                    <td className="p-2 text-muted-foreground">
                      {formatStorage(u.virtualWorkspace?.usedBytes, u.virtualWorkspace?.limitBytes)}
                    </td>
                    <td className="p-2 text-muted-foreground">
                      {u.isPartner ? (
                        <span className="rounded border border-emerald-200 bg-emerald-50 px-1.5 text-xs text-emerald-900">да</span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="p-2">
                      <div className="flex flex-wrap items-center gap-2">
                        {canWrite ? (
                          <>
                            <form action={addTokensAction} className="flex items-center gap-1">
                              <input type="hidden" name="userId" value={u.id} />
                              <Input name="amount" className="h-8 w-20" placeholder="+" />
                              <Button size="sm" type="submit" variant="secondary">
                                +токены
                              </Button>
                            </form>
                            <AdminUserPlanForm
                              key={`${u.id}-${normalizePlanId(u.plan)}`}
                              userId={u.id}
                              plan={u.plan}
                            />
                            <form action={setPartnerAction} className="flex items-center gap-1">
                              <input type="hidden" name="userId" value={u.id} />
                              <input type="hidden" name="isPartner" value={u.isPartner ? "false" : "true"} />
                              <Button size="sm" type="submit" variant="ghost">
                                {u.isPartner ? "снять партн." : "партнёр"}
                              </Button>
                            </form>
                          </>
                        ) : null}
                        {canDelete && u.id !== me.id ? (
                          <form action={deleteUserAction} className="inline">
                            <input type="hidden" name="userId" value={u.id} />
                            <Button size="sm" type="submit" variant="destructive">
                              Удалить
                            </Button>
                          </form>
                        ) : null}
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
  );
}
