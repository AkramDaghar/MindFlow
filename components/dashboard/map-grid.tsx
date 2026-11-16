"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2, Network, Plus, Settings } from "lucide-react";
import { createMap } from "@/app/dashboard/actions";
import { MapSettingsModal } from "@/components/map-settings-modal";

export type MapSummary = {
  id: string;
  title: string;
  updated_at: string;
  nodeCount: number;
  snapGrid: boolean;
  coverImage: string | null;
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
  onOpenSettings,
}: {
  map: MapSummary;
  onOpenSettings: () => void;
}) {
  return (
    <div className="group relative flex h-44 flex-col rounded-2xl border border-neutral-200 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition hover:-translate-y-0.5 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900">
      <Link
        href={`/map/${map.id}`}
        className="relative flex flex-1 items-center justify-center overflow-hidden rounded-t-2xl border-b border-neutral-100 [background-image:radial-gradient(circle,rgba(0,0,0,0.07)_1px,transparent_1px)] [background-size:14px_14px] dark:border-neutral-800 dark:[background-image:radial-gradient(circle,rgba(255,255,255,0.07)_1px,transparent_1px)]"
        aria-label={`Open ${map.title}`}
      >
        {map.coverImage ? (
          <img
            src={map.coverImage}
            alt={map.title}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <Network
            size={28}
            className="text-neutral-300 transition group-hover:text-neutral-500 dark:text-neutral-700 dark:group-hover:text-neutral-500"
          />
        )}
      </Link>

      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <Link href={`/map/${map.id}`} className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{map.title}</p>
          <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
            {map.nodeCount} node{map.nodeCount === 1 ? "" : "s"} · {timeAgo(map.updated_at)}
          </p>
        </Link>

        <button
          type="button"
          onClick={onOpenSettings}
          className="rounded-md p-1.5 text-neutral-400 opacity-100 transition hover:bg-neutral-100 hover:text-neutral-900 sm:opacity-0 sm:group-hover:opacity-100 dark:hover:bg-neutral-800 dark:hover:text-white"
          aria-label="Map settings"
          title="Map settings"
        >
          <Settings size={16} />
        </button>
      </div>
    </div>
  );
}

export function MapGrid({ maps: initialMaps }: { maps: MapSummary[] }) {
  const [maps, setMaps] = useState(initialMaps);
  const [settingsId, setSettingsId] = useState<string | null>(null);
  useEffect(() => setMaps(initialMaps), [initialMaps]);

  const activeMap = maps.find((m) => m.id === settingsId) ?? null;

  return (
    <>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <form action={createMap}>
          <NewMapButton />
        </form>
        {maps.map((m) => (
          <MapCard key={m.id} map={m} onOpenSettings={() => setSettingsId(m.id)} />
        ))}
      </div>

      {activeMap && (
        <MapSettingsModal
          map={activeMap}
          onClose={() => setSettingsId(null)}
          onUpdated={(patch) =>
            setMaps((all) =>
              all.map((x) => (x.id === activeMap.id ? { ...x, ...patch } : x))
            )
          }
          onDeleted={() => setMaps((all) => all.filter((x) => x.id !== activeMap.id))}
        />
      )}
    </>
  );
}
