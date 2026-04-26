import { redirect } from "next/navigation";

import { TariffsEditor } from "@/components/admin/tariffs-editor";
import { requireAdminUser } from "@/lib/auth-guards";

export default async function AdminTariffsPage() {
  const g = await requireAdminUser();
  if (!g.ok) {
    redirect(g.status === 401 ? "/login" : "/admin/users");
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-white">Тарифы платформы</h1>
        <p className="text-sm text-zinc-400">
          Месячные лимиты токенов и флаги применяются к новым пересчётам (назначение плана,
          getEffectiveMonthlyAllowance). Тексты на лендинге /plans при необходимости обновите вручную
          (i18n) или согласуйте с маркетингом.
        </p>
      </div>
      <TariffsEditor />
    </div>
  );
}
