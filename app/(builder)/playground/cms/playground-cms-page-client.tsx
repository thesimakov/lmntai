"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ChevronDown,
  ClipboardList,
  Copy,
  ExternalLink,
  FileText,
  Globe,
  History,
  Inbox,
  Layers,
  Link2,
  Loader2,
  Lock,
  Plus,
  RotateCcw,
  Search,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import { useI18n } from "@/components/i18n-provider";
import { PageTransition } from "@/components/page-transition";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  noIndex?: boolean;
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
  const projectIdFromQuery = search.get("projectId")?.trim() || "";
  const rawPlanUpper = String(session?.user?.plan ?? "").toUpperCase();
  const hasCustomDomainPlan =
    rawPlanUpper === "PRO" || rawPlanUpper === "TEAM" || rawPlanUpper === "BUSINESS";

  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [sites, setSites] = useState<SiteRow[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState(projectIdFromQuery);
  const [selectedSiteId, setSelectedSiteId] = useState<string>("");

  const [pages, setPages] = useState<PageRow[]>([]);
  const [publishHistory, setPublishHistory] = useState<PublishJobRow[]>([]);
  const [selectedPageId, setSelectedPageId] = useState("");

  const [contentTypes, setContentTypes] = useState<ContentTypeRow[]>([]);
  const [selectedTypeId, setSelectedTypeId] = useState("");
  const [entries, setEntries] = useState<EntryRow[]>([]);
  const [formSubmissions, setFormSubmissions] = useState<FormSubmissionRow[]>([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);

  const [createPageTitle, setCreatePageTitle] = useState("");
  const [createPageSlug, setCreatePageSlug] = useState("");
  const [createParentId, setCreateParentId] = useState("");
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [seoNoIndex, setSeoNoIndex] = useState(false);

  const [createTypeName, setCreateTypeName] = useState("");
  const [createTypeKey, setCreateTypeKey] = useState("");
  const [entrySlug, setEntrySlug] = useState("");
  const [entryJson, setEntryJson] = useState("{\n  \"title\": \"\",\n  \"body\": \"\"\n}");
  const [busy, setBusy] = useState<string | null>(null);
  const [expandedPageIds, setExpandedPageIds] = useState<Set<string>>(() => new Set());
  const [cmsActiveSection, setCmsActiveSection] = useState<CmsPanelSectionId>("pages");
  const [cmsNavQuery, setCmsNavQuery] = useState("");
  const [cmsDomainLoading, setCmsDomainLoading] = useState(false);
  const [cmsDomainMode, setCmsDomainMode] = useState<"subdomain" | "custom">("subdomain");
  const [cmsDomainSubdomain, setCmsDomainSubdomain] = useState("");
  const [cmsDomainCustom, setCmsDomainCustom] = useState("");
  const [cmsDomainVerification, setCmsDomainVerification] = useState<CmsDomainVerification | null>(null);
  const [cmsDomainBusy, setCmsDomainBusy] = useState(false);

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
          ["submissions", Inbox, "playground_cms_submissions_heading"],
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
    setSelectedSiteId((prev) => (prev && next.some((s) => s.id === prev) ? prev : next[0]?.id || ""));
  }, []);

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
    async (siteId: string) => {
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
      setPages(nextPages);
      setContentTypes(nextTypes);
      setSelectedPageId((prev) => (prev && nextPages.some((p) => p.id === prev) ? prev : nextPages[0]?.id || ""));
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
      return;
    }
    const res = await fetch(`/api/cms/sites/${encodeURIComponent(siteId)}/form-submissions?take=120`, {
      credentials: "include",
      cache: "no-store",
    });
    if (!res.ok) throw new Error((await res.text()) || "Не удалось загрузить заявки");
    const body = await readJson<{ submissions?: FormSubmissionRow[] }>(res);
    const raw = body.submissions ?? [];
    setFormSubmissions(
      raw.map((s) => ({
        ...s,
        fields:
          s.fields && typeof s.fields === "object" && !Array.isArray(s.fields)
            ? (s.fields as Record<string, string>)
            : {},
      })),
    );
  }, []);

  useEffect(() => {
    if (cmsActiveSection !== "submissions" || !selectedSiteId) return;
    let cancelled = false;
    setSubmissionsLoading(true);
    void loadFormSubmissions(selectedSiteId)
      .catch((e) => {
        if (!cancelled) toast.error(e instanceof Error ? e.message : "Ошибка загрузки заявок");
      })
      .finally(() => {
        if (!cancelled) setSubmissionsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [cmsActiveSection, loadFormSubmissions, selectedSiteId]);

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
    let active = true;
    setLoading(true);
    void Promise.all([loadProjects(), loadSites()])
      .catch((e) => toast.error(e instanceof Error ? e.message : String(e)))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [loadProjects, loadSites]);

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
      setSeoNoIndex(false);
      return;
    }
    setSeoTitle(selectedPage.seoTitle ?? "");
    setSeoDescription(selectedPage.seoDescription ?? "");
    setSeoNoIndex(Boolean(selectedPage.noIndex));
  }, [selectedPage]);

  const ensureSiteForProject = useCallback(async () => {
    if (!selectedProjectId) {
      toast.error("Выберите проект");
      return;
    }
    setBusy("ensure-site");
    try {
      const res = await fetch("/api/cms/sites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ projectId: selectedProjectId }),
      });
      if (!res.ok) throw new Error((await res.text()) || "Не удалось создать CMS-сайт");
      const body = await readJson<{ siteId?: string }>(res);
      await loadSites();
      if (body.siteId) setSelectedSiteId(body.siteId);
      toast.success("CMS-сайт готов");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }, [loadSites, selectedProjectId]);

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
            noIndex: seoNoIndex,
          }),
        },
      );
      if (!res.ok) throw new Error((await res.text()) || "Не удалось сохранить SEO");
      await loadSiteData(selectedSiteId);
      toast.success("SEO сохранено");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }, [loadSiteData, selectedPage, selectedSiteId, seoDescription, seoNoIndex, seoTitle]);

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
        toast.success("Страница опубликована");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : String(e));
      } finally {
        setBusy(null);
      }
    },
    [loadSiteData, selectedSiteId],
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

  const publishSite = useCallback(async () => {
    if (!selectedSiteId) return;
    setBusy("publish-site");
    try {
      const res = await fetch(`/api/cms/sites/${encodeURIComponent(selectedSiteId)}/publish`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error((await res.text()) || "Не удалось опубликовать сайт");
      await loadSiteData(selectedSiteId);
      toast.success("Сайт опубликован");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }, [loadSiteData, selectedSiteId]);

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
        toast.success("Откат публикации выполнен");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : String(e));
      } finally {
        setBusy(null);
      }
    },
    [loadSiteData, selectedSiteId],
  );

  const togglePageDetails = useCallback((pageId: string) => {
    setExpandedPageIds((prev) => {
      const next = new Set(prev);
      if (next.has(pageId)) next.delete(pageId);
      else next.add(pageId);
      return next;
    });
  }, []);

  const activatePageRow = useCallback(
    (pageId: string) => {
      setSelectedPageId(pageId);
      togglePageDetails(pageId);
    },
    [togglePageDetails],
  );

  useEffect(() => {
    setExpandedPageIds(new Set());
    setCmsActiveSection("pages");
  }, [selectedSiteId]);

  return (
    <PageTransition>
      <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col gap-3">
        <header className="flex items-center gap-2 border-b border-border pb-3">
          <Button type="button" variant="ghost" size="sm" className="h-9 w-fit gap-2 px-2" asChild>
            <Link href="/playground">
              <ArrowLeft className="h-4 w-4" />
              Назад
            </Link>
          </Button>
        </header>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("playground_cms_loading")}
          </div>
        ) : (
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-[320px_1fr]">
            <aside className="flex min-h-0 min-w-0 shrink-0 flex-col gap-3 rounded-lg border border-border bg-background p-3 lg:w-[320px]">
              <h2 className="text-sm font-semibold">{t("playground_cms_sites_title")}</h2>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="h-9 rounded-md border border-border bg-background px-2 text-sm"
              >
                <option value="">{t("playground_cms_select_project")}</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <Button onClick={() => void ensureSiteForProject()} disabled={busy === "ensure-site"} className="gap-2">
                <Plus className="h-4 w-4" />
                {t("playground_cms_ensure_site")}
              </Button>

              <div className="max-h-[38vh] space-y-2 overflow-auto">
                {sites.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelectedSiteId(s.id)}
                    className={`w-full rounded-md border px-2 py-2 text-left text-xs transition ${
                      s.id === selectedSiteId ? "border-primary bg-primary/5" : "border-border hover:bg-muted/60"
                    }`}
                  >
                    <div className="font-medium text-foreground">{s.name}</div>
                    <div className="text-muted-foreground">
                      {t("playground_cms_meta_pages")}: {s.pagesCount}
                    </div>
                    <div className="truncate text-muted-foreground">
                      {t("playground_cms_meta_project")}: {s.projectId}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {t("playground_cms_meta_updated")}: {fmtDate(s.updatedAt)}
                    </div>
                  </button>
                ))}
              </div>

              <div className="rounded-md border border-border p-2">
                <div className="mb-2 text-xs font-semibold text-foreground">{t("playground_cms_publish_section")}</div>
                <Button
                  variant="secondary"
                  onClick={() => void publishSite()}
                  disabled={!selectedSiteId || busy === "publish-site"}
                  className="w-full gap-2"
                >
                  <Upload className="h-4 w-4" />
                  {t("playground_cms_publish_all")}
                </Button>
                <Link
                  href={selectedSiteId ? `/api/headless/sites/${encodeURIComponent(selectedSiteId)}/pages` : "#"}
                  className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  {t("playground_cms_headless_pages")}
                </Link>
              </div>

              <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 border-t border-border pt-3">
                <p className="text-xs font-semibold text-muted-foreground">{t("playground_cms_nav_heading")}</p>
                <div className="relative shrink-0">
                  <Search
                    aria-hidden
                    className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/70"
                  />
                  <input
                    value={cmsNavQuery}
                    onChange={(e) => setCmsNavQuery(e.target.value)}
                    placeholder={t("playground_cms_nav_search_placeholder")}
                    type="search"
                    aria-label={t("playground_cms_nav_search_placeholder")}
                    className="h-9 w-full rounded-md border border-border bg-background pl-9 pr-2 text-xs shadow-sm outline-none placeholder:text-muted-foreground/65 focus-visible:ring-2 focus-visible:ring-ring/40"
                  />
                </div>
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
                          "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm transition-colors",
                          sel
                            ? "bg-primary font-medium text-primary-foreground shadow-sm"
                            : "text-muted-foreground hover:bg-muted/90 hover:text-foreground",
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

            <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-background">
              <header className="shrink-0 border-b border-border px-4 py-3 md:px-5">
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

              <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-3 py-3 md:px-4 md:py-4">
                {cmsActiveSection === "pages" ? (
                  <div className="flex h-full min-h-0 flex-col rounded-lg bg-background">
                  <div className="mb-2 shrink-0 grid gap-2 sm:grid-cols-[1fr_140px_1fr_auto]">
                    <input
                      value={createPageTitle}
                      onChange={(e) => setCreatePageTitle(e.target.value)}
                      placeholder={t("playground_cms_placeholder_new_title")}
                      className="h-9 rounded-md border border-border bg-background px-2 text-sm"
                    />
                    <input
                      value={createPageSlug}
                      onChange={(e) => setCreatePageSlug(e.target.value)}
                      placeholder={t("playground_cms_placeholder_slug")}
                      className="h-9 rounded-md border border-border bg-background px-2 text-sm"
                    />
                    <select
                      value={createParentId}
                      onChange={(e) => setCreateParentId(e.target.value)}
                      className="h-9 rounded-md border border-border bg-background px-2 text-sm"
                    >
                      <option value="">{t("playground_cms_parent_root")}</option>
                      {pages.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.path}
                        </option>
                      ))}
                    </select>
                    <Button
                      variant="outline"
                      onClick={() => void createPage()}
                      disabled={!selectedSiteId || busy === "create-page"}
                    >
                      {t("playground_cms_add_page")}
                    </Button>
                  </div>
                  <div className="flex-1 basis-0 min-h-[12rem] max-h-[min(52vh,32rem)] space-y-2 overflow-y-auto overflow-x-hidden overscroll-contain">
                    {pages.map((p) => {
                      const isSelected = p.id === selectedPageId;
                      const expanded = expandedPageIds.has(p.id);
                      const parentPath = p.parentId ? pathByPageId.get(p.parentId) ?? p.parentId : null;
                      const VB = "rounded-lg border border-border/60 bg-muted/15 px-2.5 py-2 shadow-sm";
                      return (
                        <div
                          key={p.id}
                          className={cn(
                            "overflow-hidden rounded-lg bg-background text-xs transition-[box-shadow,background-color]",
                            isSelected ? "bg-muted/20 shadow-sm ring-1 ring-primary/20" : "hover:bg-muted/10",
                          )}
                        >
                          <div className="grid min-w-0 grid-cols-1 gap-2 px-2 py-2 sm:grid-cols-[1fr_140px_1fr_auto] sm:items-center sm:gap-2 sm:px-2.5 sm:py-2.5">
                            <button
                              type="button"
                              aria-expanded={expanded}
                              aria-label={`${t("playground_cms_page_toggle_details_aria")}: ${p.title}`}
                              className="flex min-w-0 w-full cursor-pointer items-start gap-2 py-0.5 text-left transition-colors hover:opacity-90 sm:gap-3"
                              onClick={() => activatePageRow(p.id)}
                            >
                              <ChevronDown
                                aria-hidden
                                className={cn(
                                  "mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform duration-200 sm:mt-1",
                                  expanded && "rotate-180",
                                )}
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-sm font-semibold leading-snug text-foreground">{p.title}</span>
                                  {p.isHome ? (
                                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                      {t("playground_cms_badge_home")}
                                    </span>
                                  ) : null}
                                </div>
                              </div>
                            </button>
                            <div className="min-w-0 sm:self-center">
                              <p className="truncate font-mono text-[11px] text-muted-foreground" title={p.slug}>
                                {p.slug || "—"}
                              </p>
                            </div>
                            <div className="min-w-0 sm:self-center">
                              <p className="truncate text-[11px] text-muted-foreground" title={parentPath ?? undefined}>
                                {parentPath ? parentPath : t("playground_cms_parent_root")}
                              </p>
                            </div>
                            <div className="flex min-w-0 flex-wrap items-center justify-start gap-1.5 sm:justify-end">
                              {selectedSite?.projectId ? (
                                <Button variant="secondary" size="sm" className="h-8 gap-1.5 text-[11px]" asChild>
                                  <Link
                                    href={`/playground/box/editor?siteId=${encodeURIComponent(selectedSiteId)}&pageId=${encodeURIComponent(p.id)}&projectId=${encodeURIComponent(selectedSite.projectId)}&pagePath=${encodeURIComponent(p.path)}`}
                                  >
                                    <ExternalLink className="size-3.5 shrink-0" aria-hidden />
                                    {t("playground_cms_edit")}
                                  </Link>
                                </Button>
                              ) : (
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  className="h-8 gap-1.5 text-[11px]"
                                  disabled
                                  title={t("playground_cms_domain_select_site")}
                                >
                                  <ExternalLink className="size-3.5 shrink-0" aria-hidden />
                                  {t("playground_cms_edit")}
                                </Button>
                              )}
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-8 text-[11px]"
                                disabled={!p.draftRevisionId || busy === `publish-page-${p.id}`}
                                onClick={() => void publishPage(p.id)}
                              >
                                {t("playground_cms_publish_page")}
                              </Button>
                            </div>
                          </div>

                          {expanded ? (
                            <div className="space-y-2 border-t border-border/70 px-2.5 pb-3 pt-2.5">
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
                      <p className="text-xs text-muted-foreground">{t("playground_cms_pages_empty")}</p>
                    ) : null}
                  </div>
                </div>
                ) : null}
                {cmsActiveSection === "seo" ? (
                <div className="rounded-lg border border-border bg-background p-4 shadow-sm">
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
                          <span className="font-medium text-foreground/80">{t("playground_cms_label_id")}:</span> {selectedPage.id}
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
                          <span className="min-w-0 text-left text-xs leading-snug text-foreground">
                            <span className="font-medium">{t("playground_cms_label_noindex")}</span>
                            <span className="mt-1 block text-[11px] text-muted-foreground">
                              {t("playground_cms_noindex_hint")}
                            </span>
                          </span>
                        </label>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">{t("playground_cms_select_page_seo")}</p>
                  )}
                </div>
                ) : null}
                {cmsActiveSection === "history" ? (
                <div className="flex min-h-0 flex-col rounded-lg border border-border bg-background p-3">
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
                        <section className="rounded-xl border border-border bg-muted/10 p-4 shadow-sm">
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

                        <section className="rounded-xl border border-border bg-muted/10 p-4 shadow-sm">
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
                <div className="rounded-lg border border-border bg-background p-3">
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
                <div className="flex min-h-0 flex-col rounded-lg border border-border bg-background p-3">
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
                  <div className="flex min-h-0 flex-col gap-3 rounded-lg border border-border bg-background p-3">
                    {!selectedSiteId ? (
                      <p className="text-sm text-muted-foreground">{t("playground_cms_domain_select_site")}</p>
                    ) : (
                      <>
                        <p className="text-xs leading-relaxed text-muted-foreground">{t("playground_cms_submissions_intro")}</p>
                            {submissionsLoading ? (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            {t("playground_cms_submissions_loading")}
                          </div>
                        ) : (
                          <div className="min-h-0 flex-1 space-y-2 overflow-auto">
                            {formSubmissions.map((s, idx) => (
                              <div
                                key={s.id}
                                style={{ animationDelay: `${idx * 80}ms` }}
                                className="rounded-md border border-border p-2 text-xs transition-colors hover:border-primary/60 hover:bg-primary/[0.03] motion-safe:animate-fade-in-up motion-reduce:animate-none"
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2 font-medium text-foreground">
                                  <span>{fmtDate(s.createdAt)}</span>
                                  {s.formName ? (
                                    <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                                      {s.formName}
                                    </span>
                                  ) : null}
                                </div>
                                <p className="mt-1 text-muted-foreground">
                                  <span className="font-medium text-foreground/80">{t("playground_cms_submissions_col_page")}:</span>{" "}
                                  {s.pageTitle ?? s.pagePath ?? "—"}
                                </p>
                                <pre className="mt-2 max-h-40 overflow-auto rounded bg-muted p-2 font-mono text-[11px] leading-snug">
                                  {JSON.stringify(s.fields, null, 2)}
                                </pre>
                              </div>
                            ))}
                            {formSubmissions.length === 0 ? (
                              <p className="text-xs text-muted-foreground">{t("playground_cms_submissions_empty")}</p>
                            ) : null}
                          </div>
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
    </PageTransition>
  );
}
