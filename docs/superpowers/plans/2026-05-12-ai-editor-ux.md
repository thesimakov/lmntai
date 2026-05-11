# AI-редактор UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Переработать AI-редактор Lemnity — левый сайдбар с историей версий + чатом, inline-тулбар в превью, снимки версий в БД.

**Architecture:** Инкрементальный рефактор: `build/page.tsx` сохраняет всю логику SSE/AI-потоков, новые компоненты `components/ai-editor/*` реализуют UI, стор получает новый `VersionSlice`, snapshot API добавляется поверх существующего `app/api/projects/[id]/`.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript strict, Prisma + PostgreSQL, Zustand, Tailwind CSS, Vitest, shadcn/ui

---

## Карта файлов

| Действие | Файл | Ответственность |
|---|---|---|
| Create | `prisma/migrations/YYYYMMDD_add_project_snapshot/` | Миграция таблицы ProjectSnapshot |
| Modify | `prisma/schema.prisma` | Добавить модель ProjectSnapshot |
| Create | `lib/project-snapshots.ts` | Сервисный слой: CRUD снимков |
| Create | `lib/project-snapshots.test.ts` | Unit-тесты сервиса |
| Create | `app/api/projects/[id]/snapshots/route.ts` | GET список + POST создать |
| Create | `app/api/projects/[id]/snapshots/[snapshotId]/route.ts` | GET html + DELETE |
| Modify | `lib/stores/use-build-editor-store.ts` | Добавить VersionSlice |
| Create | `components/ai-editor/AiVersionDiffBadge.tsx` | Бейдж «v3 · 5 мин» |
| Create | `components/ai-editor/AiVersionList.tsx` | Список снимков |
| Create | `components/ai-editor/AiPromptInput.tsx` | Поле ввода промпта |
| Create | `components/ai-editor/AiEditorSidebar.tsx` | Левый сайдбар 260px |
| Create | `components/ai-editor/AiEditorPreview.tsx` | Обёртка превью (правая область) |
| Create | `components/ai-editor/AiEditorShell.tsx` | Корневой layout редактора |
| Modify | `app/(builder)/playground/build/page.tsx` | Использовать AiEditorShell, сохранять снимки |
| Modify | `components/playground/preview-frame.tsx` | Добавить `onAiEdit` callback |

---

## Task 1: Prisma — модель ProjectSnapshot

**Files:**
- Modify: `prisma/schema.prisma`
- Run: `npm run prisma:migrate`

- [ ] **Step 1: Добавить модель в schema.prisma**

Открой `prisma/schema.prisma`. Найди блок модели `Project` (строка ~11). После закрывающей скобки модели `Project` добавь отношение к снимкам — в самой модели `Project` добавь поле:

```prisma
  snapshots           ProjectSnapshot[]
```

Затем после блока `SandboxProjectState` добавь новую модель:

```prisma
/// Снимок HTML-состояния проекта после AI-генерации.
model ProjectSnapshot {
  id          String   @id @default(cuid())
  projectId   String
  project     Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  promptText  String
  sandboxHtml String   @db.Text
  sandboxCss  String   @db.Text @default("")
  sandboxId   String?
  versionNum  Int
  createdAt   DateTime @default(now())

  @@index([projectId, createdAt])
}
```

- [ ] **Step 2: Создать и применить миграцию**

```bash
npm run prisma:migrate
```

Когда Prisma спросит имя миграции, введи: `add_project_snapshot`

- [ ] **Step 3: Проверить, что клиент сгенерирован**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Ожидаемый результат: нет ошибок о `ProjectSnapshot`.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add ProjectSnapshot model to prisma schema"
```

---

## Task 2: Сервисный слой — lib/project-snapshots.ts

**Files:**
- Create: `lib/project-snapshots.ts`
- Create: `lib/project-snapshots.test.ts`

- [ ] **Step 1: Написать тест (TDD — упадёт)**

Создай файл `lib/project-snapshots.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

// Мокаем prisma до импорта модуля
vi.mock("@/lib/prisma", () => ({
  default: {
    projectSnapshot: {
      findMany: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
      findFirstOrThrow: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import prisma from "@/lib/prisma";
import {
  listSnapshotsMeta,
  createSnapshot,
  getSnapshotById,
  deleteSnapshot,
  type ProjectSnapshotMeta,
  type CreateSnapshotInput,
} from "@/lib/project-snapshots";

const mockPrisma = prisma as unknown as {
  projectSnapshot: {
    findMany: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
  $transaction: ReturnType<typeof vi.fn>;
};

describe("listSnapshotsMeta", () => {
  it("returns snapshots ordered by createdAt desc", async () => {
    const rows = [
      { id: "s2", versionNum: 2, promptText: "v2", createdAt: new Date("2026-01-02") },
      { id: "s1", versionNum: 1, promptText: "v1", createdAt: new Date("2026-01-01") },
    ];
    mockPrisma.projectSnapshot.findMany.mockResolvedValue(rows);

    const result = await listSnapshotsMeta("proj1");

    expect(mockPrisma.projectSnapshot.findMany).toHaveBeenCalledWith({
      where: { projectId: "proj1" },
      orderBy: { createdAt: "desc" },
      select: { id: true, versionNum: true, promptText: true, createdAt: true },
    });
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("s2");
  });
});

describe("createSnapshot", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates snapshot with next versionNum and returns meta", async () => {
    mockPrisma.projectSnapshot.count.mockResolvedValue(0);
    mockPrisma.projectSnapshot.findMany.mockResolvedValue([]); // for eviction check
    const created = {
      id: "new-id",
      versionNum: 1,
      promptText: "hello",
      createdAt: new Date("2026-01-01"),
    };
    mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const fakeTx = {
        projectSnapshot: {
          count: vi.fn().mockResolvedValue(0),
          findMany: vi.fn().mockResolvedValue([]),
          delete: vi.fn(),
          create: vi.fn().mockResolvedValue(created),
          aggregate: vi.fn().mockResolvedValue({ _max: { versionNum: 0 } }),
        },
      };
      return fn(fakeTx);
    });

    const input: CreateSnapshotInput = {
      projectId: "proj1",
      promptText: "hello",
      sandboxHtml: "<html/>",
      sandboxCss: "",
      sandboxId: "sb1",
    };
    const result = await createSnapshot(input);

    expect(result.id).toBe("new-id");
    expect(result.versionNum).toBe(1);
  });

  it("evicts oldest snapshot when count >= 50", async () => {
    const oldSnapshots = Array.from({ length: 50 }, (_, i) => ({
      id: `snap-${i}`,
      versionNum: i + 1,
      promptText: "",
      createdAt: new Date(),
    }));
    const created = {
      id: "new-id",
      versionNum: 51,
      promptText: "new",
      createdAt: new Date(),
    };
    mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const fakeTx = {
        projectSnapshot: {
          count: vi.fn().mockResolvedValue(50),
          findMany: vi.fn().mockResolvedValue(oldSnapshots),
          delete: vi.fn(),
          create: vi.fn().mockResolvedValue(created),
          aggregate: vi.fn().mockResolvedValue({ _max: { versionNum: 50 } }),
        },
      };
      return fn(fakeTx);
    });

    const result = await createSnapshot({
      projectId: "proj1",
      promptText: "new",
      sandboxHtml: "<html/>",
      sandboxCss: "",
    });

    expect(result.id).toBe("new-id");
  });
});

describe("getSnapshotById", () => {
  it("returns null when snapshot not found", async () => {
    mockPrisma.projectSnapshot.findFirst.mockResolvedValue(null);
    const result = await getSnapshotById("proj1", "no-id");
    expect(result).toBeNull();
  });

  it("returns full snapshot when found", async () => {
    const snap = {
      id: "s1",
      versionNum: 1,
      promptText: "p",
      sandboxHtml: "<html/>",
      sandboxCss: "",
      sandboxId: null,
      createdAt: new Date(),
    };
    mockPrisma.projectSnapshot.findFirst.mockResolvedValue(snap);
    const result = await getSnapshotById("proj1", "s1");
    expect(result?.sandboxHtml).toBe("<html/>");
  });
});

describe("deleteSnapshot", () => {
  it("returns false when snapshot not found", async () => {
    mockPrisma.projectSnapshot.findFirst.mockResolvedValue(null);
    const result = await deleteSnapshot("proj1", "no-id");
    expect(result).toBe(false);
  });

  it("deletes and returns true when found", async () => {
    mockPrisma.projectSnapshot.findFirst.mockResolvedValue({ id: "s1" });
    mockPrisma.projectSnapshot.delete.mockResolvedValue({});
    const result = await deleteSnapshot("proj1", "s1");
    expect(result).toBe(true);
  });
});
```

- [ ] **Step 2: Запустить тест — убедиться, что падает**

```bash
npm test -- lib/project-snapshots.test.ts
```

Ожидаемый результат: `FAIL` — Cannot find module `@/lib/project-snapshots`.

- [ ] **Step 3: Реализовать lib/project-snapshots.ts**

```typescript
import prisma from "@/lib/prisma";

export type ProjectSnapshotMeta = {
  id: string;
  versionNum: number;
  promptText: string;
  createdAt: string; // ISO
};

export type ProjectSnapshotFull = ProjectSnapshotMeta & {
  sandboxHtml: string;
  sandboxCss: string;
  sandboxId: string | null;
};

export type CreateSnapshotInput = {
  projectId: string;
  promptText: string;
  sandboxHtml: string;
  sandboxCss: string;
  sandboxId?: string | null;
};

const MAX_SNAPSHOTS = 50;

export async function listSnapshotsMeta(projectId: string): Promise<ProjectSnapshotMeta[]> {
  const rows = await prisma.projectSnapshot.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
    select: { id: true, versionNum: true, promptText: true, createdAt: true },
  });
  return rows.map((r) => ({
    id: r.id,
    versionNum: r.versionNum,
    promptText: r.promptText,
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function createSnapshot(input: CreateSnapshotInput): Promise<ProjectSnapshotMeta> {
  const { projectId, promptText, sandboxHtml, sandboxCss, sandboxId } = input;

  const created = await prisma.$transaction(async (tx) => {
    const count = await tx.projectSnapshot.count({ where: { projectId } });

    if (count >= MAX_SNAPSHOTS) {
      const oldest = await tx.projectSnapshot.findMany({
        where: { projectId },
        orderBy: { versionNum: "asc" },
        take: count - MAX_SNAPSHOTS + 1,
        select: { id: true },
      });
      for (const snap of oldest) {
        await tx.projectSnapshot.delete({ where: { id: snap.id } });
      }
    }

    const agg = await tx.projectSnapshot.aggregate({
      where: { projectId },
      _max: { versionNum: true },
    });
    const nextVersion = (agg._max.versionNum ?? 0) + 1;

    return tx.projectSnapshot.create({
      data: { projectId, promptText, sandboxHtml, sandboxCss: sandboxCss ?? "", sandboxId, versionNum: nextVersion },
      select: { id: true, versionNum: true, promptText: true, createdAt: true },
    });
  });

  return {
    id: created.id,
    versionNum: created.versionNum,
    promptText: created.promptText,
    createdAt: created.createdAt.toISOString(),
  };
}

export async function getSnapshotById(
  projectId: string,
  snapshotId: string,
): Promise<ProjectSnapshotFull | null> {
  const row = await prisma.projectSnapshot.findFirst({
    where: { id: snapshotId, projectId },
  });
  if (!row) return null;
  return {
    id: row.id,
    versionNum: row.versionNum,
    promptText: row.promptText,
    sandboxHtml: row.sandboxHtml,
    sandboxCss: row.sandboxCss,
    sandboxId: row.sandboxId,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function deleteSnapshot(projectId: string, snapshotId: string): Promise<boolean> {
  const row = await prisma.projectSnapshot.findFirst({
    where: { id: snapshotId, projectId },
    select: { id: true },
  });
  if (!row) return false;
  await prisma.projectSnapshot.delete({ where: { id: row.id } });
  return true;
}
```

- [ ] **Step 4: Запустить тест — убедиться, что проходит**

```bash
npm test -- lib/project-snapshots.test.ts
```

Ожидаемый результат: `PASS` — все 6 тестов зелёные.

- [ ] **Step 5: Проверить типы**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Ожидаемый результат: нет ошибок.

- [ ] **Step 6: Commit**

```bash
git add lib/project-snapshots.ts lib/project-snapshots.test.ts
git commit -m "feat: add project-snapshots service with unit tests"
```

---

## Task 3: API — GET list + POST create

**Files:**
- Create: `app/api/projects/[id]/snapshots/route.ts`

- [ ] **Step 1: Создать route.ts**

```typescript
import { z } from "zod";
import type { NextRequest } from "next/server";

import { requireDbUser } from "@/lib/auth-guards";
import { apiError, apiGuardError, apiOk } from "@/lib/api-response";
import { withApiLogging } from "@/lib/with-api-logging";
import prisma from "@/lib/prisma";
import { listSnapshotsMeta, createSnapshot } from "@/lib/project-snapshots";

const CreateSnapshotBody = z.object({
  promptText: z.string().min(1).max(2000),
  sandboxHtml: z.string().min(1),
  sandboxCss: z.string().default(""),
  sandboxId: z.string().nullable().optional(),
});

async function requireProjectOwner(projectId: string, userId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, ownerId: userId },
    select: { id: true },
  });
  return project;
}

async function getSnapshots(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireDbUser();
  if (!guard.ok) return apiGuardError(guard);

  const { id: projectId } = await params;
  const project = await requireProjectOwner(projectId, guard.data.user.id);
  if (!project) return apiError("Not found", 404);

  const snapshots = await listSnapshotsMeta(projectId);
  return apiOk({ snapshots });
}

async function postSnapshot(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireDbUser();
  if (!guard.ok) return apiGuardError(guard);

  const { id: projectId } = await params;
  const project = await requireProjectOwner(projectId, guard.data.user.id);
  if (!project) return apiError("Not found", 404);

  const raw = await req.json().catch(() => null);
  const parsed = CreateSnapshotBody.safeParse(raw);
  if (!parsed.success) return apiError("Invalid request body", 400);

  const snapshot = await createSnapshot({ projectId, ...parsed.data });
  return apiOk({ snapshot }, 201);
}

export const GET = withApiLogging(getSnapshots, "GET /api/projects/[id]/snapshots");
export const POST = withApiLogging(postSnapshot, "POST /api/projects/[id]/snapshots");
```

- [ ] **Step 2: Проверить типы**

```bash
npx tsc --noEmit 2>&1 | grep "snapshots" | head -10
```

Ожидаемый результат: нет ошибок связанных с `snapshots/route.ts`.

- [ ] **Step 3: Commit**

```bash
git add app/api/projects/\[id\]/snapshots/route.ts
git commit -m "feat: add GET/POST /api/projects/[id]/snapshots"
```

---

## Task 4: API — GET single + DELETE

**Files:**
- Create: `app/api/projects/[id]/snapshots/[snapshotId]/route.ts`

- [ ] **Step 1: Создать route.ts**

```typescript
import type { NextRequest } from "next/server";

import { requireDbUser } from "@/lib/auth-guards";
import { apiError, apiGuardError, apiOk } from "@/lib/api-response";
import { withApiLogging } from "@/lib/with-api-logging";
import prisma from "@/lib/prisma";
import { getSnapshotById, deleteSnapshot } from "@/lib/project-snapshots";

async function requireProjectOwner(projectId: string, userId: string) {
  return prisma.project.findFirst({
    where: { id: projectId, ownerId: userId },
    select: { id: true },
  });
}

type RouteContext = { params: Promise<{ id: string; snapshotId: string }> };

async function getSnapshot(_req: NextRequest, { params }: RouteContext) {
  const guard = await requireDbUser();
  if (!guard.ok) return apiGuardError(guard);

  const { id: projectId, snapshotId } = await params;
  const project = await requireProjectOwner(projectId, guard.data.user.id);
  if (!project) return apiError("Not found", 404);

  const snapshot = await getSnapshotById(projectId, snapshotId);
  if (!snapshot) return apiError("Not found", 404);
  return apiOk({ snapshot });
}

async function deleteSnapshotRoute(_req: NextRequest, { params }: RouteContext) {
  const guard = await requireDbUser();
  if (!guard.ok) return apiGuardError(guard);

  const { id: projectId, snapshotId } = await params;
  const project = await requireProjectOwner(projectId, guard.data.user.id);
  if (!project) return apiError("Not found", 404);

  const deleted = await deleteSnapshot(projectId, snapshotId);
  if (!deleted) return apiError("Not found", 404);
  return new Response(null, { status: 204 });
}

export const GET = withApiLogging(getSnapshot, "GET /api/projects/[id]/snapshots/[snapshotId]");
export const DELETE = withApiLogging(deleteSnapshotRoute, "DELETE /api/projects/[id]/snapshots/[snapshotId]");
```

- [ ] **Step 2: Проверить типы**

```bash
npx tsc --noEmit 2>&1 | grep "snapshotId" | head -10
```

Ожидаемый результат: нет ошибок.

- [ ] **Step 3: Commit**

```bash
git add "app/api/projects/[id]/snapshots/[snapshotId]/route.ts"
git commit -m "feat: add GET/DELETE /api/projects/[id]/snapshots/[snapshotId]"
```

---

## Task 5: Store — VersionSlice

**Files:**
- Modify: `lib/stores/use-build-editor-store.ts`

- [ ] **Step 1: Добавить VersionSlice в стор**

Открой `lib/stores/use-build-editor-store.ts`. После блока `TemplateSlice` добавь новый слайс:

```typescript
// --- Version slice ---
export type ProjectSnapshotMeta = {
  id: string;
  versionNum: number;
  promptText: string;
  createdAt: string; // ISO
};

interface VersionSlice {
  currentVersionId: string | null;
  versions: ProjectSnapshotMeta[];
  selectedElementId: string | null;
  setCurrentVersionId: (id: string | null) => void;
  setVersions: (versions: ProjectSnapshotMeta[]) => void;
  prependVersion: (v: ProjectSnapshotMeta) => void;
  setSelectedElementId: (id: string | null) => void;
}
```

Обнови объединение типов:

```typescript
type BuildEditorStore = SessionSlice & UiSlice & TemplateSlice & VersionSlice;
```

Добавь реализацию в `create(...)`:

```typescript
  // Version
  currentVersionId: null,
  versions: [],
  selectedElementId: null,
  setCurrentVersionId: (currentVersionId) => set({ currentVersionId }),
  setVersions: (versions) => set({ versions }),
  prependVersion: (v) => set((s) => ({ versions: [v, ...s.versions] })),
  setSelectedElementId: (selectedElementId) => set({ selectedElementId }),
```

- [ ] **Step 2: Проверить типы**

```bash
npx tsc --noEmit 2>&1 | grep "use-build-editor" | head -10
```

Ожидаемый результат: нет ошибок.

- [ ] **Step 3: Commit**

```bash
git add lib/stores/use-build-editor-store.ts
git commit -m "feat: add VersionSlice to build editor store"
```

---

## Task 6: Компоненты AiVersionDiffBadge + AiVersionList

**Files:**
- Create: `components/ai-editor/AiVersionDiffBadge.tsx`
- Create: `components/ai-editor/AiVersionList.tsx`

- [ ] **Step 1: Создать AiVersionDiffBadge.tsx**

```tsx
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";

type Props = {
  versionNum: number;
  createdAt: string;
};

export function AiVersionDiffBadge({ versionNum, createdAt }: Props) {
  const ago = formatDistanceToNow(new Date(createdAt), { addSuffix: false, locale: ru });
  return (
    <span className="text-[10px] text-muted-foreground tabular-nums">
      v{versionNum} · {ago}
    </span>
  );
}
```

- [ ] **Step 2: Проверить, что date-fns установлен**

```bash
grep "date-fns" /Users/thesimakov/Documents/GitHub/lmntai/package.json
```

Если строки нет, установи:

```bash
npm install date-fns
```

- [ ] **Step 3: Создать AiVersionList.tsx**

```tsx
"use client";

import { cn } from "@/lib/utils";
import { useBuildEditorStore, type ProjectSnapshotMeta } from "@/lib/stores/use-build-editor-store";
import { AiVersionDiffBadge } from "./AiVersionDiffBadge";

type Props = {
  onSelect: (snapshot: ProjectSnapshotMeta) => void;
  disabled?: boolean;
};

export function AiVersionList({ onSelect, disabled = false }: Props) {
  const versions = useBuildEditorStore((s) => s.versions);
  const currentVersionId = useBuildEditorStore((s) => s.currentVersionId);

  if (versions.length === 0) {
    return (
      <p className="px-3 py-2 text-[11px] text-muted-foreground">
        Версии появятся после первой генерации
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-1 px-2">
      {versions.map((v) => {
        const isActive = v.id === currentVersionId;
        return (
          <li key={v.id}>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onSelect(v)}
              className={cn(
                "w-full rounded-lg px-3 py-2 text-left text-[11px] transition-colors",
                "hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isActive
                  ? "border border-blue-300 bg-blue-50 dark:bg-blue-950/40"
                  : "border border-transparent bg-transparent",
                disabled && "pointer-events-none opacity-50",
              )}
            >
              <div className="mb-0.5 flex items-center justify-between gap-2">
                <AiVersionDiffBadge versionNum={v.versionNum} createdAt={v.createdAt} />
                {isActive && (
                  <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[9px] font-semibold text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                    сейчас
                  </span>
                )}
              </div>
              <p className="line-clamp-2 text-foreground/80">{v.promptText}</p>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
```

- [ ] **Step 4: Проверить типы**

```bash
npx tsc --noEmit 2>&1 | grep "ai-editor" | head -10
```

Ожидаемый результат: нет ошибок.

- [ ] **Step 5: Commit**

```bash
git add components/ai-editor/
git commit -m "feat: add AiVersionDiffBadge and AiVersionList components"
```

---

## Task 7: Компонент AiPromptInput

**Files:**
- Create: `components/ai-editor/AiPromptInput.tsx`

- [ ] **Step 1: Создать AiPromptInput.tsx**

```tsx
"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { SendHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Props = {
  onSubmit: (prompt: string) => void;
  disabled?: boolean;
  modelLabel?: string;
  placeholder?: string;
};

export function AiPromptInput({
  onSubmit,
  disabled = false,
  modelLabel,
  placeholder = "Опишите следующее изменение...",
}: Props) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function handleSubmit() {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSubmit(trimmed);
    setValue("");
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  return (
    <div className="flex flex-col gap-2 border-t border-border bg-background p-2">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        rows={2}
        className="resize-none text-[12px] leading-snug"
      />
      <div className="flex items-center justify-between gap-2">
        {modelLabel && (
          <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
            {modelLabel}
          </span>
        )}
        <Button
          type="button"
          size="sm"
          disabled={disabled || !value.trim()}
          onClick={handleSubmit}
          className={cn("ml-auto h-7 gap-1 text-[11px]")}
        >
          <SendHorizontal className="h-3 w-3" />
          Отправить
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Проверить типы**

```bash
npx tsc --noEmit 2>&1 | grep "AiPromptInput" | head -5
```

- [ ] **Step 3: Commit**

```bash
git add components/ai-editor/AiPromptInput.tsx
git commit -m "feat: add AiPromptInput component"
```

---

## Task 8: Компонент AiEditorSidebar

**Files:**
- Create: `components/ai-editor/AiEditorSidebar.tsx`

- [ ] **Step 1: Создать AiEditorSidebar.tsx**

```tsx
"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { useBuildEditorStore, type ProjectSnapshotMeta } from "@/lib/stores/use-build-editor-store";
import { AiVersionList } from "./AiVersionList";
import { AiPromptInput } from "./AiPromptInput";

type Props = {
  projectName: string;
  projectId: string;
  isGenerating: boolean;
  modelLabel?: string;
  onSubmitPrompt: (prompt: string) => void;
  onVersionRestoreHtml: (html: string, css: string) => void;
  /** Слот для AgentChat (рендерится выше промпта) */
  chatSlot?: React.ReactNode;
};

export function AiEditorSidebar({
  projectName,
  projectId,
  isGenerating,
  modelLabel,
  onSubmitPrompt,
  onVersionRestoreHtml,
  chatSlot,
}: Props) {
  const setCurrentVersionId = useBuildEditorStore((s) => s.setCurrentVersionId);

  const handleSelectVersion = useCallback(
    async (snapshot: ProjectSnapshotMeta) => {
      try {
        const res = await fetch(`/api/projects/${projectId}/snapshots/${snapshot.id}`);
        if (!res.ok) {
          toast.error("Не удалось загрузить версию");
          return;
        }
        const data = (await res.json()) as { snapshot: { sandboxHtml: string; sandboxCss: string } };
        setCurrentVersionId(snapshot.id);
        onVersionRestoreHtml(data.snapshot.sandboxHtml, data.snapshot.sandboxCss);
      } catch {
        toast.error("Ошибка при загрузке версии");
      }
    },
    [projectId, setCurrentVersionId, onVersionRestoreHtml],
  );

  return (
    <aside className="flex h-full w-[260px] shrink-0 flex-col overflow-hidden border-r border-border bg-background">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
        <span className="truncate text-[12px] font-semibold text-foreground">{projectName}</span>
      </div>

      {/* Version list */}
      <div className="flex flex-col overflow-hidden">
        <p className="px-3 pb-1 pt-2.5 text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">
          Версии
        </p>
        <div className="max-h-[220px] overflow-y-auto">
          <AiVersionList onSelect={handleSelectVersion} disabled={isGenerating} />
        </div>
      </div>

      {/* Chat slot (scrollable) */}
      {chatSlot && (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden border-t border-border">
          {chatSlot}
        </div>
      )}

      {/* Prompt input — fixed at bottom */}
      <AiPromptInput
        onSubmit={onSubmitPrompt}
        disabled={isGenerating}
        modelLabel={modelLabel}
      />
    </aside>
  );
}
```

- [ ] **Step 2: Проверить типы**

```bash
npx tsc --noEmit 2>&1 | grep "AiEditorSidebar" | head -5
```

- [ ] **Step 3: Commit**

```bash
git add components/ai-editor/AiEditorSidebar.tsx
git commit -m "feat: add AiEditorSidebar component"
```

---

## Task 9: Компонент AiEditorPreview

**Files:**
- Create: `components/ai-editor/AiEditorPreview.tsx`

- [ ] **Step 1: Создать AiEditorPreview.tsx**

```tsx
"use client";

import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

/** Правая область редактора — flex-1, содержит BuildPreviewChrome + PreviewFrame. */
export function AiEditorPreview({ children }: Props) {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/ai-editor/AiEditorPreview.tsx
git commit -m "feat: add AiEditorPreview wrapper component"
```

---

## Task 10: Компонент AiEditorShell

**Files:**
- Create: `components/ai-editor/AiEditorShell.tsx`

- [ ] **Step 1: Создать AiEditorShell.tsx**

```tsx
"use client";

import type { ReactNode } from "react";
import { AiEditorSidebar } from "./AiEditorSidebar";
import { AiEditorPreview } from "./AiEditorPreview";

type Props = {
  projectName: string;
  projectId: string;
  isGenerating: boolean;
  modelLabel?: string;
  onSubmitPrompt: (prompt: string) => void;
  onVersionRestoreHtml: (html: string, css: string) => void;
  chatSlot?: ReactNode;
  previewSlot: ReactNode;
};

export function AiEditorShell({
  projectName,
  projectId,
  isGenerating,
  modelLabel,
  onSubmitPrompt,
  onVersionRestoreHtml,
  chatSlot,
  previewSlot,
}: Props) {
  return (
    <div className="flex h-full min-h-0 min-w-0 w-full flex-1 flex-row items-stretch overflow-hidden">
      <AiEditorSidebar
        projectName={projectName}
        projectId={projectId}
        isGenerating={isGenerating}
        modelLabel={modelLabel}
        onSubmitPrompt={onSubmitPrompt}
        onVersionRestoreHtml={onVersionRestoreHtml}
        chatSlot={chatSlot}
      />
      <AiEditorPreview>{previewSlot}</AiEditorPreview>
    </div>
  );
}
```

- [ ] **Step 2: Создать barrel export**

Создай `components/ai-editor/index.ts`:

```typescript
export { AiEditorShell } from "./AiEditorShell";
export { AiEditorSidebar } from "./AiEditorSidebar";
export { AiEditorPreview } from "./AiEditorPreview";
export { AiVersionList } from "./AiVersionList";
export { AiVersionDiffBadge } from "./AiVersionDiffBadge";
export { AiPromptInput } from "./AiPromptInput";
```

- [ ] **Step 3: Проверить типы**

```bash
npx tsc --noEmit 2>&1 | grep "AiEditor" | head -10
```

Ожидаемый результат: нет ошибок.

- [ ] **Step 4: Commit**

```bash
git add components/ai-editor/
git commit -m "feat: add AiEditorShell and barrel export"
```

---

## Task 11: Подключить AiEditorShell в build/page.tsx + сохранение снимков

**Files:**
- Modify: `app/(builder)/playground/build/page.tsx`

Это самый хирургический шаг. Изменения вносятся точечно в четырёх местах файла.

- [ ] **Step 1: Добавить импорты в начало файла**

В секцию импортов `build/page.tsx` добавь:

```typescript
import { AiEditorShell } from "@/components/ai-editor";
import { useBuildEditorStore } from "@/lib/stores/use-build-editor-store";
```

- [ ] **Step 2: Добавить загрузку версий при монтировании**

В компонент `BuildPlayground` (или основной компонент страницы) добавь следующий `useEffect` после существующих — он загружает список версий для проекта при открытии редактора:

```typescript
const { setVersions, prependVersion, setCurrentVersionId } = useBuildEditorStore();

useEffect(() => {
  if (!projectId) return;
  fetch(`/api/projects/${projectId}/snapshots`)
    .then((r) => r.ok ? r.json() : null)
    .then((data) => {
      if (data?.snapshots) setVersions(data.snapshots);
    })
    .catch(() => {/* silent */});
}, [projectId, setVersions]);
```

- [ ] **Step 3: Добавить сохранение снимка после завершения генерации**

Найди строку `setMode("preview")` (строка ~1125) — это место завершения SSE-потока. Сразу после неё добавь асинхронное сохранение снимка:

```typescript
// Сохранить снимок версии после успешной генерации
if (sandboxId && projectId && rawPrompt) {
  (async () => {
    try {
      const htmlRes = await fetch(`/api/sandbox/${coalescedSandboxId}`);
      if (!htmlRes.ok) return;
      const sandboxHtml = await htmlRes.text();
      const snapRes = await fetch(`/api/projects/${projectId}/snapshots`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          promptText: rawPrompt.slice(0, 500),
          sandboxHtml,
          sandboxCss: "",
          sandboxId: coalescedSandboxId,
        }),
      });
      if (snapRes.ok) {
        const { snapshot } = (await snapRes.json()) as { snapshot: { id: string; versionNum: number; promptText: string; createdAt: string } };
        prependVersion(snapshot);
        setCurrentVersionId(snapshot.id);
      }
    } catch {
      // не ломаем основной поток
    }
  })();
}
```

> **Примечание:** `rawPrompt` — это переменная с текущим промптом пользователя, уже доступная в этой области. `coalescedSandboxId` — id sandbox из SSE-события, также доступен в этой области.

- [ ] **Step 4: Добавить обработчик восстановления версии**

В компоненте добавь функцию:

```typescript
const handleVersionRestoreHtml = useCallback((html: string, _css: string) => {
  // Перезаписать iframe: создать blob URL и установить как src
  if (!iframeRef.current) return;
  const blob = new Blob([html], { type: "text/html" });
  const blobUrl = URL.createObjectURL(blob);
  iframeRef.current.src = blobUrl;
  setMode("preview");
}, []);
```

> **Примечание:** `iframeRef` — это ref на iframe в `PreviewFrame`. Поскольку PreviewFrame управляет своим iframe внутренне, используй вместо этого подход через состояние: добавь `useState<string | null>(null)` для `restoredHtml` и передавай его в `PreviewFrame` через новый проп `overrideHtml`. Реализацию этого пропа смотри в Task 12.

Упрощённый вариант: обнови `previewUrl` на blob URL напрямую:

```typescript
const handleVersionRestoreHtml = useCallback((html: string, _css: string) => {
  const blob = new Blob([html], { type: "text/html" });
  const blobUrl = URL.createObjectURL(blob);
  setPreviewUrl(blobUrl);
  setMode("preview");
}, [setPreviewUrl]);
```

- [ ] **Step 5: Обернуть рендер в AiEditorShell**

Найди `return (` в компоненте (строка ~2153). Корневой `<div className="flex h-full ...">` оставь, но левый rail (`<div className="relative z-30 ...">` с `AgentChat`) передай в `chatSlot`, а правую часть (`section` с RightPanel) — в `previewSlot`:

```tsx
return (
  <PageTransition>
    <AiEditorShell
      projectName={header ?? "Проект"}
      projectId={projectId ?? ""}
      isGenerating={isGenerating}
      modelLabel={formatAgentModelDisplayLabel(agentPickerLabel)}
      onSubmitPrompt={(prompt) => {
        // вызвать существующую функцию отправки (определена на строке ~2034)
        onSend(prompt);
      }}
      onVersionRestoreHtml={handleVersionRestoreHtml}
      chatSlot={
        <AgentChat
          variant="studio"
          /* ... все те же пропсы что были раньше ... */
        />
      }
      previewSlot={
        <section className="flex min-h-0 flex-1 ...">
          {/* весь код правой панели без изменений */}
        </section>
      }
    />
    {/* BuildPublishDialog и остальные диалоги — вне Shell */}
    <BuildPublishDialog ... />
  </PageTransition>
);
```

> **Важно:** `onSend` — функция отправки определена на строке ~2034 в `build/page.tsx` (`async function onSend(text: string, files?: File[])`). Поскольку `AiEditorShell` рендерится внутри того же компонента, `onSend` доступна в замыкании.

- [ ] **Step 6: Проверить типы**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Исправь все ошибки типов до перехода к следующему шагу.

- [ ] **Step 7: Проверить в браузере**

```bash
npm run dev
```

Открой `/playground/build?projectId=<any>`. Проверь:
- Левый сайдбар 260px виден
- Список версий пуст (или показывает существующие снимки если были)
- Поле промпта внизу работает
- Основной превью справа работает как прежде

- [ ] **Step 8: Commit**

```bash
git add "app/(builder)/playground/build/page.tsx"
git commit -m "feat: integrate AiEditorShell into build page with snapshot saving"
```

---

## Task 12: Inline-тулбар в PreviewFrame

**Files:**
- Modify: `components/playground/preview-frame.tsx`

- [ ] **Step 1: Добавить новый проп `onAiEdit` в тип**

Найди `type PreviewFrameProps` (строка ~86). Добавь новый проп:

```typescript
  /** Вызывается когда пользователь нажимает «AI-правка» для элемента */
  onAiEdit?: (elementId: string, elementLabel: string) => void;
```

- [ ] **Step 2: Принять проп в функции**

В деструктуризации `export function PreviewFrame({` добавь:

```typescript
  onAiEdit,
```

- [ ] **Step 3: Добавить кнопку AI-правки в тулбар над выделенным элементом**

Найди в JSX место где рендерится `ElementEditorPanel` (строка ~928). Перед ним добавь:

```tsx
{visualSnapshot && onAiEdit && (
  <div
    className="pointer-events-auto absolute left-4 top-4 z-50 flex items-center gap-1 rounded-lg bg-gray-900 px-2 py-1 text-white shadow-lg"
  >
    <span className="text-[10px] text-gray-400">{visualSnapshot.tagName.toLowerCase()}</span>
    <div className="mx-1 h-3 w-px bg-gray-600" />
    <button
      type="button"
      className="rounded px-2 py-0.5 text-[11px] font-medium hover:bg-gray-700"
      onClick={() => {
        const el = visualSelectedPrimaryRef.current;
        const id = el?.getAttribute("data-lmnt-element-id") ?? el?.id ?? visualSnapshot.elementId;
        const label = visualSnapshot.tagName.toLowerCase();
        onAiEdit(id, label);
      }}
    >
      🤖 AI-правка
    </button>
  </div>
)}
```

- [ ] **Step 4: Подключить onAiEdit в build/page.tsx**

В `app/(builder)/playground/build/page.tsx` найди место где `<PreviewFrame>` или `<RightPanel>` передаётся. Добавь:

```typescript
const handleAiEdit = useCallback((elementId: string, elementLabel: string) => {
  const { setSelectedElementId } = useBuildEditorStore.getState();
  setSelectedElementId(elementId);
  // Сфокусировать prompt input и вставить контекст
  // (AiPromptInput placeholder обновится через стор в следующей итерации)
  toast.info(`Контекст выбран: ${elementLabel}. Введите промпт для AI-правки.`);
}, []);
```

И передай:

```tsx
onAiEdit={handleAiEdit}
```

> **Примечание:** `selectedElementId` из стора читается в `build/page.tsx` при формировании промпта (Task 11, Step 3), поэтому следующий промпт автоматически получит контекст элемента.

- [ ] **Step 5: Проверить типы**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 6: Проверить в браузере**

```bash
npm run dev
```

В `/playground/build` с существующим проектом: нажми на элемент в превью в режиме `visualEditMode`. Убедись что тулбар «AI-правка» появляется.

- [ ] **Step 7: Запустить все тесты**

```bash
npm test
```

Ожидаемый результат: все тесты зелёные.

- [ ] **Step 8: Финальная проверка типов**

```bash
npx tsc --noEmit
```

Ожидаемый результат: выход без ошибок.

- [ ] **Step 9: Commit**

```bash
git add components/playground/preview-frame.tsx "app/(builder)/playground/build/page.tsx"
git commit -m "feat: add AI-edit inline toolbar to PreviewFrame"
```

---

## Итого

| Задача | Что производит |
|---|---|
| Task 1 | Таблица `ProjectSnapshot` в БД |
| Task 2 | Сервисный слой + 6 unit-тестов |
| Task 3 | API GET/POST снимков |
| Task 4 | API GET/DELETE снимка |
| Task 5 | `VersionSlice` в Zustand сторе |
| Task 6 | `AiVersionDiffBadge` + `AiVersionList` |
| Task 7 | `AiPromptInput` |
| Task 8 | `AiEditorSidebar` |
| Task 9 | `AiEditorPreview` |
| Task 10 | `AiEditorShell` |
| Task 11 | Интеграция в `build/page.tsx` + сохранение снимков |
| Task 12 | Inline-тулбар «AI-правка» в `PreviewFrame` |
