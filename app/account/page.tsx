import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, LogOut } from "lucide-react";
import { logout } from "@/app/auth/actions";
import { createClient } from "@/lib/supabase/server";
import { fetchUserProfile } from "@/lib/account";
import { Logo } from "@/components/logo";
import { AccountSettings } from "@/components/account/account-settings";

export const metadata = { title: "Account settings — MindFlow" };

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await fetchUserProfile(supabase, user);

  return (
    <div className="min-h-screen bg-neutral-50/60 dark:bg-neutral-950">
      <header className="sticky top-0 z-20 border-b border-neutral-200/70 bg-white/80 backdrop-blur dark:border-neutral-800/70 dark:bg-neutral-950/80">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white"
              title="Back to dashboard"
              aria-label="Back to dashboard"
            >
              <ArrowLeft size={16} />
            </Link>
            <Logo href="/dashboard" />
          </div>
          <form action={logout}>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-md border border-neutral-200 px-2.5 py-1.5 text-sm font-medium text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-900 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-white"
            >
              <LogOut size={14} />
              Log Out
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight">Account settings</h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Manage your profile, appearance, email, and password.
          </p>
        </div>

        <AccountSettings
          initialEmail={user.email ?? ""}
          initialDisplayName={profile.displayName}
          initialAvatarUrl={profile.avatarUrl}
          profilesTableMissing={profile.profilesTableMissing}
        />
      </main>
    </div>
  );
}
