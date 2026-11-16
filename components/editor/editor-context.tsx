"use client";

import { createContext, useContext } from "react";

export type EditorApi = {
  editingId: string | null;
  rootId: string;
  startEditing: (id: string) => void;
  stopEditing: (id: string) => void;
  updateLabel: (id: string, label: string) => void;
  addSibling: (id: string) => void;
  undo: () => void;
};

export const EditorContext = createContext<EditorApi | null>(null);

export function useEditor() {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error("useEditor must be used inside EditorContext");
  return ctx;
}
