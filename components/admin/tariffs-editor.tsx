"use client";

import { useCallback, useEffect, useState } from "react";

import { saveTariffsAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  PLATFORM_FEATURE_CATALOG,
  type PlatformPlanDataV1,
} from "@/lib/platform-plan-settings";
import type { PlanId } from "@/lib/plan-config";

const PLANS: PlanId[] = ["FREE", "PRO", "TEAM"];

export function TariffsEditor() {
  const [data, setData] = useState<PlatformPlanDataV1 | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setErr(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/plan-config", { method: "GET" });
      if (!res.ok) {
        setErr("Не удалось загрузить конфиг");
        return;
      }
      const j = (await res.json()) as PlatformPlanDataV1;
      setData(j);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSave() {
    if (!data) return;
    setSaving(true);
    setErr(null);
    try {
      await saveTariffsAction(data);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setSaving(false);
    }
  }

  function patchPlan(plan: PlanId, field: "monthlyTokens" | "minPromptBuilder" | "minStream" | "teamSeats", v: number) {
    if (!data) return;
    setData({
      ...data,
      plans: {
        ...data.plans,
        [plan]: {
          ...data.plans[plan],
          [field]: v
        }
      }
    });
  }

  function patchFeature(plan: PlanId, featureId: string, enabled: boolean) {
    if (!data) return;
    setData({
      ...data,
      plans: {
        ...data.plans,
        [plan]: {
          ...data.plans[plan],
          features: {
            ...data.plans[plan].features,
            [featureId]: enabled
          }
        }
      }
    });
  }

  if (loading || !data) {
    return <p className="text-sm text-zinc-400">Загрузка…</p>;
  }

  return (
    <div className="space-y-6">
      {err ? <p className="text-sm text-red-400">{err}</p> : null}
      {PLANS.map((plan) => (
        <Card key={plan} className="border-white/10 bg-zinc-900/60">
          <CardHeader>
            <CardTitle className="text-base text-fuchsia-200">Тариф {plan}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className="text-xs text-zinc-400">
                Токенов / мес
                <Input
                  type="number"
                  className="mt-1 bg-zinc-950/50"
                  value={data.plans[plan].monthlyTokens}
                  onChange={(e) => patchPlan(plan, "monthlyTokens", Number(e.target.value) || 0)}
                />
              </label>
              <label className="text-xs text-zinc-400">
                Мин. для prompt builder
                <Input
                  type="number"
                  className="mt-1 bg-zinc-950/50"
                  value={data.plans[plan].minPromptBuilder}
                  onChange={(e) => patchPlan(plan, "minPromptBuilder", Number(e.target.value) || 0)}
                />
              </label>
              <label className="text-xs text-zinc-400">
                Мин. для стрима
                <Input
                  type="number"
                  className="mt-1 bg-zinc-950/50"
                  value={data.plans[plan].minStream}
                  onChange={(e) => patchPlan(plan, "minStream", Number(e.target.value) || 0)}
                />
              </label>
              <label className="text-xs text-zinc-400">
                Мест в команде (0 = нет)
                <Input
                  type="number"
                  className="mt-1 bg-zinc-950/50"
                  value={data.plans[plan].teamSeats}
                  onChange={(e) => patchPlan(plan, "teamSeats", Number(e.target.value) || 0)}
                />
              </label>
            </div>
            <p className="text-xs text-zinc-500">Функционал (флаги для платформы; числовые лимиты выше влияют на списания и планы)</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {PLATFORM_FEATURE_CATALOG.map((f) => (
                <label key={f.id} className="flex items-start gap-2 text-sm text-zinc-300">
                  <input
                    type="checkbox"
                    checked={Boolean(data.plans[plan].features[f.id])}
                    onChange={(e) => patchFeature(plan, f.id, e.target.checked)}
                  />
                  <span>
                    {f.label}
                    <br />
                    <span className="text-xs text-zinc-500">{f.desc}</span>
                  </span>
                </label>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
      <Button type="button" onClick={() => void onSave()} disabled={saving}>
        {saving ? "Сохраняю…" : "Сохранить в платформу"}
      </Button>
    </div>
  );
}
