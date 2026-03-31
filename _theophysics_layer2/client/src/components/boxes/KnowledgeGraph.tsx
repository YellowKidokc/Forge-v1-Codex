import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";

interface KnowledgeGraphProps {
  activeNodeId: string | null;
  onSelectNode?: (nodeId: string) => void;
}

interface GraphNode {
  id: string;
  title: string;
  categorySlug: string | null;
  avg7qScore: string | null;
  chainPosition: number;
  bridgeCount: number;
  killCount: number;
}

interface GraphEdge {
  source: string;
  target: string;
  type: "chain" | "reference";
}

interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

const CATEGORY_COLORS: Record<string, string> = {
  "01_Axioms": "#3b82f6",
  "02_Definitions": "#8b5cf6",
  "03_Lemmas": "#06b6d4",
  "04_Equations": "#f59e0b",
  "05_Propositions": "#10b981",
  "06_Theorems": "#ef4444",
  "07_Bridge": "#f97316",
  "08_Corollaries": "#84cc16",
  "09_Ontological": "#ec4899",
  "10_Boundary": "#6366f1",
  default: "#475569",
};

function getNodeColor(categorySlug: string | null): string {
  return (categorySlug && CATEGORY_COLORS[categorySlug]) || CATEGORY_COLORS.default;
}

function getNodeRadius(bridgeCount: number): number {
  return Math.max(6, Math.min(16, 6 + bridgeCount * 1.5));
}

export default function KnowledgeGraph({ activeNodeId, onSelectNode }: KnowledgeGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [size, setSize] = useState({ width: 600, height: 400 });

  const { data: graphData, isLoading } = useQuery<GraphData>({
    queryKey: ["/api/graph/neighborhood", activeNodeId],
    queryFn: () =>
      fetch(`/api/graph/neighborhood/${activeNodeId}`).then((r) => r.json()),
    enabled: !!activeNodeId,
  });

  // Observe container size
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setSize({ width: Math.max(200, width), height: Math.max(200, height) });
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Compute node positions (simple force-directed layout approximation)
  const layout = useMemo(() => {
    if (!graphData?.nodes?.length) return { positions: new Map<string, { x: number; y: number }>() };

    const positions = new Map<string, { x: number; y: number }>();
    const cx = size.width / 2;
    const cy = size.height / 2;
    const activeNode = graphData.nodes.find((n) => n.id === activeNodeId);

    // Place active node at center
    if (activeNode) {
      positions.set(activeNode.id, { x: cx, y: cy });
    }

    // Place connected nodes in a ring
    const connected = graphData.nodes.filter((n) => n.id !== activeNodeId);
    const ringRadius = Math.min(size.width, size.height) * 0.35;
    connected.forEach((node, i) => {
      const angle = (i / connected.length) * Math.PI * 2 - Math.PI / 2;
      positions.set(node.id, {
        x: cx + Math.cos(angle) * ringRadius,
        y: cy + Math.sin(angle) * ringRadius,
      });
    });

    return { positions };
  }, [graphData, activeNodeId, size]);

  // Render on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !graphData?.nodes?.length) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size.width * dpr;
    canvas.height = size.height * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, size.width, size.height);

    // Draw edges
    for (const edge of graphData.edges) {
      const from = layout.positions.get(edge.source);
      const to = layout.positions.get(edge.target);
      if (!from || !to) continue;

      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.strokeStyle = edge.type === "chain" ? "rgba(59,130,246,0.2)" : "rgba(139,92,246,0.15)";
      ctx.lineWidth = edge.type === "chain" ? 1.5 : 1;
      ctx.stroke();
    }

    // Draw nodes
    for (const node of graphData.nodes) {
      const pos = layout.positions.get(node.id);
      if (!pos) continue;

      const isActive = node.id === activeNodeId;
      const isHovered = node.id === hoveredNode;
      const color = getNodeColor(node.categorySlug);
      const radius = getNodeRadius(node.bridgeCount);

      // Glow for active
      if (isActive) {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, radius + 6, 0, Math.PI * 2);
        ctx.fillStyle = `${color}20`;
        ctx.fill();
      }

      // Node circle
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = isActive ? color : isHovered ? `${color}cc` : `${color}80`;
      ctx.fill();
      ctx.strokeStyle = isActive ? "#fff" : `${color}40`;
      ctx.lineWidth = isActive ? 2 : 1;
      ctx.stroke();

      // Label
      ctx.fillStyle = isActive ? "#fff" : isHovered ? "#cbd5e1" : "#64748b";
      ctx.font = `${isActive ? "bold " : ""}${isActive ? 10 : 9}px ui-monospace, monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(node.id, pos.x, pos.y + radius + 4);
    }
  }, [graphData, layout, activeNodeId, hoveredNode, size]);

  // Hit test on mouse move/click
  const findNodeAt = (clientX: number, clientY: number): string | null => {
    const canvas = canvasRef.current;
    if (!canvas || !graphData) return null;
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    for (const node of graphData.nodes) {
      const pos = layout.positions.get(node.id);
      if (!pos) continue;
      const dx = x - pos.x;
      const dy = y - pos.y;
      const r = getNodeRadius(node.bridgeCount) + 4;
      if (dx * dx + dy * dy <= r * r) return node.id;
    }
    return null;
  };

  return (
    <div ref={containerRef} className="relative w-full h-full bg-[#060810] rounded-lg overflow-hidden">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[10px] text-slate-600 animate-pulse">Loading graph...</span>
        </div>
      )}
      {!isLoading && !graphData?.nodes?.length && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[10px] text-slate-600">No graph data available</span>
        </div>
      )}
      <canvas
        ref={canvasRef}
        style={{ width: size.width, height: size.height }}
        className="cursor-crosshair"
        onMouseMove={(e) => setHoveredNode(findNodeAt(e.clientX, e.clientY))}
        onMouseLeave={() => setHoveredNode(null)}
        onClick={(e) => {
          const nodeId = findNodeAt(e.clientX, e.clientY);
          if (nodeId && nodeId !== activeNodeId) onSelectNode?.(nodeId);
        }}
      />
      {/* Legend */}
      <div className="absolute bottom-2 left-2 flex gap-2">
        <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-[7px]">
          {graphData?.nodes?.length || 0} nodes
        </Badge>
        <Badge className="bg-slate-800 text-slate-500 border-slate-700 text-[7px]">
          {graphData?.edges?.length || 0} edges
        </Badge>
      </div>
      {hoveredNode && (
        <div className="absolute top-2 right-2 px-2 py-1 rounded bg-slate-900/90 border border-slate-700 text-[10px] text-slate-300 font-mono">
          {hoveredNode}
        </div>
      )}
    </div>
  );
}
