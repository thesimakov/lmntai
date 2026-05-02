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

  it("accepts camelCase technicalPrompt", () => {
    const parsed = parsePromptCoachJson(
      JSON.stringify({
        reply: "Готово.",
        phase: "confirm",
        technicalPrompt: "Сделай одностраничный лендинг с формой и FAQ из четырёх пунктов."
      })
    );
    expect(parsed?.phase).toBe("confirm");
    expect(parsed?.technical_prompt).toContain("лендинг");
  });

  it("unwraps nested data envelope", () => {
    const parsed = parsePromptCoachJson(
      JSON.stringify({
        data: {
          reply: "Уточни аудиторию.",
          phase: "gathering",
          technical_prompt: null
        }
      })
    );
    expect(parsed?.phase).toBe("gathering");
    expect(parsed?.technical_prompt).toBeNull();
  });

  it("parses JSON with unicode double quotes in keys", () => {
    const raw =
      "{\u201Creply\u201D:\u201CВопрос?\u201D,\u201Cphase\u201D:\u201Cgathering\u201D,\u201Ctechnical_prompt\u201D:null}";
    const parsed = parsePromptCoachJson(raw);
    expect(parsed?.reply).toBe("Вопрос?");
    expect(parsed?.phase).toBe("gathering");
  });

  it("derives technical_prompt from confirm reply when field omitted", () => {
    const tz =
      "Тип: веб-интерфейс. Структура: hero, тарифы, FAQ из 4 блоков, форма заявки. Стек: React+TS, Tailwind.";
    const parsed = parsePromptCoachJson(
      JSON.stringify({
        reply: `${tz}\n\nВсё верно? Запускать?`,
        phase: "confirm",
        technical_prompt: null
      })
    );
    expect(parsed?.phase).toBe("confirm");
    expect(parsed?.technical_prompt?.length).toBeGreaterThanOrEqual(60);
    expect(parsed?.technical_prompt).toContain("hero");
  });
});
