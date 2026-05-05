"use client";

import type { Editor } from "grapesjs";
import { Grid3x3, LayoutGrid, Rows3 } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BOX_IMAGE_TOPICS } from "@/lib/box-image-library-sidebar";
import type { BoxImageLibraryHit } from "@/lib/box-image-library-types";
import { insertImageGallerySection } from "@/lib/box-insert-image-gallery";
import { cn } from "@/lib/utils";

/** Минимум из GrapesJS `AssetsCustomData`, без типов Grapes на клиенте. */
export type LemnityImageLibraryGrapesContext = {
  close: () => void;
  /** Вызов добавляет актив в коллекцию и применяет к выделенному компоненту. */
  select: (asset: { src: string; name?: string } | string, complete?: boolean) => void;
};

type LemnityBoxImageLibraryModalProps = {
  context: LemnityImageLibraryGrapesContext | null;
  getEditor: () => Editor | null;
};

type GridMode = "masonry" | "dense" | "rows";

export function LemnityBoxImageLibraryModal({ context, getEditor }: LemnityBoxImageLibraryModalProps) {
  const open = Boolean(context);

  const [topicQuery, setTopicQuery] = useState("");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 320);
  const [page, setPage] = useState(1);
  const [gridMode, setGridMode] = useState<GridMode>("dense");
  const [hits, setHits] = useState<BoxImageLibraryHit[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [picked, setPicked] = useState<BoxImageLibraryHit | null>(null);
  const [categorySlug, setCategorySlug] = useState<string>("all");
  const localImageInputRef = useRef<HTMLInputElement>(null);

  const effectiveQuery = useMemo(() => {
    const manual = debouncedSearch.trim();
    if (manual) return manual;
    if (topicQuery.trim()) return topicQuery.trim();
    return "creative landscape atmospheric";
  }, [debouncedSearch, topicQuery]);

  /** Сброс при открытии */
  useEffect(() => {
    if (!open) return;
    setNotice(null);
    setHits([]);
    setSearch("");
    setTopicQuery("");
    setCategorySlug("all");
  }, [open]);

  /** Загрузка выдачи и «ещё» (постраничное объединение) */
  useEffect(() => {
    if (!open) return;

    const ac = new AbortController();
    setLoading(true);

    void fetch(`/api/box-image-library?q=${encodeURIComponent(effectiveQuery)}&page=${page}`, {
      credentials: "same-origin",
      signal: ac.signal,
    })
      .then((r) => r.json())
      .then((data: import("@/lib/box-image-library-types").BoxImageLibraryResponse) => {
        const next = Array.isArray(data.results) ? data.results : [];

        function mergeDedupe(existing: BoxImageLibraryHit[], more: BoxImageLibraryHit[]) {
          const keys = new Set(existing.map((h) => `${h.id}:${h.full}`));
          const add = more.filter((h) => !keys.has(`${h.id}:${h.full}`));
          return existing.concat(add);
        }

        if (page === 1) {
          setHits(next);
          /* Сообщение API (демо / ошибка загрузки) — отдельно от пустой выдачи */
          const n = data.notice?.trim();
          setNotice(n && (data.source === "fallback" || next.length === 0) ? n : null);
        } else {
          setHits((prev) => mergeDedupe(prev, next));
        }
        setHasMore(Boolean(data.hasMore));
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setHits([]);
        setHasMore(false);
        setNotice("Сеть недоступна — проверьте соединение и попробуйте снова.");
      })
      .finally(() => setLoading(false));

    return () => ac.abort();
  }, [effectiveQuery, open, page]);

  const sidebar = useMemo(
    () => (
      <ul className="py-0">
        {BOX_IMAGE_TOPICS.map((t) => (
          <li key={t.id}>
            <button
              type="button"
              onClick={() => {
                setTopicQuery(t.query);
                setCategorySlug(t.id);
                setSearch("");
                setPage(1);
              }}
              className={cn(
                "flex min-h-[40px] w-full items-center border-0 px-3 py-2.5 text-left text-[13px] leading-snug transition-colors hover:bg-white/85",
                categorySlug === t.id && debouncedSearch.trim() === ""
                  ? "bg-white font-semibold text-[#222] shadow-[inset_-3px_0_0_0_#f97316]"
                  : "bg-transparent font-normal text-[#555]",
              )}
            >
              {t.label}
            </button>
          </li>
        ))}
      </ul>
    ),
    [categorySlug, debouncedSearch],
  );

  const closeAll = useCallback(() => {
    context?.close();
  }, [context]);

  const onInsertSingle = () => {
    if (!picked || !context) return;
    context.select({ src: picked.full, name: picked.alt }, true);
  };

  const onInsertGallery = () => {
    if (!picked || !context) return;
    const editor = getEditor();
    if (editor) insertImageGallerySection(editor, picked.full);
    context.close();
    editor?.refresh?.();
  };

  const onLocalImageChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.currentTarget;
      const file = input.files?.[0];
      if (!file || !context) {
        input.value = "";
        return;
      }
      if (!file.type.startsWith("image/")) {
        input.value = "";
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const src = reader.result;
        if (typeof src !== "string" || !context) {
          input.value = "";
          return;
        }

        const editor = getEditor();
        const am = editor?.AssetManager;
        if (am) {
          try {
            const existing = typeof am.get === "function" ? am.get(src) : null;
            if (!existing) am.add({ src, name: file.name });
          } catch {
            /* дубликаты / ограничения Grapes */
          }
        }

        context.select({ src, name: file.name }, true);
        input.value = "";
      };
      reader.onerror = () => {
        input.value = "";
      };
      reader.readAsDataURL(file);
    },
    [context, getEditor],
  );

  const gridClass =
    gridMode === "dense"
      ? "grid w-full gap-2 sm:grid-cols-[repeat(auto-fill,minmax(120px,1fr))]"
      : gridMode === "rows"
        ? "grid w-full gap-3 sm:grid-cols-2 lg:grid-cols-4"
        : "columns-2 gap-x-4 sm:columns-3 [&_button]:mb-4";

  const handleDialogOpenChange = (next: boolean) => {
    if (!next && context) closeAll();
  };

  const loadMoreJsx = (
    <div className="flex shrink-0 justify-center border-t border-[#eaeaea] py-4">
      {hasMore ? (
        <Button type="button" variant="outline" size="sm" disabled={loading} onClick={() => setPage((p) => p + 1)}>
          {loading ? "Загрузка…" : "Ещё изображения"}
        </Button>
      ) : null}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          /* ! — перебивает дефолты DialogContent: grid / sm:max-w-lg (~512px) / p-6 / gap-4 */
          "z-[1200] !flex h-[min(90vh,min(820px,100dvh))] max-h-[min(94vh,96dvh)] !w-[min(calc(100vw-24px),800px)] !max-w-[min(calc(100vw-24px),800px)] flex-col gap-0 overflow-hidden border-[#dcdcdc] bg-[#f5f6f8] !gap-0 !p-0 shadow-xl sm:!w-[800px] sm:!max-w-[800px]",
          "fixed left-[50%] top-[50%] !translate-x-[-50%] !translate-y-[-50%] rounded-lg duration-200 sm:rounded-xl",
          "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
        )}
      >
        <DialogHeader className="shrink-0 space-y-0 border-b border-[#eaeaea] bg-white px-5 pb-4 pt-5">
          <div className="flex items-center justify-between gap-4">
            <DialogTitle className="min-w-0 flex-1 text-left text-lg font-semibold tracking-tight text-[#0f172a]">
              Библиотека изображений
            </DialogTitle>
            <DialogClose asChild>
              <button
                type="button"
                onClick={closeAll}
                className="flex size-9 shrink-0 items-center justify-center rounded-md border-0 bg-transparent text-[#475569] transition hover:bg-slate-100"
                aria-label="Закрыть"
              >
                <span className="text-xl leading-none" aria-hidden>
                  ×
                </span>
              </button>
            </DialogClose>
          </div>
        </DialogHeader>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden lg:flex-row">
          <aside className="hidden w-[212px] shrink-0 overflow-y-auto border-r border-[#e5e7eb] bg-[#eaecef] lg:block">
            <div className="border-b border-[#dfdfdf] bg-[#eaecef] px-3 py-2.5">
              <input
                ref={localImageInputRef}
                type="file"
                accept="image/*,.svg"
                className="sr-only"
                aria-label="Выбрать файл изображения с устройства"
                onChange={onLocalImageChange}
              />
              <button
                type="button"
                disabled={!context}
                onClick={() => localImageInputRef.current?.click()}
                className="flex min-h-[40px] w-full items-center justify-center rounded-md border border-dashed border-slate-400/80 bg-white/60 px-2 py-2 text-center text-[12px] font-semibold leading-snug text-[#334155] transition hover:border-orange-400 hover:bg-white hover:text-[#0f172a] disabled:pointer-events-none disabled:opacity-50"
              >
                Загрузить своё изображение
              </button>
            </div>
            {sidebar}
          </aside>

          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[#eef0f3]">
            <div className="flex shrink-0 flex-col gap-3 border-b border-[#e8e8e8] bg-white px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4 sm:gap-y-3 sm:px-5 md:gap-5">
              <label className="flex min-h-10 min-w-0 flex-[1_1_200px] flex-col md:max-w-none">
                <span className="sr-only">Поиск изображений</span>
                <input
                  type="search"
                  placeholder="Поиск изображений"
                  autoComplete="off"
                  aria-label="Поиск изображений"
                  className="h-10 w-full min-w-0 rounded-lg border border-slate-200 bg-[#f8fafc] px-3 py-2 text-[13px] text-[#0f172a] shadow-inner placeholder:text-slate-400 md:bg-white md:shadow-sm"
                  value={search}
                  onChange={(ev) => {
                    const v = ev.target.value;
                    setCategorySlug("__search");
                    setSearch(v);
                    setTopicQuery("");
                    setPage(1);
                  }}
                />
              </label>

              <div className="flex shrink-0 items-center gap-0 rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                {(
                  [
                    { id: "masonry" satisfies GridMode, Icon: Rows3 },
                    { id: "dense" satisfies GridMode, Icon: LayoutGrid },
                    { id: "rows" satisfies GridMode, Icon: Grid3x3 },
                  ] as const
                ).map(({ id, Icon }) => (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={gridMode === id}
                    className={cn(
                      "flex size-9 items-center justify-center rounded-md outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-slate-400",
                      gridMode === id ? "bg-white text-slate-900 shadow-sm" : "text-slate-400",
                    )}
                    onClick={() => setGridMode(id)}
                  >
                    <Icon className="size-4" />
                    <span className="sr-only">
                      {id === "masonry"
                        ? "Каменная кладка"
                        : id === "dense"
                          ? "Компактно"
                          : "Крупно"}
                    </span>
                  </button>
                ))}
              </div>

              <div className="flex w-full shrink-0 flex-wrap items-center justify-end gap-2 sm:ml-auto sm:w-auto md:justify-end">
                <Button type="button" variant="outline" disabled={!context} onClick={closeAll}>
                  Отмена
                </Button>
                <Button type="button" variant="outline" disabled={!picked || !context} onClick={onInsertGallery}>
                  Галерея
                </Button>
                <Button type="button" disabled={!picked || !context} onClick={onInsertSingle}>
                  Вставить
                </Button>
              </div>
            </div>

            <div className="relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-[#f1f5f9] px-4 py-4 sm:px-5">
              {loading && page === 1 && hits.length === 0 ? (
                <p className="py-16 text-center text-[13px] text-slate-500">Загрузка каталога…</p>
              ) : hits.length === 0 && !loading ? (
                <p className="py-12 text-center text-[13px] leading-relaxed text-slate-600">
                  {notice
                    ? "По этому запросу сейчас нет превью. Попробуйте другую тему или поиск на английском."
                    : "Ничего не найдено — смените запрос или тему."}
                </p>
              ) : (
                <div
                  key={`${effectiveQuery}-${page}-${gridMode}`}
                  className={cn(gridClass, "w-full min-w-0 animate-in fade-in duration-150")}
                >
                  {hits.map((h) => {
                    const sel = picked?.id === h.id && picked?.thumb === h.thumb && picked.full === h.full;
                    const imgUrl = gridMode === "rows" ? h.full : h.thumb;
                    return (
                      <button
                        key={`${h.id}-${page}-${gridMode}-${h.thumb}-${h.full}`}
                        type="button"
                        onClick={() => setPicked(h)}
                        className={cn(
                          "group relative mb-2 break-inside-avoid overflow-hidden rounded-lg border bg-slate-200 text-left shadow-sm outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-indigo-500 sm:mb-3",
                          sel ? "border-indigo-500 ring-2 ring-indigo-400" : "border-transparent",
                          gridMode === "rows" ? "aspect-[21/11] sm:aspect-[16/10]" : "aspect-auto",
                        )}
                      >
                        {/* Динамические URL провайдера — next/image без статического remotePatterns не подходит */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          alt={h.alt}
                          loading="lazy"
                          src={imgUrl}
                          className={cn(
                            "pointer-events-none w-full object-cover transition group-hover:scale-[1.02]",
                            gridMode === "dense" ? "h-24 sm:h-[92px]" : gridMode === "rows" ? "h-full max-h-none" : "block",
                          )}
                        />
                        <span className="sr-only">Выбрать {h.alt}</span>
                      </button>
                    );
                  })}
                </div>
              )}
              {hasMore && hits.length > 0 ? loadMoreJsx : null}
            </div>

          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function useDebouncedValue<T>(value: T, delay: number): T {
  const [v, setV] = useState(value);

  useEffect(() => {
    const t = window.setTimeout(() => setV(value), delay);
    return () => window.clearTimeout(t);
  }, [delay, value]);

  return v;
}
