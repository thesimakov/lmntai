# Build Editor — Lovable-style Refactor

**Date:** 2026-05-12  
**Status:** Approved  
**Scope:** `app/(builder)/playground/build/page.tsx` и связанный слой логики

---

## Проблема

`build/page.tsx` — 2601 строка:
- 30+ `useState`, 10+ `useRef` в одном компоненте
- Две параллельные AI-системы (legacy `/api/generate-stream` + lemnity-ai bridge) с `shouldUseLemnityAiBridge` ветками по всему файлу
- SSE-парсинг, session management, prompt-coach, preview sync, handoff — всё в одном месте
- Session ID дублируется в state (`lemnityAiSessionId`) И в ref (`activeLemnityAiBridgeSessionRef`) — источник sync-багов
- `window.dispatchEvent(new CustomEvent(...))` вместо store

---

## Решение: Lovable-thin-page (Подход A)

Страница становится тонкой оберткой (~250 строк). Вся логика уходит в хуки и Zustand store.

---

## Архитектура

### Новые файлы

| Файл | Ответственность |
|------|-----------------|
| `hooks/use-ai-session.ts` | Сессия + SSE-стрим (create/load/send/cancel) |
| `hooks/use-prompt-coach.ts` | Промпт-коуч: stages, runPromptCoach, slow-hint |
| `hooks/use-build-handoff.ts` | Handoff из landing (sessionStorage guard, один раз при маунте) |

### Изменённые файлы

| Файл | Изменение |
|------|-----------|
| `lib/stores/use-build-editor-store.ts` | Добавляем все 30+ state-слайсов |
| `app/(builder)/playground/build/page.tsx` | Урезаем до ~250 строк |

---

## Store — полные слайсы

Всё состояние страницы переезжает в `useBuildEditorStore`:

```ts
// Session
sessionId: string | null
sandboxId: string | null
previewUrl: string | null
projectKind: ProjectKind | null
shareIsPublic: boolean

// Chat
messages: ChatMessage[]
stage: "idea" | "questions" | "ready" | "generating"
idea: string
finalPrompt: string

// Stream
isGenerating: boolean
progress: number
streamSteps: StreamStep[]
streamToolLine: string | null
previewArtifactMime: string | null
previewDownloadFilename: string | null
presentationPdfExport: { url: string; filename: string } | null
lastBuildMs: number | null
streamArtifactChars: number
buildTemplate: BuildTemplate | null

// Coach
coachAwaitingConfirm: boolean
pendingTechnicalPrompt: string | null
promptCoachLoading: boolean

// UI
leftCollapsed: boolean
leftWidth: number
tab: "preview" | "document" | "settings" | "code"
agentHint: AgentPickerLabel
publishDialogOpen: boolean
```

Каждый slice имеет setter. Нет локальных `useState` на странице.

---

## `useAiSession`

**Что делает:**
1. `ensureSession()` — GET/PUT `/api/lemnity-ai/sessions`, возвращает `{ ok, sessionId }`
2. `loadSession(sessionId)` — GET истории, восстанавливает messages + preview в store
3. `sendChat(message, opts?)` — SSE-стрим с полным парсером событий
4. `cancelStream()` — abort controller
5. `sandboxFilesUpdated(sandboxId)` — вместо `window.dispatchEvent` вызывает store action (или zustand event)

**SSE-события, которые обрабатываем:**
- `delta` — appendBridgeAssistantChunk (только не-artifact/не-fence куски)
- `message` — pushBridgeAssistantMessage (финальный текст ответа)
- `step` / `plan` — applyStreamLog
- `tool` — applyStreamLog
- `preview` — setSandboxId + setPreviewUrl + push "✅ Превью готово" + saveSnapshot
- `title` — setIdea (если idea пуста)
- `error` — push "❌ ..." + setMode("idle")
- `done` — markStreamFinished + setProgress(100) + setMode("idle")

**Snapshot после preview:**
```
GET /api/sandbox/:sandboxId
POST /api/projects/:projectId/snapshots
→ prependVersion(snapshot) + setCurrentVersionId(snapshot.id)
```

**Anti-stale pattern:** один `abortRef` + `requestSeq` — тот же паттерн что сейчас, но инкапсулирован в хуке.

**Session ID:** хранится ТОЛЬКО в store. Ref убирается. `writeStoredLemnityBuildManusSessionId` вызывается в хуке при сохранении sessionId.

---

## `usePromptCoach`

**Что делает:**
1. `runPromptCoach(thread)` — POST `/api/prompt-coach`, разбирает `phase`, обновляет store
2. Управляет stage: `"idea"` → `"questions"` → (phase=confirm) → `"ready"`
3. Slow-hint таймер: 12с → `coachSlowHint = true`, сбрасывается при `promptCoachLoading = false`
4. `coachAwaitingConfirm + pendingTechnicalPrompt` — финальный промпт ждёт подтверждения

**Логика phase:**
```
phase === "confirm" && technical_prompt → coachAwaitingConfirm=true, stage="ready"
иначе → stage="questions"
```

---

## `useBuildHandoff`

Один `useEffect` при маунте. Читает `readBuilderHandoff()`, проверяет sessionStorage guard, диспатчит в store + вызывает `runBuildTemplatePreview` или `runPromptCoach`.

Условия запуска: `lemnityAiBridgeReady && !requestedSessionId && projectScopeReady`.

---

## `onSend` — единый обработчик (в странице)

```
files → formatAttachmentsForLemnityChat → userOutbound
if buildTemplate → return (template-only mode, input заблокирован)
if coachAwaitingConfirm:
  if isAffirmativeUserReply(text) → sendChat(pendingTechnicalPrompt + annex)
  else → runPromptCoach(thread + userMsg)
else if stage === "ready" → sendChat(userOutbound)
else → runPromptCoach(thread + userMsg)
     setIdea(text) if idea empty
     setStage("questions") if stage === "idea"
```

---

## Что удаляем

| Что | Почему |
|-----|--------|
| `handleGenerate` (legacy) | Только для generate-stream, убираем legacy |
| `handleCreateQuestions` (legacy) | То же |
| `handleComposePrompt` (legacy) | То же |
| `shouldUseLemnityAiBridge` ветки | Всегда bridge |
| `activeLemnityAiBridgeSessionRef` | Дублировал state, теперь только store |
| `window.dispatchEvent(CustomEvent)` | Заменяем на store action или zustand event |
| `pendingProjectIdRef` / `hostProjectIdRef` / `sandboxIdReserveRef` | Заменяем на `store.sandboxId` / `store.sessionId` |

---

## Сохраняем

- `useBuildStreamLog` хук — оставляем как есть
- `useLemnityAiBridgeFromServer` хук — оставляем, но только для `ready` флага
- Всю UI-логику `AgentChat`, `BuildCode`, `RightPanel`, `BuildTopbar` — компоненты не меняем
- Snapshot сохранение после preview — переносим в `useAiSession`
- `loadLemnityAiSession` после финализации стрима — переносим в `useAiSession`
- Session resync при `sessionNeedsResync` — переносим в `useAiSession`
- Template preview (`runBuildTemplatePreview`) — остаётся в странице, `useBuildHandoff` получает его как callback-параметр

---

## Граничные случаи

1. **Шаблон `isHandoffTemplateDirectPreview`** — обрабатывается в `useBuildHandoff`, запускает `runBuildTemplatePreview` без промпт-коуча
2. **Resync при `sessionNeedsResync`** — `useEffect` в `useAiSession` перезагружает сессию если она была "running" при загрузке
3. **`lastSsePreviewSandboxIdRef`** — защищает от перезаписи preview устаревшим GET после стрима. Остаётся в `useAiSession` как внутренний ref
4. **`templatePreviewSandboxIdRef`** — защищает preview каталога от перезаписи GET /sessions. Остаётся в `useAiSession`
5. **buildTemplate mode** — когда buildTemplate активен, input чата заблокирован, `onSend` возвращает early
6. **PDF export** — `presentationPdfExport` в store, устанавливается из preview-события

---

## Не входит в скоуп

- Рефакторинг `AgentChat`, `BuildCode`, `RightPanel`, `BuildTopbar`
- Изменения API-роутов (`/api/lemnity-ai/*`, `/api/prompt-coach`)
- CMS editor, Box editor, Puck editor

---

## Критерии готовности

- [ ] `build/page.tsx` ≤ 350 строк
- [ ] Нет `useState` в `build/page.tsx` (кроме тривиальных UI-only)
- [ ] `npx tsc --noEmit` без ошибок
- [ ] Ручной smoke-test: handoff из лендинга, промпт-коуч, генерация, preview, шаблон
- [ ] Нет `window.dispatchEvent(CustomEvent)` в новом коде
