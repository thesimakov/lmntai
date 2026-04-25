export type PlanStep = {
  id: string;
  description: string;
};

export type BuilderPlan = {
  message: string;
  language: string;
  goal: string;
  title: string;
  steps: PlanStep[];
};

export const LEMNITY_SYSTEM_PROMPT = [
  "You are Lemnity Builder, an AI interface-generation agent embedded in the Lemnity platform.",
  "Your job is to turn the user's product idea into a polished, working visual preview.",
  "You do not have a shell, browser automation, or external sandbox in this MVP. Do not claim to run commands or inspect websites.",
  "You may still behave like an agent: plan the work, explain visible progress, and produce a complete artifact.",
  "Visible copy in the generated UI must use the user's language.",
  "Prefer production-quality UI: responsive layout, semantic HTML, accessible labels, strong hierarchy, realistic content, and no lorem ipsum unless explicitly requested.",
  "The final artifact must be one self-contained HTML5 document with embedded CSS and optional tiny inline JavaScript only when useful."
].join("\n");

export function createPlanPrompt(input: { message: string; attachments?: string }): string {
  return [
    LEMNITY_SYSTEM_PROMPT,
    "",
    "Create a compact execution plan for generating the visual preview.",
    "Return only valid JSON matching this TypeScript interface:",
    "```typescript",
    "interface CreatePlanResponse {",
    "  message: string;",
    "  language: string;",
    "  goal: string;",
    "  title: string;",
    "  steps: Array<{ id: string; description: string }>;",
    "}",
    "```",
    "",
    "Rules:",
    "- Use 3 to 5 atomic steps.",
    "- Steps should describe UI generation work, not advice to the user.",
    "- If the user asks in Russian, use Russian for message/title/steps.",
    "- The title should be short enough for a session name.",
    "",
    "User message:",
    input.message,
    "",
    "Attachments:",
    input.attachments?.trim() || "None"
  ].join("\n");
}

export function executeUiPrompt(input: {
  message: string;
  plan: BuilderPlan;
  modelContext?: string;
}): string {
  const steps = input.plan.steps.map((s) => `${s.id}. ${s.description}`).join("\n");
  return [
    LEMNITY_SYSTEM_PROMPT,
    "",
    "Generate the final visual preview artifact for Lemnity.",
    "",
    "Strict output rules:",
    "- Return exactly one complete HTML document.",
    "- Start with <!doctype html> or <html>.",
    "- Include all CSS inside <style>.",
    "- Do not wrap the answer in Markdown fences.",
    "- Do not include explanatory prose outside the HTML.",
    "- The preview must be visually complete on desktop and mobile.",
    "",
    "Design guidance:",
    "- Use modern SaaS/product-grade layout quality.",
    "- Include realistic Russian copy when the user writes in Russian.",
    "- Prefer cards, grids, clear typography, subtle gradients, KPI blocks, tables, charts drawn with HTML/CSS/SVG when requested.",
    "- Keep JavaScript optional and safe; do not import external frameworks.",
    "",
    input.modelContext ? `Additional Lemnity context:\n${input.modelContext}\n` : "",
    `Plan title: ${input.plan.title}`,
    `Goal: ${input.plan.goal}`,
    "Plan steps:",
    steps,
    "",
    "Original user request:",
    input.message
  ].join("\n");
}

export function summarizePrompt(input: { message: string; plan: BuilderPlan }): string {
  return [
    LEMNITY_SYSTEM_PROMPT,
    "",
    "Write a short assistant message after the preview has been generated.",
    "Do not include the HTML code. Mention that the preview is ready and summarize what was built in 1-2 concise sentences.",
    "Use the user's language.",
    "",
    `Plan title: ${input.plan.title}`,
    `Goal: ${input.plan.goal}`,
    "",
    "User request:",
    input.message
  ].join("\n");
}

export function fallbackPlan(message: string): BuilderPlan {
  const isRu = /[\u0400-\u04FF]/.test(message);
  return {
    message: isRu ? "Собираю структуру интерфейса и подготовлю визуальное превью." : "I will structure the interface and prepare a visual preview.",
    language: isRu ? "ru" : "en",
    goal: isRu ? "Создать визуальное превью по запросу пользователя" : "Create a visual preview from the user's request",
    title: message.trim().slice(0, 80) || (isRu ? "Новая сборка" : "New build"),
    steps: [
      { id: "plan", description: isRu ? "Определить цель и структуру интерфейса" : "Define the interface goal and structure" },
      { id: "design", description: isRu ? "Подобрать визуальную систему и секции" : "Choose the visual system and sections" },
      { id: "html", description: isRu ? "Сгенерировать HTML-превью" : "Generate the HTML preview" },
      { id: "preview", description: isRu ? "Подготовить превью для просмотра" : "Prepare the preview for display" }
    ]
  };
}
