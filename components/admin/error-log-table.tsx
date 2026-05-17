"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type ErrorLog = {
  id: string;
  createdAt: Date | string;
  source: string;
  errorType: string;
  module: string | null;
  message: string;
  stack: string | null;
  url: string | null;
  method: string | null;
  statusCode: number | null;
  userAgent: string | null;
  viewport: string | null;
  ip: string | null;
  userId: string | null;
  user: { id: string; email: string; name: string | null } | null;
  meta: unknown;
  resolved: boolean;
  resolvedAt: Date | string | null;
};

export type ErrorLogTableProps = {
  items: ErrorLog[];
  total: number;
  page: number;
  limit: number;
  onPageChange: (page: number) => void;
  onResolve: (id: string, resolved: boolean) => void;
};

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max) + "…" : str;
}

function formatDate(value: Date | string): string {
  return new Date(value).toLocaleString("ru-RU");
}

function MetaCell({ meta }: { meta: unknown }) {
  if (meta == null) return null;
  try {
    return (
      <pre className="text-xs bg-muted rounded p-2 overflow-auto max-h-40 whitespace-pre-wrap break-all">
        {JSON.stringify(meta, null, 2)}
      </pre>
    );
  } catch {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
}

function ExpandedRow({ item }: { item: ErrorLog }) {
  return (
    <TableRow>
      <TableCell colSpan={7} className="bg-muted/30 p-4 text-sm">
        <div className="grid gap-3">
          <div>
            <div className="font-medium mb-1 text-xs text-muted-foreground uppercase tracking-wide">
              Полное сообщение
            </div>
            <p className="break-all">{item.message}</p>
          </div>

          {item.stack && (
            <div>
              <div className="font-medium mb-1 text-xs text-muted-foreground uppercase tracking-wide">
                Stack trace
              </div>
              <pre className="text-xs font-mono bg-muted rounded p-2 overflow-auto max-h-48 whitespace-pre-wrap break-all">
                {item.stack}
              </pre>
            </div>
          )}

          {item.meta != null && (
            <div>
              <div className="font-medium mb-1 text-xs text-muted-foreground uppercase tracking-wide">
                Meta
              </div>
              <MetaCell meta={item.meta} />
            </div>
          )}

          <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
            {item.url && (
              <span>
                <span className="font-medium">URL:</span> {item.method ? `[${item.method}] ` : ""}{item.url}
              </span>
            )}
            {item.statusCode != null && (
              <span>
                <span className="font-medium">Status:</span> {item.statusCode}
              </span>
            )}
            {item.ip && (
              <span>
                <span className="font-medium">IP:</span> {item.ip}
              </span>
            )}
            {item.viewport && (
              <span>
                <span className="font-medium">Viewport:</span> {item.viewport}
              </span>
            )}
            {item.userAgent && (
              <span className="break-all">
                <span className="font-medium">User-Agent:</span> {item.userAgent}
              </span>
            )}
          </div>
        </div>
      </TableCell>
    </TableRow>
  );
}

export function ErrorLogTable({
  items,
  total,
  page,
  limit,
  onPageChange,
  onResolve,
}: ErrorLogTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const totalPages = Math.max(1, Math.ceil(total / limit));

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  return (
    <div className="space-y-3">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-36">Время</TableHead>
            <TableHead className="w-24">Источник</TableHead>
            <TableHead className="w-36">Тип</TableHead>
            <TableHead className="w-28">Модуль</TableHead>
            <TableHead>Сообщение</TableHead>
            <TableHead className="w-40">Пользователь</TableHead>
            <TableHead className="w-32">Статус</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                Ошибок не найдено
              </TableCell>
            </TableRow>
          )}
          {items.map((item) => (
            <>
              <TableRow
                key={item.id}
                className={`cursor-pointer ${item.resolved ? "opacity-50" : ""}`}
                onClick={() => toggleExpand(item.id)}
              >
                <TableCell className="text-xs whitespace-nowrap">
                  {formatDate(item.createdAt)}
                </TableCell>
                <TableCell>
                  <span className="text-xs font-mono">{item.source}</span>
                </TableCell>
                <TableCell>
                  <span className="text-xs font-mono">{item.errorType}</span>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {item.module ?? "—"}
                </TableCell>
                <TableCell>
                  <span
                    className={`text-sm ${item.resolved ? "line-through text-muted-foreground" : ""}`}
                  >
                    {truncate(item.message, 80)}
                  </span>
                </TableCell>
                <TableCell className="text-xs">
                  {item.user ? (
                    <span title={item.user.id}>{item.user.email}</span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Button
                    size="sm"
                    variant={item.resolved ? "outline" : "default"}
                    className="text-xs h-7 px-2"
                    onClick={() => onResolve(item.id, !item.resolved)}
                  >
                    {item.resolved ? "Снять отметку" : "Разобрано ✓"}
                  </Button>
                </TableCell>
              </TableRow>
              {expandedId === item.id && <ExpandedRow key={`${item.id}-expanded`} item={item} />}
            </>
          ))}
        </TableBody>
      </Table>

      <div className="flex items-center justify-between text-sm text-muted-foreground px-1">
        <span>
          Страница {page} из {totalPages} (всего {total})
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            Назад
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            Вперёд
          </Button>
        </div>
      </div>
    </div>
  );
}
