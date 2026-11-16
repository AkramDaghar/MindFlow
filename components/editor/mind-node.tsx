"use client";

import { memo, useEffect, useRef } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { MindNode } from "@/lib/mindmap";
import { useEditor } from "./editor-context";

function MindNodeView({ id, data, selected }: NodeProps<MindNode>) {
  const { editingId, rootId, stopEditing, updateLabel, addSibling, undo } = useEditor();
  const isEditing = editingId === id;
  const isRoot = id === rootId;
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!isEditing) return;
    const el = ref.current;
    if (!el) return;
    el.focus();
    const end = el.value.length;
    el.setSelectionRange(end, end);
  }, [isEditing]);

  const label = data.label ?? "";

  const base = isRoot
    ? "rounded-xl border border-neutral-900 bg-neutral-900 px-5 py-3 text-base font-semibold text-white shadow-md dark:border-white dark:bg-white dark:text-neutral-900"
    : "rounded-lg border border-neutral-200 bg-white px-3.5 py-2 text-sm text-neutral-800 shadow-[0_1px_3px_rgba(0,0,0,0.06)] hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:border-neutral-600";

  const ring = selected || isEditing
    ? "ring-2 ring-blue-500/70 ring-offset-2 ring-offset-white dark:ring-blue-400/70 dark:ring-offset-neutral-950"
    : "";

  // Text classes shared by the mirror div and textarea so they size identically
  const textCls = "col-start-1 row-start-1 min-w-0 max-w-full whitespace-pre-wrap [overflow-wrap:anywhere] [word-break:break-word] leading-snug";

  return (
    <div className={`box-border min-w-[60px] max-w-[300px] transition-shadow ${base} ${ring}`}
      style={{ maxWidth: 300 }}
    >
      <Handle type="target" position={Position.Left} className="mind-handle" />

      {isEditing ? (
        <div className="relative">
          {/* invisible mirror that drives the auto-size */}
          <div aria-hidden className={`${textCls} invisible block`}>
            {label + "\u200b"}
          </div>
          <textarea
            ref={ref}
            value={label}
            rows={1}
            placeholder="Type something…"
            spellCheck={false}
            onChange={(e) => updateLabel(id, e.target.value)}
            onBlur={() => stopEditing(id)}
            onKeyDown={(e) => {
              e.stopPropagation();
              if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === "z") {
                e.preventDefault();
                undo();
                return;
              }
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                stopEditing(id);
              } else if (e.key === "Escape") {
                e.preventDefault();
                stopEditing(id);
              } else if (e.key === "Tab") {
                e.preventDefault();
                addSibling(id);
              }
            }}
            className={`${textCls} nodrag nopan nowheel absolute inset-0 h-full w-full resize-none overflow-hidden bg-transparent p-0 outline-none placeholder:opacity-50`}
          />
        </div>
      ) : (
        <div className={`${textCls} ${label ? "" : "opacity-40"}`}>
          {label || "Untitled"}
        </div>
      )}

      <Handle type="source" position={Position.Right} className="mind-handle" />
    </div>
  );
}

export const MindNodeComponent = memo(MindNodeView);
