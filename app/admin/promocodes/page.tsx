import { redirect } from "next/navigation";

import { PromoCodesEditor } from "@/components/admin/promo-codes-editor";
import { requireAdminUser } from "@/lib/auth-guards";

export default async function AdminPromoCodesPage() {
  const g = await requireAdminUser();
  if (!g.ok) {
    redirect(g.status === 401 ? "/login" : "/admin/users");
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Промокоды</h1>
        <p className="text-sm text-muted-foreground">
          Настройки копятся в БД и сразу участвуют в расчёте на странице «Тарифы» (поле «Промокод») и
          в публичном API <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm text-foreground">POST /api/promo/preview</code>.
        </p>
      </div>
      <PromoCodesEditor />
    </div>
  );
}
