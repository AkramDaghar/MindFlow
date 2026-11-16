import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MindMapEditor } from "@/components/editor/mind-map-editor";

export default async function MapPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [mapResult, listResult] = await Promise.all([
    supabase
      .from("mind_maps")
      .select("id, title, nodes, edges, snap_grid, cover_image")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("mind_maps")
      .select("id, title")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false }),
  ]);

  let { data: map, error } = mapResult;

  if (error && (error.code === "42703" || error.message.includes("does not exist"))) {
    const fallback = await supabase
      .from("mind_maps")
      .select("id, title, nodes, edges")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();
    map = fallback.data ? { ...fallback.data, snap_grid: true, cover_image: null } : null;
  }

  if (!map) notFound();

  const userMaps = (listResult.data ?? []).map((m) => ({
    id: m.id as string,
    title: (m.title as string) || "Untitled map",
  }));

  return (
    <MindMapEditor
      mapId={map.id}
      initialTitle={map.title}
      initialNodes={map.nodes}
      initialEdges={map.edges}
      initialSnapGrid={typeof map.snap_grid === "boolean" ? map.snap_grid : true}
      initialCoverImage={typeof map.cover_image === "string" ? map.cover_image : null}
      initialMaps={userMaps}
    />
  );
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("mind_maps").select("title").eq("id", id).maybeSingle();
  return { title: data?.title ? `${data.title} — MindFlow` : "MindFlow" };
}
