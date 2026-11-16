"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createInitialNodes } from "@/lib/types";

export async function createMap() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("mind_maps")
    .insert({
      user_id: user.id,
      title: "Untitled map",
      nodes: createInitialNodes(),
      edges: [],
    })
    .select("id")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Could not create map");

  revalidatePath("/dashboard");
  redirect(`/map/${data.id}`);
}

export async function renameMap(id: string, title: string) {
  const clean = title.trim().slice(0, 200) || "Untitled map";
  const supabase = await createClient();
  const { error } = await supabase.from("mind_maps").update({ title: clean }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteMap(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("mind_maps").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  return { ok: true };
}
