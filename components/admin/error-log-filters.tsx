"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type ErrorLogFiltersProps = {
  source: string;
  errorType: string;
  module: string;
  resolved: string;
  from: string;
  to: string;
  onChange: (key: string, value: string) => void;
  onReset: () => void;
};

export function ErrorLogFilters({
  source,
  errorType,
  module,
  resolved,
  from,
  to,
  onChange,
  onReset,
}: ErrorLogFiltersProps) {
  return (
    <div className="flex flex-wrap gap-2 items-center">
      <Select value={source} onValueChange={(v) => onChange("source", v)}>
        <SelectTrigger className="w-44">
          <SelectValue placeholder="Все источники" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Все источники</SelectItem>
          <SelectItem value="client">client</SelectItem>
          <SelectItem value="server">server</SelectItem>
          <SelectItem value="ai">ai</SelectItem>
        </SelectContent>
      </Select>

      <Select value={errorType} onValueChange={(v) => onChange("errorType", v)}>
        <SelectTrigger className="w-52">
          <SelectValue placeholder="Все типы" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Все типы</SelectItem>
          <SelectItem value="js_exception">js_exception</SelectItem>
          <SelectItem value="unhandled_rejection">unhandled_rejection</SelectItem>
          <SelectItem value="api_5xx">api_5xx</SelectItem>
          <SelectItem value="form_action">form_action</SelectItem>
          <SelectItem value="ai_stream">ai_stream</SelectItem>
        </SelectContent>
      </Select>

      <Input
        className="w-40"
        placeholder="Модуль"
        value={module}
        onChange={(e) => onChange("module", e.target.value)}
      />

      <Select value={resolved} onValueChange={(v) => onChange("resolved", v)}>
        <SelectTrigger className="w-32">
          <SelectValue placeholder="Все" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Все</SelectItem>
          <SelectItem value="false">Нет</SelectItem>
          <SelectItem value="true">Да</SelectItem>
        </SelectContent>
      </Select>

      <Input
        className="w-36"
        type="date"
        value={from}
        onChange={(e) => onChange("from", e.target.value)}
      />

      <Input
        className="w-36"
        type="date"
        value={to}
        onChange={(e) => onChange("to", e.target.value)}
      />

      <Button variant="outline" size="sm" onClick={onReset}>
        Сбросить
      </Button>
    </div>
  );
}
