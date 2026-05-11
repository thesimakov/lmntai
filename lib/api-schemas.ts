import { z } from "zod";

import { apiError } from "@/lib/api-response";

// --- Auth ---

export const ForgotPasswordBody = z.object({
  email: z.string().email(),
});

export const ResetPasswordBody = z.object({
  token: z.string().min(32),
  password: z.string().min(8),
});

// --- CMS Pages ---

export const CreateCmsPageBody = z.object({
  title: z.string().min(1).max(200),
  slug: z.string().min(1).max(100).optional(),
  parentId: z.string().optional(),
  kind: z.enum(["page", "folder"]).default("page"),
});

export const UpdateCmsPageBody = z.object({
  title: z.string().min(1).max(200).optional(),
  slug: z.string().min(1).max(100).optional(),
  parentId: z.string().nullable().optional(),
});

// --- CMS Content Types ---

export const CmsContentFieldSchema = z.object({
  key: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-z0-9_]+$/, "Field key must be lowercase alphanumeric/underscore"),
  label: z.string().min(1).max(100),
  fieldType: z.enum(["text", "textarea", "number", "boolean", "date", "image", "relation", "richtext"]),
  required: z.boolean().default(false),
  config: z.record(z.unknown()).optional(),
});

export const CreateContentTypeBody = z.object({
  apiKey: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-z0-9_]+$/, "apiKey must be lowercase alphanumeric/underscore"),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  fields: z.array(CmsContentFieldSchema).max(50).default([]),
});

// --- CMS Entries ---

export const CreateCmsEntryBody = z.object({
  id: z.string().optional(),
  slug: z.string().min(1).max(200),
  data: z.record(z.unknown()).optional().default({}),
});

// --- Form Submissions ---

export const FormSubmissionBody = z.object({
  pageId: z.string().max(100).optional(),
  pagePath: z.string().max(500).optional(),
  formName: z.string().max(200).optional(),
  fields: z
    .record(z.string().max(50), z.string().max(10_000))
    .refine((f) => Object.keys(f).length <= 100, { message: "Too many fields (max 100)" })
    .default({}),
});

// --- Projects ---

export const CreateProjectBody = z.object({
  title: z.string().min(1).max(100),
});

// --- Team ---

export const InviteTeamMemberBody = z.object({
  email: z.string().email(),
  role: z.enum(["ADMIN", "EDITOR"]),
});

export const UpdateTeamMemberBody = z.object({
  role: z.enum(["ADMIN", "EDITOR"]),
});

// --- Publish Domain ---

export const BindPublishDomainBody = z.object({
  host: z
    .string()
    .min(1)
    .max(253)
    .regex(
      /^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i,
      "Invalid hostname format",
    ),
});

// --- Pagination ---

export const PaginationQuery = z.object({
  take: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
});

// --- Utility ---

/**
 * Парсит тело запроса по Zod-схеме.
 * Возвращает { ok: true, data } или { ok: false, response: Response } с 400.
 */
export async function parseBody<T>(
  req: Request,
  schema: z.ZodSchema<T>,
): Promise<{ ok: true; data: T } | { ok: false; response: Response }> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return { ok: false, response: apiError("Invalid JSON body", 400) };
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    const message = result.error.errors
      .map((e) => `${e.path.join(".") || "body"}: ${e.message}`)
      .join("; ");
    return { ok: false, response: apiError(`Validation error: ${message}`, 400, { code: "VALIDATION_ERROR" }) };
  }
  return { ok: true, data: result.data };
}

/**
 * Парсит query-параметры по Zod-схеме.
 */
export function parseQuery<T>(
  searchParams: URLSearchParams,
  schema: z.ZodSchema<T>,
): { ok: true; data: T } | { ok: false; response: Response } {
  const raw = Object.fromEntries(searchParams.entries());
  const result = schema.safeParse(raw);
  if (!result.success) {
    const message = result.error.errors
      .map((e) => `${e.path.join(".") || "query"}: ${e.message}`)
      .join("; ");
    return { ok: false, response: apiError(`Invalid query: ${message}`, 400, { code: "VALIDATION_ERROR" }) };
  }
  return { ok: true, data: result.data };
}
