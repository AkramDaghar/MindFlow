import Link from "next/link";

export default function MapNotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-semibold">Map not found</h1>
      <p className="text-sm text-neutral-500 dark:text-neutral-400">
        This mind map doesn&apos;t exist or you don&apos;t have access to it.
      </p>
      <Link
        href="/dashboard"
        className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-neutral-900"
      >
        Back to dashboard
      </Link>
    </div>
  );
}
