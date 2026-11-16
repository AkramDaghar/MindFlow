"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ImagePlus, Loader2, Network, Settings, Trash2, X } from "lucide-react";
import { deleteMap, updateMapSettings } from "@/app/dashboard/actions";
import { ImageCropper } from "@/components/dashboard/image-cropper";

export type MapSettingsTarget = {
  id: string;
  title: string;
  snapGrid: boolean;
  coverImage: string | null;
};

type Props = {
  map: MapSettingsTarget;
  onClose: () => void;
  onUpdated: (patch: Partial<MapSettingsTarget>) => void;
  onDeleted: () => void;
};

export function MapSettingsModal({ map, onClose, onUpdated, onDeleted }: Props) {
  const [titleDraft, setTitleDraft] = useState(map.title);
  const [snapGrid, setSnapGrid] = useState(map.snapGrid);
  const [coverImage, setCoverImage] = useState<string | null>(map.coverImage);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedFlag, setSavedFlag] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (cropSrc) URL.revokeObjectURL(cropSrc);
    };
  }, [cropSrc]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (cropSrc) setCropSrc(null);
        else onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, cropSrc]);

  const persistPatch = async (
    patch: { title?: string; snapGrid?: boolean; coverImage?: string | null },
    rollback?: () => void
  ) => {
    setError(null);
    setSaving(true);
    setSavedFlag(false);
    const res = await updateMapSettings(map.id, patch);
    setSaving(false);
    if (res?.error) {
      setError(res.error);
      rollback?.();
      return false;
    }
    setSavedFlag(true);
    return true;
  };

  const handleRename = async () => {
    const clean = titleDraft.trim() || "Untitled map";
    setTitleDraft(clean);
    if (clean === map.title) return;
    const prev = map.title;
    onUpdated({ title: clean });
    await persistPatch({ title: clean }, () => {
      setTitleDraft(prev);
      onUpdated({ title: prev });
    });
  };

  const handleToggleSnapGrid = async () => {
    const next = !snapGrid;
    const prev = snapGrid;
    setSnapGrid(next);
    onUpdated({ snapGrid: next });
    await persistPatch({ snapGrid: next }, () => {
      setSnapGrid(prev);
      onUpdated({ snapGrid: prev });
    });
  };

  const handlePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      return;
    }
    setError(null);
    setCropSrc(URL.createObjectURL(file));
  };

  const handleConfirmCrop = async (croppedDataUrl: string) => {
    const prev = coverImage;
    setCoverImage(croppedDataUrl);
    onUpdated({ coverImage: croppedDataUrl });
    setCropSrc(null);
    await persistPatch({ coverImage: croppedDataUrl }, () => {
      setCoverImage(prev);
      onUpdated({ coverImage: prev });
    });
  };

  const handleRemovePicture = async () => {
    const prev = coverImage;
    setCoverImage(null);
    onUpdated({ coverImage: null });
    await persistPatch({ coverImage: null }, () => {
      setCoverImage(prev);
      onUpdated({ coverImage: prev });
    });
  };

  const handleDelete = async () => {
    setSaving(true);
    const res = await deleteMap(map.id);
    if (res?.error) {
      setSaving(false);
      setError(res.error);
      return;
    }
    onDeleted();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Mind map settings"
    >
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xl dark:border-neutral-800 dark:bg-neutral-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-3.5 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <Settings size={16} className="text-neutral-500" />
            <h2 className="text-sm font-semibold">
              {cropSrc ? "Crop & position picture" : "Mind map settings"}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {saving && <Loader2 size={14} className="animate-spin text-neutral-400" />}
            {!saving && savedFlag && (
              <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                <Check size={12} /> Saved
              </span>
            )}
            <button
              type="button"
              onClick={() => (cropSrc ? setCropSrc(null) : onClose())}
              className="rounded-md p-1 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-white"
              aria-label={cropSrc ? "Back to settings" : "Close settings"}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {cropSrc ? (
          <ImageCropper
            src={cropSrc}
            onCancel={() => setCropSrc(null)}
            onConfirm={handleConfirmCrop}
          />
        ) : (
          <div className="space-y-5 p-5">
            {error && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
                {error}
              </p>
            )}

            {/* 1. Rename */}
            <div className="space-y-1.5">
              <label htmlFor="map-rename-input" className="block text-xs font-medium text-neutral-600 dark:text-neutral-300">
                Rename
              </label>
              <div className="flex gap-2">
                <input
                  id="map-rename-input"
                  value={titleDraft}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void handleRename();
                    }
                  }}
                  maxLength={200}
                  className="min-w-0 flex-1 rounded-lg border border-neutral-200 bg-transparent px-3 py-1.5 text-sm outline-none transition focus:border-neutral-400 dark:border-neutral-700 dark:focus:border-neutral-500"
                />
                <button
                  type="button"
                  onClick={() => void handleRename()}
                  disabled={saving || (titleDraft.trim() || "Untitled map") === map.title}
                  className="rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-neutral-700 disabled:opacity-40 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
                >
                  Save
                </button>
              </div>
            </div>

            {/* 2. Picture */}
            <div className="space-y-2">
              <span className="block text-xs font-medium text-neutral-600 dark:text-neutral-300">
                Picture <span className="font-normal text-neutral-400">(optional)</span>
              </span>
              <div className="flex items-center gap-3">
                <div className="flex h-16 w-28 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-950">
                  {coverImage ? (
                    <img src={coverImage} alt={map.title} className="h-full w-full object-cover" />
                  ) : (
                    <Network size={20} className="text-neutral-300 dark:text-neutral-700" />
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePictureChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={saving}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium transition hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
                  >
                    <ImagePlus size={14} />
                    {coverImage ? "Change picture" : "Upload picture"}
                  </button>
                  {coverImage && (
                    <button
                      type="button"
                      onClick={() => void handleRemovePicture()}
                      disabled={saving}
                      className="rounded-lg px-2.5 py-1.5 text-xs text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* 3. Snap grid toggle */}
            <div className="flex items-center justify-between gap-4 rounded-xl border border-neutral-200 px-3.5 py-3 dark:border-neutral-800">
              <div>
                <p className="text-sm font-medium">Snap grid</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Align nodes to the invisible grid when moving them.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={snapGrid}
                aria-label="Toggle snap grid"
                onClick={() => void handleToggleSnapGrid()}
                disabled={saving}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors disabled:opacity-50 ${
                  snapGrid
                    ? "bg-neutral-900 dark:bg-white"
                    : "bg-neutral-200 dark:bg-neutral-700"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform dark:bg-neutral-900 ${
                    snapGrid ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {/* 4. Delete */}
            <div className="border-t border-neutral-200 pt-4 dark:border-neutral-800">
              {confirmDelete ? (
                <div className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 dark:border-red-900/50 dark:bg-red-950/30">
                  <span className="text-xs font-medium text-red-700 dark:text-red-300">
                    Delete this map forever?
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => void handleDelete()}
                      disabled={saving}
                      className="rounded-md bg-red-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      Delete
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className="rounded-md px-2 py-1 text-xs text-neutral-600 hover:bg-black/5 dark:text-neutral-300 dark:hover:bg-white/10"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                >
                  <Trash2 size={14} /> Delete mind map
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
