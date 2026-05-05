import { redirect } from "next/navigation";

import { createManagerAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { listManagerUsers } from "@/lib/admin-service";
import { requireAdminUser } from "@/lib/auth-guards";
import { STAFF_PERMISSIONS, STAFF_PERMISSION_KEYS } from "@/lib/staff-permissions";

export default async function AdminTeamPage() {
  const g = await requireAdminUser();
  if (!g.ok) {
    redirect(g.status === 401 ? "/" : "/admin/users");
  }

  const managers = await listManagerUsers();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Команда</h1>
        <p className="text-sm text-muted-foreground">Менеджеры с ограниченными правами. Супер-админ (роль ADMIN) видит разделы «Тарифы» и «Команда».</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">О правах</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          {STAFF_PERMISSION_KEYS.map((k) => (
            <p key={k}>
              <span className="font-mono text-primary">{k}</span> — {STAFF_PERMISSIONS[k]}
            </p>
          ))}
          <p className="pt-2 text-muted-foreground/80">
            Супер-администратор (ADMIN) обходит эти флаги и может всё, включая правку платформенных
            тарифов и приглашение менеджеров. Менеджер (MANAGER) не списывает токены как безлимитный
            супер-админ — у менеджера обычный баланс для проверок интерфейса.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Добавить менеджера</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createManagerAction} className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <Input name="email" type="email" required placeholder="Email" />
              <Input name="password" type="password" required minLength={8} placeholder="Пароль" />
              <Input name="name" placeholder="Имя" />
            </div>
            <p className="text-xs text-muted-foreground">Права:</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {STAFF_PERMISSION_KEYS.map((k) => (
                <label key={k} className="flex items-start gap-2 text-sm text-foreground">
                  <input type="checkbox" name="perm" value={k} className="mt-1" />
                  <span>
                    <span className="font-mono text-xs text-primary">{k}</span>
                    <br />
                    <span className="text-muted-foreground">{STAFF_PERMISSIONS[k]}</span>
                  </span>
                </label>
              ))}
            </div>
            <Button type="submit">Создать менеджера</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Текущие менеджеры</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-foreground">
            {managers.length === 0 ? <li className="text-muted-foreground">Пока нет записей</li> : null}
            {managers.map((m) => (
              <li key={m.id} className="rounded-lg border border-border bg-muted/30 p-3">
                <p className="font-medium text-foreground">{m.email}</p>
                <p className="text-xs text-muted-foreground">
                  {m.name} · {new Date(m.createdAt).toLocaleString("ru-RU")}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Права: {JSON.stringify(m.adminPermissions)}
                </p>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
