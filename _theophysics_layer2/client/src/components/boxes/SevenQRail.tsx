import { Activity, Database, GitBranch, ArrowRight, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  ResponsiveContainer,
} from "recharts";

interface SevenQRailProps {
  axiom: any;
  onNavigate?: (nodeId: string) => void;
}

const CHART_DATA = [
  { name: "Phys", val: 40 },
  { name: "Theo", val: 80 },
  { name: "Con", val: 65 },
  { name: "QM", val: 90 },
  { name: "Scr", val: 55 },
  { name: "Evd", val: 75 },
];

export default function SevenQRail({ axiom, onNavigate }: SevenQRailProps) {
  if (!axiom) return null;

  const deps = axiom.dependencies || [];
  const enables = axiom.enables || [];

  return (
    <div className="space-y-10">
      {/* Logic Metadata */}
      <section className="space-y-4">
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
          Logic Metadata
        </p>
        <div className="space-y-3">
          {[
            { label: "Chain #", value: `${axiom.chainPosition} of ${axiom.totalChain}` },
            { label: "Object", value: axiom.objectType },
            { label: "Stage", value: axiom.stage },
            { label: "Status", value: axiom.status, color: axiom.status === "Validated" ? "text-emerald-400" : "text-slate-400" },
            { label: "CR Rating", value: axiom.crRating, color: "text-rose-500" },
            { label: "Bridges", value: String(axiom.bridgeCount) },
            { label: "Conflicts", value: String(axiom.conflicts), color: axiom.conflicts === 0 ? "text-emerald-400" : "text-rose-500" },
            ...(axiom.avg7qScore
              ? [
                  { label: "7Q Avg", value: axiom.avg7qScore, color: "text-violet-400" },
                  { label: "ISO", value: axiom.isoStatus || "—", color: axiom.isoStatus === "ISO-CONFIRMED" ? "text-emerald-400" : "text-amber-400" },
                  { label: "Kills", value: String(axiom.killCount || 0), color: "text-rose-400" },
                  { label: "Claims", value: String(axiom.claimCount || 0), color: "text-blue-400" },
                ]
              : []),
          ].map((row) => (
            <div key={row.label} className="flex justify-between py-1.5 border-b border-slate-800/40 last:border-0">
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tighter">{row.label}</span>
              <span className={`text-[11px] font-mono ${row.color || "text-slate-200"}`}>{row.value}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Dependencies */}
      {deps.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <GitBranch className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500">
              Depends On ({deps.length})
            </span>
          </div>
          {deps.map((d: any) => (
            <Card
              key={d.id}
              className="p-3 border-slate-800/40 bg-slate-900/10 hover:border-blue-500/20 transition-all cursor-pointer"
              onClick={() => onNavigate?.(d.dependsOnNodeId)}
            >
              <span className="text-[9px] font-mono text-slate-600 block mb-1">
                {d.dependsOnNodeId}
              </span>
              {d.description && (
                <p className="text-[10px] text-slate-400 leading-relaxed">{d.description}</p>
              )}
            </Card>
          ))}
        </section>
      )}

      {/* Enables */}
      {enables.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500">
              Enables ({enables.length})
            </span>
          </div>
          {enables.map((e: any) => (
            <Card
              key={e.id}
              className="p-3 border-slate-800/40 bg-slate-900/10 hover:border-emerald-500/20 transition-all cursor-pointer group"
              onClick={() => onNavigate?.(e.enablesNodeId)}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[9px] font-mono text-slate-600">{e.enablesNodeId}</span>
                <ExternalLink className="w-3 h-3 text-slate-700 group-hover:text-emerald-400 transition-colors" />
              </div>
              {e.description && (
                <p className="text-[10px] text-slate-400 leading-relaxed">{e.description}</p>
              )}
            </Card>
          ))}
        </section>
      )}

      {/* Source Files */}
      {axiom.sourceFiles?.length > 0 && (
        <section className="space-y-3">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
            Source Reference
          </p>
          {axiom.sourceFiles.map((src: string, i: number) => (
            <div key={i} className="p-3 rounded-xl border border-slate-800 bg-slate-900/30 flex items-center gap-3">
              <Database className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span className="text-[10px] font-mono text-slate-400 truncate">
                {src.split("/").pop()}
              </span>
            </div>
          ))}
        </section>
      )}

      {/* Bridge Distribution Chart */}
      <section className="space-y-3">
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
          Bridge Distribution
        </p>
        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={CHART_DATA}>
              <Bar dataKey="val" fill="#3b82f6" radius={[2, 2, 0, 0]} fillOpacity={0.6} />
              <XAxis dataKey="name" fontSize={8} tickLine={false} axisLine={false} tick={{ fill: "#475569" }} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}
