import grapesRuImported from "grapesjs/locale/ru.mjs";

type GrapesRuMessages = typeof grapesRuImported extends { default: infer D }
  ? D
  : typeof grapesRuImported;

/**
 * Grapes может отдавать CJS-shape `{ default: { ...messages } }` в клиентском бандле — иначе
 * после `…baseRu` ключи локали лежат внутри `.default`, i18n не находит перевод и падает в `en`.
 */
function unwrapGrapesLocale<M>(mod: M | { default: M }): M {
  if (mod !== null && typeof mod === "object" && "default" in mod) {
    const d = (mod as { default: M }).default;
    if (d && typeof d === "object") return d;
  }
  return mod as M;
}

const baseRu = unwrapGrapesLocale(grapesRuImported) as GrapesRuMessages;

/** Подписи свойств Style Manager (`styleManager.properties.<id>`) — базовые id из Grapes 0.22. */
const LEMNITY_SM_PROPERTIES: Record<string, string> = {
  "font-family": "Семейство шрифтов",
  "font-size": "Размер шрифта",
  "font-weight": "Начертание",
  "letter-spacing": "Межбуквенный интервал",
  "line-height": "Межстрочный интервал",
  color: "Цвет",
  "text-align": "Выравнивание текста",
  "text-shadow": "Тень текста",
  display: "Отображение",
  float: "Обтекание",
  position: "Позиция",
  top: "Сверху",
  right: "Справа",
  bottom: "Снизу",
  left: "Слева",
  opacity: "Непрозрачность",
  cursor: "Курсор",
  overflow: "Переполнение",
  "overflow-x": "Переполнение по X",
  "overflow-y": "Переполнение по Y",
  width: "Ширина",
  "min-width": "Мин. ширина",
  "max-width": "Макс. ширина",
  height: "Высота",
  "min-height": "Мин. высота",
  "max-height": "Макс. высота",
  margin: "Внешние отступы",
  padding: "Внутренние отступы",
  "margin-top": "Отступ сверху",
  "margin-right": "Отступ справа",
  "margin-bottom": "Отступ снизу",
  "margin-left": "Отступ слева",
  "padding-top": "Поля сверху",
  "padding-right": "Поля справа",
  "padding-bottom": "Поля снизу",
  "padding-left": "Поля слева",
  border: "Рамка",
  "border-width": "Толщина рамки",
  "border-radius": "Скругление",
  "border-radius-c": "Скругление",
  perspective: "Перспектива",
  "flex-basis": "Базис flex",
  "flex-grow": "Растяжение (flex-grow)",
  "flex-shrink": "Сжатие (flex-shrink)",
  order: "Порядок",
  transition: "Переход",
  "transition-property": "Свойство перехода",
  "transition-duration": "Длительность перехода",
  "transition-timing-function": "Кривая перехода",
  "justify-content": "Выравнивание по главной оси",
  "align-items": "Выравнивание элементов",
  "align-content": "Выравнивание строк",
  "align-self": "Выравнивание себя",
  "flex-direction": "Направление flex",
  "flex-wrap": "Перенос flex",
  "box-shadow": "Тень блока",
  background: "Фон",
  "background-color": "Цвет фона",
  "background-image": "Фоновое изображение",
  "background-repeat": "Повтор фона",
  "background-position": "Позиция фона",
  "background-attachment": "Прокрутка фона",
  "background-size": "Размер фона",
  transform: "Трансформация",
  "transform-type": "Тип",
  "transform-value": "Значение",
  "border-style": "Стиль рамки",
};

/** Подписи значений селектов/радио (`styleManager.options.<propId>.<optId>`). */
const LEMNITY_SM_OPTIONS: Record<string, Record<string, string>> = {
  float: {
    none: "Нет",
    left: "Слева",
    right: "Справа",
  },
  position: {
    static: "Обычная",
    relative: "Относительная",
    absolute: "Абсолютная",
    fixed: "Фиксированная",
  },
  display: {
    block: "Блок",
    inline: "Строчный",
    "inline-block": "Строчно-блочный",
    flex: "Flex",
    none: "Скрыть",
  },
  "text-align": {
    left: "Слева",
    center: "По центру",
    right: "Справа",
    justify: "По ширине",
  },
  "font-weight": {
    "100": "Тонкий",
    "200": "Экстра-светлый",
    "300": "Светлый",
    "400": "Обычный",
    "500": "Средний",
    "600": "Полужирный",
    "700": "Жирный",
    "800": "Экстра-жирный",
    "900": "Чёрный",
  },
  "box-shadow-type": {
    "": "Снаружи",
    inset: "Внутри",
  },
  "flex-direction": {
    row: "Строка",
    "row-reverse": "Строка (обратно)",
    column: "Колонка",
    "column-reverse": "Колонка (обратно)",
  },
  "flex-wrap": {
    nowrap: "Без переноса",
    wrap: "С переносом",
    "wrap-reverse": "С переносом (обратно)",
  },
  "justify-content": {
    "flex-start": "К началу",
    "flex-end": "К концу",
    center: "По центру",
    "space-between": "Между",
    "space-around": "Вокруг",
    "space-evenly": "Равномерно",
  },
  "align-items": {
    "flex-start": "К началу",
    "flex-end": "К концу",
    center: "По центру",
    baseline: "По базовой линии",
    stretch: "Растянуть",
  },
  "align-content": {
    "flex-start": "К началу",
    "flex-end": "К концу",
    center: "По центру",
    "space-between": "Между",
    "space-around": "Вокруг",
    stretch: "Растянуть",
  },
  "align-self": {
    auto: "Авто",
    "flex-start": "К началу",
    "flex-end": "К концу",
    center: "По центру",
    baseline: "По базовой линии",
    stretch: "Растянуть",
  },
  "border-style": {
    none: "Нет",
    solid: "Сплошная",
    dotted: "Точками",
    dashed: "Штрихами",
    double: "Двойная",
    groove: "Жёлоб",
    ridge: "Ребро",
    inset: "Вдавленная",
    outset: "Выпуклая",
  },
  overflow: {
    visible: "Видно",
    hidden: "Скрыть",
    scroll: "Прокрутка",
    auto: "Авто",
  },
  "overflow-x": {
    visible: "Видно",
    hidden: "Скрыть",
    scroll: "Прокрутка",
    auto: "Авто",
  },
  "overflow-y": {
    visible: "Видно",
    hidden: "Скрыть",
    scroll: "Прокрутка",
    auto: "Авто",
  },
  cursor: {
    auto: "Авто",
    pointer: "Указатель",
    copy: "Копирование",
    crosshair: "Прицел",
    grab: "Захват",
    grabbing: "Перетаскивание",
    help: "Справка",
    move: "Перемещение",
    text: "Текст",
  },
  "transition-timing-function": {
    linear: "Линейная",
    ease: "Плавно",
    "ease-in": "Плавное начало",
    "ease-out": "Плавный конец",
    "ease-in-out": "Плавно везде",
  },
  "transition-property": {
    all: "Все",
    width: "Ширина",
    height: "Высота",
    "background-color": "Цвет фона",
    transform: "Трансформация",
    "box-shadow": "Тень блока",
    opacity: "Непрозрачность",
  },
  /** В составном свойстве «Переход» селект с id именно `*-sub`. */
  "transition-property-sub": {
    all: "Все",
    width: "Ширина",
    height: "Высота",
    "background-color": "Цвет фона",
    transform: "Трансформация",
    "box-shadow": "Тень блока",
    opacity: "Непрозрачность",
  },
  "transition-timing-function-sub": {
    linear: "Линейная",
    ease: "Плавно",
    "ease-in": "Плавное начало",
    "ease-out": "Плавный конец",
    "ease-in-out": "Плавно везде",
  },
  "background-repeat": {
    repeat: "Повторять",
    "repeat-x": "По горизонтали",
    "repeat-y": "По вертикали",
    "no-repeat": "Без повтора",
  },
  "background-attachment": {
    scroll: "С прокруткой",
    fixed: "Фиксированное",
    local: "Локальное",
  },
  "background-size": {
    auto: "Авто",
    cover: "Покрыть",
    contain: "Вместить",
  },
  "background-position": {
    "left top": "Слева сверху",
    "left center": "Слева по центру",
    "left bottom": "Слева снизу",
    "right top": "Справа сверху",
    "right center": "Справа по центру",
    "right bottom": "Справа снизу",
    "center top": "По центру сверху",
    "center center": "По центру",
    "center bottom": "По центру снизу",
  },
  "background-position-sub": {
    "left top": "Слева сверху",
    "left center": "Слева по центру",
    "left bottom": "Слева снизу",
    "right top": "Справа сверху",
    "right center": "Справа по центру",
    "right bottom": "Справа снизу",
    "center top": "По центру сверху",
    "center center": "По центру",
    "center bottom": "По центру снизу",
  },
  "background-repeat-sub": {
    repeat: "Повторять",
    "repeat-x": "По горизонтали",
    "repeat-y": "По вертикали",
    "no-repeat": "Без повтора",
  },
  "background-attachment-sub": {
    scroll: "С прокруткой",
    fixed: "Фиксированное",
    local: "Локальное",
  },
  "background-size-sub": {
    auto: "Авто",
    cover: "Покрыть",
    contain: "Вместить",
  },
  "border-style-sub": {
    none: "Нет",
    solid: "Сплошная",
    dotted: "Точками",
    dashed: "Штрихами",
    double: "Двойная",
    groove: "Жёлоб",
    ridge: "Ребро",
    inset: "Вдавленная",
    outset: "Выпуклая",
  },
  "transform-type": {
    scaleX: "Масштаб X",
    scaleY: "Масштаб Y",
    scaleZ: "Масштаб Z",
    rotateX: "Поворот X",
    rotateY: "Поворот Y",
    rotateZ: "Поворот Z",
    translateX: "Сдвиг X",
    translateY: "Сдвиг Y",
  },
};

function mergeRuStyleManager(inheritedStyleManager: unknown): Record<string, unknown> {
  const sm = inheritedStyleManager && typeof inheritedStyleManager === "object" ? inheritedStyleManager : {};
  const inh = sm as { properties?: Record<string, string>; options?: Record<string, Record<string, string>> };
  const baseProps = inh.properties ?? {};
  const baseOpts = inh.options ?? {};
  const mergedOpts = { ...baseOpts };
  for (const [propId, labels] of Object.entries(LEMNITY_SM_OPTIONS)) {
    mergedOpts[propId] = { ...(mergedOpts[propId] ?? {}), ...labels };
  }
  return {
    ...inh,
    properties: { ...baseProps, ...LEMNITY_SM_PROPERTIES },
    options: mergedOpts,
  };
}

/** RU-локаль встроенного движка редактора (на базе grapesjs) + правки формулировок для Lemnity Box. */
export const lemnityBoxEditorMessagesRu = {
  ...baseRu,
  blockManager: {
    ...baseRu.blockManager,
    categories: {
      ...baseRu.blockManager.categories,
      Basic: "Базовые",
      Sections: "Секции",
      Media: "Медиа",
      Extra: "Дополнительно",
      General: "Общее",
      Forms: "Формы",
    },
  },
  domComponents: {
    ...baseRu.domComponents,
    names: {
      ...baseRu.domComponents.names,
      /** Без этого в слоях показывается «Div», «Span» через capitalize(tagName). */
      div: "Блок",
      span: "Фрагмент",
      p: "Абзац",
      section: "Секция",
      article: "Статья",
      aside: "Боковая колонка",
      header: "Шапка",
      footer: "Подвал",
      nav: "Навигация",
      main: "Основная область",
      h1: "Заголовок 1",
      h2: "Заголовок 2",
      h3: "Заголовок 3",
      h4: "Заголовок 4",
      h5: "Заголовок 5",
      h6: "Заголовок 6",
      ul: "Маркированный список",
      ol: "Нумерованный список",
      li: "Пункт списка",
      form: "Форма",
      button: "Кнопка",
      input: "Поле ввода",
      textarea: "Многострочное поле",
      select: "Выпадающий список",
      iframe: "Встраиваемое окно",
      br: "Перенос строки",
      hr: "Разделитель",
      image: "Изображение",
      video: "Видео",
    },
  },
  deviceManager: {
    ...baseRu.deviceManager,
    devices: {
      ...baseRu.deviceManager.devices,
      mobilePortrait: "Мобильный вертикально",
    },
  },
  panels: {
    buttons: {
      titles: {
        ...baseRu.panels.buttons.titles,
        preview: "Предпросмотр страницы",
        fullscreen: "На весь экран",
        "sw-visibility": "Подсветка рамок компонентов",
        "export-template": "Просмотр HTML/CSS кода",
        "open-sm": "Стили (Style Manager)",
        "open-tm": "Настройки",
        "open-layers": "Слои",
        "open-blocks": "Страницы проекта — добавить или открыть страницу в проекте",
        "lemnity-blocks-toolbar": "Блоки",
        undo: "Отменить",
        redo: "Вернуть",
        "canvas-clear": "Очистить холст",
        "gjs-open-import-webpage": "Импорт HTML",
        "set-device-desktop": "Вид: компьютер",
        "set-device-tablet": "Вид: планшет",
        "set-device-mobile": "Вид: телефон",
      },
    },
  },
  styleManager: mergeRuStyleManager(baseRu.styleManager),
  traitManager: {
    ...baseRu.traitManager,
    empty: "Выберите элемент на холсте",
    label: "Настройки",
    traits: Object.assign({}, baseRu.traitManager?.traits ?? {}, {
      labels: Object.assign({}, baseRu.traitManager?.traits?.labels ?? {}, {
        "data-ln-span": "Ширина блока (из 12 колонок)",
        "data-ln-align": "Выравнивание контента в ряду",
        "lemnity-form-settings": "Форма: поля и типы",
        "lemnity-shop-filters": "Магазин: фильтры в боковой колонке",
      }),
    }),
  },
};
