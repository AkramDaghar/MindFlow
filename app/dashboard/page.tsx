import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardHeader } from "@/components/dashboard/header";
import { MapGrid, type MapSummary } from "@/components/dashboard/map-grid";

export const metadata = { title: "Dashboard — MindFlow" };

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("mind_maps")
    .select("id, title, nodes, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  const maps: MapSummary[] = (data ?? []).map((m) => ({
    id: m.id as string,
    title: m.title as string,
    updated_at: m.updated_at as string,
    nodeCount: Array.isArray(m.nodes) ? m.nodes.length : 0,
  }));

  return (
    <div className="min-h-screen bg-neutral-50/60 dark:bg-neutral-950">
      <DashboardHeader email={user.email ?? ""} />
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
