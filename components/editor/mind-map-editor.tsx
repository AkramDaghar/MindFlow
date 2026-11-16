"use client";

import "@xyflow/react/dist/style.css";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, Network } from "lucide-react";
import {
  addEdge,
  Background,
  BackgroundVariant,
  ReactFlow,
  ReactFlowProvider,
  SelectionMode,
  useEdgesState,
  useNodesState,
  useReactFlow,
  useStoreApi,
  type Connection,
  type Edge,
  type NodeMouseHandler,
  type OnConnectEnd,
} from "@xyflow/react";
import { useTheme } from "next-themes";
import { createClient } from "@/lib/supabase/client";
import { ROOT_NODE_ID, type ChecklistItem, type NodeColor, type NodeFile } from "@/lib/types";
import {
  downloadFile,
  EST_HEIGHT,
  fromStoredEdges,
  fromStoredNodes,
  getChildren,
  getDescendantIds,
  getParentId,
  GRID_SIZE,
  NODE_GAP_X,
  NODE_GAP_Y,
  newId,
  pickInDirection,
  sizeOf,
  slugify,
  snapPosition,
  toMarkdown,
  toStoredEdges,
  toStoredNodes,
  type Direction,
  type MindNode,
} from "@/lib/mindmap";
import { EditorContext, type EditorApi } from "./editor-context";
import { FilePreview } from "./file-preview";
import { MindNodeComponent } from "./mind-node";
import { Toolbar, type SaveStatus } from "./toolbar";
import { MapSettingsModal } from "@/components/map-settings-modal";

const nodeTypes = { mind: MindNodeComponent };
const defaultEdgeOptions = { type: "default" as const, interactionWidth: 24 };
const SAVE_DEBOUNCE_MS = 1000;

type MapListItem = {
  id: string;
  title: string;
};

type Props = {
  mapId: string;
  initialTitle: string;
  initialNodes: unknown;
  initialEdges: unknown;
  initialSnapGrid?: boolean;
  initialCoverImage?: string | null;
  initialMaps?: MapListItem[];
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

function EditorInner({
  mapId,
  initialTitle,
  initialNodes,
  initialEdges,
  initialSnapGrid = true,
  initialCoverImage = null,
  initialMaps = [],
}: Props) {
  const router = useRouter();
  const [snapGrid, setSnapGrid] = useState(initialSnapGrid);
  const [coverImage, setCoverImage] = useState<string | null>(initialCoverImage);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [previewingFile, setPreviewingFile] = useState<NodeFile | null>(null);
  const supabase = useMemo(() => createClient(), []);
  const { resolvedTheme } = useTheme();
  const rf = useReactFlow<MindNode, Edge>();
  const storeApi = useStoreApi();
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
  const [saveError, setSaveError] = useState<string | null>(null);
  const [retryTick, setRetryTick] = useState(0);
  const retryCountRef = useRef(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[] | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const rootId = useMemo(
    () => (nodes.some((n) => n.id === ROOT_NODE_ID) ? ROOT_NODE_ID : nodes[0]?.id ?? ROOT_NODE_ID),
    [nodes]
  );

  // Latest state in refs so keyboard handlers never see stale data
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  const editingRef = useRef(editingId);
  const settingsOpenRef = useRef(settingsOpen);
  const pendingDeleteRef = useRef(pendingDeleteIds);
  nodesRef.current = nodes;
  edgesRef.current = edges;
  editingRef.current = editingId;
  settingsOpenRef.current = settingsOpen;
  pendingDeleteRef.current = pendingDeleteIds;

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
        const raw = {
          x: children[0].position.x,
          y: last.position.y + sizeOf(last).h + NODE_GAP_Y,
        };
        position = snapGrid ? snapPosition(raw) : raw;
      } else {
        const raw = {
          x: parent.position.x + w + NODE_GAP_X,
          y: parent.position.y + h / 2 - EST_HEIGHT / 2,
        };
        position = snapGrid ? snapPosition(raw) : raw;
      }
      insertNode(parentId, position);
    },
    [insertNode, snapGrid]
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

  const performDeleteNodes = useCallback(
    (ids: string[]) => {
      const nonRoot = ids.filter((id) => id !== rootId);
      if (!nonRoot.length) return;
      const es = edgesRef.current;
      const doomed = new Set<string>();
      for (const id of nonRoot) {
        doomed.add(id);
        for (const d of getDescendantIds(es, id)) doomed.add(d);
      }
      const focusId = nonRoot.length === 1 ? getParentId(es, nonRoot[0]) : null;
      setNodes((ns) =>
        ns.filter((n) => !doomed.has(n.id)).map((n) => ({ ...n, selected: n.id === focusId }))
      );
      setEdges((all) => all.filter((e) => !doomed.has(e.source) && !doomed.has(e.target)));
      setEditingId(null);
      setPreviewingFile((cur) => {
        if (!cur) return null;
        const deletedCur = nodesRef.current.some(
          (n) => doomed.has(n.id) && n.data.files?.some((f) => f.id === cur.id)
        );
        return deletedCur ? null : cur;
      });
    },
    [rootId, setNodes, setEdges]
  );

  const deleteNodes = useCallback(
    (ids: string[]) => {
      const nonRoot = ids.filter((id) => id !== rootId);
      if (!nonRoot.length) return;
      const es = edgesRef.current;
      const doomed = new Set<string>();
      for (const id of nonRoot) {
        doomed.add(id);
        for (const d of getDescendantIds(es, id)) doomed.add(d);
      }
      const hasFiles = nodesRef.current.some(
        (n) => doomed.has(n.id) && (n.data.files?.length ?? 0) > 0
      );
      if (hasFiles) {
        setEditingId(null);
        setPendingDeleteIds(nonRoot);
        return;
      }
      performDeleteNodes(nonRoot);
    },
    [rootId, performDeleteNodes]
  );

  const deleteNode = useCallback(
    (id: string) => {
      const selected = nodesRef.current.filter((n) => n.selected);
      if (selected.length > 1 && selected.some((n) => n.id === id)) {
        deleteNodes(selected.map((n) => n.id));
      } else {
        deleteNodes([id]);
      }
    },
    [deleteNodes]
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

  const updateColor = useCallback(
    (id: string, color: NodeColor) => {
      setNodes((ns) => {
        const selectedIds = new Set(ns.filter((n) => n.selected).map((n) => n.id));
        const applyToSelection = selectedIds.size > 1 && selectedIds.has(id);
        return ns.map((n) =>
          (applyToSelection ? selectedIds.has(n.id) : n.id === id)
            ? { ...n, data: { ...n.data, color } }
            : n
        );
      });
    },
    [setNodes]
  );

  const updateChecklist = useCallback(
    (id: string, checklist: ChecklistItem[]) => {
      setNodes((ns) =>
        ns.map((n) =>
          n.id === id
            ? { ...n, data: { ...n.data, checklist: checklist.length ? checklist : undefined } }
            : n
        )
      );
    },
    [setNodes]
  );

  const addFiles = useCallback(
    (id: string, newFiles: NodeFile[]) => {
      if (!newFiles.length) return;
      setNodes((ns) =>
        ns.map((n) =>
          n.id === id
            ? { ...n, data: { ...n.data, files: [...(n.data.files ?? []), ...newFiles] } }
            : n
        )
      );
    },
    [setNodes]
  );

  const removeFile = useCallback(
    (nodeId: string, fileId: string) => {
      setPreviewingFile((cur) => (cur?.id === fileId ? null : cur));
      setNodes((ns) =>
        ns.map((n) => {
          if (n.id !== nodeId) return n;
          const remaining = (n.data.files ?? []).filter((f) => f.id !== fileId);
          return {
            ...n,
            data: { ...n.data, files: remaining.length ? remaining : undefined },
          };
        })
      );
    },
    [setNodes]
  );

  const previewFile = useCallback((file: NodeFile) => {
    setPreviewingFile(file);
  }, []);

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
      if (pendingDeleteRef.current) {
        if (e.key === "Escape") {
          e.preventDefault();
          setPendingDeleteIds(null);
        }
        return;
      }
      if (settingsOpenRef.current) return;
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
      const selectedNodes = ns.filter((n) => n.selected);
      const selected = selectedNodes.length === 1 ? selectedNodes[0] : undefined;
      const arrows: Record<string, Direction> = {
        ArrowLeft: "left",
        ArrowRight: "right",
        ArrowUp: "up",
        ArrowDown: "down",
      };

      const selectedEdge = edgesRef.current.find((ed) => ed.selected);
      if (selectedNodes.length === 0 && selectedEdge) {
        if (e.key === "Backspace" || e.key === "Delete") {
          e.preventDefault();
          deleteEdge(selectedEdge.id);
        } else if (e.key === "Escape") {
          selectOnly(null);
        }
        return;
      }

      if (selectedNodes.length > 1) {
        if (e.key === "Backspace" || e.key === "Delete") {
          e.preventDefault();
          deleteNodes(selectedNodes.map((n) => n.id));
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
  }, [rootId, addChild, addSibling, deleteNode, deleteNodes, navigate, startEditing, selectOnly, updateLabel, ensureVisible, undo, deleteEdge]);

  // ---------------------------------------------------------------- mouse
  const onNodeClick: NodeMouseHandler<MindNode> = useCallback(
    (e, node) => {
      setEditingId(null);
      setEdges((es) => (es.some((ed) => ed.selected) ? es.map((ed) => (ed.selected ? { ...ed, selected: false } : ed)) : es));
      if (!e.shiftKey) {
        selectOnly(node.id);
      }
    },
    [selectOnly, setEdges]
  );

  const onNodeDoubleClick: NodeMouseHandler<MindNode> = useCallback(
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

  const onSelectionEnd = useCallback(() => {
    setEdges((es) =>
      es.some((ed) => ed.selected)
        ? es.map((ed) => (ed.selected ? { ...ed, selected: false } : ed))
        : es
    );
    queueMicrotask(() => storeApi.setState({ nodesSelectionActive: false }));
  }, [setEdges, storeApi]);

  // Clicking anywhere outside a node (canvas, toolbar, sidebar, etc.) deselects nodes
  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (e.shiftKey || e.ctrlKey || e.metaKey) return;
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (
        target.closest(".react-flow__node") ||
        target.closest(".react-flow__node-toolbar") ||
        target.closest('[role="dialog"]')
      ) {
        return;
      }
      if (editingRef.current || nodesRef.current.some((n) => n.selected)) {
        setEditingId(null);
        selectOnly(null);
      }
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
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

  const onConnectEnd: OnConnectEnd = useCallback(
    (event, connectionState) => {
      if (connectionState.isValid || !connectionState.fromNode) return;
      const point = "changedTouches" in event ? event.changedTouches[0] : event;
      if (!point) return;

      // Ignore tiny accidental clicks on a handle (require a real drag)
      const dx = connectionState.to.x - connectionState.from.x;
      const dy = connectionState.to.y - connectionState.from.y;
      if (Math.hypot(dx, dy) < 16) return;

      const dropPos = rf.screenToFlowPosition({ x: point.clientX, y: point.clientY });
      const draggedLeft = connectionState.fromHandle?.type === "target";
      const raw = {
        x: draggedLeft ? dropPos.x - 120 : dropPos.x,
        y: dropPos.y - EST_HEIGHT / 2,
      };
      const position = snapGrid ? snapPosition(raw) : raw;
      insertNode(connectionState.fromNode.id, position);
    },
    [rf, snapGrid, insertNode]
  );

  // ---------------------------------------------------------------- auto-save
  const serialized = useMemo(() => serialize(title, nodes, edges), [title, nodes, edges]);
  const lastSavedRef = useRef<string>(serialized);
  const latestRef = useRef(serialized);
  latestRef.current = serialized;

  useEffect(() => {
    if (serialized === lastSavedRef.current) {
      retryCountRef.current = 0;
      setSaveError(null);
      setStatus((s) => (s === "saving" ? s : "saved"));
      return;
    }
    setStatus((s) => (s === "error" ? s : "unsaved"));

    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const timer = setTimeout(async () => {
      const snapshot = serialized;
      const payload = JSON.parse(snapshot) as { title: string; nodes: unknown; edges: unknown };
      setStatus("saving");
      try {
        const { error } = await supabase
          .from("mind_maps")
          .update({
            title: payload.title.trim() || "Untitled map",
            nodes: payload.nodes,
            edges: payload.edges,
          })
          .eq("id", mapId);

        if (cancelled) return;

        if (error) {
          const msg =
            (error as { message?: string; details?: string; code?: string }).message ||
            (error as { details?: string }).details ||
            "Network or server error";
          console.warn("Auto-save failed:", msg);
          setSaveError(msg);
          setStatus("error");
          // Refresh auth session in case the JWT expired while the tab was open
          await supabase.auth.refreshSession().catch(() => {});
          if (!cancelled) {
            const delay = Math.min(15000, 3000 * 2 ** retryCountRef.current);
            retryCountRef.current += 1;
            retryTimer = setTimeout(() => setRetryTick((t) => t + 1), delay);
          }
          return;
        }

        retryCountRef.current = 0;
        setSaveError(null);
        lastSavedRef.current = snapshot;
        setStatus(latestRef.current === snapshot ? "saved" : "unsaved");
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : "Network error";
        console.warn("Auto-save failed:", msg);
        setSaveError(msg);
        setStatus("error");
        const delay = Math.min(15000, 3000 * 2 ** retryCountRef.current);
        retryCountRef.current += 1;
        retryTimer = setTimeout(() => setRetryTick((t) => t + 1), delay);
      }
    }, SAVE_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      if (retryTimer) clearTimeout(retryTimer);
    };
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
    () => ({
      editingId,
      rootId,
      previewingFileId: previewingFile?.id ?? null,
      startEditing,
      stopEditing,
      updateLabel,
      updateColor,
      updateChecklist,
      addFiles,
      removeFile,
      previewFile,
      deleteNode,
      notify: showNotice,
      addSibling,
      undo,
    }),
    [
      editingId,
      rootId,
      previewingFile,
      startEditing,
      stopEditing,
      updateLabel,
      updateColor,
      updateChecklist,
      addFiles,
      removeFile,
      previewFile,
      deleteNode,
      showNotice,
      addSibling,
      undo,
    ]
  );

  return (
    <EditorContext.Provider value={api}>
      <div className="flex h-screen flex-col bg-neutral-50 dark:bg-neutral-950">
        <Toolbar
          title={title}
          onTitleChange={setTitle}
          status={status}
          saveError={saveError}
          onExportMarkdown={exportMarkdown}
          onExportJson={exportJson}
          onUndo={undo}
          canUndo={canUndo}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen((o) => !o)}
          maps={initialMaps}
          currentMapId={mapId}
          onOpenSettings={() => {
            setEditingId(null);
            setSettingsOpen(true);
          }}
        />
        <div className="relative flex min-h-0 flex-1">
          {sidebarOpen && (
            <aside
              aria-label="Your mind maps"
              className="flex w-56 shrink-0 flex-col border-r border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950"
            >
              <div className="border-b border-neutral-100 px-3.5 py-2.5 dark:border-neutral-800/80">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                  Mind maps
                </p>
              </div>
              <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
                {initialMaps.map((m) => {
                  const isCurrent = m.id === mapId;
                  const displayTitle = isCurrent ? title || "Untitled map" : m.title || "Untitled map";
                  return (
                    <Link
                      key={m.id}
                      href={`/map/${m.id}`}
                      className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm transition ${
                        isCurrent
                          ? "bg-neutral-100 font-medium text-neutral-900 dark:bg-neutral-800 dark:text-white"
                          : "text-neutral-600 hover:bg-neutral-100/70 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800/60 dark:hover:text-neutral-100"
                      }`}
                      aria-current={isCurrent ? "page" : undefined}
                      title={displayTitle}
                    >
                      <Network
                        size={14}
                        className={`shrink-0 ${
                          isCurrent
                            ? "text-neutral-700 dark:text-neutral-200"
                            : "text-neutral-400 dark:text-neutral-500"
                        }`}
                      />
                      <span className="truncate">{displayTitle}</span>
                    </Link>
                  );
                })}
              </nav>
            </aside>
          )}
          <div ref={wrapperRef} className="relative min-w-0 flex-1">
          <ReactFlow<MindNode, Edge>
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onConnectEnd={onConnectEnd}
            onNodeClick={onNodeClick}
            onNodeDoubleClick={onNodeDoubleClick}
            onEdgeClick={onEdgeClick}
            onPaneClick={onPaneClick}
            onSelectionEnd={onSelectionEnd}
            paneClickDistance={6}
            nodeTypes={nodeTypes}
            defaultEdgeOptions={defaultEdgeOptions}
            colorMode={resolvedTheme === "dark" ? "dark" : "light"}
            snapToGrid={snapGrid}
            snapGrid={[GRID_SIZE, GRID_SIZE]}
            multiSelectionKeyCode="Shift"
            selectionKeyCode={["Control", "Meta"]}
            selectionMode={SelectionMode.Partial}
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
          {previewingFile && (
            <FilePreview
              file={previewingFile}
              onClose={() => setPreviewingFile(null)}
            />
          )}
        </div>
      </div>
      {settingsOpen && (
        <MapSettingsModal
          map={{ id: mapId, title, snapGrid, coverImage }}
          onClose={() => setSettingsOpen(false)}
          onUpdated={(patch) => {
            if (patch.title !== undefined) setTitle(patch.title);
            if (patch.snapGrid !== undefined) setSnapGrid(patch.snapGrid);
            if (patch.coverImage !== undefined) setCoverImage(patch.coverImage);
          }}
          onDeleted={() => {
            lastSavedRef.current = latestRef.current;
            router.push("/dashboard");
            router.refresh();
          }}
        />
      )}
      {pendingDeleteIds && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setPendingDeleteIds(null);
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Confirm delete node"
        >
          <div className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-5 shadow-xl dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400">
                <AlertTriangle size={18} />
              </div>
              <div>
                <h2 className="text-sm font-semibold">
                  {pendingDeleteIds.length > 1
                    ? "Delete selected nodes with uploaded files?"
                    : "Delete node with uploaded files?"}
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
                  {pendingDeleteIds.length > 1
                    ? "One or more selected nodes contain uploaded files. Are you sure you want to delete them? All attached files will be removed."
                    : "This node contains uploaded files. Are you sure you want to delete it? All attached files in it will be removed."}
                </p>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPendingDeleteIds(null)}
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-neutral-600 transition hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const ids = pendingDeleteIds;
                  setPendingDeleteIds(null);
                  performDeleteNodes(ids);
                }}
                className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-red-700"
              >
                {pendingDeleteIds.length > 1 ? "Delete nodes" : "Delete node"}
              </button>
            </div>
          </div>
        </div>
      )}
    </EditorContext.Provider>
  );
}
