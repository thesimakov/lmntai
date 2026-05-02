"use client";

import { useFormStatus } from "react-dom";

import { setPlanAction } from "@/app/admin/actions";
import { normalizePlanId } from "@/lib/plan-config";

function PlanSelectField({ defaultValue }: { defaultValue: string }) {
  const { pending } = useFormStatus();
  return (
    <select
      name="plan"
      defaultValue={defaultValue}
      disabled={pending}
      onChange={(e) => {
        e.currentTarget.form?.requestSubmit();
      }}
      className="h-8 max-w-[8rem] rounded border border-input bg-background text-xs disabled:opacity-60"
    >
      <option value="FREE">FREE</option>
      <option value="PRO">PRO</option>
      <option value="TEAM">TEAM</option>
    </select>
  );
}

export function AdminUserPlanForm({ userId, plan }: { userId: string; plan: string }) {
  const value = normalizePlanId(plan);
  return (
    <form action={setPlanAction} className="flex items-center gap-1">
      <input type="hidden" name="userId" value={userId} />
      <PlanSelectField defaultValue={value} />
    </form>
  );
}
