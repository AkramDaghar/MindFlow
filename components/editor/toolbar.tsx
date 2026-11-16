"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useReactFlow, useViewport } from "@xyflow/react";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Download,
  FileJson,
  FileText,
  HelpCircle,
  Loader2,
  Maximize,
  Minus,
  Network,
  PanelLeft,
  Plus,
  Settings,
  Undo2,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export type SaveStatus = "saved" | "unsaved" | "saving" | "error";

type Props = {
  title: string;
  onTitleChange: (t: string) => void;
  status: SaveStatus;
  saveError?: string | null;
  onExportMarkdown: () => void;
  onExportJson: () => void;
  onUndo: () => void;
  canUndo: boolean;
  onOpenSettings: () => void;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  maps?: { id: string; title: string }[];
  currentMapId?: string;
};

const iconBtn =
  "inline-flex h-8 w-8 items-center justify-center rounded-md text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100";

function StatusBadge({ status, error }: { status: SaveStatus; error?: string | null }) {
  const map = {
    saved: { icon: <Check size={12} />, text: "Saved", cls: "text-neutral-400" },
    unsaved: { icon: <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />, text: "Unsaved", cls: "text-neutral-400" },
    saving: { icon: <Loader2 size={12} className="animate-spin" />, text: "Saving…", cls: "text-neutral-400" },
    error: { icon: <AlertCircle size={12} />, text: "Save failed — retrying", cls: "text-red-500" },
  }[status];
  return (
    <span
      className={`inline-flex h-7 items-center gap-1 text-xs leading-none ${map.cls}`}
      title={status === "error" && error ? error : undefined}
      aria-live="polite"
    >
      {map.icon}
      <span className="hidden sm:inline">{map.text}</span>
    </span>
  );
}

const SHORTCUTS = [
  ["Click", "Select node"],
  ["Shift + Click", "Select multiple nodes"],
  ["Ctrl / Cmd + Drag", "Area-select nodes"],
  ["Double-click / F2", "Edit text"],
  ["Enter", "New child node"],
  ["Tab", "New sibling node"],
  ["⌫ / Del", "Delete node or link"],
  ["← ↑ ↓ →", "Navigate nodes"],
  ["Esc", "Done / deselect"],
  ["Ctrl+Z", "Undo"],
] as const;

export function Toolbar({
  title,
  onTitleChange,
  status,
  saveError,
  onExportMarkdown,
  onExportJson,
  onUndo,
  canUndo,
  onOpenSettings,
  sidebarOpen,
  onToggleSidebar,
  maps = [],
  currentMapId,
}: Props) {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const { zoom } = useViewport();
  const [exportOpen, setExportOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [peekOpen, setPeekOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const shortcutsRef = useRef<HTMLDivElement>(null);
  const peekTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openPeek = () => {
    if (peekTimerRef.current) clearTimeout(peekTimerRef.current);
    if (!sidebarOpen) setPeekOpen(true);
  };

  const closePeek = () => {
    if (peekTimerRef.current) clearTimeout(peekTimerRef.current);
    peekTimerRef.current = setTimeout(() => setPeekOpen(false), 120);
  };

  useEffect(() => {
    return () => {
      if (peekTimerRef.current) clearTimeout(peekTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!exportOpen && !shortcutsOpen) return;
    const close = (e: MouseEvent) => {
      if (exportOpen && !menuRef.current?.contains(e.target as Node)) setExportOpen(false);
      if (shortcutsOpen && !shortcutsRef.current?.contains(e.target as Node)) setShortcutsOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setExportOpen(false);
        setShortcutsOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", close);
      window.removeEventListener("keydown", onKey);
    };
  }, [exportOpen, shortcutsOpen]);

  return (
    <header className="z-10 flex h-12 shrink-0 items-center justify-between gap-2 border-b border-neutral-200 bg-white/90 px-2 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/90">
      <div className="flex min-w-0 items-center gap-1">
        <Link href="/dashboard" className={iconBtn} title="Back to dashboard" aria-label="Back to dashboard">
          <ArrowLeft size={16} />
        </Link>
        <div
          className="relative"
          onMouseEnter={openPeek}
          onMouseLeave={closePeek}
        >
          <button
            type="button"
            onClick={() => {
              setPeekOpen(false);
              onToggleSidebar();
            }}
            className={`${iconBtn} ${
              sidebarOpen ? "bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100" : ""
            }`}
            title={sidebarOpen ? "Hide mind maps list" : "Show mind maps list"}
            aria-label="Toggle mind maps list"
            aria-expanded={sidebarOpen}
          >
            <PanelLeft size={16} />
          </button>

          {!sidebarOpen && peekOpen && maps.length > 0 && (
            <div
              onMouseEnter={openPeek}
              onMouseLeave={closePeek}
              className="absolute left-0 top-9 z-30 w-60 rounded-xl border border-neutral-200 bg-white/95 p-1.5 shadow-xl backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/95"
              role="region"
              aria-label="Mind maps glance"
            >
              <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                Mind maps
              </p>
              <div className="max-h-72 space-y-0.5 overflow-y-auto">
                {maps.map((m) => {
                  const isCurrent = m.id === currentMapId;
                  const displayTitle = isCurrent ? title || "Untitled map" : m.title || "Untitled map";
                  return (
                    <Link
                      key={m.id}
                      href={`/map/${m.id}`}
                      onClick={() => setPeekOpen(false)}
                      className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition ${
                        isCurrent
                          ? "bg-neutral-100 font-medium text-neutral-900 dark:bg-neutral-800 dark:text-white"
                          : "text-neutral-600 hover:bg-neutral-100/70 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800/70 dark:hover:text-white"
                      }`}
                    >
                      <Network size={13} className="shrink-0 text-neutral-400" />
                      <span className="truncate">{displayTitle}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        <div className="mx-1 h-4 w-px bg-neutral-200 dark:bg-neutral-800" />
        {/* auto-width title input */}
        <div className="relative flex h-7 min-w-[3rem] max-w-[50vw] items-center">
          <span aria-hidden className="invisible block truncate whitespace-pre px-2 text-sm font-medium leading-5">
            {title || "Untitled map"}
          </span>
          <input
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            onBlur={() => !title.trim() && onTitleChange("Untitled map")}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === "Escape") (e.target as HTMLInputElement).blur();
            }}
            placeholder="Untitled map"
            maxLength={200}
            aria-label="Map title"
            className="absolute inset-0 h-full w-full min-w-0 rounded-md bg-transparent px-2 text-sm font-medium leading-5 outline-none transition hover:bg-neutral-100 focus:bg-neutral-100 dark:hover:bg-neutral-800 dark:focus:bg-neutral-800"
          />
        </div>
        <div className="ml-2 flex shrink-0 items-center">
          <StatusBadge status={status} error={saveError} />
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-0.5">
        <button
          className={`${iconBtn} disabled:pointer-events-none disabled:opacity-40`}
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
          aria-label="Undo"
        >
          <Undo2 size={15} />
        </button>
        <div className="mx-1 h-4 w-px bg-neutral-200 dark:bg-neutral-800" />
        <button className={iconBtn} onClick={() => zoomOut({ duration: 150 })} title="Zoom out" aria-label="Zoom out">
          <Minus size={15} />
        </button>
        <button
          className="h-8 min-w-[3rem] rounded-md px-1 text-xs tabular-nums text-neutral-500 transition hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
          onClick={() => fitView({ duration: 250, padding: 0.3, maxZoom: 1.25 })}
          title="Fit to screen"
        >
          {Math.round(zoom * 100)}%
        </button>
        <button className={iconBtn} onClick={() => zoomIn({ duration: 150 })} title="Zoom in" aria-label="Zoom in">
          <Plus size={15} />
        </button>
        <button
          className={`${iconBtn} hidden sm:inline-flex`}
          onClick={() => fitView({ duration: 250, padding: 0.3, maxZoom: 1.25 })}
          title="Fit to screen"
          aria-label="Fit to screen"
        >
          <Maximize size={14} />
        </button>

        <div className="mx-1 h-4 w-px bg-neutral-200 dark:bg-neutral-800" />

        <div className="relative" ref={menuRef}>
          <button className={iconBtn} onClick={() => setExportOpen((o) => !o)} title="Export" aria-label="Export">
            <Download size={15} />
          </button>
          {exportOpen && (
            <div className="absolute right-0 top-10 w-48 rounded-lg border border-neutral-200 bg-white p-1 text-sm shadow-lg dark:border-neutral-800 dark:bg-neutral-900">
              <button
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-neutral-100 dark:hover:bg-neutral-800"
                onClick={() => {
                  onExportMarkdown();
                  setExportOpen(false);
                }}
              >
                <FileText size={14} /> Export as Markdown
              </button>
              <button
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-neutral-100 dark:hover:bg-neutral-800"
                onClick={() => {
                  onExportJson();
                  setExportOpen(false);
                }}
              >
                <FileJson size={14} /> Export as JSON
              </button>
            </div>
          )}
        </div>
        <ThemeToggle />
        <div className="relative" ref={shortcutsRef}>
          <button
            className={iconBtn}
            onClick={() => setShortcutsOpen((o) => !o)}
            title="Keyboard shortcuts"
            aria-label="Keyboard shortcuts"
            aria-expanded={shortcutsOpen}
          >
            <HelpCircle size={15} />
          </button>
          {shortcutsOpen && (
            <div className="absolute right-0 top-10 z-20 w-80 rounded-xl border border-neutral-200 bg-white p-4 text-sm shadow-xl sm:w-96 dark:border-neutral-800 dark:bg-neutral-900">
              <p className="mb-3 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                Keyboard shortcuts
              </p>
              <div className="space-y-2">
                {SHORTCUTS.map(([keys, label]) => (
                  <div key={keys} className="flex items-center justify-between gap-4">
                    <span className="text-neutral-600 dark:text-neutral-400">{label}</span>
                    <kbd className="shrink-0 rounded-md border border-neutral-200 bg-neutral-50 px-2 py-0.5 font-mono text-xs text-neutral-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
                      {keys}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <button
          className={iconBtn}
          onClick={onOpenSettings}
          title="Map settings"
          aria-label="Map settings"
        >
          <Settings size={15} />
        </button>
      </div>
    </header>
  );
}
