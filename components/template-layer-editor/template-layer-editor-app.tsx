"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
  type DragStartEvent
} from "@dnd-kit/core";
import { motion } from "framer-motion";
import { Layers, LayoutGrid, LayoutTemplate, Minus, Monitor, Plus, Smartphone, Sparkles, Tablet } from "lucide-react";
import { LayerPanel } from "@/components/template-layer-editor/layer-panel";
import { PaletteRail } from "@/components/template-layer-editor/palette";
import { parsePaletteDragId } from "@/components/template-layer-editor/palette";
import { TemplateGrid } from "@/components/template-layer-editor/grid";
import { TemplateManager } from "@/components/template-layer-editor/template-manager";
import { parseBlockDragId } from "@/components/template-layer-editor/block";
import { DROP_PREFIX } from "@/components/template-layer-editor/grid-cell";
import type { BlockPreset, BlockInstance } from "@/lib/template-layer-editor/types";
import { hydrateTemplatesFromStorage, useLayerEditorStore } from "@/lib/template-layer-editor/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type TemplateLayerEditorVariant = "page" | "embedded";
type SidebarTab = "palette" | "layers" | "templates";
type ViewportPreset = "desktop" | "tablet" | "mobile";

function surfaceFromActiveId(
  activeId: string | number
): null | { kind: "block"; instanceId: string } | { kind: "palette"; presetId: string } {
  const s = String(activeId);
  const bid = parseBlockDragId(s);
  if (bid) return { kind: "block", instanceId: bid };
  const pid = parsePaletteDragId(s);
  if (pid) return { kind: "palette", presetId: pid };
  return null;
}

export function TemplateLayerEditorApp({ variant = "page" }: { variant?: TemplateLayerEditorVariant }) {
  const isEmbedded = variant === "embedded";
  const grid = useLayerEditorStore((st) => st.grid);
  const layers = useLayerEditorStore((st) => st.layers);
  const gridLayerId = useLayerEditorStore((st) => st.gridLayerId);
  const presets = useLayerEditorStore((st) => st.presets);
  const templates = useLayerEditorStore((st) => st.templates);
  const highlightedKeys = useLayerEditorStore((st) => st.highlightedKeys);
  const renameLayer = useLayerEditorStore((st) => st.renameLayer);
  const setLayerVisibility = useLayerEditorStore((st) => st.setLayerVisibility);
  const reshape = useLayerEditorStore((st) => st.reshape);
  const incrementRows = useLayerEditorStore((st) => st.incrementRows);
  const dropFromDnD = useLayerEditorStore((st) => st.dropFromDnD);
  const paletteClickAdd = useLayerEditorStore((st) => st.paletteClickAdd);
  const deleteBlockById = useLayerEditorStore((st) => st.deleteBlockById);
  const saveTemplateAs = useLayerEditorStore((st) => st.saveTemplateAs);
  const loadTemplate = useLayerEditorStore((st) => st.loadTemplate);
  const deleteTemplateById = useLayerEditorStore((st) => st.deleteTemplateById);
  const setDragSurface = useLayerEditorStore((st) => st.setDragSurface);
  const setDragRejected = useLayerEditorStore((st) => st.setDragRejected);
  const seedDemoBlocks = useLayerEditorStore((st) => st.seedDemoBlocks);
  const dragDidReject = useLayerEditorStore((st) => st.dragDidReject);

  const [colsDraft, setColsDraft] = useState(String(grid.columns));
  const [rowsDraft, setRowsDraft] = useState(String(grid.rows));
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<SidebarTab>("palette");
  const [paletteQuery, setPaletteQuery] = useState("");
  const [viewportPreset, setViewportPreset] = useState<ViewportPreset>("desktop");

  useEffect(() => {
    hydrateTemplatesFromStorage();
  }, []);

  useEffect(() => {
    if (!dragDidReject) return;
    const t = window.setTimeout(() => setDragRejected(false), 480);
    return () => window.clearTimeout(t);
  }, [dragDidReject, setDragRejected]);

  useEffect(() => {
    setColsDraft(String(grid.columns));
    setRowsDraft(String(grid.rows));
  }, [grid.columns, grid.rows]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 }
    })
  );

  const bgLayer = useMemo(() => layers.find((L) => L.id === "layer-bg"), [layers]);
  const capLayer = useMemo(() => layers.find((L) => L.id === "layer-caption"), [layers]);

  const overlayBlock: BlockInstance | null = useMemo(() => {
    if (!activeId) return null;
    const bid = parseBlockDragId(activeId);
    if (!bid) return null;
    return grid.blocks[bid] ?? null;
  }, [activeId, grid.blocks]);

  const overlayPalette: BlockPreset | null = useMemo(() => {
    if (!activeId) return null;
    const pid = parsePaletteDragId(activeId);
    if (!pid) return null;
    return presets.find((p) => p.id === pid) ?? null;
  }, [activeId, presets]);

  const filteredPresets = useMemo(() => {
    const q = paletteQuery.trim().toLowerCase();
    if (!q) return presets;
    return presets.filter((p) => p.title.toLowerCase().includes(q) || p.id.toLowerCase().includes(q));
  }, [presets, paletteQuery]);

  function handleDragStart(ev: DragStartEvent) {
    const id = String(ev.active.id);
    setActiveId(id);
    setDragSurface(surfaceFromActiveId(id));
  }

  function handleDragEnd(ev: DragEndEvent) {
    const overId = ev.over?.id;
    setActiveId(null);
    if (!overId) {
      setDragRejected(true);
      setDragSurface(null);
      return;
    }
    const s = String(overId);
    if (!s.startsWith(`${DROP_PREFIX}:`)) {
      setDragSurface(null);
      return;
    }
    const key = s.slice(DROP_PREFIX.length + 1);
    const src = surfaceFromActiveId(String(ev.active.id));
    const result = dropFromDnD(src, key);
    if (result === "reject") setDragRejected(true);
    setDragSurface(null);
  }

  function handleDragCancel() {
    setActiveId(null);
    setDragSurface(null);
  }

  function applyResize() {
    const nc = Math.min(12, Math.max(1, Number(colsDraft) || 3));
    const nr = Math.max(1, Number(rowsDraft) || 1);
    reshape(nc, nr);
  }

  const viewportClass = isEmbedded
    ? "max-w-none"
    : viewportPreset === "desktop"
      ? "max-w-none"
      : viewportPreset === "tablet"
        ? "max-w-[860px]"
        : "max-w-[430px]";

  return (
    <div
      className={cn("flex min-h-0 w-full flex-1 overflow-hidden", !isEmbedded && "rounded-2xl border border-border")}
    >
      <div
        className={cn(
          "min-h-0 w-full flex-1 overflow-hidden",
          isEmbedded ? "flex flex-col gap-2" : "grid grid-cols-1 xl:grid-cols-[19rem_minmax(0,1fr)]"
        )}
      >
        <aside
          className={cn(
            "flex flex-col overflow-hidden border-border bg-muted/30",
            isEmbedded ? "max-h-[min(38vh,280px)] shrink-0 border-b" : "min-h-0 border-b xl:border-b-0 xl:border-r"
          )}
        >
          <div className="border-b border-border px-3 py-2.5">
            <p className="text-sm font-semibold text-foreground">Редактор шаблонов и сетки</p>
            <p className="text-[11px] text-muted-foreground">Палитра блоков, слои и сохранённые макеты</p>
          </div>

          <div className="grid grid-cols-3 gap-1 border-b border-border p-2">
            <Button
              type="button"
              size="sm"
              variant={activeTab === "palette" ? "default" : "ghost"}
              className="h-8 gap-1 text-[11px]"
              onClick={() => setActiveTab("palette")}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Палитра
            </Button>
            <Button
              type="button"
              size="sm"
              variant={activeTab === "layers" ? "default" : "ghost"}
              className="h-8 gap-1 text-[11px]"
              onClick={() => setActiveTab("layers")}
            >
              <Layers className="h-3.5 w-3.5" />
              Слои
            </Button>
            <Button
              type="button"
              size="sm"
              variant={activeTab === "templates" ? "default" : "ghost"}
              className="h-8 gap-1 text-[11px]"
              onClick={() => setActiveTab("templates")}
            >
              <LayoutTemplate className="h-3.5 w-3.5" />
              Шаблоны
            </Button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {activeTab === "palette" ? (
              <div className="space-y-3">
                <Input
                  value={paletteQuery}
                  onChange={(ev) => setPaletteQuery(ev.target.value)}
                  placeholder="Поиск по палитре…"
                  className="h-9 text-sm"
                />
                <PaletteRail
                  presets={filteredPresets}
                  grid={grid}
                  emptyHint="Ничего не найдено."
                  onQuickAdd={(id) => paletteClickAdd(id)}
                />
              </div>
            ) : null}

            {activeTab === "layers" ? (
              <LayerPanel
                layers={layers}
                gridLayerId={gridLayerId}
                onRename={renameLayer}
                onVisibility={setLayerVisibility}
              />
            ) : null}

            {activeTab === "templates" ? (
              <TemplateManager
                templates={templates}
                onSave={saveTemplateAs}
                onLoad={loadTemplate}
                onDelete={deleteTemplateById}
              />
            ) : null}
          </div>
        </aside>

        <main
          className={cn(
            "flex min-h-0 min-w-0 flex-1 flex-col bg-muted/15 dark:bg-muted/25",
            isEmbedded && "overflow-hidden"
          )}
        >
          <header className="flex flex-wrap items-center gap-2 border-b border-border bg-background/95 px-3 py-2">
            {!isEmbedded ? (
              <>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant={viewportPreset === "desktop" ? "default" : "outline"}
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setViewportPreset("desktop")}
                  >
                    <Monitor className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant={viewportPreset === "tablet" ? "default" : "outline"}
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setViewportPreset("tablet")}
                  >
                    <Tablet className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant={viewportPreset === "mobile" ? "default" : "outline"}
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setViewportPreset("mobile")}
                  >
                    <Smartphone className="h-4 w-4" />
                  </Button>
                </div>
                <div className="mx-1 h-5 w-px bg-border" />
              </>
            ) : null}

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-muted-foreground">Колонки</span>
              <Input className="h-8 w-14 text-xs" value={colsDraft} onChange={(e) => setColsDraft(e.target.value)} inputMode="numeric" />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-muted-foreground">Строки</span>
              <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => incrementRows(-1)}>
                <Minus className="h-3.5 w-3.5" />
              </Button>
              <Input className="h-8 w-12 text-xs" value={rowsDraft} onChange={(e) => setRowsDraft(e.target.value)} inputMode="numeric" />
              <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => incrementRows(1)}>
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>

            <Button type="button" size="sm" onClick={applyResize}>
              Пересобрать сетку
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={seedDemoBlocks} className="gap-1">
              <Sparkles className="h-3.5 w-3.5" />
              Демо
            </Button>
          </header>

          <div className="relative min-h-0 flex-1 overflow-hidden p-3">
            <div className={cn("relative mx-auto flex h-full min-h-0 w-full flex-col", viewportClass)}>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragCancel={handleDragCancel}
              >
                <motion.div
                  animate={
                    dragDidReject
                      ? { x: [0, -8, 8, -4, 4, 0], transition: { duration: 0.35 } }
                      : { x: 0 }
                  }
                  className={cn(
                    "relative min-h-0 flex-1 overflow-y-auto rounded-2xl border border-border bg-muted/30 p-3 shadow-inner dark:bg-zinc-900/40",
                    isEmbedded && "p-2"
                  )}
                >
                  {bgLayer?.visible ? (
                    <div
                      className="pointer-events-none absolute inset-0 -z-10 rounded-2xl bg-gradient-to-br from-violet-950/40 via-slate-950/20 to-cyan-950/30"
                      aria-hidden
                    />
                  ) : null}
                  {capLayer?.visible ? (
                    <div className="pointer-events-none absolute inset-x-0 top-3 z-20 flex justify-center">
                      <span className="rounded-full border border-white/10 bg-black/30 px-4 py-1 text-[10px] uppercase tracking-[0.35em] text-white/80">
                        водяной блок (annotation)
                      </span>
                    </div>
                  ) : null}
                  <TemplateGrid
                    grid={grid}
                    highlightedKeys={highlightedKeys}
                    onRemoveBlock={(id) => deleteBlockById(id)}
                    className="relative z-10"
                  />
                </motion.div>

                <DragOverlay dropAnimation={{ duration: 220, easing: "cubic-bezier(0.23, 1, 0.32, 1)" }}>
                  {!activeId ? null : overlayBlock ? (
                    <div
                      className="rounded-lg border border-white/30 px-3 py-2 text-xs font-medium text-white shadow-2xl"
                      style={{ backgroundColor: overlayBlock.color }}
                    >
                      {overlayBlock.icon} {overlayBlock.title}
                    </div>
                  ) : overlayPalette ? (
                    <div className="flex items-center gap-2 rounded-lg border border-primary/40 bg-card px-3 py-2 text-sm shadow-xl">
                      <span className="rounded-md px-2 py-1 text-white" style={{ backgroundColor: overlayPalette.color }}>
                        {overlayPalette.icon}
                      </span>
                      {overlayPalette.title}
                    </div>
                  ) : null}
                </DragOverlay>
              </DndContext>

              {!isEmbedded ? (
                <section className="mt-3 rounded-xl border border-border/60 bg-background/80 p-3 text-xs leading-relaxed text-muted-foreground">
                  <p className="font-medium text-foreground">Ограничение заполненного ряда</p>
                  <p className="mt-1">
                    Если ряд полностью заполнен ({grid.columns} ячеек), блоки можно двигать только внутри этого ряда по горизонтали.
                  </p>
                </section>
              ) : null}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
