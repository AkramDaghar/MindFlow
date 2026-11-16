export const NODE_COLORS = [
  {
    key: "white",
    label: "White",
    swatch: "#ffffff",
    border: "#d4d4d4",
    bg: "#ffffff",
    className: "border-neutral-300 bg-white text-neutral-900",
    darkCheck: true,
  },
  {
    key: "black",
    label: "Black",
    swatch: "#171717",
    border: "#171717",
    bg: "#171717",
    className: "border-neutral-900 bg-neutral-900 text-white dark:border-neutral-600",
    darkCheck: false,
  },
  {
    key: "blue",
    label: "Blue",
    swatch: "#3b82f6",
    border: "#3b82f6",
    bg: "rgba(59, 130, 246, 0.34)",
    className: "border-[1.5px] text-neutral-900 dark:text-white",
    darkCheck: false,
  },
  {
    key: "emerald",
    label: "Green",
    swatch: "#10b981",
    border: "#10b981",
    bg: "rgba(16, 185, 129, 0.34)",
    className: "border-[1.5px] text-neutral-900 dark:text-white",
    darkCheck: false,
  },
  {
    key: "amber",
    label: "Amber",
    swatch: "#f59e0b",
    border: "#f59e0b",
    bg: "rgba(245, 158, 11, 0.34)",
    className: "border-[1.5px] text-neutral-900 dark:text-white",
    darkCheck: false,
  },
  {
    key: "rose",
    label: "Rose",
    swatch: "#f43f5e",
    border: "#f43f5e",
    bg: "rgba(244, 63, 94, 0.34)",
    className: "border-[1.5px] text-neutral-900 dark:text-white",
    darkCheck: false,
  },
  {
    key: "violet",
    label: "Violet",
    swatch: "#8b5cf6",
    border: "#8b5cf6",
    bg: "rgba(139, 92, 246, 0.34)",
    className: "border-[1.5px] text-neutral-900 dark:text-white",
    darkCheck: false,
  },
] as const;

export type NodeColor = (typeof NODE_COLORS)[number]["key"];

export const NODE_COLOR_MAP: Record<NodeColor, (typeof NODE_COLORS)[number]> = Object.fromEntries(
  NODE_COLORS.map((c) => [c.key, c])
) as Record<NodeColor, (typeof NODE_COLORS)[number]>;

export const ALLOWED_NODE_FILE_EXTENSIONS = ["pdf", "doc", "docx", "pptx", "xlsx"] as const;
export type NodeFileExt = (typeof ALLOWED_NODE_FILE_EXTENSIONS)[number];

export type NodeFile = {
  id: string;
  name: string;
  ext: NodeFileExt;
  dataUrl: string;
};

export const MAX_NODE_FILE_BYTES = 5 * 1024 * 1024; // 5 MB

export type ChecklistItem = {
  id: string;
  text: string;
  checked: boolean;
};

export type MindNodeData = {
  label: string;
  color?: NodeColor;
  files?: NodeFile[];
  checklist?: ChecklistItem[];
};

export type StoredNode = {
  id: string;
  type: "mind";
  position: { x: number; y: number };
  data: MindNodeData;
};

export type StoredEdge = {
  id: string;
  source: string;
  target: string;
};

export type MindMapRecord = {
  id: string;
  user_id: string;
  title: string;
  nodes: StoredNode[];
  edges: StoredEdge[];
  snap_grid: boolean;
  cover_image: string | null;
  created_at: string;
  updated_at: string;
};

export const ROOT_NODE_ID = "root";

export function createInitialNodes(): StoredNode[] {
  return [
    {
      id: ROOT_NODE_ID,
      type: "mind",
      position: { x: 0, y: 0 },
      data: { label: "Central idea" },
    },
  ];
}
