import { describe, expect, it } from "vitest";

import { parsePromptCoachJson } from "@/lib/prompt-coach";

describe("parsePromptCoachJson", () => {
  it("parses plain json object", () => {
    const parsed = parsePromptCoachJson(
      JSON.stringify({
        reply: "Собрал ТЗ",
        phase: "confirm",
        technical_prompt: "Сделай лендинг"
      })
    );
    expect(parsed?.phase).toBe("confirm");
    expect(parsed?.technical_prompt).toBe("Сделай лендинг");
  });

  it("extracts json from mixed model text", () => {
    const parsed = parsePromptCoachJson(
      'Конечно, вот результат:\n{"reply":"Нужно 2 уточнения","phase":"gathering","technical_prompt":null}\nСпасибо!'
    );
    expect(parsed).toEqual({
      reply: "Нужно 2 уточнения",
      phase: "gathering",
      technical_prompt: null
    });
  });
});
