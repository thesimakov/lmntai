"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type PromoItem = {
  id: string;
  code: string;
  isActive: boolean;
  kind: "DISCOUNT" | "BONUS_TOKENS";
  discountPercent: number | null;
  bonusTokens: number | null;
  appliesToPlans: unknown;
  maxUses: number | null;
  usedCount: number;
  validFrom: string | null;
  validTo: string | null;
};

function plansFromRow(row: PromoItem): { pro: boolean; team: boolean } {
  const r = row.appliesToPlans;
  if (r == null || (Array.isArray(r) && r.length === 0)) return { pro: true, team: true };
  if (Array.isArray(r)) {
    return {
      pro: r.includes("PRO"),
      team: r.includes("TEAM")
    };
  }
  return { pro: true, team: true };
}

export function PromoCodesEditor() {
  const [rows, setRows] = useState<PromoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [code, setCode] = useState("");
  const [kind, setKind] = useState<"DISCOUNT" | "BONUS_TOKENS">("DISCOUNT");
  const [discount, setDiscount] = useState(10);
  const [tokens, setTokens] = useState(10_000);
  const [pro, setPro] = useState(true);
  const [team, setTeam] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/promo-codes");
      if (!res.ok) {
        toast.error("Не удалось загрузить промокоды");
        return;
      }
      const j = (await res.json()) as { items: PromoItem[] };
      setRows(j.items ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function createOne(e: React.FormEvent) {
    e.preventDefault();
    if (!pro && !team) {
      toast.error("Выберите хотя бы один план: Pro и/или Team");
      return;
    }
    setSaving(true);
    try {
      const applies = [
        ...(pro ? (["PRO"] as const) : []),
        ...(team ? (["TEAM"] as const) : [])
      ];
      const res = await fetch("/api/admin/promo-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          kind,
          discountPercent: kind === "DISCOUNT" ? discount : null,
          bonusTokens: kind === "BONUS_TOKENS" ? tokens : null,
          appliesToPlans: applies
        })
      });
      if (res.status === 409) {
        toast.error("Код уже существует");
        return;
      }
      if (!res.ok) {
        toast.error("Ошибка сохранения");
        return;
      }
      toast.success("Промокод создан");
      setCode("");
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Удалить этот промокод?")) return;
    const res = await fetch(`/api/admin/promo-codes/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Не удалось удалить");
      return;
    }
    toast.success("Удалено");
    void load();
  }

  async function toggle(id: string, isActive: boolean) {
    const res = await fetch(`/api/admin/promo-codes/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive })
    });
    if (!res.ok) {
      toast.error("Ошибка");
      return;
    }
    void load();
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-zinc-400">
        <Loader2 className="h-4 w-4 animate-spin" /> Загрузка…
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <form onSubmit={createOne} className="max-w-xl space-y-4 rounded-2xl border border-white/10 bg-zinc-900/50 p-4">
        <p className="text-sm text-zinc-400">
          Скидка применяется к сумме выбранного периода (месяц / квартал / год) на экране тарифов. Бонус токенов
          отображается отдельной строкой; начисление на баланс — при оформлении оплаты (интеграция платёжки).
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium">Код</label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="mt-1 border-white/10 bg-zinc-950"
              placeholder="SUMMER2026"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium">Тип</label>
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as "DISCOUNT" | "BONUS_TOKENS")}
              className="mt-1 w-full rounded-md border border-white/10 bg-zinc-950 px-3 py-2 text-sm"
            >
              <option value="DISCOUNT">Скидка, %</option>
              <option value="BONUS_TOKENS">Токены в подарок</option>
            </select>
          </div>
        </div>
        {kind === "DISCOUNT" ? (
          <div>
            <label className="text-sm font-medium">Скидка, % (1–100)</label>
            <Input
              type="number"
              min={1}
              max={100}
              value={discount}
              onChange={(e) => setDiscount(Number(e.target.value))}
              className="mt-1 border-white/10 bg-zinc-950"
            />
          </div>
        ) : (
          <div>
            <label className="text-sm font-medium">Токенов</label>
            <Input
              type="number"
              min={1}
              value={tokens}
              onChange={(e) => setTokens(Number(e.target.value))}
              className="mt-1 border-white/10 bg-zinc-950"
            />
          </div>
        )}
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={pro} onChange={(e) => setPro(e.target.checked)} />
            Pro
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={team} onChange={(e) => setTeam(e.target.checked)} />
            Team
          </label>
        </div>
        <Button type="submit" disabled={saving} className="bg-fuchsia-600 hover:bg-fuchsia-500">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Добавить промокод
        </Button>
      </form>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-zinc-500">
              <th className="p-2">Код</th>
              <th className="p-2">Тип</th>
              <th className="p-2">Значение</th>
              <th className="p-2">Планы</th>
              <th className="p-2">Исп.</th>
              <th className="p-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const pl = plansFromRow(r);
              return (
                <tr key={r.id} className="border-b border-white/5">
                  <td className="p-2 font-mono text-fuchsia-200">{r.code}</td>
                  <td className="p-2">{r.kind === "DISCOUNT" ? "Скидка" : "Токены"}</td>
                  <td className="p-2">
                    {r.kind === "DISCOUNT" ? `${r.discountPercent ?? "—"}%` : (r.bonusTokens ?? "—").toLocaleString("ru-RU")}
                  </td>
                  <td className="p-2 text-zinc-400">
                    {pl.pro && pl.team
                      ? "Pro, Team"
                      : pl.pro
                        ? "Pro"
                        : pl.team
                          ? "Team"
                          : "—"}
                  </td>
                  <td className="p-2 text-zinc-500">
                    {r.usedCount}
                    {r.maxUses != null ? ` / ${r.maxUses}` : ""}
                  </td>
                  <td className="p-2 text-right">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="mr-1 border-white/10"
                      onClick={() => void toggle(r.id, r.isActive)}
                    >
                      {r.isActive ? "Выкл" : "Вкл"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      onClick={() => void remove(r.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 ? <p className="text-sm text-zinc-500">Пока нет промокодов</p> : null}
      </div>
    </div>
  );
}
