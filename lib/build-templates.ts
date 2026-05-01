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
import {
  PR_LEAD_DEFAULT_USER_PROMPT,
  PR_LEAD_PUCK_JSON,
  PR_LEAD_PRESET_FILES,
  PR_LEAD_TEMPLATE_DESCRIPTION,
  PR_LEAD_TEMPLATE_NAME,
  PR_LEAD_TEMPLATE_RULES,
  PR_LEAD_TEMPLATE_SLUG
} from "@/lib/build-template-presets/lead-pr-preset";
import {
  WEB_STUDIO_DEFAULT_USER_PROMPT,
  WEB_STUDIO_PUCK_JSON,
  WEB_STUDIO_PRESET_FILES,
  WEB_STUDIO_TEMPLATE_DESCRIPTION,
  WEB_STUDIO_TEMPLATE_NAME,
  WEB_STUDIO_TEMPLATE_RULES,
  WEB_STUDIO_TEMPLATE_SLUG
} from "@/lib/build-template-presets/web-studio-preset";
import {
  EVENTS_AI_DEFAULT_USER_PROMPT,
  EVENTS_AI_PUCK_JSON,
  EVENTS_AI_PRESET_FILES,
  EVENTS_AI_TEMPLATE_DESCRIPTION,
  EVENTS_AI_TEMPLATE_NAME,
  EVENTS_AI_TEMPLATE_RULES,
  EVENTS_AI_TEMPLATE_SLUG
} from "@/lib/build-template-presets/events-ai-preset";

const PRESET_DEFAULT_USER_PROMPT_BY_SLUG: Record<string, string> = {
  [MASSAGE_TEMPLATE_SLUG]: MASSAGE_DEFAULT_USER_PROMPT,
  [IT_STARTUP_TEMPLATE_SLUG]: IT_STARTUP_DEFAULT_USER_PROMPT,
  [PR_LEAD_TEMPLATE_SLUG]: PR_LEAD_DEFAULT_USER_PROMPT,
  [WEB_STUDIO_TEMPLATE_SLUG]: WEB_STUDIO_DEFAULT_USER_PROMPT,
  [EVENTS_AI_TEMPLATE_SLUG]: EVENTS_AI_DEFAULT_USER_PROMPT
};

/** Встроенный макет Puck по slug (если в БД нет puck.json — подмешиваем). */
const PRESET_PUCK_JSON_BY_SLUG: Record<string, string> = {
  [MASSAGE_TEMPLATE_SLUG]: MASSAGE_PUCK_JSON,
  [IT_STARTUP_TEMPLATE_SLUG]: IT_STARTUP_PUCK_JSON,
  [PR_LEAD_TEMPLATE_SLUG]: PR_LEAD_PUCK_JSON,
  [WEB_STUDIO_TEMPLATE_SLUG]: WEB_STUDIO_PUCK_JSON,
  [EVENTS_AI_TEMPLATE_SLUG]: EVENTS_AI_PUCK_JSON
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
  },
  {
    slug: PR_LEAD_TEMPLATE_SLUG,
    name: PR_LEAD_TEMPLATE_NAME,
    description: PR_LEAD_TEMPLATE_DESCRIPTION,
    rules: PR_LEAD_TEMPLATE_RULES,
    files: PR_LEAD_PRESET_FILES,
    defaultUserPrompt: PR_LEAD_DEFAULT_USER_PROMPT
  },
  {
    slug: WEB_STUDIO_TEMPLATE_SLUG,
    name: WEB_STUDIO_TEMPLATE_NAME,
    description: WEB_STUDIO_TEMPLATE_DESCRIPTION,
    rules: WEB_STUDIO_TEMPLATE_RULES,
    files: WEB_STUDIO_PRESET_FILES,
    defaultUserPrompt: WEB_STUDIO_DEFAULT_USER_PROMPT
  },
  {
    slug: EVENTS_AI_TEMPLATE_SLUG,
    name: EVENTS_AI_TEMPLATE_NAME,
    description: EVENTS_AI_TEMPLATE_DESCRIPTION,
    rules: EVENTS_AI_TEMPLATE_RULES,
    files: EVENTS_AI_PRESET_FILES,
    defaultUserPrompt: EVENTS_AI_DEFAULT_USER_PROMPT
  }
];

const BUILTIN_SPEC_BY_SLUG: Record<string, (typeof BUILTIN_PRESET_SPECS)[number]> = Object.fromEntries(
  BUILTIN_PRESET_SPECS.map((p) => [p.slug, p])
);

/** Каталог из кода без Prisma — если сессии нет, пользователя нет в БД или недоступна БД для списка. */
export function getBuiltinBuildTemplateCatalogList(): BuildTemplateListItem[] {
  return BUILTIN_PRESET_SPECS.map((p) => ({
    id: `preset-${p.slug}`,
    slug: p.slug,
    name: p.name,
    description: p.description,
    defaultUserPrompt: p.defaultUserPrompt
  })).sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
}

function builtinListItemFromSlug(slug: string): BuildTemplateListItem | null {
  const p = BUILTIN_SPEC_BY_SLUG[slug];
  if (!p) return null;
  return {
    id: `preset-${p.slug}`,
    slug: p.slug,
    name: p.name,
    description: p.description,
    defaultUserPrompt: p.defaultUserPrompt
  };
}

function builtinRecordFromSlug(slug: string): BuildTemplateRecord | null {
  const p = BUILTIN_SPEC_BY_SLUG[slug];
  if (!p) return null;
  return {
    id: `preset-${p.slug}`,
    slug: p.slug,
    name: p.name,
    description: p.description,
    rules: p.rules,
    files: mergePresetPuckIntoFiles(p.slug, { ...p.files })
  };
}

function resolveDefaultUserPrompt(slug: string, stored: string | null | undefined): string {
  const trimmed = typeof stored === "string" ? stored.trim() : "";
  if (trimmed.length > 0) return stored ?? "";
  return PRESET_DEFAULT_USER_PROMPT_BY_SLUG[slug] ?? "";
}

/**
 * Вставка пресетов, если таблица пустая (idempotent).
 */
export async function ensureBuildTemplatesSeeded(): Promise<void> {
  try {
    const resync = process.env.LEMNITY_RESYNC_BUILTIN_BUILD_TEMPLATES === "1";
    for (const p of BUILTIN_PRESET_SPECS) {
      const existing = await prisma.buildTemplate.findUnique({ where: { slug: p.slug } });
      if (!existing) {
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
        continue;
      }
      if (!resync) continue;
      await prisma.buildTemplate.update({
        where: { slug: p.slug },
        data: {
          name: p.name,
          description: p.description,
          rules: p.rules,
          files: p.files as object,
          defaultUserPrompt: p.defaultUserPrompt
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
      select: { id: true, slug: true, name: true, description: true, defaultUserPrompt: true }
    });
    const bySlug = new Map(rows.map((r) => [r.slug, r]));
    const merged: BuildTemplateListItem[] = [];

    for (const spec of BUILTIN_PRESET_SPECS) {
      const row = bySlug.get(spec.slug);
      if (row) {
        merged.push({
          id: row.id,
          slug: row.slug,
          name: row.name,
          description: row.description,
          defaultUserPrompt: resolveDefaultUserPrompt(row.slug, row.defaultUserPrompt)
        });
      } else {
        const b = builtinListItemFromSlug(spec.slug);
        if (b) merged.push(b);
      }
    }

    for (const row of rows) {
      if (BUILTIN_SPEC_BY_SLUG[row.slug]) continue;
      merged.push({
        id: row.id,
        slug: row.slug,
        name: row.name,
        description: row.description,
        defaultUserPrompt: resolveDefaultUserPrompt(row.slug, row.defaultUserPrompt)
      });
    }

    merged.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
    return merged;
  } catch (err) {
    console.warn("[build-templates] list failed", err);
    return getBuiltinBuildTemplateCatalogList();
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
    if (row) {
      const files = row.files;
      if (files && typeof files === "object" && !Array.isArray(files)) {
        return {
          id: row.id,
          slug: row.slug,
          name: row.name,
          description: row.description,
          rules: row.rules,
          files: mergePresetPuckIntoFiles(s, files as Record<string, string>)
        };
      }
    }
    const fromCode = builtinRecordFromSlug(s);
    if (fromCode) return fromCode;
    return null;
  } catch (err) {
    console.warn("[build-templates] getBySlug failed", err);
    return builtinRecordFromSlug(s);
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
