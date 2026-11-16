export type MindNodeData = {
  label: string;
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
