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

  const { data: map } = await supabase
    .from("mind_maps")
    .select("id, title, nodes, edges")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!map) notFound();

  return (
    <MindMapEditor
      mapId={map.id}
      initialTitle={map.title}
      initialNodes={map.nodes}
      initialEdges={map.edges}
    />
  );
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("mind_maps").select("title").eq("id", id).maybeSingle();
  return { title: data?.title ? `${data.title} — MindFlow` : "MindFlow" };
}
