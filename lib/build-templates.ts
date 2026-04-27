import { prisma } from "@/lib/prisma";
import {
  MASSAGE_PRESET_FILES,
  MASSAGE_TEMPLATE_DESCRIPTION,
  MASSAGE_TEMPLATE_NAME,
  MASSAGE_TEMPLATE_RULES,
  MASSAGE_TEMPLATE_SLUG
} from "@/lib/build-template-presets/massage-preset";

export type BuildTemplateListItem = {
  id: string;
  slug: string;
  name: string;
  description: string;
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
    const count = await prisma.buildTemplate.count();
    if (count > 0) return;

    await prisma.buildTemplate.upsert({
      where: { slug: MASSAGE_TEMPLATE_SLUG },
      create: {
        slug: MASSAGE_TEMPLATE_SLUG,
        name: MASSAGE_TEMPLATE_NAME,
        description: MASSAGE_TEMPLATE_DESCRIPTION,
        rules: MASSAGE_TEMPLATE_RULES,
        files: MASSAGE_PRESET_FILES as object,
        isActive: true
      },
      update: {}
    });
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
      select: { id: true, slug: true, name: true, description: true }
    });
    return rows;
  } catch (err) {
    console.warn("[build-templates] list failed", err);
    return [
      {
        id: "preset-massage",
        slug: MASSAGE_TEMPLATE_SLUG,
        name: MASSAGE_TEMPLATE_NAME,
        description: MASSAGE_TEMPLATE_DESCRIPTION
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
      files: files as Record<string, string>
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
        files: MASSAGE_PRESET_FILES
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
    "User request:",
    userMessage.trim()
  ]
    .filter(Boolean)
    .join("\n\n");
}
