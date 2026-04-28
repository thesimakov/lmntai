/** Режим поверхности Canvas: просмотр или визуальное редактирование (overlay + панель намерений). */

export const EditorMode = {
  View: "view",
  Edit: "edit"
} as const;

export type EditorModeValue = (typeof EditorMode)[keyof typeof EditorMode];
