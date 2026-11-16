import type { Edge, Node } from "@xyflow/react";
import type { MindNodeData, StoredEdge, StoredNode } from "@/lib/types";

export type MindNode = Node<MindNodeData, "mind">;

export const NODE_GAP_X = 80;
export const NODE_GAP_Y = 22;
export const EST_WIDTH = 150;
export const EST_HEIGHT = 40;

export function newId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `n_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export const sizeOf = (n: MindNode) => ({
  w: n.measured?.width ?? n.width ?? EST_WIDTH,
  h: n.measured?.height ?? n.height ?? EST_HEIGHT,
});

export const centerOf = (n: MindNode) => {
  const { w, h } = sizeOf(n);
  return { x: n.position.x + w / 2, y: n.position.y + h / 2 };
};

export function getParentId(edges: Edge[], id: string): string | null {
  return edges.find((e) => e.target === id)?.source ?? null;
}

export function getChildren(nodes: MindNode[], edges: Edge[], id: string): MindNode[] {
  const ids = new Set(edges.filter((e) => e.source === id).map((e) => e.target));
  return nodes.filter((n) => ids.has(n.id)).sort((a, b) => a.position.y - b.position.y);
}

export function getDescendantIds(edges: Edge[], id: string): Set<string> {
  const out = new Set<string>();
  const stack = [id];
  while (stack.length) {
    const cur = stack.pop()!;
    for (const e of edges) {
      if (e.source === cur && !out.has(e.target) && e.target !== id) {
        out.add(e.target);
        stack.push(e.target);
      }
    }
  }
  return out;
}

export type Direction = "left" | "right" | "up" | "down";

/** Pick the best node from `candidates` in the given direction from `from`. */
export function pickInDirection(
  from: MindNode,
  candidates: MindNode[],
  dir: Direction
): MindNode | null {
  const c0 = centerOf(from);
  let best: MindNode | null = null;
  let bestScore = Infinity;

  for (const n of candidates) {
    if (n.id === from.id) continue;
    const c = centerOf(n);
    const dx = c.x - c0.x;
    const dy = c.y - c0.y;
    const primary = dir === "left" ? -dx : dir === "right" ? dx : dir === "up" ? -dy : dy;
    const secondary = dir === "left" || dir === "right" ? Math.abs(dy) : Math.abs(dx);
    if (primary <= 1) continue;
    const score = primary + secondary * 2;
    if (score < bestScore) {
      bestScore = score;
      best = n;
    }
  }
  return best;
}

// ---------- (de)serialisation ----------

export function toStoredNodes(nodes: MindNode[]): StoredNode[] {
  return nodes.map((n) => ({
    id: n.id,
    type: "mind",
    position: { x: Math.round(n.position.x), y: Math.round(n.position.y) },
    data: { label: n.data.label ?? "" },
  }));
}

export function toStoredEdges(edges: Edge[]): StoredEdge[] {
  return edges.map((e) => ({ id: e.id, source: e.source, target: e.target }));
}

export function fromStoredNodes(raw: unknown): MindNode[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((n) => n && typeof n.id === "string")
    .map((n) => ({
      id: n.id,
      type: "mind" as const,
      position: {
        x: Number(n.position?.x) || 0,
        y: Number(n.position?.y) || 0,
      },
      data: { label: typeof n.data?.label === "string" ? n.data.label : "" },
    }));
}

export function fromStoredEdges(raw: unknown): Edge[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((e) => e && typeof e.source === "string" && typeof e.target === "string")
    .map((e) => ({
      id: typeof e.id === "string" ? e.id : `e-${e.source}-${e.target}`,
      source: e.source,
      target: e.target,
    }));
}

// ---------- export ----------

export function toMarkdown(title: string, nodes: MindNode[], edges: Edge[], rootId: string) {
  const lines: string[] = [`# ${title || "Untitled map"}`, ""];
  const visited = new Set<string>();
  const label = (n: MindNode) => (n.data.label || "Untitled").replace(/\n+/g, " ");

  const walk = (n: MindNode, depth: number) => {
    if (visited.has(n.id)) return;
    visited.add(n.id);
    lines.push(`${"  ".repeat(depth)}- ${label(n)}`);
    for (const c of getChildren(nodes, edges, n.id)) walk(c, depth + 1);
  };

  const hasParent = new Set(edges.map((e) => e.target));
  const roots = nodes
    .filter((n) => !hasParent.has(n.id))
    .sort((a, b) => (a.id === rootId ? -1 : b.id === rootId ? 1 : a.position.y - b.position.y));

  for (const r of roots) walk(r, 0);
  // anything left over (e.g. cycles) still gets exported
  for (const n of nodes) walk(n, 0);

  return lines.join("\n") + "\n";
}

export function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function slugify(s: string) {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "mind-map"
  );
}
