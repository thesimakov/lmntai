import type { Editor } from "grapesjs";

/**
 * По умолчанию Grapes 0.22 рисует float / position / text-align как радиокнопки в ряд.
 * На макете Lemnity — выпадающий список на всю ширину блока свойства.
 */
const RADIO_PROP_TO_SELECT: readonly { sectorId: string; propCss: string }[] = [
  { sectorId: "general", propCss: "float" },
  { sectorId: "general", propCss: "position" },
  { sectorId: "typography", propCss: "text-align" },
] as const;

function cloneSmOptions(prop: {
  get(name: string): unknown;
}): Array<{ id: string; label?: string }> {
  const opts = prop.get("options") as unknown;
  if (!Array.isArray(opts)) return [];
  return opts.map((o: Record<string, unknown>) => {
    const rawId = (o.id ?? o.value ?? "") as string | number | undefined | null;
    const id = String(rawId ?? "");
    const lab = o.label ?? o.name;
    return typeof lab === "string" ? { id, label: lab } : { id };
  });
}

function replaceSmRadioWithSelect(editor: Editor): void {
  const sm = editor.StyleManager;
  for (const { sectorId, propCss } of RADIO_PROP_TO_SELECT) {
    const prop = sm.getProperty(sectorId, propCss);
    if (!prop) continue;

    const coll = sm.getProperties(sectorId);
    let at = 0;
    if (coll && typeof coll.indexOf === "function") {
      const ix = coll.indexOf(prop as never);
      at = ix >= 0 ? ix : 0;
    }

    const options = cloneSmOptions(prop);
    const def = prop.get("default");
    sm.removeProperty(sectorId, propCss);
    sm.addProperty(
      sectorId,
      {
        type: "select",
        property: propCss,
        default: def,
        options,
        full: true,
      },
      at >= 0 ? { at } : undefined,
    );
  }
}

/** После создания редакторa: один раз перевести выбранные свойства SM на выпадающие списки. */
export function attachLemnityBoxStyleManagerChoiceDropdowns(editor: Editor): void {
  editor.on("load", () => {
    queueMicrotask(() => replaceSmRadioWithSelect(editor));
  });
}
