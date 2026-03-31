import { Activity, AlertTriangle, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

interface SevenQDeepProps {
  axiom: any;
}

export default function SevenQDeep({ axiom }: SevenQDeepProps) {
  if (!axiom?.avg7qScore) return null;

  const qFields = [
    { q: "Q0", label: "Posture", val: axiom.q0Posture },
    { q: "Q1", label: "Identity", val: axiom.q1Identity },
    { q: "Q2", label: "Domain", val: axiom.q2Domain },
    { q: "Q3", label: "Assertion", val: axiom.q3Assertion },
    { q: "Q4", label: "Evidence", val: axiom.q4Evidence },
    { q: "Q5", label: "Depend.", val: axiom.q5Dependencies },
    { q: "Q6", label: "Conseq.", val: axiom.q6Consequences },
    { q: "Q7", label: "Falsif.", val: axiom.q7Falsification },
  ];

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center border border-violet-500/20">
            <Activity className="w-4 h-4 text-violet-400" />
          </div>
          <span className="text-sm font-bold tracking-widest text-slate-300 uppercase">
            7Q Truth Score
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-3xl font-mono font-black text-violet-400">
            {axiom.avg7qScore}
          </span>
          <span className="text-xs text-slate-600">/1.000</span>
          <Badge
            className={`text-[8px] ${
              axiom.isoStatus === "ISO-CONFIRMED"
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                : "bg-amber-500/10 text-amber-400 border-amber-500/20"
            }`}
          >
            {axiom.isoStatus}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
        {qFields.map(({ q, label, val }) => {
          const score = val ? parseFloat(val) : 0;
          const barColor =
            score >= 0.9
              ? "bg-emerald-500"
              : score >= 0.7
                ? "bg-amber-500"
                : "bg-rose-500";
          return (
            <div
              key={q}
              className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-[#010409] border border-slate-800"
            >
              <span className="text-[8px] font-black text-violet-400 uppercase">
                {q}
              </span>
              <span className="text-lg font-mono font-bold text-white">
                {val || "\u2014"}
              </span>
              <div className="w-full h-1 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className={`h-full rounded-full ${barColor}`}
                  style={{ width: `${score * 100}%` }}
                />
              </div>
              <span className="text-[7px] text-slate-600 uppercase tracking-widest">
                {label}
              </span>
            </div>
          );
        })}
      </div>

      {(axiom.strongestQ || axiom.weakestQ) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {axiom.strongestQ && (
            <Card className="p-5 border-emerald-500/20 bg-emerald-500/5">
              <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-2">
                Strongest
              </p>
              <p className="text-xs text-slate-300 leading-relaxed">
                {axiom.strongestQ}
              </p>
            </Card>
          )}
          {axiom.weakestQ && (
            <Card className="p-5 border-rose-500/20 bg-rose-500/5">
              <p className="text-[9px] font-black text-rose-400 uppercase tracking-widest mb-2">
                Weakest
              </p>
              <p className="text-xs text-slate-300 leading-relaxed">
                {axiom.weakestQ}
              </p>
            </Card>
          )}
        </div>
      )}

      <div className="flex gap-6">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
          <span className="text-[10px] font-bold text-slate-500 uppercase">Kill Conditions</span>
          <span className="font-mono text-sm text-rose-400">{axiom.killCount || 0}</span>
        </div>
        <div className="flex items-center gap-2">
          <FileText className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-[10px] font-bold text-slate-500 uppercase">Claims</span>
          <span className="font-mono text-sm text-blue-400">{axiom.claimCount || 0}</span>
        </div>
      </div>

      {axiom.executiveSummary && (
        <Card className="p-5 border-violet-500/20 bg-violet-500/5">
          <p className="text-[9px] font-black text-violet-400 uppercase tracking-widest mb-2">Executive Summary</p>
          <p className="text-xs text-slate-300 leading-relaxed">{axiom.executiveSummary}</p>
        </Card>
      )}

      {axiom.sevenqCoreClaim && (
        <Card className="p-5 border-slate-800 bg-[#010409]">
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Core Claim</p>
          <p className="text-xs text-slate-300 leading-relaxed italic">{axiom.sevenqCoreClaim}</p>
        </Card>
      )}
    </section>
  );
}
