const SYSTEM_PROMPT = `You are a presentation architect. Generate a SlideGraph JSON for the presentation described by the user.

RULES:
- Return ONLY valid JSON, no markdown, no code fences, no commentary
- version must be exactly 1
- slides array must have at least 3 slides; first slide must use layout "title"
- Every element must have a unique id (snake_case, e.g. "title_1", "body_2")
- Every slide must have a unique id (snake_case, e.g. "slide_1", "slide_2")
- Element types: heading | subheading | body | bullet-list | image | quote | caption | label
- Layouts: title | content | two-column | image-left | image-right | blank | quote | section-divider
- bullet-list elements use "items" array, not "content"
- image elements use "src" (real URL from picsum.photos or unsplash) and "alt"
- theme.primaryColor and theme.backgroundColor must be valid hex colors

LAYOUT GUIDANCE:
- "title": main title + subtitle, used for first slide and section openers
- "content": heading + body text or bullets (most common)
- "two-column": side-by-side content blocks
- "image-left" / "image-right": image + text side by side
- "quote": large pull-quote with attribution
- "section-divider": visual break between sections (minimal elements)
- "blank": fully custom, no constraints

SCHEMA:
{
  "version": 1,
  "meta": {
    "title": "Deck title",
    "language": "ru" | "en",
    "theme": {
      "primaryColor": "#hex",
      "backgroundColor": "#hex",
      "textColor": "#hex",
      "fontFamily": "Inter, sans-serif"
    },
    "generatedAt": ""
  },
  "slides": [{
    "id": "slide_1",
    "layout": "title",
    "background": { "color": "#optional-hex" },
    "elements": [
      { "id": "title_1", "type": "heading", "content": "..." },
      { "id": "subtitle_1", "type": "subheading", "content": "..." }
    ]
  }]
}

Generate 6–12 slides for a complete deck. Include an agenda/overview slide if appropriate.`;

export function buildSlideGraphPrompt(
  userPrompt: string
): Array<{ role: "system" | "user"; content: string }> {
  return [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: userPrompt },
  ];
}

export const SLIDE_GRAPH_RETRY_MESSAGE =
  "Your response was not valid JSON or did not match the required schema. " +
  "Return ONLY the JSON object, no markdown, no code fences. " +
  "Ensure slides array has at least 1 item, all layouts and element types are valid, " +
  "and all ids are unique snake_case strings.";

export const SLIDE_CHAT_SYSTEM_PROMPT = `You are a presentation editor assistant. The user wants to modify their presentation.

When the user requests changes, respond with a JSON object:
{
  "message": "Brief description of changes made (1-2 sentences)",
  "patches": [
    {
      "slideId": "slide_1",
      "elemId": "title_1",
      "content": "New text content",
      "items": ["Item 1", "Item 2"]
    }
  ]
}

Rules:
- patches array can be empty [] if just answering a question
- Each patch targets one element by slideId + elemId
- Only include fields that change (content OR items, not both)
- Return ONLY valid JSON, no markdown`;

export function buildSlideChatPrompt(
  graph: import("./types").SlideGraph,
  history: Array<{ role: "user" | "assistant"; content: string }>,
  message: string
): Array<{ role: "system" | "user" | "assistant"; content: string }> {
  const graphSummary = JSON.stringify(graph, null, 2).slice(0, 6000);
  const system = `${SLIDE_CHAT_SYSTEM_PROMPT}

Current SlideGraph:
\`\`\`json
${graphSummary}
\`\`\``;

  return [
    { role: "system", content: system },
    ...history,
    { role: "user", content: message },
  ];
}

export const SLIDE_CHAT_RETRY_MESSAGE =
  "Your response was not valid JSON. Return ONLY the JSON object with 'message' and 'patches' fields. No markdown, no code fences.";
