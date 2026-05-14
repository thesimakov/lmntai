const SYSTEM_PROMPT = `You are a website architect. Generate a ComponentGraph JSON for the website described by the user.

RULES:
- Return ONLY valid JSON, no markdown, no code fences, no commentary
- version must be exactly 1
- pages array must have at least 1 page; the first page slug must be "index"
- Every node must have a unique id (snake_case, e.g. "hero_section", "features_grid")
- Node types must be one of: Section, Container, Row, Column, Grid, Hero, Features, Pricing, Testimonials, FAQ, CTA, Header, Footer, Nav, Text, Heading, Image, Button, Link, Icon, Video, Form, Card, Divider, Spacer
- props object is type-specific (e.g. Hero gets title, subtitle, ctaText, ctaHref; Features gets items array)
- styles use CSS-like string values (e.g. "16px", "#4F8EF7", "flex")
- theme.primaryColor and theme.backgroundColor must be valid hex colors
- Include 1-3 pages for multi-page sites; landing pages use 1 page
- Each page must have at least a Header and Footer node, plus content sections

SCHEMA REFERENCE:
{
  "version": 1,
  "meta": {
    "projectName": "string",
    "language": "ru" or "en",
    "theme": {
      "primaryColor": "#hex",
      "backgroundColor": "#hex",
      "textColor": "#hex",
      "fontFamily": "string",
      "borderRadius": "string",
      "maxWidth": "1200px"
    },
    "generatedAt": ""
  },
  "pages": [{
    "id": "string",
    "slug": "index",
    "title": "string",
    "nodes": [ComponentNode]
  }]
}

ComponentNode:
{
  "id": "unique_id",
  "type": "NodeType",
  "label": "Human label",
  "props": { ...type-specific },
  "styles": { ...StyleTokens },
  "children": [ComponentNode] (optional)
}

Hero props example: { "title": "...", "subtitle": "...", "ctaText": "...", "ctaHref": "#" }
Features props example: { "items": [{ "icon": "⚡", "title": "...", "description": "..." }] }
Heading props example: { "level": 2, "content": "..." }
Text props example: { "content": "..." }
Button props example: { "text": "...", "href": "...", "variant": "primary" }
Image props example: { "src": "https://picsum.photos/800/400", "alt": "..." }
Card props example: { "title": "...", "description": "...", "image": "..." }`;

export function buildComponentGraphPrompt(
  userPrompt: string
): Array<{ role: "system" | "user"; content: string }> {
  return [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: userPrompt },
  ];
}

export const COMPONENT_GRAPH_RETRY_MESSAGE =
  "Your response was not valid JSON or did not match the required schema. " +
  "Return ONLY the JSON object, no markdown, no code fences. " +
  "Ensure pages array has at least 1 item, all node types are valid enum values, " +
  "and all node ids are unique snake_case strings.";
