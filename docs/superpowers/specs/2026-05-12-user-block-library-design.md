# Пользовательская библиотека блоков — Design Spec

**Дата:** 2026-05-12
**Статус:** Approved
**Область:** `components/playground/lemnity-box/`, `components/zero-block-editor/`, `app/api/user-blocks/`, `prisma/schema.prisma`

---

## Цель

Добавить личную и командную библиотеку блоков: пользователь сохраняет секцию из GrapesJS Box Editor или Zero Block Editor в свою коллекцию и переиспользует её в любом проекте. Блоки отображаются в новой вкладке левого сайдбара GrapesJS с HTML-превью (CSS-масштабирование, без серверного скриншота).

---

## Область применения

- **Поддерживаемые типы блоков:** GrapesJS-секции (`blockType: "grapesjs"`) и Zero Block-секции (`blockType: "zero"`)
- **Видимость:** личный (только автор) или командный (все члены команды проекта)
- **Лимиты:** 200 личных блоков на пользователя, 500 командных на проект
- **Вне скопа:** публичная галерея, drag-and-drop вставка, версионирование блоков, скриншоты

---

## Модель данных

### Новая таблица `UserSavedBlock`

```prisma
model UserSavedBlock {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  teamProjectId String? // null = личный; задан = командный (привязан к Project.id)
  name        String
  blockType   String   // "grapesjs" | "zero"
  htmlContent String   @db.Text
  cssContent  String   @db.Text @default("")
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([userId])
  @@index([teamProjectId])
}
```

Командные блоки привязаны к `Project.id` как пространству команды — аналогично `CmsSiteMember`. Доступ к командным блокам проверяется через `requireProjectAccess(projectId, userId)` из `lib/auth-guards.ts`.

### Изменения в `User`

```prisma
savedBlocks UserSavedBlock[]
```

---

## API

| Метод | Путь | Описание |
|---|---|---|
| `GET` | `/api/user-blocks` | Список личных + командных (`?projectId=`) блоков без `htmlContent` |
| `POST` | `/api/user-blocks` | Сохранить блок; 429 при превышении лимита |
| `PATCH` | `/api/user-blocks/[id]` | Переименовать блок |
| `GET` | `/api/user-blocks/[id]` | Полный блок с `htmlContent` (lazy, при вставке) |
| `DELETE` | `/api/user-blocks/[id]` | Удалить (только автор) |

### GET `/api/user-blocks`

Query параметры: `projectId?` — если задан, возвращает личные + командные блоки проекта.

Ответ (без `htmlContent` — lazy загрузка):
```typescript
{
  blocks: Array<{
    id: string;
    name: string;
    blockType: "grapesjs" | "zero";
    scope: "personal" | "team";
    createdAt: string;
  }>
}
```

### POST `/api/user-blocks`

Тело:
```typescript
{
  name: string;          // max 100 символов
  blockType: "grapesjs" | "zero";
  htmlContent: string;   // min 1 символ
  cssContent?: string;
  teamProjectId?: string; // если командный
}
```

### GET `/api/user-blocks/[id]` (lazy html)

Возвращает полный блок включая `htmlContent` и `cssContent` — вызывается только при вставке.

### PATCH `/api/user-blocks/[id]`

Тело: `{ name: string }` — только переименование.

### DELETE `/api/user-blocks/[id]`

204 при успехе, 403 если не автор.

---

## Сервисный слой

Файл: `lib/user-saved-blocks.ts`

```typescript
export type UserSavedBlockMeta = {
  id: string;
  name: string;
  blockType: "grapesjs" | "zero";
  scope: "personal" | "team";
  createdAt: string;
};

export type UserSavedBlockFull = UserSavedBlockMeta & {
  htmlContent: string;
  cssContent: string;
};

export type CreateUserBlockInput = {
  userId: string;
  name: string;
  blockType: "grapesjs" | "zero";
  htmlContent: string;
  cssContent: string;
  teamProjectId?: string | null;
};

export async function listUserBlocks(userId: string, projectId?: string): Promise<UserSavedBlockMeta[]>
export async function createUserBlock(input: CreateUserBlockInput): Promise<UserSavedBlockMeta>
export async function getUserBlockById(id: string, userId: string): Promise<UserSavedBlockFull | null>
export async function renameUserBlock(id: string, userId: string, name: string): Promise<boolean>
export async function deleteUserBlock(id: string, userId: string): Promise<boolean>
```

Лимиты проверяются в `createUserBlock` через `count` перед `create`.

---

## UI-компоненты

### Новые файлы

| Файл | Описание |
|---|---|
| `components/playground/lemnity-box/lemnity-box-user-blocks-panel.tsx` | Панель «Мои блоки»: табы Личные/Команда, поиск, список с HTML-превью |
| `components/playground/lemnity-box/lemnity-box-save-block-dialog.tsx` | Диалог сохранения: ввод имени, выбор видимости |

### Изменяемые файлы

| Файл | Изменение |
|---|---|
| `components/playground/lemnity-box/lemnity-box-canvas-editor.tsx` | Добавить иконку 🗂 в icon rail сайдбара; регистрировать кнопку «Сохранить» в тулбаре секции |
| `components/zero-block-editor/zb-top-bar.tsx` | Добавить кнопку «В библиотеку» рядом с «Сохранить» |

### HTML-превью

Миниатюра рендерится CSS-трансформацией:
```tsx
<div style={{ width: 56, height: 40, overflow: "hidden", position: "relative" }}>
  <div
    style={{
      transform: "scale(0.15)",
      transformOrigin: "top left",
      position: "absolute",
      width: 380,
      pointerEvents: "none",
    }}
    dangerouslySetInnerHTML={{ __html: block.htmlContent }}
  />
</div>
```

`dangerouslySetInnerHTML` безопасен здесь: контент сохранён самим пользователем из его собственного редактора; внешние данные не попадают.

---

## Поток данных

### Сохранение из GrapesJS

1. Пользователь выбирает секцию → тулбар → «🗂 Сохранить»
2. `component.toHTML()` + `component.getStyle()` → открывается `LemnityBoxSaveBlockDialog`
3. Ввод имени, выбор Личный/Команда → `POST /api/user-blocks`
4. Toast «Блок сохранён» → панель обновляет список

### Сохранение из Zero Block

1. Кнопка «В библиотеку» в `ZbTopBar`
2. `editorRef.current.getHtmlCss(blockId)` → `LemnityBoxSaveBlockDialog` (переиспользуется)
3. `blockType: "zero"` → `POST /api/user-blocks`

### Вставка блока

1. Клик на блок в панели → `GET /api/user-blocks/[id]` (lazy, только при вставке)
2. GrapesJS: `editor.addComponents(htmlContent)` — аналогично `LemnityBoxBlockLibraryFlyout`
3. Zero-блоки: перед вставкой генерируется новый `data-ln-zero-id` через `cuid()` во избежание коллизий

### Удаление блока

1. Кнопка 🗑 в панели → `DELETE /api/user-blocks/[id]`
2. Оптимистичное обновление списка

---

## Граничные случаи

| Ситуация | Поведение |
|---|---|
| Лимит 200 личных / 500 командных | `apiError("Достигнут лимит блоков", 429)` |
| Пустой HTML секции | Кнопка «Сохранить» disabled, tooltip «Пустая секция» |
| Вставка Zero-блока дважды | Новый `data-ln-zero-id` генерируется при каждой вставке |
| Удаление командного блока не автором | `apiError("Forbidden", 403)` |
| Блок с устаревшими внешними шрифтами | HTML-превью отобразит без шрифта — это допустимо |
| Нет проекта (личный режим) | Таб «Команда» скрыт |

---

## Компонентное дерево

```
lemnity-box-canvas-editor.tsx
└─ LemnityBoxUserBlocksPanel     ← новая вкладка в icon rail
   ├─ [Личные / Команда табы]
   ├─ [Поиск]
   └─ UserBlockItem ×N
      └─ [HTML-превью (scale 0.15)]
      └─ [Rename / Delete]

lemnity-box-save-block-dialog.tsx  ← вызывается из GrapesJS и ZbTopBar
zb-top-bar.tsx                     ← добавить кнопку «В библиотеку»
```

---

## Ограничения / вне скопа

- Публичная галерея блоков — следующий этап
- Drag-and-drop вставка из панели — следующий этап
- Версионирование блоков (история правок)
- Серверный скриншот / thumbnail generation
- Теги и категоризация блоков
