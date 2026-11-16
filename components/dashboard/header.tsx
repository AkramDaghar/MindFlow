import { LogOut } from "lucide-react";
import { logout } from "@/app/auth/actions";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";

export function DashboardHeader({ email }: { email: string }) {
  const initial = (email[0] ?? "?").toUpperCase();

  return (
    <header className="sticky top-0 z-20 border-b border-neutral-200/70 bg-white/80 backdrop-blur dark:border-neutral-800/70 dark:bg-neutral-950/80">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <Logo href="/dashboard" />
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <div className="flex items-center gap-2">
            <span
              className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-neutral-700 to-neutral-900 text-xs font-semibold text-white dark:from-neutral-200 dark:to-neutral-400 dark:text-neutral-900"
              aria-hidden
            >
              {initial}
            </span>
            <span className="hidden max-w-[200px] truncate text-sm text-neutral-600 sm:inline dark:text-neutral-300">
              {email}
            </span>
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
      </div>
    </header>
  );
}
