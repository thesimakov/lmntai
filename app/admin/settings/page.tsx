import { redirect } from "next/navigation";

import { changeOwnPasswordAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { requireStaffPanel } from "@/lib/auth-guards";
import { parsePermissionList, STAFF_PERMISSIONS } from "@/lib/staff-permissions";

export default async function AdminSettingsPage() {
  const g = await requireStaffPanel();
  if (!g.ok) {
    redirect(g.status === 401 ? "/login" : "/playground");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Профиль администратора</h1>
        <p className="text-sm text-zinc-400">Смена пароля для входа (email+пароль / учётка в БД).</p>
      </div>

      <Card className="border-white/10 bg-zinc-900/60">
        <CardHeader>
          <CardTitle className="text-base text-zinc-100">Новый пароль</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={changeOwnPasswordAction} className="flex max-w-md flex-col gap-3 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1">
              <Input
                name="password"
                type="password"
                required
                minLength={8}
                placeholder="Не короче 8 символов"
                className="bg-zinc-950/50"
              />
            </div>
            <Button type="submit">Сохранить</Button>
          </form>
        </CardContent>
      </Card>

      {g.data.user.role === "MANAGER" ? (
        <Card className="border-white/10 bg-zinc-900/60">
          <CardHeader>
            <CardTitle className="text-base text-zinc-100">Ваши права</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-inside list-disc space-y-1 text-sm text-zinc-300">
              {parsePermissionList(g.data.user.adminPermissions).map((k) => {
                const label = STAFF_PERMISSIONS[k] ?? k;
                return <li key={k}>{k} — {label}</li>;
              })}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
