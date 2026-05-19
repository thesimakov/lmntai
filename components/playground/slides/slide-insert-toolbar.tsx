"use client";

import { useEffect, useRef, useState } from "react";
import {
  MousePointer2,
  Image as ImageIcon,
  Type,
  Shapes,
  Minus,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  InsertLineKind,
  InsertShapeKind,
  InsertTextKind,
} from "@/lib/slide-graph/create-element";

export type SlideInsertTool = "select" | "image" | "text" | "shape" | "line";

interface SlideInsertToolbarProps {
  activeTool: SlideInsertTool;
  onToolChange: (tool: SlideInsertTool) => void;
  onInsertText: (kind: InsertTextKind) => void;
  onInsertImage: () => void;
  onInsertShape: (kind: InsertShapeKind) => void;
  onInsertLine: (kind: InsertLineKind) => void;
}

function toolSurface(active: boolean | undefined) {
  return cn(
    "transition-colors",
    active
      ? "bg-slate-100 text-slate-900 shadow-[inset_0_0_0_1px_#cbd5e1]"
      : "bg-transparent text-slate-500 shadow-[inset_0_0_0_1px_transparent] hover:bg-slate-50 hover:text-slate-700"
  );
}

function ToolBtn({
  active,
  onClick,
  title,
  children,
  showChevron,
  onChevronClick,
}: {
  active?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
  showChevron?: boolean;
  onChevronClick?: () => void;
}) {
  const inner =
    "m-0 flex items-center justify-center border-0 bg-transparent p-0 transition-colors hover:bg-slate-50/80";

  if (showChevron) {
    return (
      <div
        className={cn(
          "flex items-center overflow-hidden rounded-md",
          toolSurface(active)
        )}
      >
        <button
          type="button"
          title={title}
          onClick={onClick}
          className={cn(inner, "h-8 w-8")}
        >
          {children}
        </button>
        <div className="w-px shrink-0 self-stretch bg-slate-200" aria-hidden />
        <button
          type="button"
          title={`${title} — варианты`}
          onClick={onChevronClick}
          className={cn(inner, "h-8 w-5 text-slate-500")}
        >
          <ChevronDown className="h-3 w-3" />
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(inner, "h-8 w-8 rounded-md", toolSurface(active))}
    >
      {children}
    </button>
  );
}

function DropdownMenu({
  open,
  anchorRef,
  onClose,
  items,
}: {
  open: boolean;
  anchorRef: React.RefObject<HTMLElement | null>;
  onClose: () => void;
  items: { label: string; onClick: () => void }[];
}) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (menuRef.current?.contains(t) || anchorRef.current?.contains(t)) return;
      onClose();
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, onClose, anchorRef]);

  if (!open) return null;

  return (
    <div
      ref={menuRef}
      className="absolute top-full right-0 z-50 mt-1 min-w-[148px] rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
    >
      {items.map((item) => (
        <button
          key={item.label}
          type="button"
          onClick={() => {
            item.onClick();
            onClose();
          }}
          className="w-full text-left px-3 py-1.5 text-xs text-slate-900 hover:bg-slate-50"
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

export function SlideInsertToolbar({
  activeTool,
  onToolChange,
  onInsertText,
  onInsertImage,
  onInsertShape,
  onInsertLine,
}: SlideInsertToolbarProps) {
  const [menu, setMenu] = useState<"text" | "shape" | "line" | null>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const shapeRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);

  const closeMenu = () => setMenu(null);

  return (
    <div className="relative flex shrink-0 items-center gap-0.5 rounded-lg border border-slate-200 bg-white px-1.5 py-1">
      <ToolBtn
        active={activeTool === "select"}
        title="Выделение"
        onClick={() => {
          closeMenu();
          onToolChange("select");
        }}
      >
        <MousePointer2 className="w-4 h-4" strokeWidth={1.75} />
      </ToolBtn>

      <ToolBtn
        active={activeTool === "image"}
        title="Изображение"
        onClick={() => {
          closeMenu();
          onToolChange("image");
          onInsertImage();
        }}
      >
        <ImageIcon className="w-4 h-4" strokeWidth={1.75} />
      </ToolBtn>

      <div ref={textRef} className="relative">
        <ToolBtn
          active={activeTool === "text"}
          title="Текст"
          showChevron
          onClick={() => {
            onToolChange("text");
            onInsertText("heading");
          }}
          onChevronClick={() => setMenu((m) => (m === "text" ? null : "text"))}
        >
          <Type className="w-4 h-4" strokeWidth={1.75} />
        </ToolBtn>
        <DropdownMenu
          open={menu === "text"}
          anchorRef={textRef}
          onClose={closeMenu}
          items={[
            { label: "Заголовок", onClick: () => { onToolChange("text"); onInsertText("heading"); } },
            { label: "Подзаголовок", onClick: () => { onToolChange("text"); onInsertText("subheading"); } },
            { label: "Текст", onClick: () => { onToolChange("text"); onInsertText("body"); } },
            { label: "Маркированный список", onClick: () => { onToolChange("text"); onInsertText("bullet-list"); } },
          ]}
        />
      </div>

      <div ref={shapeRef} className="relative">
        <ToolBtn
          active={activeTool === "shape"}
          title="Фигуры"
          showChevron
          onClick={() => {
            onToolChange("shape");
            onInsertShape("rect");
          }}
          onChevronClick={() => setMenu((m) => (m === "shape" ? null : "shape"))}
        >
          <Shapes className="w-4 h-4" strokeWidth={1.75} />
        </ToolBtn>
        <DropdownMenu
          open={menu === "shape"}
          anchorRef={shapeRef}
          onClose={closeMenu}
          items={[
            { label: "Прямоугольник", onClick: () => { onToolChange("shape"); onInsertShape("rect"); } },
            { label: "Скруглённый", onClick: () => { onToolChange("shape"); onInsertShape("rounded-rect"); } },
            { label: "Круг / овал", onClick: () => { onToolChange("shape"); onInsertShape("ellipse"); } },
          ]}
        />
      </div>

      <div ref={lineRef} className="relative">
        <ToolBtn
          active={activeTool === "line"}
          title="Линия"
          showChevron
          onClick={() => {
            onToolChange("line");
            onInsertLine("horizontal");
          }}
          onChevronClick={() => setMenu((m) => (m === "line" ? null : "line"))}
        >
          <Minus className="w-4 h-4 rotate-[-35deg]" strokeWidth={1.75} />
        </ToolBtn>
        <DropdownMenu
          open={menu === "line"}
          anchorRef={lineRef}
          onClose={closeMenu}
          items={[
            { label: "Горизонтальная", onClick: () => { onToolChange("line"); onInsertLine("horizontal"); } },
            { label: "Вертикальная", onClick: () => { onToolChange("line"); onInsertLine("vertical"); } },
          ]}
        />
      </div>
    </div>
  );
}
