# Slide Editor Redesign — Design Spec

**Дата:** 2026-05-18  
**Статус:** Approved  
**Область:** `components/playground/slides/`, `lib/slide-graph/`, `app/(builder)/playground/presentations/`

---

## Контекст

Существующий редактор слайдов использует iframe-рендеринг (`doc.write()`) и `postMessage` для выделения элементов. Это делает невозможными нативный drag, snapping и smart guides. Цель — заменить iframe на React-холст по образцу Gamma/Pitch, сохранив полную обратную совместимость данных.

Это **фаза 1 (редактор)**. Фазы 2–4 (composition engine, animation system, migration pipeline) — отдельные спеки.

---

## Раскладка редактора

**Выбор: Canva/Gamma (layout A)**

```
┌─────────────────────────────────────────────────────────────┐
│  TopBar: лого · инструменты · навигация · экспорт          │
├──────────┬──────────────────────────────────┬───────────────┤
│ LeftPanel│         CanvasArea               │ ContextPanel  │
│          │                                  │               │
│ [Слайды] │   ┌────────────────────────┐     │ [⊡][⬜][🎨][📝]│
│ [Слои  ] │   │   SlideCanvas 960×540  │     │               │
│          │   │   (масштабирован)      │     │ Контекстные   │
│ thumb 1  │   │                        │     │ свойства по   │
│ thumb 2  │   └────────────────────────┘     │ типу элемента │
│ thumb 3  │                                  │               │
│ + Слайд  │   [  AI Inline Bar  →  ]         │ Quality: 83   │
└──────────┴──────────────────────────────────┴───────────────┘
```

- **Левая панель (172px):** вкладки «Слайды / Слои»
- **Холст:** React-компоненты, CSS-scale, линейки, snap-линии
- **Правая панель (220px):** контекстная, без табов
- **AI-строка:** зафиксирована внизу холста, вызов через `/`

---

## Архитектура

### Компонентное дерево

```
PresentationEditor
├── TopBar
├── LeftPanel
│   ├── SlideNavigator        — миниатюры (iframe остаётся только здесь)
│   └── LayersPanel           — дерево элементов текущего слайда
├── CanvasArea
│   ├── Rulers                — горизонтальная + вертикальная
│   ├── SlideCanvas           — 960×540, transform: scale(ratio)
│   │   ├── SlideBackground
│   │   └── SlideElementRenderer[]
│   ├── InteractionLayer      — поверх холста, те же координаты
│   │   ├── SelectionBox
│   │   ├── ResizeHandles     — 8 хэндлов
│   │   └── SnapGuides
│   ├── FloatingToolbar       — над выбранным элементом
│   └── AiInlineBar           — внизу холста
└── ContextPanel
    ├── ModeIconBar           — [свойства][слайд][тема][заметки]
    ├── ElementProperties     — роутер по el.type
    └── QualityScoreBadge
```

### Два Zustand-стора

**`useSlideStore`** — данные:
```ts
graph: SlideGraph
updateElement(slideId, elemId, patch: Partial<SlideElement>): void
moveElement(slideId, elemId, x: number, y: number): void
resizeElement(slideId, elemId, frame: SlideElementFrame): void
addSlide(afterId?: string): void
deleteSlide(slideId: string): void
reorderSlides(ids: string[]): void
updateNotes(slideId: string, notes: string): void
saveToServer(): void  // debounced 800ms
```

**`useEditorStore`** — UI-состояние:
```ts
activeSlideIndex: number
selectedElemId: string | null
leftTab: 'slides' | 'layers'
rightMode: 'props' | 'slide' | 'theme' | 'notes'
zoom: number           // 0.5–2.0, default 1.0
isDragging: boolean
snapGuides: SnapGuide[]
scale: number          // computed: containerWidth / 960
```

---

## CSS-Scale холст

Слайд всегда рендерится в 960×540px. Контейнер масштабирует через `transform: scale()`:

```ts
const CANVAS_W = 960
const CANVAS_H = 540

// ratio пересчитывается на ResizeObserver контейнера
const scale = (containerWidth / CANVAS_W) * zoom  // zoom из useEditorStore, default 1.0

// конвертация координат мыши → холст
function toCanvas(e: PointerEvent): { x: number; y: number } {
  const rect = canvasRef.current.getBoundingClientRect()
  return {
    x: (e.clientX - rect.left) / scale,
    y: (e.clientY - rect.top) / scale,
  }
}
```

**Миниатюры** в левой панели продолжают использовать `renderSlide()` + iframe — это изолирует их от стилей редактора и упрощает реализацию.

---

## Слой взаимодействий

### Drag — машина состояний

| Состояние | Переход | Действие |
|-----------|---------|----------|
| `idle` | `pointerdown` на элемент | `setPointerCapture()`, записать `startPos`, `originalFrame` |
| `ready` | `pointermove` (delta > 4px) | переход в `dragging` |
| `dragging` | `pointermove` | `newX = snap(orig.x + dx/scale)`, обновить `snapGuides` в editorStore |
| `dragging` | `pointerup` | `moveElement()` в slideStore, сбросить guides → `idle` |

`saveToServer()` вызывается только на `pointerup`, не во время drag.

### Snap Engine — приоритеты

1. **Сетка 8px** — `Math.round(v / 8) * 8`. Отключается зажатым `Alt`
2. **Края и центры элементов** — snap к left/right/top/bottom/centerX/centerY каждого элемента на слайде. Радиус захвата 6px в координатах холста
3. **Safe zones** — snap к отступам слайда (7% ≈ 67px от каждого края)

### Resize

- 8 хэндлов: 4 угловых + 4 серединных
- `Shift` + resize — фиксация пропорций
- Минимальный размер: W ≥ 40px, H ≥ 20px
- `clamp()` на всех координатах: элемент не выходит за 960×540
- `locked: true` → хэндлы не рендерятся, `pointerEvents: none`

---

## Изменения модели данных

Все изменения обратно совместимы. `SlideGraph.version` остаётся `1`.

### SlideElement — 3 новых поля

```ts
interface SlideElement {
  // ... существующие поля без изменений

  name?: string      // отображаемое имя в панели слоёв
  locked?: boolean   // заблокирован от drag/resize (default: false)
  visible?: boolean  // скрыт в редакторе (default: true)
}
```

### SlideTheme — 5 новых токенов

```ts
interface SlideTheme {
  // ... существующие поля без изменений

  headingFont?: string                          // отдельный шрифт для заголовков
  secondaryColor?: string                       // второй акцентный цвет
  surfaceColor?: string                         // цвет карточек/панелей
  borderRadius?: 'none' | 'sm' | 'md' | 'lg'   // скругление карточек
  spacing?: 'compact' | 'normal' | 'spacious'   // плотность раскладки
}
```

`buildSlideDeckStyles()` использует дефолты если поля отсутствуют — старые презентации не затронуты.

### Slide — переходы (подготовка к фазе 3)

```ts
interface Slide {
  // ... существующие поля без изменений
  transition?: SlideTransition  // опционально, фаза 3
}

interface SlideTransition {
  type: 'none' | 'fade' | 'slide' | 'zoom'
  duration?: number                      // ms, default 300
  direction?: 'left' | 'right' | 'up' | 'down'
}
```

---

## Контекстная панель (ContextPanel)

Переключается по двум осям: `rightMode` и тип выбранного элемента. Без табов.

```
rightMode === 'slide'  → SlideProperties (фон, раскладка)
rightMode === 'theme'  → ThemeEditor (токены темы)
rightMode === 'notes'  → NotesPanel
rightMode === 'props'  → ElementProperties (роутер по el.type)
  selectedElemId = null → SlideProperties
  el.type = heading/subheading/body/quote/caption/label → TextProperties
  el.type = bullet-list → ListProperties
  el.type = image → ImageProperties
  el.type = *-card → CardProperties
```

**Секции ElementProperties по типу:**

| Тип | Секции |
|-----|--------|
| Текст | Содержимое · Шрифт+размер+вес · B/I/U · Выравнивание · Цвет · Межстрочный |
| Список | Пункты (CRUD + reorder) · Маркер · Шрифт · Цвет |
| Изображение | URL/загрузка · Alt · Object-fit · Скругление · Прозрачность |
| Карточки | Поля по типу (label/value/description/badge) · Фон · Скругление |

**Общее для всех (всегда снизу):** X · Y · W · H · Прозрачность · Имя слоя · 🔒 Lock · 👁 Visible

---

## Quality Scorer

Считается локально, без сети. Debounce 300ms. < 1ms на вычисление.

```ts
// lib/slide-graph/quality-scorer.ts
function scoreSlide(slide: Slide, theme: SlideTheme): SlideQualityScore {
  return {
    density: scoreDensity(slide),       // вес 0.25
    hierarchy: scoreHierarchy(slide),   // вес 0.35
    balance: scoreBalance(slide),       // вес 0.20
    readability: scoreReadability(slide, theme), // вес 0.20
    total: weighted average 0..100
  }
}
```

| Метрика | Алгоритм |
|---------|----------|
| **Плотность** | Суммарная площадь элементов / 960×540. Штраф если > 65% или < 20% |
| **Иерархия** | Наличие heading + разница размеров heading vs body ≥ 1.4× + только один heading |
| **Баланс** | Центр масс всех элементов vs центр слайда (480, 270). Штраф за отклонение > 15% |
| **Читаемость** | heading ≥ 28px, body ≥ 14px + WCAG AA контраст текста vs фона слайда |

---

## AI Inline

### Два режима вызова

**Глобальный** (строка внизу холста, всегда видна):
- Запросы к текущему слайду или всей презентации
- «Сделай слайд темнее», «Добавь слайд с метриками»

**Контекстный** (нажать `/` на выбранном элементе):
- Popover над элементом
- «Сделай короче», «Переведи на английский»

### Расширение API-контракта

`/api/projects/[id]/slides/chat` возвращает:

```ts
{
  message: string        // текст для пользователя
  patches?: Array<{      // точечные изменения (новое)
    op: 'update' | 'add' | 'delete'
    slideId?: string
    elemId?: string
    data?: Partial<SlideElement>
  }>
  graph?: SlideGraph     // полная замена (существующее)
}
```

`patches[]` позволяет AI точечно менять отдельные элементы без генерации всего графа.

---

## Миграция

### Что заменяем

| Старое | Новое |
|--------|-------|
| `slide-visual-editor.tsx` | удаляется после верификации |
| iframe + `doc.write()` | `SlideCanvas` (React) |
| `postMessage` selection | `useEditorStore.selectedElemId` |
| `ChatPanel` (правый таб) | `AiInlineBar` (низ холста) |

### Что остаётся без изменений

- `renderSlide()` / `renderSlideGraph()` — используются для миниатюр и экспорта
- `buildSlideDeckStyles()` — CSS не меняется
- `/api/projects/[id]/slides/*` — все маршруты совместимы
- `pptx-export.ts` / `pdf-export.ts` — без изменений
- `schema.ts` / `patch.ts` / `prompt.ts` — без изменений

### Порядок (без простоя)

1. Строим новый редактор в `presentation-editor.tsx` (уже существует, расширяем)
2. `slide-visual-editor.tsx` продолжает работать параллельно
3. Переключаем роут `/playground/slides` → новый редактор
4. Верифицируем, удаляем `slide-visual-editor.tsx`

---

## Файловая карта

### Новые файлы

```
components/playground/slides/
  slide-canvas.tsx              — 960×540, scale, SlideElementRenderer[]
  slide-element-renderer.tsx    — switch по el.type → React-компонент
  interaction-layer.tsx         — drag, resize, SnapGuides
  floating-toolbar.tsx          — B/I/U, align над элементом
  snap-guides.tsx               — линии + подписи px
  ai-inline-bar.tsx             — строка внизу холста
  layers-panel.tsx              — дерево элементов с drag-reorder, lock, visible
  panels/
    context-panel.tsx           — роутер по типу/режиму
    text-properties.tsx
    list-properties.tsx
    image-properties.tsx
    card-properties.tsx
    slide-properties.tsx
    theme-editor.tsx
    quality-score-badge.tsx

lib/slide-graph/
  quality-scorer.ts             — 4 метрики, weighted score
  snap-engine.ts                — snap к сетке, элементам, safe zones

lib/stores/
  use-editor-store.ts           — UI-состояние редактора
```

### Изменяемые файлы

```
lib/slide-graph/types.ts        — +name, +locked, +visible в SlideElement
                                  +5 токенов в SlideTheme
                                  +SlideTransition интерфейс
app/(builder)/playground/presentations/presentation-editor.tsx — расширяем
app/api/projects/[id]/slides/chat/route.ts — +patches[] в ответ
```

---

## Что вне этого спека

- Animation system (фаза 3)
- Presenter preview / speaker view (фаза 3)
- Composition engine / auto-layout (фаза 2)
- Export pipeline изменения (фаза 4)
- Новая модель SlideScene (возможная будущая фаза)
