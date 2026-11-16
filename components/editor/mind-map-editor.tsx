"use client";

import "@xyflow/react/dist/style.css";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  addEdge,
  Background,
  BackgroundVariant,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type Edge,
  type NodeMouseHandler,
} from "@xyflow/react";
import { useTheme } from "next-themes";
import { createClient } from "@/lib/supabase/client";
import { ROOT_NODE_ID } from "@/lib/types";
import {
  downloadFile,
  EST_HEIGHT,
  fromStoredEdges,
  fromStoredNodes,
  getChildren,
  getDescendantIds,
  getParentId,
  NODE_GAP_X,
  NODE_GAP_Y,
  newId,
  pickInDirection,
  sizeOf,
  slugify,
  toMarkdown,
  toStoredEdges,
  toStoredNodes,
  type Direction,
  type MindNode,
} from "@/lib/mindmap";
import { EditorContext, type EditorApi } from "./editor-context";
import { MindNodeComponent } from "./mind-node";
import { Toolbar, type SaveStatus } from "./toolbar";

const nodeTypes = { mind: MindNodeComponent };
const defaultEdgeOptions = { type: "default" as const, interactionWidth: 24 };
const SAVE_DEBOUNCE_MS = 1000;

type Props = {
  mapId: string;
  initialTitle: string;
  initialNodes: unknown;
  initialEdges: unknown;
};

export function MindMapEditor(props: Props) {
  return (
    <ReactFlowProvider>
      <EditorInner {...props} />
    </ReactFlowProvider>
  );
}

function serialize(title: string, nodes: MindNode[], edges: Edge[]) {
  return JSON.stringify({ title, nodes: toStoredNodes(nodes), edges: toStoredEdges(edges) });
}

function EditorInner({ mapId, initialTitle, initialNodes, initialEdges }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const { resolvedTheme } = useTheme();
  const rf = useReactFlow<MindNode, Edge>();
  const wrapperRef = useRef<HTMLDivElement>(null);

  const startNodes = useMemo(() => {
    const ns = fromStoredNodes(initialNodes);
    return ns.length
      ? ns
      : [{ id: ROOT_NODE_ID, type: "mind" as const, position: { x: 0, y: 0 }, data: { label: "Central idea" } }];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const startEdges = useMemo(() => fromStoredEdges(initialEdges), [initialEdges]);

  const [nodes, setNodes, onNodesChange] = useNodesState<MindNode>(startNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(startEdges);
  const [title, setTitle] = useState(initialTitle);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [status, setStatus] = useState<SaveStatus>("saved");
  const [retryTick, setRetryTick] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const rootId = useMemo(
    () => (nodes.some((n) => n.id === ROOT_NODE_ID) ? ROOT_NODE_ID : nodes[0]?.id ?? ROOT_NODE_ID),
    [nodes]
  );

  // Latest state in refs so keyboard handlers never see stale data
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  const editingRef = useRef(editingId);
  nodesRef.current = nodes;
  edgesRef.current = edges;
  editingRef.current = editingId;

  // ---------------------------------------------------------------- viewport
  const ensureVisible = useCallback(
    (node: MindNode) => {
      const el = wrapperRef.current;
      if (!el) return;
      const { x: vx, y: vy, zoom } = rf.getViewport();
      const { w, h } = sizeOf(node);
      const rect = el.getBoundingClientRect();
      const margin = 60;
      const sx = node.position.x * zoom + vx;
      const sy = node.position.y * zoom + vy;
      const outside =
        sx < margin ||
        sy < margin ||
        sx + w * zoom > rect.width - margin ||
        sy + h * zoom > rect.height - margin;
      if (outside) {
        rf.setCenter(node.position.x + w / 2, node.position.y + h / 2, { zoom, duration: 250 });
      }
    },
    [rf]
  );

  // ---------------------------------------------------------------- mutations
  const selectOnly = useCallback(
    (id: string | null) => {
      setNodes((ns) => ns.map((n) => (n.selected === (n.id === id) ? n : { ...n, selected: n.id === id })));
      setEdges((es) => (es.some((e) => e.selected) ? es.map((e) => (e.selected ? { ...e, selected: false } : e)) : es));
    },
    [setNodes, setEdges]
  );

  const insertNode = useCallback(
    (parentId: string, position: { x: number; y: number }) => {
      const id = newId();
      const node: MindNode = { id, type: "mind", position, data: { label: "" }, selected: true };
      setNodes((ns) => [...ns.map((n) => (n.selected ? { ...n, selected: false } : n)), node]);
      setEdges((es) => [...es, { id: `e-${parentId}-${id}`, source: parentId, target: id }]);
      setEditingId(id);
      requestAnimationFrame(() => ensureVisible(node));
    },
    [setNodes, setEdges, ensureVisible]
  );

  const addChild = useCallback(
    (parentId: string) => {
      const ns = nodesRef.current;
      const parent = ns.find((n) => n.id === parentId);
      if (!parent) return;
      const children = getChildren(ns, edgesRef.current, parentId);
      const { w, h } = sizeOf(parent);
      let position: { x: number; y: number };
      if (children.length) {
        const last = children.reduce((a, b) =>
          a.position.y + sizeOf(a).h > b.position.y + sizeOf(b).h ? a : b
        );
        position = { x: children[0].position.x, y: last.position.y + sizeOf(last).h + NODE_GAP_Y };
      } else {
        position = { x: parent.position.x + w + NODE_GAP_X, y: parent.position.y + h / 2 - EST_HEIGHT / 2 };
      }
      insertNode(parentId, position);
    },
    [insertNode]
  );

  const addSibling = useCallback(
    (id: string) => {
      const parentId = getParentId(edgesRef.current, id);
      if (!parentId) {
        // root has no siblings — fall back to a child
        setEditingId(null);
        addChild(id);
        return;
      }
      addChild(parentId);
    },
    [addChild]
  );

  const deleteNode = useCallback(
    (id: string) => {
      if (id === rootId) return; // keep the central node
      const es = edgesRef.current;
      const doomed = getDescendantIds(es, id);
      doomed.add(id);
      const parentId = getParentId(es, id);
      setNodes((ns) =>
        ns.filter((n) => !doomed.has(n.id)).map((n) => ({ ...n, selected: n.id === parentId }))
      );
      setEdges((all) => all.filter((e) => !doomed.has(e.source) && !doomed.has(e.target)));
      setEditingId(null);
    },
    [rootId, setNodes, setEdges]
  );

  const showNotice = useCallback((msg: string) => {
    setNotice(msg);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(null), 3500);
  }, []);

  /** A link can only be removed if neither node would be left with no links at all
   *  (the central root node is allowed to stand alone). */
  const deleteEdge = useCallback(
    (edgeId: string) => {
      const es = edgesRef.current;
      const edge = es.find((e) => e.id === edgeId);
      if (!edge) return;
      const linkCount = (nodeId: string) =>
        es.filter((e) => e.id !== edgeId && (e.source === nodeId || e.target === nodeId)).length;
      const wouldOrphan = [edge.source, edge.target].some((nid) => nid !== rootId && linkCount(nid) === 0);
      if (wouldOrphan) {
        showNotice("Can't delete this link: that node would be left disconnected. Connect it to another node first.");
        return;
      }
      setEdges((all) => all.filter((e) => e.id !== edgeId));
    },
    [rootId, setEdges, showNotice]
  );

  const navigate = useCallback(
    (fromId: string, dir: Direction) => {
      const ns = nodesRef.current;
      const es = edgesRef.current;
      const from = ns.find((n) => n.id === fromId);
      if (!from) return;
      const byId = new Map(ns.map((n) => [n.id, n]));
      const parentId = getParentId(es, fromId);
      const connected = [
        ...(parentId && byId.get(parentId) ? [byId.get(parentId)!] : []),
        ...getChildren(ns, es, fromId),
      ];
      const siblings = parentId ? getChildren(ns, es, parentId) : [];

      const target =
        dir === "up" || dir === "down"
          ? pickInDirection(from, siblings, dir) ??
            pickInDirection(from, connected, dir) ??
            pickInDirection(from, ns, dir)
          : pickInDirection(from, connected, dir) ?? pickInDirection(from, ns, dir);

      if (target) {
        selectOnly(target.id);
        ensureVisible(target);
      }
    },
    [selectOnly, ensureVisible]
  );

  const updateLabel = useCallback(
    (id: string, label: string) => {
      setNodes((ns) => ns.map((n) => (n.id === id ? { ...n, data: { ...n.data, label } } : n)));
    },
    [setNodes]
  );

  const startEditing = useCallback(
    (id: string) => {
      selectOnly(id);
      setEditingId(id);
    },
    [selectOnly]
  );

  const stopEditing = useCallback((id: string) => {
    setEditingId((cur) => (cur === id ? null : cur));
  }, []);

  // ---------------------------------------------------------------- undo history
  // Snapshots of the serialized map. Bursts of changes (typing, dragging) are
  // coalesced into a single undo step via a short debounce.
  const historyRef = useRef<{ stack: string[]; index: number }>({ stack: [], index: 0 });
  const [canUndo, setCanUndo] = useState(false);
  const serializedNow = useMemo(() => serialize(title, nodes, edges), [title, nodes, edges]);
  const serializedRef = useRef(serializedNow);
  serializedRef.current = serializedNow;
  if (historyRef.current.stack.length === 0) historyRef.current.stack.push(serializedNow);

  const commitHistory = useCallback(() => {
    const h = historyRef.current;
    const cur = serializedRef.current;
    if (cur === h.stack[h.index]) return;
    h.stack = h.stack.slice(0, h.index + 1);
    h.stack.push(cur);
    if (h.stack.length > 100) h.stack.shift();
    h.index = h.stack.length - 1;
    setCanUndo(h.index > 0);
  }, []);

  useEffect(() => {
    const t = setTimeout(commitHistory, 500);
    return () => clearTimeout(t);
  }, [serializedNow, commitHistory]);

  const undo = useCallback(() => {
    commitHistory(); // capture any not-yet-committed edits first
    const h = historyRef.current;
    if (h.index <= 0) return;
    h.index -= 1;
    const snap = JSON.parse(h.stack[h.index]) as { title: string; nodes: unknown; edges: unknown };
    setEditingId(null);
    setTitle(snap.title);
    setNodes(fromStoredNodes(snap.nodes));
    setEdges(fromStoredEdges(snap.edges));
    setCanUndo(h.index > 0);
  }, [commitHistory, setNodes, setEdges]);

  // ---------------------------------------------------------------- keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "z") {
        // let the map title input keep its native text undo
        if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
        e.preventDefault();
        undo();
        return;
      }
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (editingRef.current) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const ns = nodesRef.current;
      const selected = ns.find((n) => n.selected);
      const arrows: Record<string, Direction> = {
        ArrowLeft: "left",
        ArrowRight: "right",
        ArrowUp: "up",
        ArrowDown: "down",
      };

      const selectedEdge = edgesRef.current.find((ed) => ed.selected);
      if (!selected && selectedEdge) {
        if (e.key === "Backspace" || e.key === "Delete") {
          e.preventDefault();
          deleteEdge(selectedEdge.id);
        } else if (e.key === "Escape") {
          selectOnly(null);
        }
        return;
      }

      if (!selected) {
        if (e.key === "Enter" || e.key in arrows) {
          e.preventDefault();
          const root = ns.find((n) => n.id === rootId);
          if (root) {
            selectOnly(root.id);
            ensureVisible(root);
          }
        }
        return;
      }

      if (e.key === "Enter") {
        e.preventDefault();
        addChild(selected.id);
      } else if (e.key === "Tab") {
        e.preventDefault();
        addSibling(selected.id);
      } else if (e.key === "Backspace" || e.key === "Delete") {
        e.preventDefault();
        deleteNode(selected.id);
      } else if (e.key in arrows) {
        e.preventDefault();
        navigate(selected.id, arrows[e.key]);
      } else if (e.key === "F2") {
        e.preventDefault();
        startEditing(selected.id);
      } else if (e.key === "Escape") {
        selectOnly(null);
      } else if (e.key.length === 1) {
        // Start typing to replace the label, spreadsheet-style
        e.preventDefault();
        updateLabel(selected.id, e.key);
        startEditing(selected.id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [rootId, addChild, addSibling, deleteNode, navigate, startEditing, selectOnly, updateLabel, ensureVisible, undo, deleteEdge]);

  // ---------------------------------------------------------------- mouse
  const onNodeClick: NodeMouseHandler<MindNode> = useCallback(
    (_e, node) => startEditing(node.id),
    [startEditing]
  );

  const onEdgeClick = useCallback(
    (_e: React.MouseEvent, edge: Edge) => {
      setEditingId(null);
      setNodes((ns) => (ns.some((n) => n.selected) ? ns.map((n) => (n.selected ? { ...n, selected: false } : n)) : ns));
      setEdges((es) => es.map((e) => (e.selected === (e.id === edge.id) ? e : { ...e, selected: e.id === edge.id })));
    },
    [setNodes, setEdges]
  );

  const onPaneClick = useCallback(() => {
    setEditingId(null);
    selectOnly(null);
  }, [selectOnly]);

  const onConnect = useCallback(
    (c: Connection) => {
      if (c.source === c.target) return;
      // a node can only have one parent: replace any existing incoming edge
      setEdges((es) =>
        addEdge(
          { ...c, id: `e-${c.source}-${c.target}` },
          es.filter((e) => e.target !== c.target)
        )
      );
    },
    [setEdges]
  );

  // ---------------------------------------------------------------- auto-save
  const serialized = useMemo(() => serialize(title, nodes, edges), [title, nodes, edges]);
  const lastSavedRef = useRef<string>(serialized);
  const latestRef = useRef(serialized);
  latestRef.current = serialized;

  useEffect(() => {
    if (serialized === lastSavedRef.current) {
      setStatus((s) => (s === "saving" ? s : "saved"));
      return;
    }
    setStatus((s) => (s === "error" ? s : "unsaved"));

    const timer = setTimeout(async () => {
      const snapshot = serialized;
      const payload = JSON.parse(snapshot) as { title: string; nodes: unknown; edges: unknown };
      setStatus("saving");
      const { error } = await supabase
        .from("mind_maps")
        .update({
          title: payload.title.trim() || "Untitled map",
          nodes: payload.nodes,
          edges: payload.edges,
        })
        .eq("id", mapId);

      if (error) {
        console.error("Auto-save failed:", error);
        setStatus("error");
        setTimeout(() => setRetryTick((t) => t + 1), 3000);
        return;
      }
      lastSavedRef.current = snapshot;
      setStatus(latestRef.current === snapshot ? "saved" : "unsaved");
    }, SAVE_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [serialized, retryTick, supabase, mapId]);

  // Warn before leaving with unsaved edits
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (latestRef.current !== lastSavedRef.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  // ---------------------------------------------------------------- export
  const exportMarkdown = useCallback(() => {
    downloadFile(
      `${slugify(title)}.md`,
      toMarkdown(title, nodesRef.current, edgesRef.current, rootId),
      "text/markdown;charset=utf-8"
    );
  }, [title, rootId]);

  const exportJson = useCallback(() => {
    const data = {
      title,
      exportedAt: new Date().toISOString(),
      nodes: toStoredNodes(nodesRef.current),
      edges: toStoredEdges(edgesRef.current),
    };
    downloadFile(`${slugify(title)}.json`, JSON.stringify(data, null, 2), "application/json");
  }, [title]);

  // ---------------------------------------------------------------- render
  const api: EditorApi = useMemo(
    () => ({ editingId, rootId, startEditing, stopEditing, updateLabel, addSibling, undo }),
    [editingId, rootId, startEditing, stopEditing, updateLabel, addSibling, undo]
  );

  return (
    <EditorContext.Provider value={api}>
      <div className="flex h-screen flex-col bg-neutral-50 dark:bg-neutral-950">
        <Toolbar
          title={title}
          onTitleChange={setTitle}
          status={status}
          onExportMarkdown={exportMarkdown}
          onExportJson={exportJson}
          onUndo={undo}
          canUndo={canUndo}
        />
        <div ref={wrapperRef} className="relative flex-1">
          <ReactFlow<MindNode, Edge>
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onEdgeClick={onEdgeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            defaultEdgeOptions={defaultEdgeOptions}
            colorMode={resolvedTheme === "dark" ? "dark" : "light"}
            fitView
            fitViewOptions={{ padding: 0.4, maxZoom: 1 }}
            minZoom={0.1}
            maxZoom={2.5}
            deleteKeyCode={null}
            disableKeyboardA11y
            zoomOnDoubleClick={false}
            proOptions={{ hideAttribution: true }}
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
            <Panel position="bottom-center">
              <div className="hidden items-center gap-3 rounded-full border border-neutral-200 bg-white/90 px-4 py-1.5 text-[11px] text-neutral-500 shadow-sm backdrop-blur md:flex dark:border-neutral-800 dark:bg-neutral-900/90 dark:text-neutral-400">
                {[
                  ["Enter", "child"],
                  ["Tab", "sibling"],
                  ["⌫", "delete node / link"],
                  ["←↑↓→", "navigate"],
                  ["Click / F2", "edit"],
                  ["Esc", "done"],
                  ["Ctrl+Z", "undo"],
                ].map(([k, l]) => (
                  <span key={k} className="inline-flex items-center gap-1">
                    <kbd className="rounded border border-neutral-200 bg-neutral-50 px-1 font-mono text-[10px] dark:border-neutral-700 dark:bg-neutral-800">
                      {k}
                    </kbd>
                    {l}
                  </span>
                ))}
              </div>
            </Panel>
          </ReactFlow>
          {notice && (
            <div
              role="status"
              className="pointer-events-none absolute left-1/2 top-4 z-20 max-w-[90%] -translate-x-1/2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900 shadow-md dark:border-amber-900/60 dark:bg-amber-950 dark:text-amber-200"
            >
              {notice}
            </div>
          )}
        </div>
      </div>
    </EditorContext.Provider>
  );
}
