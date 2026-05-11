"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ClipboardList,
  Copy,
  CopyPlus,
  ExternalLink,
  Eye,
  FileText,
  Globe,
  History,
  Layers,
  Link2,
  Loader2,
  Lock,
  MoreHorizontal,
  Pencil,
  RotateCcw,
  Search,
  Settings,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { useI18n } from "@/components/i18n-provider";
import { PageTransition } from "@/components/page-transition";
import { PlaygroundCmsSubmissionKanban } from "@/components/playground/playground-cms-submission-kanban";
import { PlaygroundStudioChrome } from "@/components/playground/playground-studio-chrome";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CMS_FORM_SUBMISSION_KANBAN_DONE,
  CMS_FORM_SUBMISSION_KANBAN_IN_PROGRESS,
  CMS_FORM_SUBMISSION_KANBAN_NEW,
} from "@/lib/cms-form-submissions-kanban";
import {
  PUBLISH_BUILTIN_BASE_DOMAIN,
  normalizePublishCustomHost,
  normalizePublishSubdomainLabel,
  suggestPublishSubdomain,
} from "@/lib/publish-host";
import { copyTextToClipboard } from "@/lib/preview-share";
import { cn } from "@/lib/utils";

type ProjectRow = { id: string; name: string };
type SiteRow = {
  id: string;
  name: string;
  projectId: string;
  pagesCount: number;
  updatedAt: string;
  project?: { id: string; name: string; subdomain: string | null } | null;
};

type CmsDomainVerification = {
  status: "PENDING" | "VERIFIED";
  recordType: "TXT" | null;
  recordName: string | null;
  recordValue: string | null;
  verifiedAt: string | null;
};
type PageRow = {
  id: string;
  title: string;
  slug: string;
  path: string;
  kind?: string;
  isHome: boolean;
  parentId: string | null;
  sortOrder?: number;
  seoTitle?: string | null;
  seoDescription?: string | null;
  seoKeywords?: string | null;
  seoCanonicalUrl?: string | null;
  noIndex?: boolean;
  seoNoFollow?: boolean;
  draftRevisionId: string | null;
  publishedRevisionId: string | null;
  updatedAt?: string;
  draftVersion?: number | null;
  publishedVersion?: number | null;
};
type PublishJobRow = {
  id: string;
  status: string;
  createdAt: string;
  publishedAt: string | null;
  pagesCount: number;
  entriesCount: number;
  author: string | null;
};
type ContentTypeRow = {
  id: string;
  apiKey: string;
  name: string;
  entriesCount: number;
};
type EntryRow = {
  id: string;
  slug: string;
  status: string;
  draftVersion: { data: unknown } | null;
  publishedVersion: { data: unknown } | null;
};

type FormSubmissionRow = {
  id: string;
  pageId: string | null;
  pagePath: string | null;
  pageTitle: string | null;
  formName: string | null;
  kanbanColumnKey: string;
  fields: Record<string, string>;
  createdAt: string;
};

type CmsPanelSectionId =
  | "pages"
  | "seo"
  | "history"
  | "domain"
  | "content-types"
  | "entries"
  | "submissions";

async function readJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(text || "Некорректный JSON-ответ");
  }
}

function fmtDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("ru-RU", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function displayMetaPlain(text: string | null | undefined): string {
  const s = (text ?? "").trim();
  return s || "—";
}

export default function PlaygroundCmsPage() {
  const search = useSearchParams();
  const { t } = useI18n();
  const { data: session } = useSession();
  const cmsProjectId = search.get("projectId")?.trim() || "";
  const rawPlanUpper = String(session?.user?.plan ?? "").toUpperCase();
  const hasCustomDomainPlan =
    rawPlanUpper === "PRO" || rawPlanUpper === "TEAM" || rawPlanUpper === "BUSINESS";

  const [loading, setLoading] = useState(() => Boolean(search.get("projectId")?.trim()));
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [sites, setSites] = useState<SiteRow[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string>("");

  const cmsProjectName = useMemo(
    () => (cmsProjectId ? (projects.find((p) => p.id === cmsProjectId)?.name ?? null) : null),
    [cmsProjectId, projects],
  );

  const [pages, setPages] = useState<PageRow[]>([]);
  const [publishHistory, setPublishHistory] = useState<PublishJobRow[]>([]);
  const [selectedPageId, setSelectedPageId] = useState("");

  const [contentTypes, setContentTypes] = useState<ContentTypeRow[]>([]);
  const [selectedTypeId, setSelectedTypeId] = useState("");
  const [entries, setEntries] = useState<EntryRow[]>([]);
  const [formSubmissions, setFormSubmissions] = useState<FormSubmissionRow[]>([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [formWebhookInput, setFormWebhookInput] = useState("");
  const [formWebhookLoading, setFormWebhookLoading] = useState(false);
  const [formWebhookSaving, setFormWebhookSaving] = useState(false);
  const [submissionKanbanCustomColumns, setSubmissionKanbanCustomColumns] = useState<
    { id: string; label: string }[]
  >([]);
  const [submissionKanbanAddOpen, setSubmissionKanbanAddOpen] = useState(false);
  const [submissionKanbanAddLabel, setSubmissionKanbanAddLabel] = useState("");
  const [submissionKanbanAddBusy, setSubmissionKanbanAddBusy] = useState(false);
  const submissionKanbanMoveLock = useRef(false);

  const [createPageTitle, setCreatePageTitle] = useState("");
  const [createPageSlug, setCreatePageSlug] = useState("");
  const [createParentId, setCreateParentId] = useState("");
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [seoKeywords, setSeoKeywords] = useState("");
  const [seoCanonicalUrl, setSeoCanonicalUrl] = useState("");
  const [seoNoIndex, setSeoNoIndex] = useState(false);
  const [seoNoFollow, setSeoNoFollow] = useState(false);

  const [robotsGenerated, setRobotsGenerated] = useState("");
  const [robotsDraft, setRobotsDraft] = useState("");
  const [robotsCustom, setRobotsCustom] = useState(false);
  const [robotsPublicOrigin, setRobotsPublicOrigin] = useState<string | null>(null);
  const [robotsLoading, setRobotsLoading] = useState(false);
  const [robotsSaving, setRobotsSaving] = useState(false);

  const [createTypeName, setCreateTypeName] = useState("");
  const [createTypeKey, setCreateTypeKey] = useState("");
  const [entrySlug, setEntrySlug] = useState("");
  const [entryJson, setEntryJson] = useState("{\n  \"title\": \"\",\n  \"body\": \"\"\n}");
  const [busy, setBusy] = useState<string | null>(null);
  const [expandedPageIds, setExpandedPageIds] = useState<Set<string>>(() => new Set());
  const [cmsActiveSection, setCmsActiveSection] = useState<CmsPanelSectionId>("pages");
  const [cmsNavQuery, setCmsNavQuery] = useState("");
  const [cmsDomainMode, setCmsDomainMode] = useState<"subdomain" | "custom">("subdomain");
  const [cmsDomainSubdomain, setCmsDomainSubdomain] = useState("");
  const [cmsDomainCustom, setCmsDomainCustom] = useState("");
  const [cmsDomainVerification, setCmsDomainVerification] = useState<CmsDomainVerification | null>(null);
  const [cmsDomainBusy, setCmsDomainBusy] = useState(false);
  const [cmsDomainLoading, setCmsDomainLoading] = useState(false);
  const [pageSettingsDialogForId, setPageSettingsDialogForId] = useState<string | null>(null);
  const [pageSettingsTab, setPageSettingsTab] = useState<"main" | "seo">("main");
  const [pageSettingsTitle, setPageSettingsTitle] = useState("");
  const [pageSettingsSlug, setPageSettingsSlug] = useState("");
  const [pageSettingsSeoTitle, setPageSettingsSeoTitle] = useState("");
  const [pageSettingsSeoDescription, setPageSettingsSeoDescription] = useState("");
  const [pageSettingsSeoKeywords, setPageSettingsSeoKeywords] = useState("");
  const [pageSettingsCanonicalUrl, setPageSettingsCanonicalUrl] = useState("");
  const [pageSettingsNoIndex, setPageSettingsNoIndex] = useState(false);
  const [pageSettingsNoFollow, setPageSettingsNoFollow] = useState(false);

  const selectedSite = useMemo(() => sites.find((s) => s.id === selectedSiteId) ?? null, [sites, selectedSiteId]);
  const selectedPage = useMemo(() => pages.find((p) => p.id === selectedPageId) ?? null, [pages, selectedPageId]);
  const pathByPageId = useMemo(() => new Map(pages.map((p) => [p.id, p.path])), [pages]);
  const selectedType = useMemo(
    () => contentTypes.find((t) => t.id === selectedTypeId) ?? null,
    [contentTypes, selectedTypeId],
  );

  const fetchCmsPublishDomain = useCallback(async (projectId: string, init?: RequestInit): Promise<Response | null> => {
    if (!projectId) return null;
    return fetch(`/api/sandbox/${encodeURIComponent(projectId)}/publish-domain`, {
      credentials: "include",
      ...init,
    });
  }, []);

  const cleanCmsSubdomain = useMemo(() => {
    const normalized = normalizePublishSubdomainLabel(cmsDomainSubdomain);
    if (normalized) return normalized;
    return suggestPublishSubdomain(selectedSite?.name, selectedSite?.projectId ?? null);
  }, [cmsDomainSubdomain, selectedSite?.name, selectedSite?.projectId]);

  const cmsManualHost = useMemo(() => normalizePublishCustomHost(cmsDomainCustom), [cmsDomainCustom]);

  const cmsPublishHost = useMemo(() => {
    if (cmsDomainMode === "custom" && hasCustomDomainPlan && cmsManualHost) return cmsManualHost;
    return `${cleanCmsSubdomain}.${PUBLISH_BUILTIN_BASE_DOMAIN}`;
  }, [cmsDomainMode, hasCustomDomainPlan, cmsManualHost, cleanCmsSubdomain]);

  const cmsPublicUrl = useMemo(() => `https://${cmsPublishHost}`, [cmsPublishHost]);

  const pageSettingsTargetPage = useMemo(() => {
    if (!pageSettingsDialogForId) return null;
    return pages.find((p) => p.id === pageSettingsDialogForId) ?? null;
  }, [pages, pageSettingsDialogForId]);

  const pageSettingsPublicPageUrl = useMemo(() => {
    if (!pageSettingsTargetPage) return "";
    const path = pageSettingsTargetPage.path || "/";
    const suffix = path.startsWith("/") ? path : `/${path}`;
    return `${cmsPublicUrl.replace(/\/$/, "")}${suffix === "//" ? "/" : suffix}`;
  }, [cmsPublicUrl, pageSettingsTargetPage]);

  const pageSettingsSerpTitle = useMemo(
    () => pageSettingsSeoTitle.trim() || pageSettingsTitle.trim() || "—",
    [pageSettingsSeoTitle, pageSettingsTitle],
  );
  const pageSettingsSerpDescription = useMemo(
    () => pageSettingsSeoDescription.trim(),
    [pageSettingsSeoDescription],
  );
  const pageSettingsSerpUrl = useMemo(
    () => pageSettingsCanonicalUrl.trim() || pageSettingsPublicPageUrl || "—",
    [pageSettingsCanonicalUrl, pageSettingsPublicPageUrl],
  );

  const submissionKanbanColumnDefs = useMemo(
    () => [
      { id: CMS_FORM_SUBMISSION_KANBAN_NEW, label: t("playground_cms_submissions_kanban_new") },
      {
        id: CMS_FORM_SUBMISSION_KANBAN_IN_PROGRESS,
        label: t("playground_cms_submissions_kanban_in_progress"),
      },
      { id: CMS_FORM_SUBMISSION_KANBAN_DONE, label: t("playground_cms_submissions_kanban_done") },
      ...submissionKanbanCustomColumns.map((c) => ({ id: c.id, label: c.label })),
    ],
    [t, submissionKanbanCustomColumns],
  );

  const submissionsByKanbanColumn = useMemo(() => {
    const known = new Set(submissionKanbanColumnDefs.map((c) => c.id));
    const m: Record<string, FormSubmissionRow[]> = {};
    for (const col of submissionKanbanColumnDefs) m[col.id] = [];
    for (const s of formSubmissions) {
      const key = known.has(s.kanbanColumnKey) ? s.kanbanColumnKey : CMS_FORM_SUBMISSION_KANBAN_NEW;
      if (!m[key]) m[key] = [];
      m[key].push(s);
    }
    for (const rows of Object.values(m)) {
      rows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return m;
  }, [formSubmissions, submissionKanbanColumnDefs]);

  const cmsNavItems = useMemo(
    () =>
      (
        [
          ["pages", FileText, "playground_cms_pages_title"],
          ["seo", Globe, "playground_cms_seo_section"],
          ["history", History, "playground_cms_publish_history_title"],
          ["domain", Link2, "playground_cms_domain_title"],
          ["content-types", Layers, "playground_cms_content_types_title"],
          ["entries", ClipboardList, "playground_cms_entries_heading"],
        ] as const
      ).map(([id, icon, msgKey]) => ({
        id: id as CmsPanelSectionId,
        icon,
        label: t(msgKey),
      })),
    [t],
  );

  const cmsNavFiltered = useMemo(() => {
    const q = cmsNavQuery.trim().toLowerCase();
    if (!q.length) return cmsNavItems;
    return cmsNavItems.filter((item) => item.label.toLowerCase().includes(q));
  }, [cmsNavItems, cmsNavQuery]);

  const cmsActiveHeading = cmsNavItems.find((i) => i.id === cmsActiveSection)?.label ?? "";

  const loadSites = useCallback(async () => {
    const res = await fetch("/api/cms/sites", { credentials: "include", cache: "no-store" });
    if (!res.ok) throw new Error((await res.text()) || "Не удалось загрузить CMS-сайты");
    const body = await readJson<{ sites?: SiteRow[] }>(res);
    const next = Array.isArray(body.sites) ? body.sites : [];
    setSites(next);
    setSelectedSiteId((prev) => {
      if (cmsProjectId) {
        const forProject = next.find((s) => s.projectId === cmsProjectId);
        return forProject?.id ?? (prev && next.some((s) => s.id === prev && s.projectId === cmsProjectId) ? prev : "");
      }
      return prev && next.some((s) => s.id === prev) ? prev : next[0]?.id || "";
    });
  }, [cmsProjectId]);

  const loadProjects = useCallback(async () => {
    const res = await fetch("/api/projects", { credentials: "include", cache: "no-store" });
    if (!res.ok) throw new Error((await res.text()) || "Не удалось загрузить проекты");
    const body = await readJson<{ projects?: Array<{ id: string; name: string }> }>(res);
    setProjects((body.projects ?? []).map((p) => ({ id: p.id, name: p.name })));
  }, []);

  const loadPublishHistory = useCallback(async (siteId: string) => {
    if (!siteId) {
      setPublishHistory([]);
      return;
    }
    const res = await fetch(`/api/cms/sites/${encodeURIComponent(siteId)}/publish-history`, {
      credentials: "include",
      cache: "no-store",
    });
    if (!res.ok) throw new Error((await res.text()) || "Не удалось загрузить историю публикаций");
    const body = await readJson<{ jobs?: PublishJobRow[] }>(res);
    setPublishHistory(body.jobs ?? []);
  }, []);

  const loadSiteData = useCallback(
    async (siteId: string, opts?: { preferredPageId?: string | null }) => {
      if (!siteId) {
        setPages([]);
        setContentTypes([]);
        setSelectedTypeId("");
        setEntries([]);
        setPublishHistory([]);
        return;
      }
      const [pagesRes, typesRes] = await Promise.all([
        fetch(`/api/cms/sites/${encodeURIComponent(siteId)}/pages`, { credentials: "include", cache: "no-store" }),
        fetch(`/api/cms/sites/${encodeURIComponent(siteId)}/content-types`, {
          credentials: "include",
          cache: "no-store",
        }),
      ]);
      if (!pagesRes.ok) throw new Error((await pagesRes.text()) || "Не удалось загрузить страницы");
      if (!typesRes.ok) throw new Error((await typesRes.text()) || "Не удалось загрузить content types");
      const pagesBody = await readJson<{ pages?: PageRow[] }>(pagesRes);
      const typesBody = await readJson<{ contentTypes?: ContentTypeRow[] }>(typesRes);
      const nextPages = pagesBody.pages ?? [];
      const nextTypes = typesBody.contentTypes ?? [];
      const preferred = opts?.preferredPageId?.trim();
      setPages(nextPages);
      setContentTypes(nextTypes);
      setSelectedPageId((prev) => {
        if (preferred && nextPages.some((p) => p.id === preferred)) return preferred;
        return prev && nextPages.some((p) => p.id === prev) ? prev : nextPages[0]?.id || "";
      });
      setSelectedTypeId((prev) => (prev && nextTypes.some((t) => t.id === prev) ? prev : nextTypes[0]?.id || ""));
      await loadPublishHistory(siteId);
    },
    [loadPublishHistory],
  );

  const loadEntries = useCallback(async (siteId: string, typeId: string) => {
    if (!siteId || !typeId) {
      setEntries([]);
      return;
    }
    const res = await fetch(
      `/api/cms/sites/${encodeURIComponent(siteId)}/content-types/${encodeURIComponent(typeId)}/entries`,
      { credentials: "include", cache: "no-store" },
    );
    if (!res.ok) throw new Error((await res.text()) || "Не удалось загрузить entries");
    const body = await readJson<{ entries?: EntryRow[] }>(res);
    setEntries(body.entries ?? []);
  }, []);

  const loadFormSubmissions = useCallback(async (siteId: string) => {
    if (!siteId) {
      setFormSubmissions([]);
      setSubmissionKanbanCustomColumns([]);
      return;
    }
    const res = await fetch(`/api/cms/sites/${encodeURIComponent(siteId)}/form-submissions?take=120`, {
      credentials: "include",
      cache: "no-store",
    });
    if (!res.ok) throw new Error((await res.text()) || "Не удалось загрузить заявки");
    const body = await readJson<{
      submissions?: FormSubmissionRow[];
      kanbanCustomColumns?: { id?: string; label?: string }[];
    }>(res);
    const rawKanban = Array.isArray(body.kanbanCustomColumns) ? body.kanbanCustomColumns : [];
    const nextKanban = rawKanban
      .map((x) => ({
        id: typeof x.id === "string" ? x.id : "",
        label: typeof x.label === "string" ? x.label : "",
      }))
      .filter((x) => /^col_[a-f0-9]{8,48}$/.test(x.id) && x.label.trim().length > 0)
      .map((x) => ({ id: x.id, label: x.label }));
    setSubmissionKanbanCustomColumns(nextKanban);
    const raw = body.submissions ?? [];
    setFormSubmissions(
      raw.map((s) => ({
        ...s,
        kanbanColumnKey:
          typeof (s as { kanbanColumnKey?: unknown }).kanbanColumnKey === "string" &&
          (s as { kanbanColumnKey: string }).kanbanColumnKey.trim()
            ? (s as { kanbanColumnKey: string }).kanbanColumnKey.trim()
            : CMS_FORM_SUBMISSION_KANBAN_NEW,
        fields:
          s.fields && typeof s.fields === "object" && !Array.isArray(s.fields)
            ? (s.fields as Record<string, string>)
            : {},
      })),
    );
  }, []);

  const loadFormDispatch = useCallback(async (siteId: string) => {
    if (!siteId) {
      setFormWebhookInput("");
      return;
    }
    const res = await fetch(`/api/cms/sites/${encodeURIComponent(siteId)}/form-dispatch`, {
      credentials: "include",
      cache: "no-store",
    });
    if (!res.ok) throw new Error((await res.text()) || "Не удалось загрузить вебхук");
    const body = await readJson<{ formSubmissionWebhookUrl?: string | null }>(res);
    setFormWebhookInput(typeof body.formSubmissionWebhookUrl === "string" ? body.formSubmissionWebhookUrl : "");
  }, []);

  const saveFormWebhook = useCallback(async () => {
    if (!selectedSiteId) return;
    setFormWebhookSaving(true);
    try {
      const res = await fetch(`/api/cms/sites/${encodeURIComponent(selectedSiteId)}/form-dispatch`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ formSubmissionWebhookUrl: formWebhookInput.trim() || null }),
      });
      const body = await readJson<{ error?: string }>(res);
      if (!res.ok) {
        if (body.error === "bad_webhook_url") toast.error(t("playground_cms_submissions_webhook_invalid"));
        else toast.error(typeof body.error === "string" ? body.error : "Error");
        return;
      }
      toast.success(t("playground_cms_submissions_webhook_saved"));
      await loadFormDispatch(selectedSiteId);
    } catch {
      toast.error(t("playground_cms_domain_network_error"));
    } finally {
      setFormWebhookSaving(false);
    }
  }, [formWebhookInput, loadFormDispatch, selectedSiteId, t]);

  const patchSubmissionKanbanColumn = useCallback(
    async (submissionId: string, columnKey: string) => {
      if (!selectedSiteId || submissionKanbanMoveLock.current) return false;

      const prevRow = formSubmissions.find((s) => s.id === submissionId);
      const prevKey = prevRow?.kanbanColumnKey ?? CMS_FORM_SUBMISSION_KANBAN_NEW;
      if (prevKey === columnKey) return true;

      submissionKanbanMoveLock.current = true;
      setFormSubmissions((list) =>
        list.map((s) => (s.id === submissionId ? { ...s, kanbanColumnKey: columnKey } : s)),
      );

      try {
        const res = await fetch(
          `/api/cms/sites/${encodeURIComponent(selectedSiteId)}/form-submissions/${encodeURIComponent(submissionId)}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ kanbanColumnKey: columnKey }),
          },
        );
        if (!res.ok) throw new Error(await res.text());
        return true;
      } catch {
        toast.error(t("playground_cms_submissions_kanban_move_error"));
        setFormSubmissions((list) =>
          list.map((s) => (s.id === submissionId ? { ...s, kanbanColumnKey: prevKey } : s)),
        );
        return false;
      } finally {
        submissionKanbanMoveLock.current = false;
      }
    },
    [formSubmissions, selectedSiteId, t],
  );

  const submitAddKanbanColumn = useCallback(async () => {
    if (!selectedSiteId) return;
    const label = submissionKanbanAddLabel.trim().slice(0, 120);
    if (!label) return;

    setSubmissionKanbanAddBusy(true);
    try {
      const res = await fetch(
        `/api/cms/sites/${encodeURIComponent(selectedSiteId)}/form-submissions/kanban-columns`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ label }),
        },
      );
      const body = await readJson<{
        error?: string;
        kanbanCustomColumns?: { id?: string; label?: string }[];
      }>(res);
      if (!res.ok) {
        toast.error(t("playground_cms_submissions_kanban_add_error"));
        return;
      }
      const rawKanban = Array.isArray(body.kanbanCustomColumns) ? body.kanbanCustomColumns : [];
      const nextKanban = rawKanban
        .map((x) => ({
          id: typeof x.id === "string" ? x.id : "",
          label: typeof x.label === "string" ? x.label : "",
        }))
        .filter((x) => /^col_[a-f0-9]{8,48}$/.test(x.id) && x.label.trim().length > 0)
        .map((x) => ({ id: x.id, label: x.label }));
      setSubmissionKanbanCustomColumns(nextKanban);
      setSubmissionKanbanAddOpen(false);
      setSubmissionKanbanAddLabel("");
    } catch {
      toast.error(t("playground_cms_submissions_kanban_add_error"));
    } finally {
      setSubmissionKanbanAddBusy(false);
    }
  }, [selectedSiteId, submissionKanbanAddLabel, t]);

  const loadRobotsSettings = useCallback(async (siteId: string) => {
    if (!siteId) {
      setRobotsGenerated("");
      setRobotsDraft("");
      setRobotsCustom(false);
      setRobotsPublicOrigin(null);
      return;
    }
    const res = await fetch(`/api/cms/sites/${encodeURIComponent(siteId)}/robots-settings`, {
      credentials: "include",
      cache: "no-store",
    });
    if (!res.ok) throw new Error((await res.text()) || "robots-settings");
    const body = await readJson<{
      generated?: string;
      override?: string | null;
      publicOrigin?: string | null;
    }>(res);
    const generated = typeof body.generated === "string" ? body.generated : "";
    setRobotsGenerated(generated);
    setRobotsPublicOrigin(typeof body.publicOrigin === "string" ? body.publicOrigin : null);
    const ov = typeof body.override === "string" ? body.override : null;
    if (ov !== null) {
      setRobotsCustom(true);
      setRobotsDraft(ov);
    } else {
      setRobotsCustom(false);
      setRobotsDraft(generated);
    }
  }, []);

  const saveRobotsTxt = useCallback(async () => {
    if (!selectedSiteId) return;
    setRobotsSaving(true);
    try {
      const res = await fetch(`/api/cms/sites/${encodeURIComponent(selectedSiteId)}/robots-settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          robotsTxtOverride: robotsCustom ? robotsDraft.trim() || null : null,
        }),
      });
      const body = await readJson<{ error?: string }>(res);
      if (!res.ok) {
        if (body.error === "robots_override_too_long") toast.error(t("playground_cms_robots_error_too_long"));
        else toast.error(typeof body.error === "string" ? body.error : "Error");
        return;
      }
      toast.success(t("playground_cms_robots_saved"));
      await loadRobotsSettings(selectedSiteId);
    } catch {
      toast.error(t("playground_cms_domain_network_error"));
    } finally {
      setRobotsSaving(false);
    }
  }, [loadRobotsSettings, robotsCustom, robotsDraft, selectedSiteId, t]);

  useEffect(() => {
    if (cmsActiveSection !== "submissions" || !selectedSiteId) return;
    let cancelled = false;
    setSubmissionsLoading(true);
    setFormWebhookLoading(true);
    void Promise.all([loadFormSubmissions(selectedSiteId), loadFormDispatch(selectedSiteId)])
      .catch((e) => {
        if (!cancelled) toast.error(e instanceof Error ? e.message : "Ошибка загрузки");
      })
      .finally(() => {
        if (!cancelled) {
          setSubmissionsLoading(false);
          setFormWebhookLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [cmsActiveSection, loadFormDispatch, loadFormSubmissions, selectedSiteId]);

  const copyCmsUrl = useCallback(
    async (url: string) => {
      const ok = await copyTextToClipboard(url);
      if (ok) toast.success(t("playground_cms_domain_copied"));
      else toast.error(t("playground_cms_domain_copy_failed"));
    },
    [t],
  );

  const saveCmsDomainHost = useCallback(async () => {
    if (!selectedSite?.projectId) return;
    if (cmsDomainMode === "custom") {
      if (!hasCustomDomainPlan) {
        toast.error(t("playground_cms_domain_plan_toast"));
        return;
      }
      if (!cmsManualHost) {
        toast.error(t("playground_cms_domain_custom_empty"));
        return;
      }
    }
    setCmsDomainBusy(true);
    try {
      const res = await fetchCmsPublishDomain(selectedSite.projectId, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ host: cmsPublishHost }),
      });
      if (!res || !res.ok) {
        const body = res ? ((await res.json().catch(() => ({}))) as { error?: string }) : {};
        if (body.error === "forbidden_plan") toast.error(t("playground_cms_domain_plan_toast"));
        else toast.error(t("playground_cms_domain_bind_error"));
        return;
      }
      const data = (await res.json().catch(() => null)) as { verification?: CmsDomainVerification | null } | null;
      if (data?.verification) setCmsDomainVerification(data.verification);
      toast.success(t("playground_cms_domain_saved"));
      await loadSites();
    } catch {
      toast.error(t("playground_cms_domain_network_error"));
    } finally {
      setCmsDomainBusy(false);
    }
  }, [
    cmsDomainMode,
    cmsManualHost,
    cmsPublishHost,
    fetchCmsPublishDomain,
    hasCustomDomainPlan,
    loadSites,
    selectedSite?.projectId,
    t,
  ]);

  const verifyCmsDomainNow = useCallback(async () => {
    if (!selectedSite?.projectId) return;
    if (cmsDomainMode !== "custom" || !hasCustomDomainPlan || !cmsManualHost) return;
    setCmsDomainBusy(true);
    try {
      const res = await fetchCmsPublishDomain(selectedSite.projectId, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ host: cmsPublishHost }),
      });
      const data = res
        ? ((await res.json().catch(() => null)) as
            | { verified?: boolean; verification?: CmsDomainVerification; error?: string }
            | null)
        : null;
      if (!res || !res.ok) {
        toast.error(t("playground_cms_domain_verify_error"));
        return;
      }
      if (data?.verification) setCmsDomainVerification(data.verification);
      if (data?.verified) toast.success(t("playground_cms_domain_verify_ok"));
      else toast.message(t("playground_cms_domain_verify_wait"));
    } catch {
      toast.error(t("playground_cms_domain_network_error"));
    } finally {
      setCmsDomainBusy(false);
    }
  }, [
    cmsDomainMode,
    cmsManualHost,
    cmsPublishHost,
    fetchCmsPublishDomain,
    hasCustomDomainPlan,
    selectedSite?.projectId,
    t,
  ]);

  useEffect(() => {
    if (cmsActiveSection !== "domain" || !selectedSite?.projectId) return;
    let cancelled = false;
    setCmsDomainLoading(true);
    void (async () => {
      try {
        const res = await fetchCmsPublishDomain(selectedSite.projectId);
        if (!res?.ok || cancelled) return;
        const body = await readJson<{
          domains?: Array<{ host?: string | null; verification?: CmsDomainVerification | null }>;
        }>(res);
        if (cancelled) return;
        const first = body.domains?.[0];
        const suffix = `.${PUBLISH_BUILTIN_BASE_DOMAIN.toLowerCase()}`;
        if (first?.host?.trim()) {
          const host = first.host.trim().toLowerCase();
          if (host.endsWith(suffix)) {
            const label = host.slice(0, -suffix.length);
            setCmsDomainMode("subdomain");
            setCmsDomainSubdomain(label || suggestPublishSubdomain(selectedSite.name, selectedSite.projectId));
            setCmsDomainCustom("");
          } else {
            setCmsDomainMode("custom");
            setCmsDomainCustom(host);
            setCmsDomainSubdomain(
              normalizePublishSubdomainLabel(selectedSite.name) ||
                suggestPublishSubdomain(selectedSite.name, selectedSite.projectId),
            );
          }
          setCmsDomainVerification(first.verification ?? null);
        } else {
          setCmsDomainMode("subdomain");
          const persisted = selectedSite.project?.subdomain?.trim();
          setCmsDomainSubdomain(
            persisted ||
              normalizePublishSubdomainLabel(selectedSite.name) ||
              suggestPublishSubdomain(selectedSite.name, selectedSite.projectId),
          );
          setCmsDomainCustom("");
          setCmsDomainVerification(null);
        }
      } catch {
        if (!cancelled) toast.error(t("playground_cms_domain_load_error"));
      } finally {
        if (!cancelled) setCmsDomainLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [cmsActiveSection, fetchCmsPublishDomain, selectedSite, t]);

  useEffect(() => {
    if (!cmsProjectId) {
      setLoading(false);
      setProjects([]);
      setSites([]);
      setSelectedSiteId("");
      return;
    }
    let active = true;
    setLoading(true);
    setSelectedSiteId("");
    void Promise.all([loadProjects(), loadSites()])
      .catch((e) => toast.error(e instanceof Error ? e.message : String(e)))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [cmsProjectId, loadProjects, loadSites]);

  useEffect(() => {
    void loadSiteData(selectedSiteId).catch((e) => toast.error(e instanceof Error ? e.message : String(e)));
  }, [loadSiteData, selectedSiteId]);

  useEffect(() => {
    void loadEntries(selectedSiteId, selectedTypeId).catch((e) => toast.error(e instanceof Error ? e.message : String(e)));
  }, [loadEntries, selectedSiteId, selectedTypeId]);

  useEffect(() => {
    if (!selectedPage) {
      setSeoTitle("");
      setSeoDescription("");
      setSeoKeywords("");
      setSeoCanonicalUrl("");
      setSeoNoIndex(false);
      setSeoNoFollow(false);
      return;
    }
    setSeoTitle(selectedPage.seoTitle ?? "");
    setSeoDescription(selectedPage.seoDescription ?? "");
    setSeoKeywords(selectedPage.seoKeywords ?? "");
    setSeoCanonicalUrl(selectedPage.seoCanonicalUrl ?? "");
    setSeoNoIndex(Boolean(selectedPage.noIndex));
    setSeoNoFollow(Boolean(selectedPage.seoNoFollow));
  }, [selectedPage]);

  useEffect(() => {
    if (cmsActiveSection !== "seo" || !selectedSiteId) return;
    let cancelled = false;
    setRobotsLoading(true);
    void loadRobotsSettings(selectedSiteId)
      .catch((e) => {
        if (!cancelled) toast.error(e instanceof Error ? e.message : "robots-settings");
      })
      .finally(() => {
        if (!cancelled) setRobotsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [cmsActiveSection, loadRobotsSettings, selectedSiteId]);

  const ensureSiteForProject = useCallback(async () => {
    if (!cmsProjectId) return;
    setBusy("ensure-site");
    try {
      const res = await fetch("/api/cms/sites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ projectId: cmsProjectId }),
      });
      if (!res.ok) throw new Error((await res.text()) || "Не удалось создать CMS-сайт");
      await loadSites();
      toast.success("CMS-сайт готов");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }, [cmsProjectId, loadSites]);

  useEffect(() => {
    if (!cmsProjectId || loading) return;
    if (!projects.some((p) => p.id === cmsProjectId)) return;
    if (sites.some((s) => s.projectId === cmsProjectId)) return;
    void ensureSiteForProject();
  }, [cmsProjectId, loading, sites, projects, ensureSiteForProject]);

  const createPage = useCallback(async () => {
    if (!selectedSiteId) return;
    const title = createPageTitle.trim();
    if (!title) {
      toast.error("Введите название страницы");
      return;
    }
    setBusy("create-page");
    try {
      const res = await fetch(`/api/cms/sites/${encodeURIComponent(selectedSiteId)}/pages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title,
          slug: createPageSlug.trim() || undefined,
          parentId: createParentId || undefined,
        }),
      });
      if (!res.ok) throw new Error((await res.text()) || "Не удалось создать страницу");
      setCreatePageTitle("");
      setCreatePageSlug("");
      setCreateParentId("");
      await loadSiteData(selectedSiteId);
      await loadSites();
      toast.success("Страница создана");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }, [createPageSlug, createPageTitle, createParentId, loadSiteData, loadSites, selectedSiteId]);

  const saveSeo = useCallback(async () => {
    if (!selectedSiteId || !selectedPage) return;
    setBusy("save-seo");
    try {
      const res = await fetch(
        `/api/cms/sites/${encodeURIComponent(selectedSiteId)}/pages/${encodeURIComponent(selectedPage.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            seoTitle: seoTitle.trim() || null,
            seoDescription: seoDescription.trim() || null,
            seoKeywords: seoKeywords.trim() || null,
            seoCanonicalUrl: seoCanonicalUrl.trim() || null,
            noIndex: seoNoIndex,
            seoNoFollow: seoNoFollow,
          }),
        },
      );
      if (!res.ok) throw new Error((await res.text()) || "Не удалось сохранить SEO");
      await loadSiteData(selectedSiteId);
      void loadRobotsSettings(selectedSiteId).catch(() => {});
      toast.success("SEO сохранено");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }, [loadRobotsSettings, loadSiteData, selectedPage, selectedSiteId, seoCanonicalUrl, seoDescription, seoKeywords, seoNoFollow, seoNoIndex, seoTitle]);

  const publishPage = useCallback(
    async (pageId: string) => {
      if (!selectedSiteId) return;
      setBusy(`publish-page-${pageId}`);
      try {
        const res = await fetch(
          `/api/cms/sites/${encodeURIComponent(selectedSiteId)}/pages/${encodeURIComponent(pageId)}/publish`,
          {
            method: "POST",
            credentials: "include",
          },
        );
        if (!res.ok) throw new Error((await res.text()) || "Не удалось опубликовать страницу");
        await loadSiteData(selectedSiteId);
        void loadRobotsSettings(selectedSiteId).catch(() => {});
        toast.success(t("playground_cms_page_published_ok"));
      } catch (e) {
        toast.error(e instanceof Error ? e.message : String(e));
      } finally {
        setBusy(null);
      }
    },
    [loadRobotsSettings, loadSiteData, selectedSiteId, t],
  );

  const unpublishPage = useCallback(
    async (pageId: string) => {
      if (!selectedSiteId) return;
      setBusy(`publish-page-${pageId}`);
      try {
        const res = await fetch(
          `/api/cms/sites/${encodeURIComponent(selectedSiteId)}/pages/${encodeURIComponent(pageId)}/unpublish`,
          {
            method: "POST",
            credentials: "include",
          },
        );
        if (!res.ok) throw new Error((await res.text()) || t("playground_cms_page_unpublish_error"));
        await loadSiteData(selectedSiteId);
        void loadRobotsSettings(selectedSiteId).catch(() => {});
        toast.success(t("playground_cms_page_unpublished_ok"));
      } catch (e) {
        toast.error(e instanceof Error ? e.message : String(e));
      } finally {
        setBusy(null);
      }
    },
    [loadRobotsSettings, loadSiteData, selectedSiteId, t],
  );

  const openPageSettings = useCallback(
    (pageId: string) => {
      const p = pages.find((x) => x.id === pageId);
      if (!p || !selectedSiteId) return;
      setSelectedPageId(pageId);
      setPageSettingsTitle(p.title);
      setPageSettingsSlug(p.slug);
      setPageSettingsSeoTitle(p.seoTitle ?? "");
      setPageSettingsSeoDescription(p.seoDescription ?? "");
      setPageSettingsSeoKeywords(p.seoKeywords ?? "");
      setPageSettingsCanonicalUrl(p.seoCanonicalUrl ?? "");
      setPageSettingsNoIndex(Boolean(p.noIndex));
      setPageSettingsNoFollow(Boolean(p.seoNoFollow));
      setPageSettingsTab("main");
      setPageSettingsDialogForId(pageId);
    },
    [pages, selectedSiteId],
  );

  const savePageSettingsFromDialog = useCallback(async () => {
    if (!selectedSiteId || !pageSettingsDialogForId) return;
    const target = pages.find((p) => p.id === pageSettingsDialogForId);
    if (!target) return;
    setBusy("page-settings-save");
    try {
      const body: Record<string, unknown> = {
        title: pageSettingsTitle.trim() || target.title,
        seoTitle: pageSettingsSeoTitle.trim() || null,
        seoDescription: pageSettingsSeoDescription.trim() || null,
        seoKeywords: pageSettingsSeoKeywords.trim() || null,
        seoCanonicalUrl: pageSettingsCanonicalUrl.trim() || null,
        noIndex: pageSettingsNoIndex,
        seoNoFollow: pageSettingsNoFollow,
      };
      if (!target.isHome) body.slug = pageSettingsSlug.trim() || target.slug;
      const res = await fetch(
        `/api/cms/sites/${encodeURIComponent(selectedSiteId)}/pages/${encodeURIComponent(pageSettingsDialogForId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(body),
        },
      );
      if (!res.ok) throw new Error((await res.text()) || t("playground_cms_page_settings_save_error"));
      const data = await readJson<{
        page?: {
          title: string;
          slug: string;
          seoTitle?: string | null;
          seoDescription?: string | null;
          seoKeywords?: string | null;
          seoCanonicalUrl?: string | null;
          noIndex?: boolean;
          seoNoFollow?: boolean;
        };
      }>(res);
      const refreshed = data.page;
      if (refreshed) {
        setPageSettingsTitle(refreshed.title);
        setPageSettingsSlug(refreshed.slug);
        setPageSettingsSeoTitle(refreshed.seoTitle ?? "");
        setPageSettingsSeoDescription(refreshed.seoDescription ?? "");
        setPageSettingsSeoKeywords(refreshed.seoKeywords ?? "");
        setPageSettingsCanonicalUrl(refreshed.seoCanonicalUrl ?? "");
        setPageSettingsNoIndex(Boolean(refreshed.noIndex));
        setPageSettingsNoFollow(Boolean(refreshed.seoNoFollow));
      }
      await loadSiteData(selectedSiteId);
      void loadRobotsSettings(selectedSiteId).catch(() => {});
      toast.success(t("playground_cms_page_settings_saved"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }, [
    loadRobotsSettings,
    loadSiteData,
    pageSettingsDialogForId,
    pageSettingsNoFollow,
    pageSettingsCanonicalUrl,
    pageSettingsNoIndex,
    pageSettingsSeoDescription,
    pageSettingsSeoKeywords,
    pageSettingsSeoTitle,
    pageSettingsSlug,
    pageSettingsTitle,
    pages,
    selectedSiteId,
    t,
  ]);

  const cloneCmsPage = useCallback(
    async (pageId: string, sourceTitle: string) => {
      if (!selectedSiteId) return;
      const cloneTitle = t("playground_cms_page_clone_title").replace(/\{title\}/g, sourceTitle);
      setBusy(`clone-page-${pageId}`);
      try {
        const res = await fetch(
          `/api/cms/sites/${encodeURIComponent(selectedSiteId)}/pages/${encodeURIComponent(pageId)}/duplicate`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ title: cloneTitle }),
          },
        );
        if (!res.ok) throw new Error((await res.text()) || t("playground_cms_menu_clone_error"));
        const data = await readJson<{ pageId?: string }>(res);
        await loadSiteData(selectedSiteId, { preferredPageId: data.pageId });
        void loadRobotsSettings(selectedSiteId).catch(() => {});
        toast.success(t("playground_cms_menu_clone_ok"));
      } catch (e) {
        toast.error(e instanceof Error ? e.message : String(e));
      } finally {
        setBusy(null);
      }
    },
    [loadRobotsSettings, loadSiteData, selectedSiteId, t],
  );

  const deleteCmsPage = useCallback(
    async (pageId: string, title: string) => {
      if (!selectedSiteId) return;
      const msg = t("playground_cms_menu_delete_confirm").replace(/\{title\}/g, title);
      const okConfirm = typeof window !== "undefined" ? window.confirm(msg) : false;
      if (!okConfirm) return;
      setBusy(`delete-page-${pageId}`);
      try {
        setPageSettingsDialogForId((prev) => (prev === pageId ? null : prev));
        const res = await fetch(
          `/api/cms/sites/${encodeURIComponent(selectedSiteId)}/pages/${encodeURIComponent(pageId)}`,
          { method: "DELETE", credentials: "include" },
        );
        if (!res.ok) throw new Error((await res.text()) || t("playground_cms_menu_delete_error"));
        await loadSiteData(selectedSiteId);
        void loadRobotsSettings(selectedSiteId).catch(() => {});
        toast.success(t("playground_cms_menu_delete_ok"));
      } catch (e) {
        toast.error(e instanceof Error ? e.message : String(e));
      } finally {
        setBusy(null);
      }
    },
    [loadRobotsSettings, loadSiteData, selectedSiteId, t],
  );

  const createContentType = useCallback(async () => {
    if (!selectedSiteId) return;
    if (!createTypeName.trim() || !createTypeKey.trim()) {
      toast.error("Заполните name и apiKey");
      return;
    }
    setBusy("create-type");
    try {
      const res = await fetch(`/api/cms/sites/${encodeURIComponent(selectedSiteId)}/content-types`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: createTypeName.trim(),
          apiKey: createTypeKey.trim(),
        }),
      });
      if (!res.ok) throw new Error((await res.text()) || "Не удалось создать content type");
      setCreateTypeName("");
      setCreateTypeKey("");
      await loadSiteData(selectedSiteId);
      toast.success("Content type создан");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }, [createTypeKey, createTypeName, loadSiteData, selectedSiteId]);

  const saveEntryDraft = useCallback(async () => {
    if (!selectedSiteId || !selectedTypeId) return;
    if (!entrySlug.trim()) {
      toast.error("Введите slug entry");
      return;
    }
    let parsed: unknown = {};
    try {
      parsed = JSON.parse(entryJson);
    } catch {
      toast.error("JSON данных entry невалиден");
      return;
    }
    setBusy("save-entry");
    try {
      const res = await fetch(
        `/api/cms/sites/${encodeURIComponent(selectedSiteId)}/content-types/${encodeURIComponent(selectedTypeId)}/entries`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ slug: entrySlug.trim(), data: parsed }),
        },
      );
      if (!res.ok) throw new Error((await res.text()) || "Не удалось сохранить entry");
      await loadEntries(selectedSiteId, selectedTypeId);
      toast.success("Entry draft сохранён");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }, [entryJson, entrySlug, loadEntries, selectedSiteId, selectedTypeId]);



  const rollbackPublish = useCallback(
    async (jobId: string) => {
      if (!selectedSiteId) return;
      setBusy(`rollback-${jobId}`);
      try {
        const res = await fetch(
          `/api/cms/sites/${encodeURIComponent(selectedSiteId)}/publish-history/${encodeURIComponent(jobId)}/rollback`,
          {
            method: "POST",
            credentials: "include",
          },
        );
        if (!res.ok) throw new Error((await res.text()) || "Не удалось выполнить rollback");
        await loadSiteData(selectedSiteId);
        void loadRobotsSettings(selectedSiteId).catch(() => {});
        toast.success("Откат публикации выполнен");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : String(e));
      } finally {
        setBusy(null);
      }
    },
    [loadRobotsSettings, loadSiteData, selectedSiteId],
  );

  const togglePageDetails = useCallback((pageId: string) => {
    setExpandedPageIds((prev) => {
      const next = new Set(prev);
      if (next.has(pageId)) next.delete(pageId);
      else next.add(pageId);
      return next;
    });
  }, []);

  useEffect(() => {
    setExpandedPageIds(new Set());
    setCmsActiveSection("pages");
  }, [selectedSiteId]);

  useEffect(() => {
    if (!pageSettingsDialogForId) return;
    if (!pages.some((p) => p.id === pageSettingsDialogForId)) setPageSettingsDialogForId(null);
  }, [pages, pageSettingsDialogForId]);

  const showCmsTopSearch =
    Boolean(cmsProjectId) &&
    loading === false &&
    projects.some((p) => p.id === cmsProjectId);

  return (
    <PageTransition>
      <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col gap-4 bg-[#eef2f8]">
        <PlaygroundStudioChrome
          backHref="/playground"
          backLabel={t("playground_menu_back")}
          segmentLabel={t("playground_cms_chrome_title")}
          contextLine={cmsProjectName ? `· ${cmsProjectName}` : null}
          centerSlot={
            showCmsTopSearch ? (
              <div className="relative w-full min-w-0 md:mx-2">
                <Search
                  aria-hidden
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
                />
                <input
                  value={cmsNavQuery}
                  onChange={(e) => setCmsNavQuery(e.target.value)}
                  placeholder={t("playground_cms_nav_search_placeholder")}
                  type="search"
                  aria-label={t("playground_cms_nav_search_placeholder")}
                  className="h-10 w-full rounded-lg border border-slate-200/90 bg-white py-2 pl-10 pr-3 text-sm text-slate-900 shadow-sm outline-none ring-slate-200/80 placeholder:text-slate-400 focus-visible:border-[#0061FF]/40 focus-visible:ring-2 focus-visible:ring-[#0061FF]/25"
                />
              </div>
            ) : undefined
          }
        />

        {!cmsProjectId ? (
          <div className="mx-auto w-full max-w-2xl space-y-3 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700 shadow-sm">
            <p className="text-foreground">{t("playground_cms_need_project_hint")}</p>
            <Button type="button" size="sm" asChild>
              <Link href="/playground">{t("playground_cms_to_playground")}</Link>
            </Button>
          </div>
        ) : loading ? (
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-6 text-sm text-slate-600 shadow-sm">
            <Loader2 className="h-4 w-4 animate-spin text-[#0061FF]" aria-hidden />
            {t("playground_cms_loading")}
          </div>
        ) : !projects.some((p) => p.id === cmsProjectId) ? (
          <div className="space-y-3 rounded-xl border border-rose-200 bg-rose-50/90 p-4 text-sm text-rose-900 shadow-sm">
            <p className="text-destructive">{t("playground_cms_project_missing")}</p>
            <Button type="button" size="sm" variant="secondary" asChild>
              <Link href="/playground">{t("playground_cms_to_playground")}</Link>
            </Button>
          </div>
        ) : (
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[300px_1fr] xl:gap-5">
            <aside className="flex min-h-0 min-w-0 shrink-0 flex-col gap-3 rounded-xl border border-slate-200/90 bg-white p-3 shadow-sm lg:w-[300px]">
              <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                  {t("playground_cms_nav_heading")}
                </p>
                <nav
                  aria-label={t("playground_cms_nav_sections_aria")}
                  className="min-h-[12rem] flex-1 space-y-0.5 overflow-y-auto pr-0.5"
                >
                  {cmsNavFiltered.map((item) => {
                    const Icon = item.icon;
                    const sel = cmsActiveSection === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setCmsActiveSection(item.id)}
                        className={cn(
                          "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                          sel
                            ? "bg-[#0061FF] font-medium text-white shadow-sm"
                            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                        )}
                      >
                        <Icon className="size-4 shrink-0 opacity-95" aria-hidden />
                        <span className="min-w-0 flex-1 truncate">{item.label}</span>
                      </button>
                    );
                  })}
                  {cmsNavFiltered.length === 0 ? (
                    <p className="py-4 text-center text-xs text-muted-foreground">{t("playground_cms_nav_no_results")}</p>
                  ) : null}
                </nav>
              </div>
            </aside>

            <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm">
              {cmsActiveSection !== "pages" ? (
                <header className="shrink-0 border-b border-slate-200 bg-slate-50/90 px-4 py-3 md:px-5">
                  <h2 className="text-base font-semibold tracking-tight text-foreground">{cmsActiveHeading}</h2>
                  {cmsActiveSection === "domain" ? (
                    <p className="mt-1 max-w-2xl text-xs leading-snug text-muted-foreground">
                      {t("playground_cms_domain_intro")}
                    </p>
                  ) : null}
                  {cmsActiveSection === "entries" && selectedType ? (
                    <p className="mt-0.5 font-mono text-xs text-muted-foreground">{selectedType.apiKey}</p>
                  ) : null}
                </header>
              ) : null}

              <div
                className={cn(
                  "min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain",
                  cmsActiveSection === "pages"
                    ? "bg-[#f4f7fb] px-4 py-4 md:px-5 md:py-6"
                    : "bg-[#f4f7fb] px-3 py-3 md:px-4 md:py-4",
                )}
              >
                {cmsActiveSection === "pages" ? (
                  <div className="relative flex h-full min-h-0 flex-col overflow-hidden">
                    <div className="mb-6 shrink-0 space-y-4">
                      <div>
                        <nav className="mb-2 text-xs text-slate-500" aria-label="Breadcrumb">
                          <Link href="/playground" className="font-medium text-slate-500 transition-colors hover:text-[#0061FF]">
                            Home
                          </Link>
                          <span className="mx-2 text-slate-300">/</span>
                          <span className="font-medium text-slate-700">{t("playground_cms_pages_title")}</span>
                        </nav>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-[1.65rem]">
                          {selectedSite?.name ?? t("playground_cms_pages_title")}
                        </h1>
                        <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                          <p className="text-sm text-slate-600">{t("playground_cms_pages_title")}</p>
                          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs sm:max-w-[min(100%,28rem)] sm:justify-end sm:text-right">
                            <ExternalLink className="size-4 shrink-0 text-[#0061FF]" aria-hidden />
                            <span className="shrink-0 font-medium uppercase tracking-wide text-slate-500">
                              {t("playground_cms_site_address_label")}
                            </span>
                            <a
                              href={cmsPublicUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="min-w-0 break-all font-semibold text-[#0061FF] underline-offset-2 hover:underline sm:break-normal sm:truncate"
                            >
                              {cmsPublicUrl}
                            </a>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-white px-2 py-2 shadow-sm">
                        <nav aria-label={t("playground_cms_toolbar_nav_aria")} className="flex min-w-0 flex-wrap items-center gap-x-0.5 gap-y-1 md:gap-x-1">
                          <button
                            type="button"
                            onClick={() => setCmsActiveSection("pages")}
                            className="inline-flex items-center gap-2 rounded-lg bg-[#0061FF] px-2.5 py-2 text-[10px] font-bold uppercase tracking-[0.08em] text-white shadow-sm ring-1 ring-[#0061FF]/30 hover:bg-[#0056e6]"
                          >
                            <FileText className="size-[1.125rem] shrink-0 text-current" strokeWidth={2.25} aria-hidden />
                            {t("playground_cms_pages_tab_pages")}
                          </button>
                          <button
                            type="button"
                            onClick={() => setCmsActiveSection("submissions")}
                            className="inline-flex items-center gap-2 rounded-lg px-2.5 py-2 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-700 transition-colors hover:bg-slate-100"
                          >
                            <ClipboardList className="size-[1.125rem] shrink-0 text-current" strokeWidth={2.25} aria-hidden />
                            {t("playground_cms_pages_tab_submissions")}
                          </button>
                        </nav>
                      </div>

                    </div>

                    <div className="mb-4 shrink-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="grid gap-3 sm:grid-cols-[1fr_140px_1fr_auto]">
                        <input
                          value={createPageTitle}
                          onChange={(e) => setCreatePageTitle(e.target.value)}
                          placeholder={t("playground_cms_placeholder_new_title")}
                          className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-inner outline-none ring-slate-100 placeholder:text-slate-400 focus-visible:border-[#0061FF]/35 focus-visible:ring-2 focus-visible:ring-[#0061FF]/20"
                        />
                        <input
                          value={createPageSlug}
                          onChange={(e) => setCreatePageSlug(e.target.value)}
                          placeholder={t("playground_cms_placeholder_slug")}
                          className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-inner outline-none ring-slate-100 placeholder:text-slate-400 focus-visible:border-[#0061FF]/35 focus-visible:ring-2 focus-visible:ring-[#0061FF]/20"
                        />
                        <select
                          value={createParentId}
                          onChange={(e) => setCreateParentId(e.target.value)}
                          className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-inner outline-none focus-visible:border-[#0061FF]/35 focus-visible:ring-2 focus-visible:ring-[#0061FF]/20"
                        >
                          <option value="">{t("playground_cms_parent_root")}</option>
                          {pages.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.path}
                            </option>
                          ))}
                        </select>
                        <Button
                          type="button"
                          className="h-10 shrink-0 rounded-lg border-0 bg-[#0061FF] px-4 text-white shadow-sm hover:bg-[#0056e6]"
                          onClick={() => void createPage()}
                          disabled={!selectedSiteId || busy === "create-page"}
                        >
                          {t("playground_cms_add_page")}
                        </Button>
                      </div>
                    </div>

                    <div className="min-h-[12rem] flex-1 space-y-3 overflow-y-auto overflow-x-hidden overscroll-contain pb-2">
                      {pages.map((p) => {
                        const isSelected = p.id === selectedPageId;
                        const expanded = expandedPageIds.has(p.id);
                        const parentPath = p.parentId ? pathByPageId.get(p.parentId) ?? p.parentId : null;
                        const VB =
                          "rounded-lg border border-slate-200 bg-slate-50/80 px-2.5 py-2 shadow-sm";
                        const pathSuffix =
                          !p.path || p.path === "" ? "/" : p.path.startsWith("/") ? p.path : `/${p.path}`;
                        const previewUrl = `${cmsPublicUrl.replace(/\/$/, "")}${pathSuffix === "/" ? "/" : pathSuffix}`;
                        const publishBusy = busy === `publish-page-${p.id}`;
                        const cloneOrDeleteBusy = busy === `clone-page-${p.id}` || busy === `delete-page-${p.id}`;
                        return (
                          <div
                            key={p.id}
                            className={cn(
                              "overflow-hidden rounded-xl bg-white text-xs shadow-sm transition-[border-color,box-shadow]",
                              isSelected
                                ? "border-2 border-[#0061FF]/55"
                                : "border border-slate-200 hover:border-slate-300",
                            )}
                          >
                            <div className="flex flex-col gap-3 px-3 py-3 sm:flex-row sm:items-center sm:gap-4 sm:px-4 sm:py-4">
                              <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center">
                                <Switch
                                  checked={Boolean(p.publishedRevisionId)}
                                  disabled={
                                    cloneOrDeleteBusy ||
                                    publishBusy ||
                                    !selectedSiteId ||
                                    (!p.draftRevisionId && !p.publishedRevisionId)
                                  }
                                  title={t("playground_cms_publish_switch_aria")}
                                  aria-label={t("playground_cms_publish_switch_aria")}
                                  onCheckedChange={(next) => {
                                    if (next) {
                                      if (!p.publishedRevisionId) void publishPage(p.id);
                                      return;
                                    }
                                    if (p.publishedRevisionId) void unpublishPage(p.id);
                                  }}
                                  className="mt-1 shrink-0 sm:mt-0"
                                />
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-sm font-semibold leading-snug text-slate-900 md:text-[15px]">
                                      {p.title}
                                    </span>
                                  </div>
                                  <div className="mt-2 flex min-w-0 flex-wrap items-center gap-1.5">
                                    <span className="shrink-0 text-[11px] font-medium text-slate-500">{pathSuffix}</span>
                                    <span
                                      className={cn(
                                        "inline-flex max-w-full rounded-md px-2 py-0.5 text-[11px] font-semibold leading-none",
                                        p.publishedRevisionId
                                          ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100"
                                          : "bg-amber-50 text-amber-900 ring-1 ring-amber-100",
                                      )}
                                    >
                                      {p.publishedRevisionId
                                        ? t("playground_cms_badge_published")
                                        : t("playground_cms_badge_not_published")}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center justify-end gap-2 sm:shrink-0">
                                {selectedSite?.projectId ? (
                                  <Button
                                    size="sm"
                                    className="h-9 shrink-0 gap-1.5 rounded-lg border-0 bg-orange-500 px-3 text-xs font-semibold text-white shadow-sm hover:bg-orange-600"
                                    asChild
                                  >
                                    <Link
                                      href={`/playground/box/editor?siteId=${encodeURIComponent(selectedSiteId)}&pageId=${encodeURIComponent(p.id)}&projectId=${encodeURIComponent(selectedSite.projectId)}&pagePath=${encodeURIComponent(p.path)}`}
                                    >
                                      <Pencil className="size-3.5" aria-hidden />
                                      {t("playground_cms_edit")}
                                    </Link>
                                  </Button>
                                ) : (
                                  <Button
                                    size="sm"
                                    className="h-9 rounded-lg bg-orange-400 px-3 text-xs text-white"
                                    disabled
                                  >
                                    <Pencil className="mr-1 size-3.5" aria-hidden />
                                    {t("playground_cms_edit")}
                                  </Button>
                                )}

                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-9 w-9 shrink-0 rounded-lg border-slate-200 bg-white hover:bg-slate-50"
                                  asChild
                                >
                                  <a href={previewUrl} target="_blank" rel="noopener noreferrer" aria-label={t("playground_cms_preview_aria")}>
                                    <Eye className="size-4" aria-hidden />
                                  </a>
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className="h-9 w-9 shrink-0 rounded-lg border-slate-200 bg-white hover:bg-slate-50"
                                  aria-label={t("playground_cms_settings_aria")}
                                  onClick={() => openPageSettings(p.id)}
                                >
                                  <Settings className="size-4" aria-hidden />
                                </Button>

                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      className="h-9 w-9 shrink-0 rounded-lg border-slate-200 bg-white hover:bg-slate-50"
                                      aria-label={t("playground_cms_more_aria")}
                                    >
                                      <MoreHorizontal className="size-4" aria-hidden />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="min-w-[12rem]">
                                    <DropdownMenuItem
                                      onClick={() => {
                                        void copyTextToClipboard(previewUrl).then((ok) => {
                                          if (ok) toast.success(t("playground_cms_menu_copy_url_ok"));
                                          else toast.error(t("playground_cms_copy_failed"));
                                        });
                                      }}
                                    >
                                      <Copy className="mr-2 size-4" aria-hidden />
                                      {t("playground_cms_menu_copy_url")}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => {
                                        void copyTextToClipboard(p.id).then((ok) => {
                                          if (ok) toast.success(t("playground_cms_menu_copy_id_ok"));
                                          else toast.error(t("playground_cms_copy_failed"));
                                        });
                                      }}
                                    >
                                      <Copy className="mr-2 size-4" aria-hidden />
                                      {t("playground_cms_menu_copy_id")}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      disabled={publishBusy || cloneOrDeleteBusy}
                                      onClick={() => void cloneCmsPage(p.id, p.title)}
                                    >
                                      <CopyPlus className="mr-2 size-4" aria-hidden />
                                      {t("playground_cms_menu_clone")}
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      disabled={!p.draftRevisionId || publishBusy || cloneOrDeleteBusy}
                                      onClick={() => void publishPage(p.id)}
                                    >
                                      {t("playground_cms_menu_publish")}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      disabled={cloneOrDeleteBusy}
                                      onClick={() => togglePageDetails(p.id)}
                                    >
                                      {t("playground_cms_menu_details")}
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      disabled={cloneOrDeleteBusy}
                                      className="text-rose-600 focus:bg-rose-50 focus:text-rose-700"
                                      onClick={() => void deleteCmsPage(p.id, p.title)}
                                    >
                                      <Trash2 className="mr-2 size-4" aria-hidden />
                                      {t("playground_cms_menu_delete")}
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>

                            {expanded ? (
                              <div className="space-y-2 border-t border-slate-200 bg-slate-50/50 px-3 pb-3 pt-3 sm:px-4">
                                <div className={VB}>
                                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                    {t("playground_cms_label_id")}
                                  </p>
                                  <p className="mt-1 break-all font-mono text-[11px] leading-relaxed text-foreground">{p.id}</p>
                                </div>
                                {p.kind !== undefined ? (
                                  <div className={VB}>
                                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                      {t("playground_cms_label_kind")}
                                    </p>
                                    <p className="mt-1 text-[11px] text-foreground">{p.kind}</p>
                                  </div>
                                ) : null}
                                {typeof p.sortOrder === "number" ? (
                                  <div className={VB}>
                                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                      {t("playground_cms_label_sort_order")}
                                    </p>
                                    <p className="mt-1 text-[11px] text-foreground">{p.sortOrder}</p>
                                  </div>
                                ) : null}
                                <div className={VB}>
                                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                    {t("playground_cms_label_updated_at")}
                                  </p>
                                  <p className="mt-1 text-[11px] text-foreground">{p.updatedAt ? fmtDate(p.updatedAt) : "—"}</p>
                                </div>
                                <div className={VB}>
                                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                    {t("playground_cms_label_parent")}
                                  </p>
                                  <p className="mt-1 break-words text-[11px] text-foreground">
                                    {parentPath ? parentPath : t("playground_cms_parent_none")}
                                  </p>
                                </div>
                                <div className={VB}>
                                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                    {t("playground_cms_label_seo_title")}
                                  </p>
                                  <p className="mt-1 whitespace-pre-wrap break-words text-[11px] leading-relaxed text-foreground">
                                    {displayMetaPlain(p.seoTitle)}
                                  </p>
                                </div>
                                <div className={VB}>
                                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                    {t("playground_cms_label_seo_description")}
                                  </p>
                                  <p className="mt-1 whitespace-pre-wrap break-words text-[11px] leading-relaxed text-foreground">
                                    {displayMetaPlain(p.seoDescription)}
                                  </p>
                                </div>
                                <div className={VB}>
                                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                    {t("playground_cms_label_noindex")}
                                  </p>
                                  <p className="mt-1 text-[11px] text-foreground">
                                    {p.noIndex ? t("playground_cms_noindex_yes") : t("playground_cms_noindex_no")}
                                  </p>
                                </div>
                                <div className={VB}>
                                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                    {t("playground_cms_label_draft_revision")}
                                  </p>
                                  <p className="mt-1 break-all font-mono text-[11px] text-foreground">
                                    {p.draftRevisionId ?? t("playground_cms_revision_none")}
                                  </p>
                                </div>
                                {p.draftVersion != null ? (
                                  <div className={VB}>
                                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                      {t("playground_cms_label_draft_version")}
                                    </p>
                                    <p className="mt-1 text-[11px] text-foreground">{p.draftVersion}</p>
                                  </div>
                                ) : null}
                                <div className={VB}>
                                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                    {t("playground_cms_label_published_revision")}
                                  </p>
                                  <p className="mt-1 break-all font-mono text-[11px] text-foreground">
                                    {p.publishedRevisionId ?? t("playground_cms_revision_none")}
                                  </p>
                                </div>
                                {p.publishedVersion != null ? (
                                  <div className={VB}>
                                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                      {t("playground_cms_label_published_version")}
                                    </p>
                                    <p className="mt-1 text-[11px] text-foreground">{p.publishedVersion}</p>
                                  </div>
                                ) : null}
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                      {pages.length === 0 ? (
                        <p className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-600">
                          {t("playground_cms_pages_empty")}
                        </p>
                      ) : null}
                    </div>
                  </div>
                ) : null}
                {cmsActiveSection === "seo" ? (
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    {!selectedSiteId ? (
                      <p className="text-xs text-muted-foreground">{t("playground_cms_domain_select_site")}</p>
                    ) : (
                      <div className="flex flex-col gap-6">
                        <section className="space-y-3 border-b border-border pb-6">
                          <div>
                            <h3 className="text-sm font-semibold text-foreground">{t("playground_cms_robots_heading")}</h3>
                            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t("playground_cms_robots_intro")}</p>
                            {robotsPublicOrigin ? (
                              <p className="mt-2 text-[11px] text-muted-foreground">
                                <span className="font-medium text-foreground/80">{t("playground_cms_robots_origin")}:</span>{" "}
                                <span className="break-all">{robotsPublicOrigin}</span>
                              </p>
                            ) : null}
                            <p className="mt-2 text-[11px] text-muted-foreground">{t("playground_cms_robots_public_path")}</p>
                          </div>

                          {robotsLoading ? (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                              {t("playground_cms_robots_loading")}
                            </div>
                          ) : (
                            <>
                              <div>
                                <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                                  {robotsCustom
                                    ? t("playground_cms_robots_custom_toggle")
                                    : t("playground_cms_robots_generated_label")}
                                </p>
                                {robotsCustom ? (
                                  <textarea
                                    value={robotsDraft}
                                    onChange={(e) => setRobotsDraft(e.target.value)}
                                    rows={12}
                                    className="min-h-[180px] w-full resize-y rounded-md border border-input bg-background px-3 py-2 font-mono text-[11px] leading-relaxed shadow-sm transition-colors focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                                    spellCheck={false}
                                  />
                                ) : (
                                  <pre className="max-h-56 overflow-auto whitespace-pre-wrap rounded-md border border-border bg-muted/20 p-3 font-mono text-[11px] leading-relaxed text-foreground">
                                    {robotsGenerated}
                                  </pre>
                                )}
                              </div>

                              <label className="flex cursor-pointer gap-3 rounded-lg border border-border bg-muted/20 px-3 py-2.5 transition-colors hover:bg-muted/35">
                                <input
                                  type="checkbox"
                                  checked={robotsCustom}
                                  onChange={(e) => {
                                    const next = e.target.checked;
                                    setRobotsCustom(next);
                                    if (next) setRobotsDraft((prev) => (prev.trim() ? prev : robotsGenerated));
                                  }}
                                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-input"
                                />
                                <span className="min-w-0 text-left text-xs leading-snug text-foreground">
                                  <span className="font-medium">{t("playground_cms_robots_custom_toggle")}</span>
                                  <span className="mt-1 block text-[11px] text-muted-foreground">
                                    {t("playground_cms_robots_custom_hint")}
                                  </span>
                                </span>
                              </label>

                              <div className="flex flex-wrap gap-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  disabled={robotsSaving || robotsLoading}
                                  onClick={() => setRobotsDraft(robotsGenerated)}
                                >
                                  {t("playground_cms_robots_insert_auto")}
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  disabled={robotsSaving || robotsLoading}
                                  onClick={() => void saveRobotsTxt()}
                                >
                                  {robotsSaving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" aria-hidden /> : null}
                                  {t("playground_cms_robots_save")}
                                </Button>
                              </div>
                            </>
                          )}
                        </section>

                        {selectedPage ? (
                          <div className="flex flex-col gap-4">
                            <div className="rounded-lg border border-border bg-muted/30 px-3 py-2.5">
                              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                                {t("playground_cms_seo_current_page")}
                              </p>
                              <p className="mt-1 text-sm font-semibold text-foreground">{selectedPage.title}</p>
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                <span className="font-medium text-foreground/80">{t("playground_cms_label_path")}:</span>{" "}
                                <span>{selectedPage.path}</span>
                              </p>
                              <p className="mt-1 break-all font-mono text-[11px] leading-snug text-muted-foreground">
                                <span className="font-medium text-foreground/80">{t("playground_cms_label_id")}:</span>{" "}
                                {selectedPage.id}
                              </p>
                            </div>

                            <div className="space-y-3">
                              <label className="block">
                                <span className="mb-1.5 block text-xs font-medium text-foreground">
                                  {t("playground_cms_label_seo_title")}
                                </span>
                                <input
                                  value={seoTitle}
                                  onChange={(e) => setSeoTitle(e.target.value)}
                                  placeholder={t("playground_cms_placeholder_seo_title")}
                                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm transition-colors focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                                />
                              </label>
                              <label className="block">
                                <span className="mb-1.5 block text-xs font-medium text-foreground">
                                  {t("playground_cms_label_seo_description")}
                                </span>
                                <textarea
                                  value={seoDescription}
                                  onChange={(e) => setSeoDescription(e.target.value)}
                                  placeholder={t("playground_cms_placeholder_seo_description")}
                                  rows={5}
                                  className="min-h-[110px] w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm leading-relaxed shadow-sm transition-colors focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                                />
                              </label>
                              <label className="block">
                                <span className="mb-1.5 block text-xs font-medium text-foreground">
                                  {t("playground_cms_page_settings_label_keywords")}
                                </span>
                                <input
                                  value={seoKeywords}
                                  onChange={(e) => setSeoKeywords(e.target.value)}
                                  placeholder={t("playground_cms_placeholder_seo_keywords")}
                                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm transition-colors focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                                />
                              </label>
                              <label className="block">
                                <span className="mb-1.5 block text-xs font-medium text-foreground">
                                  {t("playground_cms_page_settings_label_canonical")}
                                </span>
                                <input
                                  value={seoCanonicalUrl}
                                  onChange={(e) => setSeoCanonicalUrl(e.target.value)}
                                  placeholder={t("playground_cms_placeholder_canonical")}
                                  spellCheck={false}
                                  className="h-10 w-full rounded-md border border-input bg-background px-3 font-mono text-sm shadow-sm transition-colors focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                                />
                              </label>
                            </div>

                            <div className="flex flex-col gap-3 border-t border-border pt-4">
                              <Button
                                type="button"
                                className="h-10 w-full sm:w-auto sm:min-w-[10rem]"
                                onClick={() => void saveSeo()}
                                disabled={busy === "save-seo"}
                              >
                                {t("playground_cms_save_seo")}
                              </Button>
                              <label className="flex cursor-pointer gap-3 rounded-lg border border-border bg-muted/20 px-3 py-2.5 transition-colors hover:bg-muted/35">
                                <input
                                  type="checkbox"
                                  checked={seoNoIndex}
                                  onChange={(e) => setSeoNoIndex(e.target.checked)}
                                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-input"
                                />
                                <span className="min-w-0 text-left text-sm leading-snug text-foreground">{t("playground_cms_page_settings_noindex_label")}</span>
                              </label>
                              <label className="flex cursor-pointer gap-3 rounded-lg border border-border bg-muted/20 px-3 py-2.5 transition-colors hover:bg-muted/35">
                                <input
                                  type="checkbox"
                                  checked={seoNoFollow}
                                  onChange={(e) => setSeoNoFollow(e.target.checked)}
                                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-input"
                                />
                                <span className="min-w-0 text-left text-sm leading-snug text-foreground">{t("playground_cms_page_settings_nofollow_label")}</span>
                              </label>
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">{t("playground_cms_select_page_seo")}</p>
                        )}
                      </div>
                    )}
                  </div>
                ) : null}
                {cmsActiveSection === "history" ? (
                <div className="flex min-h-0 flex-col rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                  <div className="min-h-0 flex-1 space-y-2 overflow-auto">
                    {publishHistory.map((job) => (
                      <div key={job.id} className="rounded-md border border-border p-2 text-xs">
                        <div className="font-medium">{job.status}</div>
                        <div className="text-muted-foreground">
                          {fmtDate(job.publishedAt ?? job.createdAt)} · {job.pagesCount} {t("playground_cms_job_pages")} ·{" "}
                          {job.entriesCount} {t("playground_cms_job_entries")}
                        </div>
                        <div className="text-muted-foreground">
                          {t("playground_cms_job_author")}: {job.author ?? "—"}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-2 h-7 gap-1 px-2 text-[11px]"
                          disabled={busy === `rollback-${job.id}`}
                          onClick={() => void rollbackPublish(job.id)}
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          {t("playground_cms_rollback")}
                        </Button>
                      </div>
                    ))}
                    {publishHistory.length === 0 ? (
                      <p className="text-xs text-muted-foreground">{t("playground_cms_no_jobs")}</p>
                    ) : null}
                  </div>
                </div>
                ) : null}
                {cmsActiveSection === "domain" ? (
                  <div className="space-y-4">
                    {!selectedSiteId ? (
                      <p className="text-sm text-muted-foreground">{t("playground_cms_domain_select_site")}</p>
                    ) : cmsDomainLoading ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {t("playground_cms_domain_loading")}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                          <p className="text-sm font-semibold text-foreground">
                            {t("playground_cms_domain_builtin_heading")}
                          </p>
                          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                            {t("playground_cms_domain_builtin_desc")}
                          </p>
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() => setCmsDomainMode("subdomain")}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                setCmsDomainMode("subdomain");
                              }
                            }}
                            className={cn(
                              "mt-3 flex cursor-pointer gap-3 rounded-xl border px-3 py-3 transition-colors",
                              cmsDomainMode === "subdomain"
                                ? "border-primary/50 bg-primary/[0.06] ring-1 ring-primary/25"
                                : "border-border/80 hover:bg-muted/35",
                            )}
                          >
                            <input
                              type="radio"
                              className="mt-1 h-4 w-4 shrink-0 accent-primary"
                              checked={cmsDomainMode === "subdomain"}
                              readOnly
                              aria-checked={cmsDomainMode === "subdomain"}
                            />
                            <div className="min-w-0 flex-1 space-y-2">
                              <div
                                className="flex min-h-11 min-w-0 flex-1 items-center gap-1 rounded-lg border border-border bg-background px-3"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <span className="shrink-0 text-sm text-muted-foreground">https://</span>
                                <Input
                                  value={cmsDomainSubdomain}
                                  onChange={(e) => setCmsDomainSubdomain(e.target.value)}
                                  onFocus={() => setCmsDomainMode("subdomain")}
                                  className="h-10 min-w-0 flex-1 border-0 bg-transparent px-1 text-sm font-medium shadow-none focus-visible:ring-0"
                                  spellCheck={false}
                                  autoCapitalize="off"
                                  autoCorrect="off"
                                  aria-label={t("playground_cms_domain_subdomain_aria")}
                                />
                                <span className="shrink-0 truncate text-sm text-muted-foreground">
                                  .{PUBLISH_BUILTIN_BASE_DOMAIN}
                                </span>
                              </div>
                              <p className="text-[11px] text-muted-foreground">
                                <span className="font-medium text-foreground/80">{t("playground_cms_domain_result_url")}</span>{" "}
                                <span className="break-all font-mono">{cmsPublicUrl}</span>
                              </p>
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  className="h-9"
                                  disabled={cmsDomainBusy}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    void saveCmsDomainHost();
                                  }}
                                >
                                  {t("playground_cms_domain_save")}
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="h-9 gap-1.5"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    void copyCmsUrl(cmsPublicUrl);
                                  }}
                                >
                                  <Copy className="h-3.5 w-3.5" aria-hidden />
                                  {t("playground_cms_domain_copy")}
                                </Button>
                                <Button type="button" size="sm" variant="outline" className="h-9 gap-1.5" asChild>
                                  <a href={cmsPublicUrl} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                                    {t("playground_cms_domain_open")}
                                  </a>
                                </Button>
                              </div>
                            </div>
                          </div>
                        </section>

                        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-foreground">
                              {t("playground_cms_domain_custom_heading")}
                            </p>
                            <Lock className="h-4 w-4 text-muted-foreground" aria-hidden />
                          </div>
                          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                            {t("playground_cms_domain_custom_desc")}
                          </p>

                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() => hasCustomDomainPlan && setCmsDomainMode("custom")}
                            onKeyDown={(e) => {
                              if (!hasCustomDomainPlan) return;
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                setCmsDomainMode("custom");
                              }
                            }}
                            className={cn(
                              "mt-3 flex gap-3 rounded-xl border px-3 py-3 transition-colors",
                              cmsDomainMode === "custom"
                                ? "cursor-pointer border-primary/50 bg-primary/[0.06] ring-1 ring-primary/25"
                                : "border-border/80 hover:bg-muted/35",
                              !hasCustomDomainPlan && "cursor-default opacity-95",
                            )}
                          >
                            <input
                              type="radio"
                              className="mt-1 h-4 w-4 shrink-0 accent-primary"
                              checked={cmsDomainMode === "custom"}
                              disabled={!hasCustomDomainPlan}
                              readOnly
                              aria-checked={cmsDomainMode === "custom"}
                            />
                            <div className="min-w-0 flex-1 space-y-3">
                              {!hasCustomDomainPlan ? (
                                <div className="rounded-lg border border-amber-500/35 bg-amber-500/[0.08] px-3 py-2.5 dark:border-amber-500/25 dark:bg-amber-500/10">
                                  <p className="text-sm font-medium text-amber-950 dark:text-amber-100">
                                    {t("playground_cms_domain_plan_title")}
                                  </p>
                                  <p className="mt-1 text-xs leading-snug text-amber-900/85 dark:text-amber-200/90">
                                    {t("playground_cms_domain_plan_body")}
                                  </p>
                                  <Link
                                    href="/pricing"
                                    className={cn(
                                      buttonVariants({ size: "sm" }),
                                      "mt-2 inline-flex h-9 bg-amber-600 text-white hover:bg-amber-500",
                                    )}
                                  >
                                    {t("playground_cms_domain_pricing_cta")}
                                  </Link>
                                </div>
                              ) : (
                                <>
                                  <div onClick={(e) => e.stopPropagation()}>
                                    <Input
                                      value={cmsDomainCustom}
                                      onChange={(e) => setCmsDomainCustom(e.target.value)}
                                      onFocus={() => setCmsDomainMode("custom")}
                                      placeholder={t("playground_cms_domain_host_placeholder")}
                                      className="h-10 text-sm"
                                      spellCheck={false}
                                      autoCapitalize="off"
                                      autoCorrect="off"
                                      aria-label={t("playground_cms_domain_custom_aria")}
                                    />
                                  </div>
                                  <div className="flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
                                    <Button
                                      type="button"
                                      size="sm"
                                      className="h-9"
                                      disabled={cmsDomainBusy || !cmsManualHost}
                                      onClick={() => void saveCmsDomainHost()}
                                    >
                                      {t("playground_cms_domain_save")}
                                    </Button>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="secondary"
                                      className="h-9"
                                      disabled={cmsDomainBusy || cmsDomainVerification?.status === "VERIFIED"}
                                      onClick={() => void verifyCmsDomainNow()}
                                    >
                                      {t("playground_cms_domain_verify")}
                                    </Button>
                                    <Button type="button" size="sm" variant="outline" className="h-9 gap-1.5" asChild>
                                      <a href={cmsPublicUrl} target="_blank" rel="noopener noreferrer">
                                        <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                                        {t("playground_cms_domain_open")}
                                      </a>
                                    </Button>
                                  </div>
                                  <div className="rounded-lg border border-border bg-background px-3 py-2 text-xs">
                                    <p className="font-medium text-foreground">{t("playground_cms_domain_ssl_note_title")}</p>
                                    <p className="mt-1 text-muted-foreground">{t("playground_cms_domain_ssl_note_body")}</p>
                                  </div>
                                  {cmsDomainMode === "custom" && cmsManualHost ? (
                                    <div className="rounded-lg border border-border bg-background px-3 py-2 text-xs">
                                      <p className="font-medium text-foreground">{t("playground_cms_domain_status_label")}</p>
                                      <p className="mt-1">
                                        {cmsDomainVerification?.status === "VERIFIED" ? (
                                          <span className="text-emerald-700 dark:text-emerald-400">
                                            {t("playground_cms_domain_status_verified")}
                                          </span>
                                        ) : (
                                          <span className="text-muted-foreground">
                                            {t("playground_cms_domain_status_pending")}
                                          </span>
                                        )}
                                      </p>
                                    </div>
                                  ) : null}
                                  {cmsDomainVerification?.status === "PENDING" &&
                                  cmsDomainVerification.recordName &&
                                  cmsDomainVerification.recordValue ? (
                                    <div className="space-y-2 rounded-lg border border-dashed border-border bg-muted/20 p-3 text-xs">
                                      <p className="font-semibold text-foreground">{t("playground_cms_domain_txt_heading")}</p>
                                      <div>
                                        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                          {t("playground_cms_domain_txt_name")}
                                        </p>
                                        <div className="mt-1 flex items-start gap-2">
                                          <code className="flex-1 break-all rounded bg-muted px-2 py-1 font-mono text-[11px]">
                                            {cmsDomainVerification.recordName}
                                          </code>
                                          <Button
                                            type="button"
                                            size="icon"
                                            variant="outline"
                                            className="h-8 w-8 shrink-0"
                                            onClick={() => void copyCmsUrl(cmsDomainVerification.recordName ?? "")}
                                            aria-label={t("playground_cms_domain_copy")}
                                          >
                                            <Copy className="h-3.5 w-3.5" />
                                          </Button>
                                        </div>
                                      </div>
                                      <div>
                                        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                          {t("playground_cms_domain_txt_value")}
                                        </p>
                                        <div className="mt-1 flex items-start gap-2">
                                          <code className="flex-1 break-all rounded bg-muted px-2 py-1 font-mono text-[11px]">
                                            {cmsDomainVerification.recordValue}
                                          </code>
                                          <Button
                                            type="button"
                                            size="icon"
                                            variant="outline"
                                            className="h-8 w-8 shrink-0"
                                            onClick={() => void copyCmsUrl(cmsDomainVerification.recordValue ?? "")}
                                            aria-label={t("playground_cms_domain_copy")}
                                          >
                                            <Copy className="h-3.5 w-3.5" />
                                          </Button>
                                        </div>
                                      </div>
                                    </div>
                                  ) : null}
                                </>
                              )}
                            </div>
                          </div>
                        </section>
                      </div>
                    )}
                  </div>
                ) : null}
                {cmsActiveSection === "content-types" ? (
                <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                  <div className="mb-2 flex gap-2">
                    <input
                      value={createTypeName}
                      onChange={(e) => setCreateTypeName(e.target.value)}
                      placeholder={t("playground_cms_placeholder_type_name")}
                      className="h-9 flex-1 rounded-md border border-border bg-background px-2 text-sm"
                    />
                    <input
                      value={createTypeKey}
                      onChange={(e) => setCreateTypeKey(e.target.value)}
                      placeholder={t("playground_cms_placeholder_api_key")}
                      className="h-9 w-36 rounded-md border border-border bg-background px-2 text-sm"
                    />
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => void createContentType()}
                    disabled={!selectedSiteId || busy === "create-type"}
                  >
                    {t("playground_cms_add_type")}
                  </Button>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {contentTypes.map((ct) => (
                      <button
                        key={ct.id}
                        type="button"
                        onClick={() => setSelectedTypeId(ct.id)}
                        className={`rounded-md border px-2 py-1 text-xs ${
                          ct.id === selectedTypeId ? "border-primary bg-primary/5 text-primary" : "border-border"
                        }`}
                      >
                        {ct.apiKey} ({ct.entriesCount})
                      </button>
                    ))}
                  </div>
                </div>
                ) : null}
                {cmsActiveSection === "entries" ? (
                <div className="flex min-h-0 flex-col rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                  <div className="mb-2 flex gap-2">
                    <input
                      value={entrySlug}
                      onChange={(e) => setEntrySlug(e.target.value)}
                      placeholder={t("playground_cms_placeholder_entry_slug")}
                      className="h-9 w-44 rounded-md border border-border bg-background px-2 text-sm"
                    />
                    <Button
                      variant="outline"
                      onClick={() => void saveEntryDraft()}
                      disabled={!selectedSiteId || !selectedTypeId || busy === "save-entry"}
                    >
                      {t("playground_cms_save_entry_draft")}
                    </Button>
                  </div>
                  <textarea
                    value={entryJson}
                    onChange={(e) => setEntryJson(e.target.value)}
                    className="mb-3 h-28 w-full rounded-md border border-border bg-background p-2 font-mono text-xs"
                  />
                  <div className="min-h-0 flex-1 space-y-2 overflow-auto">
                    {entries.map((e) => (
                      <div key={e.id} className="rounded-md border border-border p-2 text-xs">
                        <div className="font-medium">{e.slug}</div>
                        <div className="text-muted-foreground">
                          {t("playground_cms_entry_status")}: {e.status}
                        </div>
                        <pre className="mt-1 max-h-28 overflow-auto rounded bg-muted p-2 text-[11px]">
                          {JSON.stringify(e.publishedVersion?.data ?? e.draftVersion?.data ?? {}, null, 2)}
                        </pre>
                      </div>
                    ))}
                    {entries.length === 0 ? (
                      <p className="text-xs text-muted-foreground">{t("playground_cms_entries_empty")}</p>
                    ) : null}
                  </div>
                </div>
                ) : null}
                {cmsActiveSection === "submissions" ? (
                  <div className="flex min-h-0 flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                    {!selectedSiteId ? (
                      <p className="text-sm text-muted-foreground">{t("playground_cms_domain_select_site")}</p>
                    ) : (
                      <>
                        <p className="text-xs leading-relaxed text-muted-foreground">{t("playground_cms_submissions_intro")}</p>
                        <div className="space-y-2 rounded-md border border-border bg-muted/30 p-3">
                          <div className="text-xs font-medium text-foreground">{t("playground_cms_submissions_webhook_title")}</div>
                          <p className="text-[11px] leading-relaxed text-muted-foreground">{t("playground_cms_submissions_webhook_help")}</p>
                          {formWebhookLoading ? (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                              {t("playground_cms_submissions_webhook_loading")}
                            </div>
                          ) : (
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                              <Input
                                type="password"
                                autoComplete="off"
                                value={formWebhookInput}
                                onChange={(e) => setFormWebhookInput(e.target.value)}
                                placeholder={t("playground_cms_submissions_webhook_placeholder")}
                                className="font-mono text-xs sm:min-w-0 sm:flex-1"
                              />
                              <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                className="shrink-0"
                                disabled={formWebhookSaving}
                                onClick={() => void saveFormWebhook()}
                              >
                                {formWebhookSaving ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
                                {t("playground_cms_submissions_webhook_save")}
                              </Button>
                            </div>
                          )}
                        </div>
                        {submissionsLoading ? (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            {t("playground_cms_submissions_loading")}
                          </div>
                        ) : (
                          <>
                            <PlaygroundCmsSubmissionKanban
                              columns={submissionKanbanColumnDefs}
                              itemsByColumn={submissionsByKanbanColumn}
                              boardAriaLabel={t("playground_cms_submissions_heading")}
                              pageColumnLabel={t("playground_cms_submissions_col_page")}
                              dragHandleAriaLabel={t("playground_cms_submissions_drag_aria")}
                              addColumnLabel={t("playground_cms_submissions_kanban_add_column")}
                              fmtDate={fmtDate}
                              displayMetaPlain={displayMetaPlain}
                              onMoveToColumn={patchSubmissionKanbanColumn}
                              onAddColumnClick={() => setSubmissionKanbanAddOpen(true)}
                            />
                            {formSubmissions.length === 0 ? (
                              <p className="mt-3 text-xs text-muted-foreground">
                                {t("playground_cms_submissions_empty")}
                              </p>
                            ) : null}
                          </>
                        )}
                      </>
                    )}
                  </div>
                ) : null}
              </div>
            </main>
          </div>
        )}
      </div>

      <Dialog
        open={submissionKanbanAddOpen}
        onOpenChange={(open) => {
          setSubmissionKanbanAddOpen(open);
          if (!open) setSubmissionKanbanAddLabel("");
        }}
      >
        <DialogContent showCloseButton className="sm:max-w-md">
          <DialogHeader className="text-left">
            <DialogTitle>{t("playground_cms_submissions_kanban_add_column_title")}</DialogTitle>
          </DialogHeader>
          <Input
            autoFocus
            value={submissionKanbanAddLabel}
            onChange={(e) => setSubmissionKanbanAddLabel(e.target.value)}
            placeholder={t("playground_cms_submissions_kanban_add_column_placeholder")}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void submitAddKanbanColumn();
              }
            }}
          />
          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              disabled={submissionKanbanAddBusy}
              onClick={() => setSubmissionKanbanAddOpen(false)}
            >
              {t("playground_cms_submissions_kanban_add_column_cancel")}
            </Button>
            <Button
              type="button"
              className="w-full sm:w-auto"
              disabled={submissionKanbanAddBusy || !submissionKanbanAddLabel.trim()}
              onClick={() => void submitAddKanbanColumn()}
            >
              {submissionKanbanAddBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t("playground_cms_submissions_kanban_add_column_submit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={pageSettingsDialogForId !== null} onOpenChange={(next) => !next && setPageSettingsDialogForId(null)}>
        <DialogContent
          showCloseButton
          className="flex max-h-[min(92dvh,760px)] w-full max-w-[calc(100%-2rem)] min-h-0 flex-col gap-0 overflow-hidden p-0 shadow-lg sm:max-w-2xl"
        >
          <DialogHeader className="shrink-0 border-b border-border px-6 py-4 text-left">
            <DialogTitle className="pr-10 text-xl font-semibold tracking-tight">
              {t("playground_cms_page_settings_modal_title")}
            </DialogTitle>
          </DialogHeader>

          <Tabs
            value={pageSettingsTab}
            onValueChange={(v) => setPageSettingsTab(v === "seo" ? "seo" : "main")}
            className="flex min-h-0 min-w-0 flex-1 flex-col gap-0 overflow-hidden"
          >
            <div className="shrink-0 border-b border-border px-6">
              <TabsList className="h-auto w-full flex-wrap justify-start gap-2 rounded-none border-0 bg-transparent p-0">
                <TabsTrigger
                  value="main"
                  className="rounded-none border-0 border-b-2 border-transparent bg-transparent px-1 py-3 text-sm shadow-none data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                >
                  {t("playground_cms_page_settings_tab_main")}
                </TabsTrigger>
                <TabsTrigger
                  value="seo"
                  className="rounded-none border-0 border-b-2 border-transparent bg-transparent px-1 py-3 text-sm shadow-none data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                >
                  {t("playground_cms_page_settings_tab_seo")}
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-6 py-5">
              <TabsContent value="main" className="mt-0 space-y-5">
                <label className="block">
                  <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("playground_cms_page_settings_label_title")}
                  </span>
                  <input
                    value={pageSettingsTitle}
                    onChange={(e) => setPageSettingsTitle(e.target.value)}
                    className="h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none ring-offset-background transition-colors focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/45"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("playground_cms_page_settings_label_description")}
                  </span>
                  <textarea
                    value={pageSettingsSeoDescription}
                    onChange={(e) => setPageSettingsSeoDescription(e.target.value)}
                    rows={3}
                    placeholder={t("playground_cms_placeholder_seo_description")}
                    className="min-h-[100px] w-full resize-y rounded-lg border border-input bg-background px-3 py-2.5 text-sm leading-relaxed shadow-sm outline-none ring-offset-background transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/45"
                  />
                </label>
                <div>
                  <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("playground_cms_page_settings_label_page_url")}
                  </span>
                  <p className="break-all rounded-lg border border-input bg-muted/35 px-3 py-2.5 text-sm font-medium leading-snug text-foreground">
                    {pageSettingsPublicPageUrl || "—"}
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{t("playground_cms_page_settings_url_hint")}</p>
                </div>
                {pageSettingsTargetPage?.isHome ? (
                  <p className="text-xs text-muted-foreground">{t("playground_cms_page_settings_home_slug_hint")}</p>
                ) : (
                  <label className="block">
                    <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {t("playground_cms_page_settings_label_slug")}
                    </span>
                    <input
                      value={pageSettingsSlug}
                      onChange={(e) => setPageSettingsSlug(e.target.value)}
                      spellCheck={false}
                      autoCapitalize="off"
                      className="h-11 w-full rounded-lg border border-input bg-background px-3 py-2 font-mono text-sm shadow-sm outline-none ring-offset-background transition-colors focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/45"
                    />
                  </label>
                )}
              </TabsContent>

              <TabsContent value="seo" className="mt-0 space-y-8">
                <section className="space-y-3">
                  <div>
                    <h3 className="text-base font-semibold tracking-tight text-foreground">
                      {t("playground_cms_page_settings_seo_preview_heading")}
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {t("playground_cms_page_settings_seo_preview_subtitle")}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border/70 bg-background p-4 shadow-md ring-1 ring-black/[0.06] dark:bg-card dark:ring-white/[0.08]">
                    <p className="break-words text-[1.05rem] font-normal leading-snug text-[#1558d6] dark:text-[#8ab4f8]">{pageSettingsSerpTitle}</p>
                    <p className="mt-2 break-all text-sm leading-snug text-[#246d4a] dark:text-green-400">{pageSettingsSerpUrl}</p>
                    <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-foreground">
                      {pageSettingsSerpDescription || "—"}
                    </p>
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    <span>{t("playground_cms_page_settings_seo_preview_guide_prefix")} </span>
                    <a
                      href={t("playground_cms_page_settings_seo_preview_guide_href")}
                      className="font-medium text-primary underline-offset-2 hover:underline"
                    >
                      {t("playground_cms_page_settings_seo_preview_guide_link")}
                    </a>
                    <span>.</span>
                  </p>
                </section>

                <section className="space-y-5 border-t border-border pt-6">
                  <div className="grid gap-2 sm:grid-cols-[minmax(0,7.5rem)_1fr] sm:items-start sm:gap-x-6">
                    <span className="pt-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {t("playground_cms_page_settings_seo_field_title")}
                    </span>
                    <input
                      value={pageSettingsSeoTitle}
                      onChange={(e) => setPageSettingsSeoTitle(e.target.value)}
                      placeholder={t("playground_cms_placeholder_seo_title")}
                      className="h-11 min-w-0 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none ring-offset-background transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/45"
                    />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-[minmax(0,7.5rem)_1fr] sm:items-start sm:gap-x-6">
                    <span className="pt-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {t("playground_cms_page_settings_seo_field_description")}
                    </span>
                    <textarea
                      value={pageSettingsSeoDescription}
                      onChange={(e) => setPageSettingsSeoDescription(e.target.value)}
                      rows={3}
                      placeholder={t("playground_cms_placeholder_seo_description")}
                      className="min-h-[100px] min-w-0 w-full resize-y rounded-lg border border-input bg-background px-3 py-2.5 text-sm leading-relaxed shadow-sm outline-none ring-offset-background transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/45"
                    />
                  </div>
                </section>

                <section className="space-y-6 border-t border-border pt-6">
                  <div className="grid gap-2 sm:grid-cols-[minmax(0,11rem)_1fr] sm:items-start sm:gap-x-6">
                    <span className="pt-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {t("playground_cms_page_settings_label_keywords")}
                    </span>
                    <input
                      value={pageSettingsSeoKeywords}
                      onChange={(e) => setPageSettingsSeoKeywords(e.target.value)}
                      placeholder={t("playground_cms_placeholder_seo_keywords")}
                      className="h-11 min-w-0 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none ring-offset-background transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/45"
                    />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-[minmax(0,11rem)_1fr] sm:items-start sm:gap-x-6">
                    <span className="pt-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {t("playground_cms_page_settings_label_canonical")}
                    </span>
                    <input
                      value={pageSettingsCanonicalUrl}
                      onChange={(e) => setPageSettingsCanonicalUrl(e.target.value)}
                      placeholder={t("playground_cms_placeholder_canonical")}
                      spellCheck={false}
                      autoCapitalize="off"
                      className="h-11 min-w-0 w-full rounded-lg border border-input bg-background px-3 py-2 font-mono text-sm shadow-sm outline-none ring-offset-background transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/45"
                    />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-[minmax(0,11rem)_1fr] sm:items-start sm:gap-x-6">
                    <span className="pt-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {t("playground_cms_page_settings_label_indexing_section")}
                    </span>
                    <label className="flex cursor-pointer items-start gap-2.5 pt-1">
                      <input
                        type="checkbox"
                        checked={pageSettingsNoIndex}
                        onChange={(e) => setPageSettingsNoIndex(e.target.checked)}
                        className="mt-0.5 h-4 w-4 shrink-0 rounded border-input"
                      />
                      <span className="text-sm leading-snug text-foreground">{t("playground_cms_page_settings_noindex_label")}</span>
                    </label>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-[minmax(0,11rem)_1fr] sm:items-start sm:gap-x-6">
                    <span className="pt-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {t("playground_cms_page_settings_label_links_section")}
                    </span>
                    <label className="flex cursor-pointer items-start gap-2.5 pt-1">
                      <input
                        type="checkbox"
                        checked={pageSettingsNoFollow}
                        onChange={(e) => setPageSettingsNoFollow(e.target.checked)}
                        className="mt-0.5 h-4 w-4 shrink-0 rounded border-input"
                      />
                      <span className="text-sm leading-snug text-foreground">{t("playground_cms_page_settings_nofollow_label")}</span>
                    </label>
                  </div>
                </section>
              </TabsContent>
            </div>
          </Tabs>

          <DialogFooter className="shrink-0 flex-col gap-4 border-t border-border bg-muted/15 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              className={cn(
                buttonVariants({ variant: "ghost" }),
                "h-auto justify-start px-0 py-1 text-sm font-medium text-primary hover:bg-transparent hover:text-primary/90",
              )}
              onClick={() => {
                setPageSettingsDialogForId(null);
                setCmsActiveSection("domain");
              }}
            >
              {t("playground_cms_page_settings_site_link")}
            </button>
            <div className="flex w-full shrink-0 flex-col-reverse gap-2 sm:w-auto sm:flex-row">
              <Button type="button" variant="outline" className="sm:min-w-[7rem]" onClick={() => setPageSettingsDialogForId(null)}>
                {t("playground_cms_page_settings_close")}
              </Button>
              <Button
                type="button"
                className="sm:min-w-[11rem]"
                disabled={busy === "page-settings-save" || !pageSettingsDialogForId || !selectedSiteId}
                onClick={() => void savePageSettingsFromDialog()}
              >
                {busy === "page-settings-save" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
                {t("playground_cms_page_settings_save")}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
}
