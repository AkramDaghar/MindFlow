"use client";

import { createContext, useContext } from "react";
import type { ChecklistItem, NodeColor, NodeFile } from "@/lib/types";

export type EditorApi = {
  editingId: string | null;
  rootId: string;
  previewingFileId: string | null;
  startEditing: (id: string) => void;
  stopEditing: (id: string) => void;
  updateLabel: (id: string, label: string) => void;
  updateColor: (id: string, color: NodeColor) => void;
  updateChecklist: (id: string, checklist: ChecklistItem[]) => void;
  addFiles: (id: string, files: NodeFile[]) => void;
  removeFile: (nodeId: string, fileId: string) => void;
  previewFile: (file: NodeFile) => void;
  deleteNode: (id: string) => void;
  notify: (msg: string) => void;
  addSibling: (id: string) => void;
  undo: () => void;
};

export const EditorContext = createContext<EditorApi | null>(null);

export function useEditor() {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error("useEditor must be used inside EditorContext");
  return ctx;
}
