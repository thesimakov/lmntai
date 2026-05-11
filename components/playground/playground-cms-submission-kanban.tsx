"use client";

import {
  closestCorners,
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import type { CSSProperties } from "react";
import { useMemo, useState } from "react";

import { cn } from "@/lib/utils";

export type SubmissionKanbanItemModel = {
  id: string;
  createdAt: string;
  pageTitle: string | null;
  pagePath: string | null;
  fields: Record<string, string>;
};

export type SubmissionKanbanColumnModel = {
  id: string;
  label: string;
};

type PlaygroundCmsSubmissionKanbanProps = {
  columns: SubmissionKanbanColumnModel[];
  itemsByColumn: Record<string, SubmissionKanbanItemModel[]>;
  boardAriaLabel: string;
  pageColumnLabel: string;
  dragHandleAriaLabel: string;
  addColumnLabel: string;
  fmtDate: (iso: string) => string;
  displayMetaPlain: (text: string | null | undefined) => string;
  onMoveToColumn: (submissionId: string, columnKey: string) => Promise<boolean>;
  onAddColumnClick: () => void;
  moveDisabled?: boolean;
};

function findSubmission(columnsMap: Record<string, SubmissionKanbanItemModel[]>, id: string) {
  for (const list of Object.values(columnsMap)) {
    const row = list.find((s) => s.id === id);
    if (row) return row;
  }
  return null;
}

function KanbanDraggableSubmissionCard({
  submission,
  pageColumnLabel,
  fmtDate,
  displayMetaPlain,
  dragAria,
}: {
  submission: SubmissionKanbanItemModel;
  pageColumnLabel: string;
  fmtDate: (iso: string) => string;
  displayMetaPlain: (text: string | null | undefined) => string;
  dragAria: string;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: submission.id,
  });
  const style: CSSProperties = {
    transform: transform ? CSS.Translate.toString(transform) : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex gap-1.5 rounded-xl border border-slate-200/90 bg-white p-2.5 text-xs shadow-sm transition-colors",
        isDragging ? "border-[#0061FF]/50 opacity-95 ring-2 ring-[#0061FF]/20" : "hover:border-[#0061FF]/45 hover:shadow-md",
      )}
    >
      <button
        type="button"
        className="-ml-1 -mt-0.5 shrink-0 touch-none cursor-grab rounded p-1 text-slate-400 hover:text-slate-600 active:cursor-grabbing"
        aria-label={dragAria}
        {...listeners}
        {...attributes}
      >
        <GripVertical className="h-4 w-4" aria-hidden />
      </button>
      <div className="min-w-0 flex-1">
        <time className="block text-[11px] leading-tight text-slate-600" dateTime={submission.createdAt}>
          {fmtDate(submission.createdAt)}
        </time>
        <p className="mt-1.5 text-[11px] leading-snug text-slate-600">
          <span className="font-semibold text-slate-800">{pageColumnLabel}:</span>{" "}
          {displayMetaPlain(submission.pageTitle ?? submission.pagePath)}
        </p>
        <pre className="mt-2 max-h-36 overflow-auto rounded-lg bg-slate-50 p-2 font-mono text-[10px] leading-snug text-slate-800">
          {JSON.stringify(submission.fields, null, 2)}
        </pre>
      </div>
    </div>
  );
}

function KanbanDroppableColumnBody({
  columnId,
  children,
}: {
  columnId: string;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: columnId });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-contain rounded-b-[0.925rem] px-2 pb-2 pt-1",
        isOver ? "bg-[#0061FF]/04 ring-2 ring-inset ring-[#0061FF]/30" : "",
      )}
    >
      {children}
    </div>
  );
}

function KanbanSubmissionPreviewOverlay({
  submission,
  fmtDate,
  pageColumnLabel,
  displayMetaPlain,
}: {
  submission: SubmissionKanbanItemModel;
  fmtDate: (iso: string) => string;
  pageColumnLabel: string;
  displayMetaPlain: (text: string | null | undefined) => string;
}) {
  return (
    <div className="max-w-[240px] cursor-grabbing rounded-xl border border-slate-200 bg-white p-2.5 text-xs shadow-xl">
      <div className="text-[11px] text-slate-600">{fmtDate(submission.createdAt)}</div>
      <p className="mt-1 text-[11px] font-semibold text-slate-800">
        {pageColumnLabel}: {displayMetaPlain(submission.pageTitle ?? submission.pagePath)}
      </p>
    </div>
  );
}

export function PlaygroundCmsSubmissionKanban({
  columns,
  itemsByColumn,
  boardAriaLabel,
  pageColumnLabel,
  dragHandleAriaLabel,
  addColumnLabel,
  fmtDate,
  displayMetaPlain,
  onMoveToColumn,
  onAddColumnClick,
  moveDisabled,
}: PlaygroundCmsSubmissionKanbanProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const [activeSubmission, setActiveSubmission] = useState<SubmissionKanbanItemModel | null>(null);

  const columnIds = useMemo(() => columns.map((c) => c.id), [columns]);
  const columnIdSet = useMemo(() => new Set(columnIds), [columnIds]);

  const handleDragStart = (evt: DragStartEvent) => {
    if (typeof evt.active.id !== "string") return;
    const sid = evt.active.id;
    if (columnIdSet.has(sid)) return;
    setActiveSubmission(findSubmission(itemsByColumn, sid));
  };

  const handleDragEnd = async (evt: DragEndEvent) => {
    const overId = evt.over?.id != null ? String(evt.over.id) : null;
    const activeId =
      evt.active?.id !== undefined && evt.active.id !== null ? String(evt.active.id) : null;
    setActiveSubmission(null);

    if (
      moveDisabled ||
      !activeId ||
      !overId ||
      !columnIdSet.has(overId) ||
      columnIdSet.has(activeId)
    ) {
      return;
    }
    await onMoveToColumn(activeId, overId);
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd} onDragStart={handleDragStart}>
      <div
        className="flex min-h-[min(520px,calc(100dvh-18rem))] gap-4 overflow-x-auto overflow-y-hidden overscroll-x-contain pb-1 pt-0.5 [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5"
        role="region"
        aria-label={boardAriaLabel}
      >
        {columns.map((col) => {
          const rows = itemsByColumn[col.id] ?? [];
          return (
            <div
              key={col.id}
              className="flex max-h-[min(560px,calc(100dvh-16rem))] min-h-0 w-[min(100%,280px)] shrink-0 snap-start snap-always flex-col rounded-2xl border border-slate-200/95 bg-[#eef2f7] shadow-inner"
            >
              <div className="shrink-0 rounded-t-[0.925rem] border-b border-slate-200/90 bg-white/90 px-3 py-2.5">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="min-w-0 flex-1 text-left text-[11px] font-bold uppercase tracking-[0.1em] text-slate-600">
                    <span className="line-clamp-2">{col.label}</span>
                  </h3>
                  <span className="shrink-0 rounded-full bg-slate-900/85 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-white">
                    {rows.length}
                  </span>
                </div>
              </div>
              <KanbanDroppableColumnBody columnId={col.id}>
                {rows.map((s) => (
                  <KanbanDraggableSubmissionCard
                    key={s.id}
                    submission={s}
                    pageColumnLabel={pageColumnLabel}
                    fmtDate={fmtDate}
                    displayMetaPlain={displayMetaPlain}
                    dragAria={dragHandleAriaLabel}
                  />
                ))}
                {rows.length === 0 ? (
                  <p className="px-2 py-6 text-center text-[11px] text-slate-500">—</p>
                ) : null}
              </KanbanDroppableColumnBody>
            </div>
          );
        })}
        <div className="flex w-[min(100%,260px)] shrink-0 snap-start snap-always flex-col">
          <div className="flex min-h-[12rem] flex-1 flex-col justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/70 p-3">
            <button
              type="button"
              onClick={onAddColumnClick}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3 text-[11px] font-bold uppercase tracking-[0.1em] text-slate-600 shadow-sm transition-colors hover:border-[#0061FF]/40 hover:bg-[#0061FF]/[0.04] hover:text-slate-900"
            >
              {addColumnLabel}
            </button>
          </div>
        </div>
      </div>
      <DragOverlay dropAnimation={null}>
        {activeSubmission ? (
          <KanbanSubmissionPreviewOverlay
            submission={activeSubmission}
            fmtDate={fmtDate}
            pageColumnLabel={pageColumnLabel}
            displayMetaPlain={displayMetaPlain}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
