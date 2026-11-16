import Link from "next/link";
import { Network } from "lucide-react";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2 font-semibold tracking-tight">
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-neutral-900">
        <Network size={15} strokeWidth={2.25} />
      </span>
      <span>MindFlow</span>
    </Link>
  );
}
