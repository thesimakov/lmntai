"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Presentation, Trash2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageTransition } from "@/components/page-transition";
import { useI18n } from "@/components/i18n-provider";

type PresentationItem = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  hasSlides: boolean;
  editUrl: string;
};

function PresentationsContent() {
  const router = useRouter();
  const { lang } = useI18n();
  const [items, setItems] = useState<PresentationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/presentations");
      if (res.ok) {
        const data = (await res.json()) as { data?: { presentations?: PresentationItem[] } };
        setItems(data.data?.presentations ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleNew = async () => {
    setCreating(true);
    try {
      const res = await fetch(`/api/presentation/new?lang=${encodeURIComponent(lang)}`, { redirect: "manual" });
      // GET /api/presentation/new redirects; follow the Location header manually
      const location = res.headers.get("location") ?? res.url;
      if (location) { router.push(location); return; }
    } catch {
      // fallback: direct navigation which follows the redirect
    }
    router.push(`/api/presentation/new?lang=${encodeURIComponent(lang)}`);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Удалить «${name}»?`)) return;
    setDeletingId(id);
    try {
      await fetch(`/api/projects/${id}`, { method: "DELETE" });
      setItems((prev) => prev.filter((p) => p.id !== id));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Презентации</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Создавайте и редактируйте AI-презентации
            </p>
          </div>
          <Button onClick={() => void handleNew()} disabled={creating} className="gap-2">
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Новая презентация
          </Button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center min-h-[200px]">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border bg-muted/20 min-h-[280px] text-center">
            <Presentation className="w-10 h-10 text-muted-foreground/40" />
            <p className="font-medium text-sm">Нет презентаций</p>
            <Button variant="outline" size="sm" onClick={() => void handleNew()} disabled={creating} className="gap-2">
              {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              Создать
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item) => (
              <PresentationCard
                key={item.id}
                item={item}
                deleting={deletingId === item.id}
                onEdit={() => router.push(item.editUrl)}
                onDelete={() => void handleDelete(item.id, item.name)}
              />
            ))}
          </div>
        )}
      </div>
    </PageTransition>
  );
}

function PresentationCard({
  item,
  deleting,
  onEdit,
  onDelete,
}: {
  item: PresentationItem;
  deleting: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const updated = new Date(item.updatedAt).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="group relative flex flex-col gap-3 rounded-xl border border-border bg-card p-4 hover:shadow-md transition-shadow">
      {/* Slide preview placeholder */}
      <div
        className="w-full aspect-video rounded-md bg-muted/40 border border-border/60 flex items-center justify-center cursor-pointer"
        onClick={onEdit}
      >
        <Presentation className="w-8 h-8 text-muted-foreground/30" />
      </div>

      <div className="flex flex-col gap-0.5">
        <p className="text-sm font-medium leading-tight line-clamp-1">{item.name}</p>
        <p className="text-xs text-muted-foreground">{updated}</p>
        {!item.hasSlides && (
          <p className="text-[11px] text-amber-500 mt-0.5">Слайды не сгенерированы</p>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button size="sm" className="flex-1 h-8 gap-1.5 text-xs" onClick={onEdit}>
          <ExternalLink className="w-3.5 h-3.5" />
          {item.hasSlides ? "Открыть редактор" : "Создать слайды"}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
          onClick={onDelete}
          disabled={deleting}
        >
          {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
        </Button>
      </div>
    </div>
  );
}

export default function PresentationsPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-[220px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <PresentationsContent />
    </Suspense>
  );
}
