"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ErrorLogFilters } from "@/components/admin/error-log-filters";
import { ErrorLogTable, type ErrorLog } from "@/components/admin/error-log-table";

const LIMIT = 50;

const DEFAULT_FILTERS = {
  source: "",
  errorType: "",
  module: "",
  resolved: "false",
  from: "",
  to: "",
};

type Filters = typeof DEFAULT_FILTERS;

type ErrorLogResponse = {
  items: ErrorLog[];
  total: number;
};

function buildQuery(filters: Filters, page: number): string {
  const params = new URLSearchParams();
  if (filters.source && filters.source !== "all") params.set("source", filters.source);
  if (filters.errorType && filters.errorType !== "all") params.set("errorType", filters.errorType);
  if (filters.module) params.set("module", filters.module);
  if (filters.resolved && filters.resolved !== "all") params.set("resolved", filters.resolved);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  params.set("page", String(page));
  params.set("limit", String(LIMIT));
  return params.toString();
}

export default function AdminErrorsPage() {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ErrorLogResponse>({ items: [], total: 0 });
  const [loading, setLoading] = useState(false);
  const [showResolved, setShowResolved] = useState(false);

  const fetchErrors = useCallback(
    async (currentFilters: Filters, currentPage: number) => {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/errors?${buildQuery(currentFilters, currentPage)}`);
        if (res.ok) {
          const json = await res.json() as ErrorLogResponse;
          setData(json);
        }
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchErrors(filters, page);
  }, [filters, page, fetchErrors]);

  function handleFilterChange(key: keyof Filters, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  }

  function toggleResolved() {
    const next = !showResolved;
    setShowResolved(next);
    handleFilterChange("resolved", next ? "all" : "false");
  }

  function handleReset() {
    setFilters(DEFAULT_FILTERS);
    setShowResolved(false);
    setPage(1);
  }

  async function handleResolve(id: string, resolved: boolean) {
    try {
      const res = await fetch(`/api/admin/errors/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolved }),
      });
      if (!res.ok) {
        console.error("Failed to update error:", res.status);
        return;
      }
      fetchErrors(filters, page);
    } catch (e) {
      console.error("Failed to update error:", e);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-semibold text-foreground">Ошибки платформы</h1>
          <Button variant={showResolved ? "default" : "outline"} size="sm" onClick={toggleResolved}>
            Показать разобранные
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Журнал ошибок клиента, сервера и AI-модулей.
        </p>
      </div>

      <ErrorLogFilters
        source={filters.source}
        errorType={filters.errorType}
        module={filters.module}
        resolved={filters.resolved}
        from={filters.from}
        to={filters.to}
        onChange={handleFilterChange as (key: string, value: string) => void}
        onReset={handleReset}
      />

      {loading ? (
        <p className="text-sm text-muted-foreground">Загрузка...</p>
      ) : (
        <ErrorLogTable
          items={data.items}
          total={data.total}
          page={page}
          limit={LIMIT}
          onPageChange={setPage}
          onResolve={handleResolve}
        />
      )}
    </div>
  );
}
