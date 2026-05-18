import { describe, expect, it } from "vitest";
import {
  marketingTableToChartPoints,
  parseMarketingChatMarkdown,
  parseNumericMarketingCell,
} from "./marketing-chat-markdown";

describe("parseMarketingChatMarkdown", () => {
  it("parses headings, list and table", () => {
    const md = `## Стратегия

- Пункт один
- Пункт два

| Канал | Бюджет |
| --- | --- |
| ВК | 500000 |
| Telegram | 300000 |
`;
    const blocks = parseMarketingChatMarkdown(md);
    expect(blocks.some((b) => b.type === "heading" && b.text === "Стратегия")).toBe(true);
    expect(blocks.some((b) => b.type === "ul" && b.items.length === 2)).toBe(true);
    expect(blocks.some((b) => b.type === "table" && b.headers[0] === "Канал")).toBe(true);
  });
});

describe("parseNumericMarketingCell", () => {
  it("parses localized numbers", () => {
    expect(parseNumericMarketingCell("21 849 600")).toBe(21849600);
    expect(parseNumericMarketingCell("10,8 млн ₽")).toBe(10.8);
  });
});

describe("marketingTableToChartPoints", () => {
  it("builds chart points from table", () => {
    const points = marketingTableToChartPoints(
      ["Канал", "Выручка"],
      [
        ["ВК", "1 000 000"],
        ["Telegram", "500 000"],
      ]
    );
    expect(points).toEqual([
      { name: "ВК", value: 1000000 },
      { name: "Telegram", value: 500000 },
    ]);
  });
});
