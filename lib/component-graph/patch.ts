import { z } from "zod";
import type { ComponentGraph, ComponentNode, StyleTokens } from "./types";

// ── Patch schema ──────────────────────────────────────────────────────────────

export const graphNodePatchSchema = z.object({
  nodeId: z.string().min(1),
  props: z.record(z.unknown()).optional(),
  styles: z.record(z.unknown()).optional(),
  label: z.string().optional(),
});

export const graphPatchResponseSchema = z.object({
  message: z.string(),
  patches: z.array(graphNodePatchSchema).min(1),
});

export type GraphNodePatch = z.infer<typeof graphNodePatchSchema>;
export type GraphPatchResponse = z.infer<typeof graphPatchResponseSchema>;

// ── Patch application ─────────────────────────────────────────────────────────

function patchNode(node: ComponentNode, patch: GraphNodePatch): ComponentNode {
  if (node.id === patch.nodeId) {
    return {
      ...node,
      ...(patch.label !== undefined ? { label: patch.label } : {}),
      props: patch.props ? { ...node.props, ...patch.props } : node.props,
      styles: patch.styles
        ? { ...node.styles, ...(patch.styles as Partial<StyleTokens>) }
        : node.styles,
      children: node.children?.map((c) => patchNode(c, patch)),
    };
  }
  return node.children?.length
    ? { ...node, children: node.children.map((c) => patchNode(c, patch)) }
    : node;
}

export function applyPatches(graph: ComponentGraph, patches: GraphNodePatch[]): ComponentGraph {
  let updated = graph;
  for (const patch of patches) {
    updated = {
      ...updated,
      pages: updated.pages.map((page) => ({
        ...page,
        nodes: page.nodes.map((node) => patchNode(node, patch)),
      })),
    };
  }
  return updated;
}

// ── Prompt ────────────────────────────────────────────────────────────────────

export function buildGraphChatPrompt(
  graph: ComponentGraph,
  history: Array<{ role: "user" | "assistant"; content: string }>,
  userMessage: string
): Array<{ role: "system" | "user" | "assistant"; content: string }> {
  const graphJson = JSON.stringify(graph, null, 0);

  const system = `You are a website editor AI. The user has a website described by the following ComponentGraph JSON.
Your job is to apply the user's requested changes.

CURRENT GRAPH:
${graphJson}

INSTRUCTIONS:
- Return ONLY valid JSON, no markdown, no code fences
- Return an object with exactly two keys: "message" and "patches"
- "message": a short confirmation in the user's language describing what you changed
- "patches": an array of patch objects. Each patch has:
  - "nodeId": the id of the node to update (must match an existing node id)
  - "props": (optional) object with props to merge into the node's existing props
  - "styles": (optional) object with styles to merge into the node's existing styles
  - "label": (optional) new label for the node
- Only include nodes that actually need to change
- If the user asks a question (not a change), return patches: [] and answer in message
- Preserve all existing data — only update fields explicitly requested

RESPONSE FORMAT:
{"message":"...","patches":[{"nodeId":"...","props":{...},"styles":{...}}]}`;

  return [
    { role: "system", content: system },
    ...history,
    { role: "user", content: userMessage },
  ];
}

export const GRAPH_CHAT_RETRY_MESSAGE =
  "Your response was not valid JSON. Return ONLY the JSON object: " +
  '{"message":"...","patches":[{"nodeId":"...","props":{...}}]}. No markdown, no fences.';
