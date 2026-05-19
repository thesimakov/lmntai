---
name: project-component-graph-prompt-flow
description: ComponentGraph (website projectKind) теперь проходит через PromptCoach перед генерацией, аналог Lovable
metadata:
  type: project
---

ComponentGraph (`projectKind === "website"`) теперь имеет фазу сбора требований через PromptCoach перед генерацией макета.

**Why:** Агент сразу генерировал граф без уточняющих вопросов — пользователь хотел аналог Lovable-флоу.

**How to apply:** В `app/(builder)/playground/build/page.tsx`, функция `onSend`:
- Short-circuit для `website` срабатывает только при наличии `sandboxId` (режим редактирования)
- В `coachAwaitingConfirm` и `stage === "ready"` для `website` вызывается `sendGenerateGraph` вместо `sendChat`

Связано с [[project-editor-v2-refactor]]
