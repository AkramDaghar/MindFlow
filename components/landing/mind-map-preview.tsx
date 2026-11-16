"use client";

import { useState } from "react";
import { ArrowLeft, Check, Download, Minus, Moon, Plus } from "lucide-react";

type PNode = { id: string; label: string; x: number; y: number; root?: boolean; delay: number };

// Coordinates live in an 800 × 380 virtual space (percent-positioned for responsiveness)
const W = 800;
const H = 380;

const NODES: PNode[] = [
  { id: "root", label: "Product launch 🚀", x: 400, y: 190, root: true, delay: 0 },
  { id: "a", label: "Research", x: 165, y: 105, delay: 250 },
  { id: "b", label: "Audience", x: 165, y: 275, delay: 400 },
  { id: "c", label: "Roadmap", x: 635, y: 85, delay: 550 },
  { id: "d", label: "Design system", x: 635, y: 190, delay: 700 },
  { id: "e", label: "Marketing site", x: 635, y: 295, delay: 850 },
];

const EDGES: [string, string][] = [
  ["root", "a"],
  ["root", "b"],
  ["root", "c"],
  ["root", "d"],
  ["root", "e"],
];

function edgePath(from: PNode, to: PNode) {
  const dir = to.x > from.x ? 1 : -1;
  const sx = from.x + dir * (from.root ? 90 : 55);
  const tx = to.x - dir * 60;
  const mx = (sx + tx) / 2;
  return `M ${sx} ${from.y} C ${mx} ${from.y}, ${mx} ${to.y}, ${tx} ${to.y}`;
}

export function MindMapPreview() {
  const [selected, setSelected] = useState("e");
  const byId = Object.fromEntries(NODES.map((n) => [n.id, n]));

  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white text-left shadow-[0_20px_60px_-20px_rgba(0,0,0,0.25)] dark:border-neutral-800 dark:bg-neutral-900">
      {/* Fake toolbar */}
      <div className="flex items-center justify-between border-b border-neutral-200 px-3 py-2 dark:border-neutral-800">
        <div className="flex items-center gap-2 text-sm">
          <span className="flex h-7 w-7 items-center justify-center rounded-md text-neutral-400">
            <ArrowLeft size={15} />
          </span>
          <span className="font-medium">Q3 Planning</span>
          <span className="ml-2 hidden items-center gap-1 text-xs text-neutral-400 sm:inline-flex">
            <Check size={12} /> Saved
          </span>
        </div>
        <div className="flex items-center gap-1 text-neutral-400">
          <span className="flex h-7 w-7 items-center justify-center"><Minus size={14} /></span>
          <span className="text-xs tabular-nums">100%</span>
          <span className="flex h-7 w-7 items-center justify-center"><Plus size={14} /></span>
          <span className="mx-1 h-4 w-px bg-neutral-200 dark:bg-neutral-800" />
          <span className="flex h-7 w-7 items-center justify-center"><Download size={14} /></span>
          <span className="flex h-7 w-7 items-center justify-center"><Moon size={14} /></span>
        </div>
      </div>

      {/* Canvas */}
      <div
        className="relative w-full [background-image:radial-gradient(circle,rgba(0,0,0,0.09)_1px,transparent_1px)] [background-size:18px_18px] dark:[background-image:radial-gradient(circle,rgba(255,255,255,0.08)_1px,transparent_1px)]"
        style={{ aspectRatio: `${W} / ${H}` }}
      >
        <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
          {EDGES.map(([s, t], i) => (
            <path
              key={`${s}-${t}`}
              d={edgePath(byId[s], byId[t])}
              fill="none"
              className="animate-draw stroke-neutral-300 dark:stroke-neutral-600"
              strokeWidth={1.75}
              style={{ animationDelay: `${150 + i * 150}ms` }}
            />
          ))}
        </svg>

        {NODES.map((n) => {
          const isSel = selected === n.id;
          return (
            <button
              key={n.id}
              type="button"
              onClick={() => setSelected(n.id)}
              className={`animate-float-in absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-lg border px-2.5 py-1.5 text-[11px] font-medium shadow-sm transition sm:px-3.5 sm:py-2 sm:text-sm ${
                n.root
                  ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900"
                  : "border-neutral-200 bg-white text-neutral-800 hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
              } ${isSel ? "ring-2 ring-blue-500/70 ring-offset-2 ring-offset-white dark:ring-offset-neutral-900" : ""}`}
              style={{
                left: `${(n.x / W) * 100}%`,
                top: `${(n.y / H) * 100}%`,
                animationDelay: `${n.delay}ms`,
              }}
            >
              {n.label}
              {isSel && !n.root && (
                <span className="animate-caret ml-0.5 inline-block h-3.5 w-px translate-y-0.5 bg-current" />
              )}
            </button>
          );
        })}

        <div className="absolute bottom-3 left-1/2 hidden -translate-x-1/2 items-center gap-3 rounded-full border border-neutral-200 bg-white/90 px-3 py-1.5 text-[11px] text-neutral-500 shadow-sm backdrop-blur sm:flex dark:border-neutral-700 dark:bg-neutral-800/90 dark:text-neutral-400">
          <span><kbd className="font-mono">Enter</kbd> child</span>
          <span><kbd className="font-mono">Tab</kbd> sibling</span>
          <span><kbd className="font-mono">⌫</kbd> delete</span>
          <span><kbd className="font-mono">←↑↓→</kbd> move</span>
        </div>
      </div>
    </div>
  );
}
