import type { SupabaseClient, User } from "@supabase/supabase-js";

export function getDefaultDisplayName(email?: string | null): string {
  if (!email) return "User";
  const at = email.indexOf("@");
  return (at > 0 ? email.slice(0, at) : email) || "User";
}

export type UserProfileInfo = {
  displayName: string;
  avatarUrl: string | null;
  profilesTableMissing: boolean;
};

export async function fetchUserProfile(
  supabase: SupabaseClient,
  user: User
): Promise<UserProfileInfo> {
  const fallbackName =
    (typeof user.user_metadata?.display_name === "string" &&
      user.user_metadata.display_name.trim()) ||
    getDefaultDisplayName(user.email);

  const { data, error } = await supabase
    .from("profiles")
    .select("display_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    const missing =
      error.code === "42P01" ||
      error.code === "PGRST205" ||
      error.message.includes("does not exist") ||
      error.message.includes("Could not find the table");
    return {
      displayName: fallbackName,
      avatarUrl: null,
      profilesTableMissing: missing,
    };
  }

  return {
    displayName: data?.display_name?.trim() || fallbackName,
    avatarUrl: typeof data?.avatar_url === "string" ? data.avatar_url : null,
    profilesTableMissing: false,
  };
}
