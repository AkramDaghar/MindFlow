import Link from "next/link";
import { ArrowRight, Cloud, Infinity as InfinityIcon, Keyboard } from "lucide-react";
import { Logo } from "@/components/logo";
import { MindMapPreview } from "@/components/landing/mind-map-preview";

const features = [
  {
    icon: Keyboard,
    title: "Instant Keyboard Node Creation",
    body: "Press Enter for a child, Tab for a sibling, arrows to move. Capture ideas as fast as you can think — your hands never leave the keyboard.",
  },
  {
    icon: InfinityIcon,
    title: "Infinite Canvas",
    body: "Pan, zoom and sprawl out. There are no page edges, so your thinking can grow in every direction without feeling cramped.",
  },
  {
    icon: Cloud,
    title: "Cloud Sync Across Devices",
    body: "Every change auto-saves to the cloud within a second. Open your maps on any device and pick up exactly where you left off.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Navbar */}
      <header className="sticky top-0 z-30 border-b border-neutral-200/70 bg-white/80 backdrop-blur dark:border-neutral-800/70 dark:bg-neutral-950/80">
        <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <Logo />
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-md px-3 py-1.5 text-sm font-medium text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-white"
            >
              Log In
            </Link>
            <Link
              href="/signup"
              className="hidden rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-neutral-700 sm:inline-block dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
            >
              Sign Up
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 [background-image:radial-gradient(circle,rgba(0,0,0,0.07)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_75%)] dark:[background-image:radial-gradient(circle,rgba(255,255,255,0.08)_1px,transparent_1px)]"
        />
        <div className="relative mx-auto max-w-6xl px-6 pb-20 pt-20 text-center sm:pt-28">
          <span className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs font-medium text-neutral-600 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Keyboard-first · Free forever
          </span>
          <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
            Think in maps.
            <br />
            <span className="text-neutral-400 dark:text-neutral-500">Type at the speed of thought.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base text-pretty text-neutral-600 sm:text-lg dark:text-neutral-400">
            MindFlow is a minimalist mind-map notebook. Branch ideas with a single
            keystroke on an infinite canvas — and have every thought synced to the cloud.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/signup"
              className="group inline-flex items-center gap-2 rounded-lg bg-neutral-900 px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
            >
              Get Started for Free
              <ArrowRight size={16} className="transition group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center rounded-lg px-5 py-3 text-sm font-medium text-neutral-600 transition hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
            >
              I already have an account
            </Link>
          </div>

          <div className="mx-auto mt-16 max-w-4xl">
            <MindMapPreview />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-neutral-200/70 dark:border-neutral-800/70">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Everything you need. Nothing you don&apos;t.
            </h2>
            <p className="mt-4 text-neutral-600 dark:text-neutral-400">
              A calm, distraction-free space built around a handful of shortcuts.
            </p>
          </div>
          <div className="mt-14 grid gap-5 md:grid-cols-3">
            {features.map(({ icon: Icon, title, body }) => (
              <div
                key={title}
                className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800">
                  <Icon size={18} />
                </div>
                <h3 className="mt-5 font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
                  {body}
                </p>
              </div>
            ))}
          </div>

          {/* Shortcut strip */}
          <div className="mx-auto mt-12 flex max-w-3xl flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm text-neutral-500 dark:text-neutral-400">
            {[
              ["Enter", "child node"],
              ["Tab", "sibling node"],
              ["⌫", "delete"],
              ["← ↑ ↓ →", "navigate"],
            ].map(([k, label]) => (
              <span key={k} className="inline-flex items-center gap-2">
                <kbd className="rounded-md border border-neutral-200 bg-white px-2 py-0.5 font-mono text-xs shadow-[0_1px_0_rgba(0,0,0,0.08)] dark:border-neutral-700 dark:bg-neutral-900">
                  {k}
                </kbd>
                {label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="px-6 pb-24">
        <div className="mx-auto max-w-4xl rounded-3xl border border-neutral-200 bg-neutral-50 px-8 py-16 text-center dark:border-neutral-800 dark:bg-neutral-900">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Your next big idea starts with one node.
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-neutral-600 dark:text-neutral-400">
            Create a free account in seconds and start mapping. No credit card, no clutter.
          </p>
          <Link
            href="/signup"
            className="group mt-8 inline-flex items-center gap-2 rounded-lg bg-neutral-900 px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
          >
            Create your free account
            <ArrowRight size={16} className="transition group-hover:translate-x-0.5" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-neutral-200/70 dark:border-neutral-800/70">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-8 text-sm text-neutral-500 sm:flex-row">
          <Logo />
          <p>© {new Date().getFullYear()} MindFlow. Built for thinkers.</p>
        </div>
      </footer>
    </div>
  );
}
