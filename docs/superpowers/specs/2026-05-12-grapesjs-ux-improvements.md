# GrapesJS UX Improvements — Design Spec

**Дата:** 2026-05-12
**Статус:** Approved
**Область:** `components/playground/lemnity-box/`

---

## Цель

Пять независимых улучшений GrapesJS-редактора: попап фона секции из тулбара, встроенное RTE редактирование текста, вставка HTML через буфер, навигатор секций, удаление секции по Delete.

---

## Новые файлы

| Файл | Описание |
|---|---|
| `lemnity-box-toolbar-bg-picker.ts` | Регистрирует команду + monkey-patch кнопки тулбара |
| `lemnity-box-section-bg-popover.tsx` | React попап: Цвет / Градиент / Картинка |
| `lemnity-box-section-nav.tsx` | Плавающая плашка «Секция N / M ‹ ›» |

## Изменяемые файлы

| Файл | Изменение |
|---|---|
| `lemnity-box-canvas-editor.tsx` | Подключение всех пяти фич в init и JSX |

---

## А. Фон секции из тулбара

### `lemnity-box-toolbar-bg-picker.ts`

```typescript
export function registerLemnityBoxToolbarBgPicker(
  editor: Editor,
  onOpen: (component: Component) => void,
): void
```

- Monkey-patch `Model.prototype.initToolbar` по паттерну `lemnity-box-toolbar-save-block.ts`
- Кнопка `🎨 Фон` вставляется только для секций (`component.get('tagName') === 'section'`)
- Регистрирует команду `lemnity-bg-picker`: вызывает `onOpen(editor.getSelected())`
- Guard против двойного патча (проверка флага на prototype)

### `lemnity-box-section-bg-popover.tsx`

Props: `{ component: Component; onClose: () => void; projectId?: string | null }`

Три таба:

**Цвет:**
- 8 фиксированных свотчей (white, gray-50, gray-900, indigo-800, green-800, red-900, yellow-50, purple-50)
- Hex input (controlled, валидация `#[0-9a-fA-F]{6}`)
- Применяет: `component.setStyle({ 'background-color': hex, 'background-image': '' })`

**Градиент:**
- 6 CSS-пресетов (linear-gradient с разными направлениями и цветами)
- Поля: angle (0–360°), from-color (hex), to-color (hex) → генерирует `linear-gradient(${angle}deg, ${from}, ${to})`
- Применяет: `component.setStyle({ 'background-image': gradient, 'background-color': '' })`

**Картинка:**
- URL text input
- Кнопка «Из библиотеки» → открывает `LemnityBoxImageLibraryModal` (передаётся callback через `onSelectImage`)
- `background-size: cover`, `background-position: center` — всегда
- Применяет: `component.setStyle({ 'background-image': 'url(...)', 'background-size': 'cover', 'background-position': 'center', 'background-color': '' })`

**Кнопка «Убрать фон»:** сбрасывает `background-color`, `background-image`, `background-size`, `background-position` в `''`.

Инициализация текущих значений: читает `component.getStyle()` при открытии → определяет активный таб.

### Подключение в `lemnity-box-canvas-editor.tsx`

```typescript
const [bgPickerComponent, setBgPickerComponent] = useState<Component | null>(null);

// В init:
registerLemnityBoxToolbarBgPicker(editor, (comp) => setBgPickerComponent(comp));

// В JSX:
{bgPickerComponent && (
  <LemnityBoxSectionBgPopover
    component={bgPickerComponent}
    onClose={() => setBgPickerComponent(null)}
    projectId={props.projectId}
  />
)}
```

---

## Б. Inline RTE

В `grapesjs.init()` добавляется конфигурация `rte`:

```typescript
rte: {
  actions: [
    'bold', 'italic', 'underline', 'strikeThrough',
    {
      name: 'link',
      icon: '<svg .../>',
      attributes: { title: 'Ссылка' },
      result: (rte) => {
        const url = window.prompt('URL ссылки');
        if (url) rte.exec('createLink', url);
      },
    },
  ],
}
```

Дополнительно в `config.fromElement`:

```typescript
components: {
  Text: { editable: true },
}
```

Двойной клик по тексту активирует RTE автоматически (поведение GrapesJS 0.22 по умолчанию). Toolbar RTE стилизуется через существующий CSS оверрайд в GrapesJS stylesheet.

---

## В. Ctrl+Shift+V — вставить HTML

После инициализации редактора:

```typescript
editor.Keymaps.add(
  'lemnity:paste-html',
  'ctrl+shift+v, ⌘+shift+v',
  async () => {
    const text = await navigator.clipboard.readText().catch(() => '');
    if (text.trim()) editor.addComponents(text.trim());
  },
);
```

Никакой валидации HTML — пользователь вставляет то что хочет. При ошибке парсинга GrapesJS молча отбросит невалидное.

---

## Г. Навигатор секций

### `lemnity-box-section-nav.tsx`

```typescript
interface Props {
  editorRef: RefObject<Editor | null>;
}
export function LemnityBoxSectionNav({ editorRef }: Props)
```

**Состояние:** `{ currentIdx: number; total: number }` — обновляется на `component:selected`.

**Логика выбора секции:**
```typescript
function getSectionIndex(editor: Editor): { idx: number; total: number } {
  const wrapper = editor.DomComponents.getWrapper();
  const sections = wrapper?.components().models ?? [];
  const selected = editor.getSelected();
  const idx = sections.findIndex(s => s === selected || s.contains(selected));
  return { idx, total: sections.length };
}
```

**Навигация:**
```typescript
const goTo = (idx: number) => {
  const wrapper = editor.DomComponents.getWrapper();
  const target = wrapper?.components().at(idx);
  if (!target) return;
  editor.select(target);
  target.getEl()?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};
```

**Рендер:** абсолютно позиционирован поверх GrapesJS контейнера, `bottom: 16px`, `left: 50%`, `transform: translateX(-50%)`. Скрыт (`display: none`) когда `total === 0` или `idx === -1`.

```tsx
<div style={{
  position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
  background: 'rgba(31,41,55,0.88)', backdropFilter: 'blur(4px)',
  borderRadius: 20, padding: '4px 10px',
  display: idx === -1 || total === 0 ? 'none' : 'flex',
  alignItems: 'center', gap: 8, zIndex: 9999,
}}>
  <button onClick={() => goTo(idx - 1)} disabled={idx <= 0}>‹</button>
  <span>Секция {idx + 1} / {total}</span>
  <button onClick={() => goTo(idx + 1)} disabled={idx >= total - 1}>›</button>
</div>
```

### Подключение в `lemnity-box-canvas-editor.tsx`

Компонент рендерится внутри `div`-обёртки GrapesJS c `position: relative`:

```tsx
<div style={{ position: 'relative', flex: 1 }}>
  <div id="gjs" ref={gjsRef} />
  <LemnityBoxSectionNav editorRef={editorInstanceRef} />
</div>
```

---

## Д. Delete / Backspace — удалить выбранный компонент

```typescript
editor.Keymaps.add('lemnity:delete-selected', 'delete, backspace', (ed) => {
  const sel = ed.getSelected();
  if (!sel) return;
  sel.remove();
});
```

GrapesJS Keymaps не срабатывает когда фокус находится в `<input>`, `<textarea>` или `contenteditable` (RTE) — встроенная защита движка. Дополнительной проверки не требуется.

---

## Граничные случаи

| Ситуация | Поведение |
|---|---|
| Clipboard API недоступен (HTTP) | `readText()` бросает → `catch(() => '')` → ничего не происходит |
| Вставка не-HTML текста через Ctrl+Shift+V | GrapesJS оборачивает в `<div>` — допустимо |
| Попап фона открыт, секция деселектирована | `onClose()` вызывается из обработчика `component:deselected` |
| Навигатор: выбрана не секция, а вложенный элемент | `getSectionIndex` ищет предка — находит ближайшую секцию по `contains()` |
| Delete при открытом RTE | Keymaps не срабатывает (GrapesJS защита) |
| Попап фона + Image Library одновременно | Image Library всегда поверх (z-index 1000 < 1001 library modal) |

---

## Вне скопа

- Градиентный редактор с несколькими стопами (только linear with 2 stops)
- Undo/redo для изменений фона через попап (GrapesJS history автоматически захватывает `setStyle`)
- Анимация появления/скрытия навигатора
- RTE: font-family picker, font-size dropdown (только базовые действия)
