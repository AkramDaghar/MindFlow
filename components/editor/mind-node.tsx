"use client";

import { memo, useEffect, useRef, useState } from "react";
import { Handle, NodeToolbar, Position, type NodeProps } from "@xyflow/react";
import {
  Check,
  FileSpreadsheet,
  FileText,
  ListTodo,
  Palette,
  Presentation,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { newId, type MindNode } from "@/lib/mindmap";
import {
  ALLOWED_NODE_FILE_EXTENSIONS,
  MAX_NODE_FILE_BYTES,
  NODE_COLOR_MAP,
  NODE_COLORS,
  type ChecklistItem,
  type NodeFile,
  type NodeFileExt,
} from "@/lib/types";
import { useEditor } from "./editor-context";

const FILE_ACCEPT =
  ".pdf,.doc,.docx,.pptx,.xlsx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function getFileExtension(filename: string): NodeFileExt | null {
  const ext = filename.split(".").pop()?.toLowerCase();
  if (!ext) return null;
  return (ALLOWED_NODE_FILE_EXTENSIONS as readonly string[]).includes(ext)
    ? (ext as NodeFileExt)
    : null;
}

function FileTypeIcon({ ext }: { ext: NodeFileExt }) {
  switch (ext) {
    case "pdf":
      return <FileText size={14} className="shrink-0 text-rose-500" />;
    case "doc":
    case "docx":
      return <FileText size={14} className="shrink-0 text-blue-500" />;
    case "pptx":
      return <Presentation size={14} className="shrink-0 text-amber-500" />;
    case "xlsx":
      return <FileSpreadsheet size={14} className="shrink-0 text-emerald-500" />;
  }
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error(`Could not read ${file.name}.`));
    reader.readAsDataURL(file);
  });
}

function MindNodeView({ id, data, selected }: NodeProps<MindNode>) {
  const {
    editingId,
    rootId,
    previewingFileId,
    startEditing,
    stopEditing,
    updateLabel,
    updateColor,
    updateChecklist,
    addFiles,
    removeFile,
    previewFile,
    deleteNode,
    notify,
    addSibling,
    undo,
  } = useEditor();
  const isEditing = editingId === id;
  const isRoot = id === rootId;
  const ref = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const checkInputRef = useRef<HTMLInputElement>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [editingCheckId, setEditingCheckId] = useState<string | null>(null);

  useEffect(() => {
    if (!selected) {
      setPaletteOpen(false);
      setEditingCheckId(null);
    }
  }, [selected]);

  useEffect(() => {
    if (!isEditing) return;
    setEditingCheckId(null);
    let cancelled = false;
    let raf = 0;
    let tries = 0;

    const tryFocus = () => {
      if (cancelled) return;
      const el = ref.current;
      if (!el) return;
      // React Flow keeps newly mounted nodes `visibility: hidden` until ResizeObserver
      // measures them; browsers ignore .focus() while an element is hidden.
      const visible = window.getComputedStyle(el).visibility !== "hidden";
      if (visible) {
        el.focus({ preventScroll: true });
        if (document.activeElement === el) {
          const end = el.value.length;
          el.setSelectionRange(end, end);
          return;
        }
      }
      if (tries++ < 30) {
        raf = requestAnimationFrame(tryFocus);
      }
    };

    tryFocus();
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [isEditing]);

  useEffect(() => {
    if (!editingCheckId) return;
    const el = checkInputRef.current;
    if (!el) return;
    el.focus();
    const end = el.value.length;
    el.setSelectionRange(end, end);
  }, [editingCheckId]);

  const label = data.label ?? "";
  const files = data.files ?? [];
  const checklist = data.checklist ?? [];
  const colorTheme = data.color ? NODE_COLOR_MAP[data.color] : null;
  const isDarkSurface = (isRoot && !colorTheme) || colorTheme?.key === "black";

  const base = colorTheme
    ? isRoot
      ? `rounded-xl border px-5 py-3 text-base font-semibold shadow-md ${colorTheme.className}`
      : `rounded-lg border px-3.5 py-2 text-sm shadow-[0_1px_3px_rgba(0,0,0,0.06)] ${colorTheme.className}`
    : isRoot
      ? "rounded-xl border border-neutral-900 bg-neutral-900 px-5 py-3 text-base font-semibold text-white shadow-md dark:border-white dark:bg-white dark:text-neutral-900"
      : "rounded-lg border border-neutral-200 bg-white px-3.5 py-2 text-sm text-neutral-800 shadow-[0_1px_3px_rgba(0,0,0,0.06)] hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:border-neutral-600";

  const ring = selected || isEditing
    ? "ring-2 ring-blue-500/70 ring-offset-2 ring-offset-white dark:ring-blue-400/70 dark:ring-offset-neutral-950"
    : "";

  // Text classes shared by the mirror div and textarea so they size identically
  const textCls = "col-start-1 row-start-1 min-w-0 max-w-full whitespace-pre-wrap [overflow-wrap:anywhere] [word-break:break-word] leading-snug";

  const usesInlineColors = colorTheme && colorTheme.key !== "white" && colorTheme.key !== "black";

  const handleAddChecklistItem = () => {
    stopEditing(id);
    const item: ChecklistItem = { id: newId(), text: "", checked: false };
    updateChecklist(id, [...checklist, item]);
    setEditingCheckId(item.id);
  };

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!picked.length) return;

    const valid: NodeFile[] = [];
    const errors: string[] = [];

    for (const file of picked) {
      const ext = getFileExtension(file.name);
      if (!ext) {
        errors.push(`"${file.name}" is not a supported file (PDF, DOC, DOCX, PPTX, XLSX).`);
        continue;
      }
      if (file.size > MAX_NODE_FILE_BYTES) {
        errors.push(`"${file.name}" exceeds the 5 MB limit.`);
        continue;
      }
      try {
        const dataUrl = await readAsDataUrl(file);
        valid.push({ id: newId(), name: file.name, ext, dataUrl });
      } catch {
        errors.push(`Could not read "${file.name}".`);
      }
    }

    if (valid.length) addFiles(id, valid);
    if (errors.length) notify(errors[0]);
  };

  return (
    <div
      className={`box-border min-w-[60px] max-w-[300px] transition-shadow ${base} ${ring}`}
      style={{
        maxWidth: 300,
        ...(usesInlineColors
          ? { backgroundColor: colorTheme.bg, borderColor: colorTheme.border }
          : {}),
      }}
    >
      <NodeToolbar
        isVisible={Boolean(selected)}
        position={Position.Top}
        offset={10}
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center gap-1.5">
          <div className="flex items-center gap-0.5 rounded-full border border-neutral-200 bg-white/95 p-1 shadow-md backdrop-blur dark:border-neutral-700 dark:bg-neutral-900/95">
            <button
              type="button"
              onClick={handleAddChecklistItem}
              className="inline-flex h-7 w-7 items-center justify-center rounded-full text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-white"
              aria-label="Add checklist item"
              title="Add checklist"
            >
              <ListTodo size={14} />
            </button>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={FILE_ACCEPT}
              onChange={(e) => void handleFilesSelected(e)}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex h-7 w-7 items-center justify-center rounded-full text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-white"
              aria-label="Upload file"
              title="Upload file (PDF, DOC/DOCX, PPTX, XLSX)"
            >
              <Upload size={14} />
            </button>

            <button
              type="button"
              onClick={() => setPaletteOpen((o) => !o)}
              className={`inline-flex h-7 w-7 items-center justify-center rounded-full transition ${
                paletteOpen
                  ? "bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-white"
                  : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-white"
              }`}
              aria-label="Change node color"
              title="Change node color"
            >
              <Palette size={14} />
            </button>

            {!isRoot && (
              <button
                type="button"
                onClick={() => deleteNode(id)}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full text-neutral-600 transition hover:bg-red-50 hover:text-red-600 dark:text-neutral-300 dark:hover:bg-red-950/50 dark:hover:text-red-400"
                aria-label="Delete node"
                title="Delete node"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>

          {paletteOpen && (
            <div className="flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white/95 px-2.5 py-1.5 shadow-md backdrop-blur dark:border-neutral-700 dark:bg-neutral-900/95">
              {NODE_COLORS.map((c) => {
                const active = data.color === c.key;
                return (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => {
                      updateColor(id, c.key);
                      setPaletteOpen(false);
                    }}
                    aria-label={c.label}
                    title={c.label}
                    className={`flex h-5 w-5 items-center justify-center rounded-full border transition hover:scale-110 ${
                      active
                        ? "ring-2 ring-neutral-900 ring-offset-1 dark:ring-white dark:ring-offset-neutral-900"
                        : "border-neutral-300 dark:border-white/20"
                    }`}
                    style={{ backgroundColor: c.swatch }}
                  >
                    {active && (
                      <Check
                        size={11}
                        className={c.darkCheck ? "text-neutral-900" : "text-white"}
                        strokeWidth={3}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </NodeToolbar>

      <Handle type="target" position={Position.Left} className="mind-handle" />

      {isEditing ? (
        <div className="relative">
          {/* invisible mirror that drives the auto-size */}
          <div aria-hidden className={`${textCls} invisible block`}>
            {label ? label + "\u200b" : "Type something…"}
          </div>
          <textarea
            ref={ref}
            autoFocus
            value={label}
            rows={1}
            placeholder="Type something…"
            spellCheck={false}
            onChange={(e) => updateLabel(id, e.target.value)}
            onBlur={() => stopEditing(id)}
            onClick={(e) => e.stopPropagation()}
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

      {checklist.length > 0 && (
        <div
          className="nodrag mt-2 flex flex-col gap-1 text-xs font-normal"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {checklist.map((item, idx) => {
            const isItemEditing = editingCheckId === item.id;
            return (
              <div key={item.id} className="group/check flex items-center gap-1.5">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={item.checked}
                  onClick={(e) => {
                    e.stopPropagation();
                    updateChecklist(
                      id,
                      checklist.map((c) =>
                        c.id === item.id ? { ...c, checked: !c.checked } : c
                      )
                    );
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[4px] border transition ${
                    item.checked
                      ? isDarkSurface
                        ? "border-white bg-white text-neutral-900"
                        : "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900"
                      : isDarkSurface
                        ? "border-white/50 hover:border-white"
                        : "border-neutral-400 hover:border-neutral-700 dark:border-neutral-500 dark:hover:border-neutral-300"
                  }`}
                  aria-label={item.checked ? "Uncheck item" : "Check item"}
                >
                  {item.checked && <Check size={9} strokeWidth={3} />}
                </button>

                {isItemEditing ? (
                  <input
                    ref={checkInputRef}
                    value={item.text}
                    placeholder="To-do…"
                    spellCheck={false}
                    onChange={(e) => {
                      const val = e.target.value;
                      updateChecklist(
                        id,
                        checklist.map((c) => (c.id === item.id ? { ...c, text: val } : c))
                      );
                    }}
                    onBlur={() => setEditingCheckId((cur) => (cur === item.id ? null : cur))}
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => {
                      e.stopPropagation();
                      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === "z") {
                        e.preventDefault();
                        undo();
                        return;
                      }
                      if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                        e.preventDefault();
                        // Pressing Enter on an empty item (i.e. pressing Enter twice) exits the checklist
                        // back to the node's normal text.
                        if (item.text.trim() === "") {
                          const cleaned = checklist.filter((c) => c.id !== item.id);
                          updateChecklist(id, cleaned);
                          setEditingCheckId(null);
                          startEditing(id);
                          return;
                        }
                        const next: ChecklistItem = { id: newId(), text: "", checked: false };
                        const updated = [
                          ...checklist.slice(0, idx + 1),
                          next,
                          ...checklist.slice(idx + 1),
                        ];
                        updateChecklist(id, updated);
                        setEditingCheckId(next.id);
                      } else if (e.key === "Backspace" && item.text === "") {
                        e.preventDefault();
                        const prev = checklist[idx - 1];
                        updateChecklist(
                          id,
                          checklist.filter((c) => c.id !== item.id)
                        );
                        setEditingCheckId(prev ? prev.id : null);
                      } else if (e.key === "Escape") {
                        e.preventDefault();
                        setEditingCheckId(null);
                      }
                    }}
                    className={`nopan nowheel min-w-[60px] flex-1 bg-transparent p-0 text-xs outline-none placeholder:opacity-50 ${
                      item.checked ? "line-through opacity-55" : ""
                    }`}
                  />
                ) : (
                  <span
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      stopEditing(id);
                      setEditingCheckId(item.id);
                    }}
                    className={`min-w-0 flex-1 cursor-text break-words leading-snug ${
                      item.checked
                        ? "line-through opacity-55"
                        : item.text
                          ? ""
                          : "opacity-45"
                    }`}
                  >
                    {item.text || "To-do"}
                  </span>
                )}

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    updateChecklist(
                      id,
                      checklist.filter((c) => c.id !== item.id)
                    );
                    if (editingCheckId === item.id) setEditingCheckId(null);
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  aria-label="Remove checklist item"
                  className={`rounded p-0.5 opacity-0 transition group-hover/check:opacity-100 focus:opacity-100 ${
                    isDarkSurface
                      ? "text-white/60 hover:bg-white/20 hover:text-white"
                      : "text-neutral-400 hover:bg-neutral-200/70 hover:text-neutral-900 dark:hover:bg-neutral-700 dark:hover:text-white"
                  }`}
                >
                  <X size={11} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {files.length > 0 && (
        <div
          className="nodrag mt-2 flex flex-col gap-1.5"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {files.map((file) => {
            const isPreviewing = previewingFileId === file.id;
            return (
              <div
                key={file.id}
                onClick={(e) => {
                  e.stopPropagation();
                  previewFile(file);
                }}
                onMouseDown={(e) => e.stopPropagation()}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    e.stopPropagation();
                    previewFile(file);
                  }
                }}
                className={`group/file flex cursor-pointer items-center gap-2 rounded-md border px-2 py-1 text-xs font-normal transition ${
                  isDarkSurface
                    ? isPreviewing
                      ? "border-white/40 bg-white/20 text-white"
                      : "border-white/15 bg-white/10 text-white/95 hover:bg-white/15"
                    : isPreviewing
                      ? "border-blue-400 bg-blue-50/80 text-neutral-900 dark:border-blue-500/70 dark:bg-blue-950/40 dark:text-white"
                      : "border-neutral-200/90 bg-neutral-50/90 text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700/80 dark:bg-neutral-800/80 dark:text-neutral-200 dark:hover:bg-neutral-800"
                }`}
                title={`Preview ${file.name}`}
              >
                <FileTypeIcon ext={file.ext} />
                <span className="min-w-0 flex-1 truncate">{file.name}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(id, file.id);
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  aria-label={`Remove ${file.name}`}
                  title="Remove file"
                  className={`rounded p-0.5 opacity-0 transition group-hover/file:opacity-100 focus:opacity-100 ${
                    isDarkSurface
                      ? "text-white/70 hover:bg-white/20 hover:text-white"
                      : "text-neutral-400 hover:bg-neutral-200/70 hover:text-neutral-900 dark:hover:bg-neutral-700 dark:hover:text-white"
                  }`}
                >
                  <X size={12} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <Handle type="source" position={Position.Right} className="mind-handle" />
    </div>
  );
}

export const MindNodeComponent = memo(MindNodeView);
