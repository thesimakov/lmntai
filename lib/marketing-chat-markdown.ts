export type MarketingChatMarkdownBlock =
  | { type: "heading"; level: 1 | 2 | 3; text: string }
  | { type: "paragraph"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "hr" };

export interface MarketingChatChartPoint {
  name: string;
  value: number;
}

function isTableRow(line: string): boolean {
  return line.trim().startsWith("|") && line.trim().endsWith("|");
}

function parseTableRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => c.trim());
}

function isTableSeparator(line: string): boolean {
  const cells = parseTableRow(line);
  return cells.length > 0 && cells.every((c) => /^:?-{2,}:?$/.test(c));
}

function parseHeading(line: string): { level: 1 | 2 | 3; text: string } | null {
  const m = /^(#{1,3})\s+(.+)$/.exec(line.trim());
  if (!m) return null;
  const level = m[1].length as 1 | 2 | 3;
  return { level, text: m[2].trim() };
}

function parseListItem(line: string): { kind: "ul" | "ol"; text: string } | null {
  const ul = /^[-*•]\s+(.+)$/.exec(line.trim());
  if (ul) return { kind: "ul", text: ul[1].trim() };
  const ol = /^\d+[.)]\s+(.+)$/.exec(line.trim());
  if (ol) return { kind: "ol", text: ol[1].trim() };
  return null;
}

/** Lightweight markdown for marketing chat answers (headings, lists, tables). */
export function parseMarketingChatMarkdown(source: string): MarketingChatMarkdownBlock[] {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: MarketingChatMarkdownBlock[] = [];
  let i = 0;

  const flushParagraph = (buf: string[]) => {
    const text = buf.join(" ").trim();
    if (text) blocks.push({ type: "paragraph", text });
    buf.length = 0;
  };

  let paragraphBuf: string[] = [];

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      flushParagraph(paragraphBuf);
      i += 1;
      continue;
    }

    if (/^---+$/.test(trimmed)) {
      flushParagraph(paragraphBuf);
      blocks.push({ type: "hr" });
      i += 1;
      continue;
    }

    const heading = parseHeading(line);
    if (heading) {
      flushParagraph(paragraphBuf);
      blocks.push({ type: "heading", ...heading });
      i += 1;
      continue;
    }

    if (isTableRow(line)) {
      flushParagraph(paragraphBuf);
      const headers = parseTableRow(line);
      i += 1;
      if (i < lines.length && isTableSeparator(lines[i])) i += 1;
      const rows: string[][] = [];
      while (i < lines.length && isTableRow(lines[i]) && !isTableSeparator(lines[i])) {
        rows.push(parseTableRow(lines[i]));
        i += 1;
      }
      if (headers.length > 0 && rows.length > 0) {
        blocks.push({ type: "table", headers, rows });
      }
      continue;
    }

    const listItem = parseListItem(line);
    if (listItem) {
      flushParagraph(paragraphBuf);
      const kind = listItem.kind;
      const items = [listItem.text];
      i += 1;
      while (i < lines.length) {
        const next = parseListItem(lines[i]);
        if (!next || next.kind !== kind) break;
        items.push(next.text);
        i += 1;
      }
      blocks.push(kind === "ul" ? { type: "ul", items } : { type: "ol", items });
      continue;
    }

    paragraphBuf.push(trimmed);
    i += 1;
  }

  flushParagraph(paragraphBuf);
  return blocks;
}

export function parseNumericMarketingCell(cell: string): number | null {
  const normalized = cell
    .replace(/\u00a0/g, " ")
    .replace(/\s/g, "")
    .replace(/,/g, ".");
  const match = normalized.match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const value = Number.parseFloat(match[0]);
  return Number.isFinite(value) ? value : null;
}

/** Build bar-chart series from a markdown table (label col + first numeric col). */
export function marketingTableToChartPoints(
  headers: string[],
  rows: string[][]
): MarketingChatChartPoint[] | null {
  if (headers.length < 2 || rows.length === 0) return null;

  let valueCol = 1;
  for (let c = 1; c < headers.length; c += 1) {
    const sample = rows.find((r) => parseNumericMarketingCell(r[c] ?? "") != null);
    if (sample) {
      valueCol = c;
      break;
    }
  }

  const points: MarketingChatChartPoint[] = [];
  for (const row of rows) {
    const name = (row[0] ?? "").trim();
    const value = parseNumericMarketingCell(row[valueCol] ?? "");
    if (!name || value == null) continue;
    points.push({ name, value });
  }

  return points.length >= 2 ? points : null;
}

export function stripInlineMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1");
}
