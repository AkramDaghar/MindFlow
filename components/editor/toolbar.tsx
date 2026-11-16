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
  Loader2,
  Maximize,
  Minus,
  Plus,
  Undo2,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export type SaveStatus = "saved" | "unsaved" | "saving" | "error";

type Props = {
  title: string;
  onTitleChange: (t: string) => void;
  status: SaveStatus;
  onExportMarkdown: () => void;
  onExportJson: () => void;
  onUndo: () => void;
  canUndo: boolean;
};

const iconBtn =
  "inline-flex h-8 w-8 items-center justify-center rounded-md text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100";

function StatusBadge({ status }: { status: SaveStatus }) {
  const map = {
    saved: { icon: <Check size={12} />, text: "Saved", cls: "text-neutral-400" },
    unsaved: { icon: <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />, text: "Unsaved", cls: "text-neutral-400" },
    saving: { icon: <Loader2 size={12} className="animate-spin" />, text: "Saving…", cls: "text-neutral-400" },
    error: { icon: <AlertCircle size={12} />, text: "Save failed — retrying", cls: "text-red-500" },
  }[status];
  return (
    <span className={`inline-flex items-center gap-1 text-xs ${map.cls}`} aria-live="polite">
      {map.icon}
      <span className="hidden sm:inline">{map.text}</span>
    </span>
  );
}

export function Toolbar({ title, onTitleChange, status, onExportMarkdown, onExportJson, onUndo, canUndo }: Props) {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const { zoom } = useViewport();
  const [exportOpen, setExportOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!exportOpen) return;
    const close = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setExportOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [exportOpen]);

  return (
    <header className="z-10 flex h-12 shrink-0 items-center justify-between gap-2 border-b border-neutral-200 bg-white/90 px-2 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/90">
      <div className="flex min-w-0 items-center gap-1">
        <Link href="/dashboard" className={iconBtn} title="Back to dashboard" aria-label="Back to dashboard">
          <ArrowLeft size={16} />
        </Link>
        <div className="mx-1 h-4 w-px bg-neutral-200 dark:bg-neutral-800" />
        {/* auto-width title input */}
        <div className="grid min-w-0 max-w-[50vw]">
          <span aria-hidden className="invisible col-start-1 row-start-1 truncate whitespace-pre px-2 text-sm font-medium">
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
            className="col-start-1 row-start-1 min-w-0 rounded-md bg-transparent px-2 py-1 text-sm font-medium outline-none transition hover:bg-neutral-100 focus:bg-neutral-100 dark:hover:bg-neutral-800 dark:focus:bg-neutral-800"
          />
        </div>
        <div className="ml-2 shrink-0">
          <StatusBadge status={status} />
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
      </div>
    </header>
  );
}
