"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { Check, Loader2, MoreHorizontal, Network, Pencil, Plus, Trash2, X } from "lucide-react";
import { createMap, deleteMap, renameMap } from "@/app/dashboard/actions";

export type MapSummary = {
  id: string;
  title: string;
  updated_at: string;
  nodeCount: number;
};

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
}

function NewMapButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="group flex h-44 w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-neutral-300 bg-white text-neutral-500 transition hover:border-neutral-900 hover:text-neutral-900 disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-900/40 dark:text-neutral-400 dark:hover:border-neutral-300 dark:hover:text-white"
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-neutral-100 transition group-hover:bg-neutral-900 group-hover:text-white dark:bg-neutral-800 dark:group-hover:bg-white dark:group-hover:text-neutral-900">
        {pending ? <Loader2 size={20} className="animate-spin" /> : <Plus size={20} />}
      </span>
      <span className="text-sm font-medium">New Mind Map</span>
    </button>
  );
}

function MapCard({
  map,
  onRenamed,
  onDeleted,
}: {
  map: MapSummary;
  onRenamed: (title: string) => void;
  onDeleted: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [draft, setDraft] = useState(map.title);
  const [pending, startTransition] = useTransition();
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) {
        setMenuOpen(false);
        setConfirmDelete(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menuOpen]);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const submitRename = () => {
    const title = draft.trim() || "Untitled map";
    setEditing(false);
    if (title === map.title) return;
    onRenamed(title);
    startTransition(async () => {
      await renameMap(map.id, title);
    });
  };

  const doDelete = () => {
    setMenuOpen(false);
    onDeleted();
    startTransition(async () => {
      await deleteMap(map.id);
    });
  };

  return (
    <div className="group relative flex h-44 flex-col rounded-2xl border border-neutral-200 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition hover:-translate-y-0.5 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900">
      <Link
        href={`/map/${map.id}`}
        className="relative flex flex-1 items-center justify-center overflow-hidden rounded-t-2xl border-b border-neutral-100 [background-image:radial-gradient(circle,rgba(0,0,0,0.07)_1px,transparent_1px)] [background-size:14px_14px] dark:border-neutral-800 dark:[background-image:radial-gradient(circle,rgba(255,255,255,0.07)_1px,transparent_1px)]"
        aria-label={`Open ${map.title}`}
      >
        <Network size={28} className="text-neutral-300 transition group-hover:text-neutral-500 dark:text-neutral-700 dark:group-hover:text-neutral-500" />
      </Link>

      <div className="flex items-center justify-between gap-2 px-4 py-3">
        {editing ? (
          <div className="flex min-w-0 flex-1 items-center gap-1">
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitRename();
                if (e.key === "Escape") {
                  setDraft(map.title);
                  setEditing(false);
                }
              }}
              onBlur={submitRename}
              className="min-w-0 flex-1 rounded-md border border-neutral-300 bg-transparent px-2 py-1 text-sm outline-none focus:border-neutral-500 dark:border-neutral-700"
              maxLength={200}
            />
            <button onMouseDown={(e) => e.preventDefault()} onClick={submitRename} className="rounded p-1 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800" aria-label="Save name">
              <Check size={14} />
            </button>
          </div>
        ) : (
          <Link href={`/map/${map.id}`} className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{map.title}</p>
            <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
              {map.nodeCount} node{map.nodeCount === 1 ? "" : "s"} · {timeAgo(map.updated_at)}
              {pending && " · saving…"}
            </p>
          </Link>
        )}

        {!editing && (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="rounded-md p-1.5 text-neutral-400 opacity-100 transition hover:bg-neutral-100 hover:text-neutral-900 sm:opacity-0 sm:group-hover:opacity-100 dark:hover:bg-neutral-800 dark:hover:text-white"
              aria-label="Map options"
            >
              <MoreHorizontal size={16} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 bottom-9 z-10 w-44 overflow-hidden rounded-lg border border-neutral-200 bg-white p-1 text-sm shadow-lg dark:border-neutral-800 dark:bg-neutral-900">
                {confirmDelete ? (
                  <div className="p-2">
                    <p className="mb-2 text-xs text-neutral-500">Delete this map forever?</p>
                    <div className="flex gap-1">
                      <button onClick={doDelete} className="flex-1 rounded-md bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700">
                        Delete
                      </button>
                      <button onClick={() => setConfirmDelete(false)} className="rounded-md px-2 py-1 text-xs hover:bg-neutral-100 dark:hover:bg-neutral-800" aria-label="Cancel">
                        <X size={12} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        setDraft(map.title);
                        setEditing(true);
                      }}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-neutral-100 dark:hover:bg-neutral-800"
                    >
                      <Pencil size={14} /> Rename
                    </button>
                    <button
                      onClick={() => setConfirmDelete(true)}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function MapGrid({ maps: initialMaps }: { maps: MapSummary[] }) {
  const [maps, setMaps] = useState(initialMaps);
  useEffect(() => setMaps(initialMaps), [initialMaps]);

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <form action={createMap}>
        <NewMapButton />
      </form>
      {maps.map((m) => (
        <MapCard
          key={m.id}
          map={m}
          onRenamed={(title) =>
            setMaps((all) => all.map((x) => (x.id === m.id ? { ...x, title } : x)))
          }
          onDeleted={() => setMaps((all) => all.filter((x) => x.id !== m.id))}
        />
      ))}
    </div>
  );
}
