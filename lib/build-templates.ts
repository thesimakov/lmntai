import { prisma } from "@/lib/prisma";
import {
  MASSAGE_DEFAULT_USER_PROMPT,
  MASSAGE_PUCK_JSON,
  MASSAGE_PRESET_FILES,
  MASSAGE_TEMPLATE_DESCRIPTION,
  MASSAGE_TEMPLATE_NAME,
  MASSAGE_TEMPLATE_RULES,
  MASSAGE_TEMPLATE_SLUG
} from "@/lib/build-template-presets/massage-preset";
import {
  IT_STARTUP_DEFAULT_USER_PROMPT,
  IT_STARTUP_PUCK_JSON,
  IT_STARTUP_PRESET_FILES,
  IT_STARTUP_TEMPLATE_DESCRIPTION,
  IT_STARTUP_TEMPLATE_NAME,
  IT_STARTUP_TEMPLATE_RULES,
  IT_STARTUP_TEMPLATE_SLUG
} from "@/lib/build-template-presets/it-startup-preset";

const PRESET_DEFAULT_USER_PROMPT_BY_SLUG: Record<string, string> = {
  [MASSAGE_TEMPLATE_SLUG]: MASSAGE_DEFAULT_USER_PROMPT,
  [IT_STARTUP_TEMPLATE_SLUG]: IT_STARTUP_DEFAULT_USER_PROMPT
};

/** Встроенный макет Puck по slug (если в БД нет puck.json — подмешиваем). */
const PRESET_PUCK_JSON_BY_SLUG: Record<string, string> = {
  [MASSAGE_TEMPLATE_SLUG]: MASSAGE_PUCK_JSON,
  [IT_STARTUP_TEMPLATE_SLUG]: IT_STARTUP_PUCK_JSON
};

function mergePresetPuckIntoFiles(slug: string, files: Record<string, string>): Record<string, string> {
  const out = { ...files };
  const cur = typeof out["puck.json"] === "string" ? out["puck.json"].trim() : "";
  if (!cur) {
    const def = PRESET_PUCK_JSON_BY_SLUG[slug];
    if (def) out["puck.json"] = def;
  }
  return out;
}

const BUILTIN_PRESET_SPECS: Array<{
  slug: string;
  name: string;
  description: string;
  rules: string;
  files: Record<string, string>;
  defaultUserPrompt: string;
}> = [
  {
    slug: MASSAGE_TEMPLATE_SLUG,
    name: MASSAGE_TEMPLATE_NAME,
    description: MASSAGE_TEMPLATE_DESCRIPTION,
    rules: MASSAGE_TEMPLATE_RULES,
    files: MASSAGE_PRESET_FILES,
    defaultUserPrompt: MASSAGE_DEFAULT_USER_PROMPT
  },
  {
    slug: IT_STARTUP_TEMPLATE_SLUG,
    name: IT_STARTUP_TEMPLATE_NAME,
    description: IT_STARTUP_TEMPLATE_DESCRIPTION,
    rules: IT_STARTUP_TEMPLATE_RULES,
    files: IT_STARTUP_PRESET_FILES,
    defaultUserPrompt: IT_STARTUP_DEFAULT_USER_PROMPT
  }
];

function resolveDefaultUserPrompt(slug: string, stored: string | null | undefined): string {
  const trimmed = typeof stored === "string" ? stored.trim() : "";
  if (trimmed.length > 0) return stored ?? "";
  return PRESET_DEFAULT_USER_PROMPT_BY_SLUG[slug] ?? "";
}

export type BuildTemplateListItem = {
  id: string;
  slug: string;
  name: string;
  description: string;
  /** Текст для поля ввода / сборки */
  defaultUserPrompt: string;
};

export type BuildTemplateRecord = {
  id: string;
  slug: string;
  name: string;
  description: string;
  rules: string;
  files: Record<string, string>;
};

/**
 * Вставка пресетов, если таблица пустая (idempotent).
 */
export async function ensureBuildTemplatesSeeded(): Promise<void> {
  try {
    for (const p of BUILTIN_PRESET_SPECS) {
      const existing = await prisma.buildTemplate.findUnique({ where: { slug: p.slug } });
      if (existing) continue;
      await prisma.buildTemplate.create({
        data: {
          slug: p.slug,
          name: p.name,
          description: p.description,
          rules: p.rules,
          files: p.files as object,
          defaultUserPrompt: p.defaultUserPrompt,
          isActive: true
        }
      });
    }
  } catch (err) {
    console.warn("[build-templates] seed skipped (db unavailable?)", err);
  }
}

export async function listBuildTemplates(): Promise<BuildTemplateListItem[]> {
  await ensureBuildTemplatesSeeded();
  try {
    const rows = await prisma.buildTemplate.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, slug: true, name: true, description: true, defaultUserPrompt: true }
    });
    return rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      name: r.name,
      description: r.description,
      defaultUserPrompt: resolveDefaultUserPrompt(r.slug, r.defaultUserPrompt)
    }));
  } catch (err) {
    console.warn("[build-templates] list failed", err);
    return [
      {
        id: "preset-massage",
        slug: MASSAGE_TEMPLATE_SLUG,
        name: MASSAGE_TEMPLATE_NAME,
        description: MASSAGE_TEMPLATE_DESCRIPTION,
        defaultUserPrompt: MASSAGE_DEFAULT_USER_PROMPT
      },
      {
        id: "preset-it-startup",
        slug: IT_STARTUP_TEMPLATE_SLUG,
        name: IT_STARTUP_TEMPLATE_NAME,
        description: IT_STARTUP_TEMPLATE_DESCRIPTION,
        defaultUserPrompt: IT_STARTUP_DEFAULT_USER_PROMPT
      }
    ];
  }
}

export async function getBuildTemplateBySlug(slug: string): Promise<BuildTemplateRecord | null> {
  const s = slug.trim();
  if (!s) return null;
  await ensureBuildTemplatesSeeded();
  try {
    const row = await prisma.buildTemplate.findFirst({
      where: { slug: s, isActive: true }
    });
    if (!row) return null;
    const files = row.files;
    if (!files || typeof files !== "object" || Array.isArray(files)) return null;
    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      description: row.description,
      rules: row.rules,
      files: mergePresetPuckIntoFiles(s, files as Record<string, string>)
    };
  } catch (err) {
    console.warn("[build-templates] getBySlug failed", err);
    if (s === MASSAGE_TEMPLATE_SLUG) {
      return {
        id: "preset-massage",
        slug: MASSAGE_TEMPLATE_SLUG,
        name: MASSAGE_TEMPLATE_NAME,
        description: MASSAGE_TEMPLATE_DESCRIPTION,
        rules: MASSAGE_TEMPLATE_RULES,
        files: mergePresetPuckIntoFiles(MASSAGE_TEMPLATE_SLUG, MASSAGE_PRESET_FILES)
      };
    }
    if (s === IT_STARTUP_TEMPLATE_SLUG) {
      return {
        id: "preset-it-startup",
        slug: IT_STARTUP_TEMPLATE_SLUG,
        name: IT_STARTUP_TEMPLATE_NAME,
        description: IT_STARTUP_TEMPLATE_DESCRIPTION,
        rules: IT_STARTUP_TEMPLATE_RULES,
        files: mergePresetPuckIntoFiles(IT_STARTUP_TEMPLATE_SLUG, IT_STARTUP_PRESET_FILES)
      };
    }
    return null;
  }
}

export function formatBuildTemplateBlock(rules: string, files: Record<string, string>): string {
  const lines: string[] = [rules.trim(), "", "### TEMPLATE_FILES"];
  for (const [rel, content] of Object.entries(files)) {
    const body = content.trimEnd();
    lines.push("```tsx:" + rel);
    lines.push(body);
    lines.push("```");
  }
  return lines.join("\n");
}

/** Склеить шаблон с текстом запроса для чата / RouterAI. */
export async function mergeBuildTemplateIntoUserMessage(
  slug: string,
  userMessage: string
): Promise<string | null> {
  const t = await getBuildTemplateBySlug(slug);
  if (!t) return null;
  const block = formatBuildTemplateBlock(t.rules, t.files);
  return [
    `[Build template: ${t.name} (${t.slug})]`,
    block,
    "---",
    "Upstream instructions: the preview is already built from this snapshot. **Do not** recite the long template brief. **First response:** ask what to change. **Edits:** minimal — the right `src/...` files and `puck.json` (keep marketing copy in TSX and `puck.json` in sync).",
    "---",
    "User request:",
    userMessage.trim()
  ]
    .filter(Boolean)
    .join("\n\n");
}
