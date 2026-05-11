# AI-редактор UX — Design Spec

**Дата:** 2026-05-12
**Статус:** Approved
**Область:** `app/(builder)/playground/build/`, `components/ai-editor/`, `app/api/projects/[id]/snapshots/`

---

## Цель

Переработать AI-редактор (`build/page.tsx`) по образцу lovable.dev: левый фиксированный сайдбар с историей версий и чатом, центральная область превью с inline-тулбаром для выбора и AI-правки элементов. Версии персистируются в БД.

---

## Раскладка (Layout A — Lovable-стиль)

```
┌──────────────────────────────────────────────────────┐
│  AiEditorShell                                       │
│  ┌─────────────┐  ┌───────────────────────────────┐  │
│  │AiEditorSide-│  │      AiEditorPreview          │  │
│  │bar (260px)  │  │  ┌─────────────────────────┐  │  │
│  │             │  │  │  BuildPreviewChrome      │  │  │
│  │  Версии     │  │  └─────────────────────────┘  │  │
│  │  v4 ●       │  │  ┌─────────────────────────┐  │  │
│  │  v3         │  │  │   PreviewFrame (iframe)  │  │  │
│  │  v2         │  │  │   + inline toolbar       │  │  │
│  │  v1         │  │  └─────────────────────────┘  │  │
│  │  ──────     │  └───────────────────────────────┘  │
│  │  Чат        │                                      │
│  │  ──────     │                                      │
│  │  Промпт     │                                      │
│  └─────────────┘                                      │
└──────────────────────────────────────────────────────┘
```

---

## Компонентная архитектура

### Новые файлы

| Файл | Описание |
|---|---|
| `components/ai-editor/AiEditorShell.tsx` | Корневой layout: flex-row, сайдбар + превью |
| `components/ai-editor/AiEditorSidebar.tsx` | 260px фикс.: список версий + AgentChat + промпт |
| `components/ai-editor/AiVersionList.tsx` | Прокручиваемый список снимков |
| `components/ai-editor/AiVersionDiffBadge.tsx` | Бейдж «v3 · 5 мин назад» |
| `components/ai-editor/AiPromptInput.tsx` | Textarea + кнопка + выбор модели |
| `components/ai-editor/AiEditorPreview.tsx` | Обёртка PreviewFrame + тулбар устройств |
| `app/api/projects/[id]/snapshots/route.ts` | GET (список мета), POST (создать снимок) |
| `app/api/projects/[id]/snapshots/[snapshotId]/route.ts` | GET (html), DELETE |

### Изменяемые файлы

| Файл | Изменение |
|---|---|
| `app/(builder)/playground/build/page.tsx` | Рендерит только `<AiEditorShell>`, логика потоков без изменений |
| `components/playground/preview-frame.tsx` | Добавить экшены «✏️ Текст», «🤖 AI-правка» в `ElementEditorPanel` |
| `lib/stores/use-build-editor-store.ts` | Добавить: `currentVersionId`, `versions[]`, `selectedElementId` |

### Дерево компонентов (runtime)

```
build/page.tsx
└─ AiEditorShell
   ├─ AiEditorSidebar
   │   ├─ AiVersionList → AiVersionDiffBadge ×N
   │   ├─ AgentChat (существующий, без изменений)
   │   └─ AiPromptInput
   └─ AiEditorPreview
       ├─ BuildPreviewChrome (существующий)
       └─ PreviewFrame (+ inline toolbar)
```

---

## Модель данных

### Новая таблица `ProjectSnapshot`

```prisma
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

### Изменения в `use-build-editor-store.ts`

```typescript
type ProjectSnapshotMeta = {
  id: string;
  versionNum: number;
  promptText: string;
  createdAt: string; // ISO
};

// Добавить в стор:
currentVersionId: string | null;
versions: ProjectSnapshotMeta[];   // без html, только мета
selectedElementId: string | null;  // для контекста AI-правки
```

### API

| Метод | Путь | Описание |
|---|---|---|
| GET | `/api/projects/[id]/snapshots` | Список мета (id, versionNum, promptText, createdAt), без html |
| POST | `/api/projects/[id]/snapshots` | Создать снимок; при >50 удаляет самый старый |
| GET | `/api/projects/[id]/snapshots/[snapshotId]` | Полный снимок с html (lazy) |
| DELETE | `/api/projects/[id]/snapshots/[snapshotId]` | Удалить версию |

---

## Сайдбар — поведение

- Ширина 260px, фиксированная, не схлопывается
- Верхняя зона: название проекта + кнопка «+ Новый»
- Список версий: активная подсвечена синей рамкой; остальные кликабельны
- При клике на версию — `GET /api/.../snapshots/[id]` (lazy), html загружается в iframe
- Новый промпт при просматриваемой старой версии отправляется как обычно (sandbox state — текущий); новый снимок добавляется в конец линейного списка. Ветвление не поддерживается.
- Пока идёт генерация — версии в списке disabled
- Чат (`AgentChat`) показывает историю сообщений текущей сессии
- Промпт внизу фиксирован; выбор модели — рядом с кнопкой отправки

---

## Inline-тулбар

**Триггер:** наведение на секцию → тонкая синяя рамка; клик → тулбар закрепляется.

**Состав тулбара:**

```
[ ✏️ Текст | 🎨 Стиль | 🤖 AI-правка | 🗑 ]
```

- **✏️ Текст** — открывает существующий `ElementEditorPanel` (inline-редактирование)
- **🎨 Стиль** — открывает существующую правую панель стилей
- **🤖 AI-правка** — разворачивает мини-инпут внизу превью с контекстом секции; промпт отправляется в основной поток с префиксом `[Контекст: секция #<elementId>] `
- **🗑** — удалить секцию (с подтверждением)

Реализация: расширение `attachVisualPreviewEditor` / `VisualPreviewEditorHandle` в `preview-frame.tsx`. `selectedElementId` пишется в стор — `build/page.tsx` читает его при формировании промпта.

---

## Поток данных

### Генерация

1. `AiPromptInput.onSubmit(prompt)` → `build/page.tsx` берёт `selectedElementId` из стора, формирует `finalPrompt`
2. SSE-поток запускается (текущий механизм не меняется)
3. По завершении потока — `POST /api/projects/[id]/snapshots` с html/css из iframe
4. `versions[]` в сторе обновляется, `currentVersionId` = новый id
5. `AiVersionList` перерисовывается

### Восстановление версии

1. Клик на версию → `GET /api/projects/[id]/snapshots/[id]`
2. Html прокидывается в `PreviewFrame`
3. `currentVersionId` = id выбранной версии

---

## Граничные случаи

| Ситуация | Поведение |
|---|---|
| Поток прерван (network error) | Снимок не создаётся; toast с ошибкой |
| 50 версий исчерпаны | Сервер удаляет `versionNum = min`, создаёт новую; фронт получает обновлённый список |
| AI-правка без sandbox | Кнопка disabled, tooltip «Сначала сгенерируйте страницу» |
| Переключение версии во время генерации | Версии в списке disabled |
| Legacy-режим (без Lemnity AI bridge) | `AiEditorShell` рендерится одинаково; поток через `/api/generate-stream` |

---

## Ограничения / вне скоупа

- Ветвление версий (дерево) — только линейная история
- Диффы между версиями (side-by-side) — не в этом спеке
- Экспорт отдельной версии — не в этом спеке
- Дизайн-система / стилистика — отдельный подпроект (#5)
