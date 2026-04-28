import type { LayoutElementKind } from "@/lib/editor/layout-element";

/** Структурированная команда для агента (чат + возможный парсинг на стороне сервера). */
export type VisualEditorStructuredPayload = {
  source: "visual_editor";
  action: "update_element";
  element_id: string;
  element_type: LayoutElementKind | string;
  updates: { field: string; new_value: string }[];
  human_instruction: string;
};

export type VisualEditorSubmitPayload = {
  /** Текст сообщения в чат (основной канал для агента). */
  chatMessage: string;
  structured: VisualEditorStructuredPayload;
};

function formatXmlishTag(kind: LayoutElementKind | string, elementId: string): string {
  const map: Record<string, string> = {
    text: "text",
    image: "image",
    button: "button",
    link: "link",
    icon: "icon",
    container: "container"
  };
  const tag = map[kind] ?? "element";
  return `<${tag} id="${elementId}">`;
}

export function buildHumanInstructionLine(
  kind: LayoutElementKind | string,
  elementId: string,
  updates: { field: string; new_value: string }[]
): string {
  const target = formatXmlishTag(kind, elementId);
  if (updates.length === 1) {
    const u = updates[0];
    const val =
      u.field === "src" && u.new_value.length > 80 ? `"${u.new_value.slice(0, 77)}…"` : JSON.stringify(u.new_value);
    return `[Визуальный редактор] Измени ${target}: ${u.field} → ${val}`;
  }
  const parts = updates.map((u) => `${u.field}: ${JSON.stringify(u.new_value)}`).join("; ");
  return `[Визуальный редактор] Измени ${target}: ${parts}`;
}

export function buildVisualEditorPayload(
  element_id: string,
  element_type: LayoutElementKind | string,
  updates: { field: string; new_value: string }[]
): VisualEditorSubmitPayload {
  const human_instruction = buildHumanInstructionLine(element_type, element_id, updates);
  const structured: VisualEditorStructuredPayload = {
    source: "visual_editor",
    action: "update_element",
    element_id,
    element_type,
    updates,
    human_instruction
  };
  const chatMessage = `${human_instruction}\n\n[visual_editor_json]\n${JSON.stringify(structured)}`;
  return { chatMessage, structured };
}

/** Короткая инструкция при замене картинки после загрузки файла (URL уже известен). */
export function buildImageReplaceInstruction(elementId: string, newSrc: string): VisualEditorSubmitPayload {
  return buildVisualEditorPayload(elementId, "image", [{ field: "src", new_value: newSrc }]);
}
