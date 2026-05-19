import { z } from "zod";
import type { ComponentGraph, ComponentNode, ComponentPage, StyleTokens } from "./types";
import { coerceNode } from "./normalize";
import { componentNodeSchema } from "./schema";

// ── Patch schema ──────────────────────────────────────────────────────────────

export const graphNodePatchSchema = z.object({
  nodeId: z.string().min(1),
  action: z.enum(["update", "add", "remove"]).default("update"),
  // update fields:
  props: z.record(z.unknown()).optional(),
  styles: z.record(z.unknown()).optional(),
  label: z.string().optional(),
  // add fields:
  node: z.record(z.unknown()).optional(),
  pageSlug: z.string().optional(),
  insertAfter: z.string().optional(),
});

export const graphPatchResponseSchema = z.object({
  message: z.string(),
  patches: z.array(graphNodePatchSchema).min(1),
});

export type GraphNodePatch = z.input<typeof graphNodePatchSchema>;
export type GraphNodePatchParsed = z.infer<typeof graphNodePatchSchema>;
export type GraphPatchResponse = z.infer<typeof graphPatchResponseSchema>;

// ── Patch application ─────────────────────────────────────────────────────────

function patchNode(node: ComponentNode, patch: GraphNodePatch | GraphNodePatchParsed): ComponentNode {
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

function addNodeToPage(
  page: ComponentPage,
  rawNode: Record<string, unknown>,
  insertAfter?: string
): ComponentPage {
  const coerced = coerceNode(rawNode);
  if (!coerced) return page;
  const validated = componentNodeSchema.safeParse(coerced);
  if (!validated.success) return page;
  const nodes = [...page.nodes];
  const afterIdx = insertAfter ? nodes.findIndex(n => n.id === insertAfter) : -1;
  nodes.splice(afterIdx >= 0 ? afterIdx + 1 : nodes.length, 0, validated.data);
  return { ...page, nodes };
}

function removeNodeFromTree(nodes: ComponentNode[], nodeId: string): ComponentNode[] {
  return nodes
    .filter(n => n.id !== nodeId)
    .map(n => n.children?.length
      ? { ...n, children: removeNodeFromTree(n.children, nodeId) }
      : n);
}

export function applyPatches(graph: ComponentGraph, patches: GraphNodePatch[]): ComponentGraph {
  let updated = graph;
  for (const patch of patches) {
    const action = patch.action ?? "update";
    if (action === "add" && patch.node) {
      updated = {
        ...updated,
        pages: updated.pages.map(page => {
          if (patch.pageSlug && page.slug !== patch.pageSlug) return page;
          return addNodeToPage(page, patch.node as Record<string, unknown>, patch.insertAfter);
        }),
      };
    } else if (action === "remove") {
      updated = {
        ...updated,
        pages: updated.pages.map(page => ({
          ...page,
          nodes: removeNodeFromTree(page.nodes, patch.nodeId),
        })),
      };
    } else {
      updated = {
        ...updated,
        pages: updated.pages.map((page) => ({
          ...page,
          nodes: page.nodes.map((node) => patchNode(node, patch)),
        })),
      };
    }
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
  - "action": optional — "update" (default), "add", or "remove"
  - For action "add": include "node" object (ComponentNode shape) and optionally "pageSlug" and "insertAfter" (existing nodeId to insert after; omit to append)
  - For action "remove": only "nodeId" is required
  - Use "add" to insert new sections/components, "remove" to delete unwanted nodes
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
