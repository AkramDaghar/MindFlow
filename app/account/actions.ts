"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getDefaultDisplayName } from "@/lib/account";

export type ActionResult = { error?: string; message?: string };

export async function updateDisplayName(
  displayName: string
): Promise<ActionResult & { displayName?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in." };

  const clean = displayName.trim().slice(0, 80) || getDefaultDisplayName(user.email);

  const { error: authErr } = await supabase.auth.updateUser({
    data: { display_name: clean },
  });
  if (authErr) return { error: authErr.message };

  const { error: profErr } = await supabase
    .from("profiles")
    .upsert({ id: user.id, display_name: clean }, { onConflict: "id" });

  // Ignore missing table error so display name still saves via user_metadata
  if (
    profErr &&
    profErr.code !== "42P01" &&
    profErr.code !== "PGRST205" &&
    !profErr.message.includes("does not exist") &&
    !profErr.message.includes("Could not find the table")
  ) {
    return { error: profErr.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/account");
  return { message: "Display name updated.", displayName: clean };
}

export async function updateAvatar(avatarUrl: string | null): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in." };

  if (avatarUrl !== null) {
    if (!avatarUrl.startsWith("data:image/") || avatarUrl.length > 400_000) {
      return { error: "Invalid or oversized image. Please choose a smaller picture." };
    }
  }

  const { error } = await supabase
    .from("profiles")
    .upsert({ id: user.id, avatar_url: avatarUrl }, { onConflict: "id" });

  if (error) {
    if (
      error.code === "42P01" ||
      error.code === "PGRST205" ||
      error.message.includes("does not exist") ||
      error.message.includes("Could not find the table")
    ) {
      return {
        error: "Run the profiles table SQL in Supabase SQL Editor first to save profile pictures.",
      };
    }
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/account");
  return { message: avatarUrl ? "Profile picture updated." : "Profile picture removed." };
}

export async function updateEmail(newEmail: string): Promise<ActionResult> {
  const clean = newEmail.trim().toLowerCase();
  if (!clean || !clean.includes("@")) {
    return { error: "Please enter a valid email address." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in." };

  if (user.email?.toLowerCase() === clean) {
    return { error: "New email must be different from your current email." };
  }

  const origin = (await headers()).get("origin") ?? "";
  const { error } = await supabase.auth.updateUser(
    { email: clean },
    origin ? { emailRedirectTo: `${origin}/auth/callback?next=/account` } : undefined
  );

  if (error) return { error: error.message };

  return {
    message: `Verification link sent to ${clean}. Check your inbox to confirm the change.`,
  };
}

export async function updatePassword(
  currentPassword: string,
  newPassword: string,
  confirmPassword: string
): Promise<ActionResult> {
  if (!currentPassword || !newPassword || !confirmPassword) {
    return { error: "All password fields are required." };
  }
  if (newPassword.length < 6) {
    return { error: "New password must be at least 6 characters." };
  }
  if (newPassword !== confirmPassword) {
    return { error: "New passwords do not match." };
  }
  if (currentPassword === newPassword) {
    return { error: "New password must be different from your current password." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.email) return { error: "You must be logged in." };

  // Verify the old password before allowing a change
  const { error: verifyErr } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });
  if (verifyErr) {
    return { error: "Current password is incorrect." };
  }

  const { error: updateErr } = await supabase.auth.updateUser({
    password: newPassword,
  });
  if (updateErr) return { error: updateErr.message };

  return { message: "Password updated successfully." };
}
