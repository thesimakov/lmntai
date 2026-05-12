# Zero Block — Настройки элементов (tooltip, form, gallery) — Design Spec

**Дата:** 2026-05-12
**Статус:** Approved
**Область:** `components/zero-block-editor/zb-settings-panel.tsx`

---

## Цель

Добавить недостающие панели настроек для трёх типов элементов Zero Block: `tooltip`, `form`, `gallery`. Типы уже объявлены в `lib/zero-block-editor/types.ts`, рендерятся в `zb-element-layer.tsx`, присутствуют в `zb-add-panel.tsx`, но при выборе возвращают `null` из `ElementTypePanel` — настроить их нельзя.

---

## Область применения

- **Только** `zb-settings-panel.tsx` — три новые функции-компоненты + подключение в `switch`
- Новые файлы не создаются
- Изменения в `types.ts`, `store.ts`, `zb-element-layer.tsx`, `zb-canvas.tsx` — вне скопа

---

## ZbTooltipPanel

Настраивает `ZbTooltipProps`:

| Поле | UI | Тип |
|---|---|---|
| `triggerText` | text input | string |
| `content` | textarea (3 строки) | string |
| `trigger` | radio: «При наведении» / «По клику» | "hover" \| "click" |
| `position` | 4 кнопки: ↑ ↓ ← → (top/bottom/left/right) | string |
| `delay` | number input, мс — только при `trigger === "hover"` | number |

Группы: «Содержимое» (triggerText, content) / «Поведение» (trigger, delay) / «Позиция» (position).

---

## ZbFormPanel

Настраивает `ZbFormProps`:

### Поля формы (`fields: ZbFormField[]`)

Список с кнопкой «+ Поле» внизу. Каждый элемент раскрывается в компактную строку:
- `fieldType`: select — input / textarea / select / checkbox / radio
- `label`: text input
- `placeholder`: text input (скрыт для checkbox/radio)
- `required`: checkbox
- Кнопка 🗑 (удалить поле)
- Кнопки ↑↓ (переместить)

Максимум 10 полей (больше `+ Поле` disabled).

### Настройки отправки

| Поле | UI |
|---|---|
| `submitText` | text input (default: «Отправить») |
| `successMessage` | text input (default: «Спасибо!») |
| `action` | URL input, опционально (пустой = нет отправки) |

Группы: «Поля» / «Отправка».

---

## ZbGalleryPanel

Настраивает `ZbGalleryProps`:

### Изображения (`images: string[]`)

Список URL с кнопкой 🗑 у каждого. Кнопка «+ Изображение» добавляет пустую строку с URL-инпутом. Максимум 20 изображений.

### Настройки отображения

| Поле | UI |
|---|---|
| `layout` | 3 кнопки: Слайдер / Сетка / Мозаика |
| `lightbox` | toggle |
| `autoplay` | toggle |
| `autoplayInterval` | number, мс — только если `autoplay === true` |
| `arrows` | toggle |

Группы: «Изображения» / «Вид» / «Поведение».

---

## Подключение

В `ElementTypePanel` (`zb-settings-panel.tsx`):

```typescript
switch (el.type) {
  case "text":    return <TextPanel el={el} />;
  case "image":   return <ImagePanel el={el} />;
  case "shape":   return <ShapePanel el={el} />;
  case "button":  return <ButtonPanel el={el} />;
  case "vector":  return <VectorPanel el={el} />;
  case "video":   return <VideoPanel el={el} />;
  case "html":    return <HtmlPanel el={el} />;
  case "tooltip": return <TooltipPanel el={el} />;  // новый
  case "form":    return <FormPanel el={el} />;     // новый
  case "gallery": return <GalleryPanel el={el} />;  // новый
  default:        return null;
}
```

---

## Граничные случаи

| Ситуация | Поведение |
|---|---|
| `fields` пуст в FormPanel | Показывается placeholder «Нет полей — нажмите + Поле» |
| `images` пуст в GalleryPanel | Показывается placeholder «Нет изображений» |
| `delay` < 0 в TooltipPanel | Clamp до 0 в onChange |
| Добавление >10 полей / >20 изображений | Кнопка «+» disabled, tooltip с лимитом |

---

## Тестирование

Unit-тесты на функции из `lib/zero-block-editor/` не затрагиваются — изменения только в React-компонентах. Ручная проверка: добавить элементы каждого типа, убедиться что панель открывается и значения сохраняются в store.
