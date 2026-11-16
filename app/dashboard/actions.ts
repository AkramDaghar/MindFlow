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
  revalidatePath(`/map/${id}`);
  return { ok: true };
}

export type MapSettingsPatch = {
  title?: string;
  snapGrid?: boolean;
  coverImage?: string | null;
};

export async function updateMapSettings(id: string, patch: MapSettingsPatch) {
  const update: Record<string, unknown> = {};
  if (patch.title !== undefined) {
    update.title = patch.title.trim().slice(0, 200) || "Untitled map";
  }
  if (patch.snapGrid !== undefined) {
    update.snap_grid = Boolean(patch.snapGrid);
  }
  if (patch.coverImage !== undefined) {
    if (patch.coverImage === null) {
      update.cover_image = null;
    } else if (
      typeof patch.coverImage === "string" &&
      patch.coverImage.startsWith("data:image/") &&
      patch.coverImage.length <= 600_000
    ) {
      update.cover_image = patch.coverImage;
    } else {
      return { error: "Invalid or oversized image. Please choose a smaller picture." };
    }
  }

  if (Object.keys(update).length === 0) return { ok: true };

  const supabase = await createClient();
  const { error } = await supabase.from("mind_maps").update(update).eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  revalidatePath(`/map/${id}`);
  return { ok: true };
}

export async function deleteMap(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("mind_maps").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  return { ok: true };
}
