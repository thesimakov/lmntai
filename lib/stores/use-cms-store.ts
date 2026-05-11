"use client";

import { create } from "zustand";

/**
 * Централизованное состояние CMS-редактора.
 * Заменяет 59 useState из playground-cms-page-client.tsx.
 * Миграция инкрементальная — начать с навигационного и domain слайсов.
 */

type CmsSection =
  | "pages"
  | "content-types"
  | "form-submissions"
  | "media"
  | "settings"
  | "seo"
  | "domain"
  | "robots";

// --- Navigation slice ---
interface NavigationSlice {
  selectedSiteId: string | null;
  selectedPageId: string | null;
  selectedTypeId: string | null;
  activeSection: CmsSection;
  setSelectedSiteId: (id: string | null) => void;
  setSelectedPageId: (id: string | null) => void;
  setSelectedTypeId: (id: string | null) => void;
  setActiveSection: (section: CmsSection) => void;
}

// --- Domain slice ---
interface DomainSlice {
  domainMode: "subdomain" | "custom";
  subdomain: string;
  customDomain: string;
  verificationStatus: "idle" | "pending" | "verified" | "failed";
  setDomainMode: (mode: "subdomain" | "custom") => void;
  setSubdomain: (v: string) => void;
  setCustomDomain: (v: string) => void;
  setVerificationStatus: (s: "idle" | "pending" | "verified" | "failed") => void;
}

// --- SEO slice ---
interface SeoSlice {
  seoTitle: string;
  seoDescription: string;
  seoNoIndex: boolean;
  seoNoFollow: boolean;
  setSeoTitle: (v: string) => void;
  setSeoDescription: (v: string) => void;
  setSeoNoIndex: (v: boolean) => void;
  setSeoNoFollow: (v: boolean) => void;
}

type CmsStore = NavigationSlice & DomainSlice & SeoSlice;

export const useCmsStore = create<CmsStore>((set) => ({
  // Navigation
  selectedSiteId: null,
  selectedPageId: null,
  selectedTypeId: null,
  activeSection: "pages",
  setSelectedSiteId: (selectedSiteId) => set({ selectedSiteId }),
  setSelectedPageId: (selectedPageId) => set({ selectedPageId }),
  setSelectedTypeId: (selectedTypeId) => set({ selectedTypeId }),
  setActiveSection: (activeSection) => set({ activeSection }),

  // Domain
  domainMode: "subdomain",
  subdomain: "",
  customDomain: "",
  verificationStatus: "idle",
  setDomainMode: (domainMode) => set({ domainMode }),
  setSubdomain: (subdomain) => set({ subdomain }),
  setCustomDomain: (customDomain) => set({ customDomain }),
  setVerificationStatus: (verificationStatus) => set({ verificationStatus }),

  // SEO
  seoTitle: "",
  seoDescription: "",
  seoNoIndex: false,
  seoNoFollow: false,
  setSeoTitle: (seoTitle) => set({ seoTitle }),
  setSeoDescription: (seoDescription) => set({ seoDescription }),
  setSeoNoIndex: (seoNoIndex) => set({ seoNoIndex }),
  setSeoNoFollow: (seoNoFollow) => set({ seoNoFollow }),
}));
