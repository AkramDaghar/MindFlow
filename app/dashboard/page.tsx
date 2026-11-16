import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchUserProfile } from "@/lib/account";
import { DashboardHeader } from "@/components/dashboard/header";
import { MapGrid, type MapSummary } from "@/components/dashboard/map-grid";

export const metadata = { title: "Dashboard — MindFlow" };

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await fetchUserProfile(supabase, user);

  let migrationNeeded = false;
  let { data, error } = await supabase
    .from("mind_maps")
    .select("id, title, nodes, updated_at, snap_grid, cover_image")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (error && (error.code === "42703" || error.message.includes("does not exist"))) {
    migrationNeeded = true;
    const fallback = await supabase
      .from("mind_maps")
      .select("id, title, nodes, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });
    data = fallback.data?.map((m) => ({ ...m, snap_grid: true, cover_image: null })) ?? null;
    error = fallback.error;
  }

  const maps: MapSummary[] = (data ?? []).map((m) => ({
    id: m.id as string,
    title: m.title as string,
    updated_at: m.updated_at as string,
    nodeCount: Array.isArray(m.nodes) ? m.nodes.length : 0,
    snapGrid: typeof m.snap_grid === "boolean" ? m.snap_grid : true,
    coverImage: typeof m.cover_image === "string" ? m.cover_image : null,
  }));

  return (
    <div className="min-h-screen bg-neutral-50/60 dark:bg-neutral-950">
      <DashboardHeader
        displayName={profile.displayName}
        avatarUrl={profile.avatarUrl}
      />
      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Your mind maps</h1>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
              {maps.length === 0
                ? "Create your first map to get started."
                : `${maps.length} map${maps.length === 1 ? "" : "s"}`}
            </p>
          </div>
        </div>
        {migrationNeeded && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
            <p className="font-medium">Database update needed for Picture &amp; Snap Grid settings</p>
            <p className="mt-1 text-xs opacity-90">
              Run this in your Supabase Dashboard → SQL Editor so map pictures and snap-grid preferences save:
            </p>
            <pre className="mt-2 overflow-x-auto rounded-lg bg-black/5 px-3 py-2 font-mono text-xs dark:bg-black/30">
              {`alter table public.mind_maps\n  add column if not exists snap_grid boolean not null default true,\n  add column if not exists cover_image text;`}
            </pre>
          </div>
        )}
        {error && (
          <p className="mb-6 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
            Could not load your maps: {error.message}
          </p>
        )}
        <MapGrid maps={maps} />
      </main>
    </div>
  );
}
