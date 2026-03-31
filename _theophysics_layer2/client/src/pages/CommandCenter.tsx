import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BrainCircuit,
  Search,
  ChevronRight,
  BookOpen,
  PanelLeftOpen,
  X,
  Code2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import BoxLayout from "@/components/boxes/BoxLayout";
import KnowledgeGraph from "@/components/boxes/KnowledgeGraph";

const TYPE_GUIDE: Record<string, { name: string; role: string; description: string }> = {
  "01_Axioms": { name: "Axiom", role: "Foundation", description: "A self-evident truth accepted without proof." },
  "02_Definitions": { name: "Definition", role: "Formal Language", description: "A precise specification of what a term means." },
  "03_Lemmas": { name: "Lemma", role: "Stepping Stone", description: "A proven intermediate result." },
  "04_Equations": { name: "Equation", role: "Quantitative Law", description: "A mathematical relationship." },
  "05_Propositions": { name: "Proposition", role: "Derived Claim", description: "A statement following from axioms." },
  "06_Theorems": { name: "Theorem", role: "Major Result", description: "A rigorously proven statement." },
  "07_Bridge": { name: "Bridge", role: "Cross-Domain Link", description: "A formal identification between domains." },
  "08_Corollaries": { name: "Corollary", role: "Direct Consequence", description: "A result following immediately from a theorem." },
  "09_Ontological": { name: "Ontological", role: "Existence Claim", description: "An axiom about what exists." },
  "10_Boundary": { name: "Boundary", role: "Limit & Constraint", description: "Conditions at the edges of the system." },
  "11_Evidence": { name: "Evidence", role: "Empirical Anchor", description: "Documented empirical results." },
  "12_Experiments": { name: "Experiment", role: "Proposed Test", description: "A specific experimental protocol." },
  "13_Predictions": { name: "Prediction", role: "Testable Forecast", description: "A specific, falsifiable claim." },
  "14_Protocols": { name: "Protocol", role: "Methodology", description: "Step-by-step experimental procedures." },
  "15_Falsification": { name: "Falsification", role: "Kill Condition", description: "Conditions that would destroy the framework." },
  "16_Open": { name: "Open Question", role: "Known Gap", description: "Questions the framework cannot yet answer." },
};

function StatusDot({ status }: { status: string }) {
  if (status === "Validated") return <div className="w-1.5 h-1.5 rounded-full bg-blue-500/50 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />;
  return <div className="w-1.5 h-1.5 rounded-full bg-slate-700" />;
}

type ViewMode = "workspace" | "graph";

export default function CommandCenter() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [activeAxiomId, setActiveAxiomId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("workspace");
  const [jsonDialogOpen, setJsonDialogOpen] = useState(false);

  const { data: categoriesData = [] } = useQuery({
    queryKey: ["/api/categories"],
    queryFn: () => fetch("/api/categories").then((r) => r.json()),
  });

  const { data: allAxioms = [] } = useQuery({
    queryKey: ["/api/axioms"],
    queryFn: () => fetch("/api/axioms").then((r) => r.json()),
  });

  const { data: axiomsList = [] } = useQuery({
    queryKey: ["/api/axioms", selectedCategory],
    queryFn: () => {
      const url = selectedCategory
        ? `/api/axioms?category=${selectedCategory}`
        : "/api/axioms";
      return fetch(url).then((r) => r.json());
    },
  });

  const { data: activeAxiom } = useQuery({
    queryKey: ["/api/axioms", activeAxiomId],
    queryFn: () => fetch(`/api/axioms/${activeAxiomId}`).then((r) => r.json()),
    enabled: !!activeAxiomId,
  });

  const categoryCounts: Record<string, number> = {};
  allAxioms.forEach((ax: any) => {
    if (ax.categorySlug) {
      categoryCounts[ax.categorySlug] = (categoryCounts[ax.categorySlug] || 0) + 1;
    }
  });

  const filteredAxioms = searchQuery.trim()
    ? axiomsList.filter((ax: any) =>
        ax.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ax.nodeId.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : axiomsList;

  if (!activeAxiomId && filteredAxioms.length > 0) {
    setActiveAxiomId(filteredAxioms[0].nodeId);
  }

  const handleAxiomSelect = useCallback((nodeId: string) => {
    setActiveAxiomId(nodeId);
    setViewMode("workspace");
  }, []);

  return (
    <div className="flex h-screen bg-[#010409] text-slate-200 font-sans overflow-hidden">
      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="absolute top-4 left-4 z-50 w-10 h-10 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center hover:border-blue-500/30 transition-colors"
        >
          <PanelLeftOpen className="w-4 h-4 text-slate-400" />
        </button>
      )}

      {sidebarOpen && (
        <aside className="w-80 border-r border-slate-800/40 flex flex-col bg-[#010409] shrink-0">
          <div className="p-5 border-b border-slate-800/40 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-[0_0_20px_rgba(37,99,235,0.3)]">
                <BrainCircuit className="text-white w-5 h-5" />
              </div>
              <div>
                <span className="font-black tracking-tighter text-base uppercase italic block">Command Center</span>
                <span className="text-[8px] text-slate-600 uppercase tracking-widest">{allAxioms.length} axioms loaded</span>
              </div>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="text-slate-600 hover:text-slate-300 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="px-4 py-3 border-b border-slate-800/40">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" />
              <input
                className="w-full bg-slate-900/50 border border-slate-800 rounded-lg py-2 pl-9 pr-4 text-xs focus:outline-none focus:border-blue-500/50 transition-all"
                placeholder="Search axioms..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="px-4 py-3 border-b border-slate-800/40">
            <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mb-2">Filter by Domain</p>
            <div className="flex flex-wrap gap-1">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`text-[9px] px-2 py-1 rounded border transition-all ${selectedCategory === null ? "bg-blue-500/10 text-blue-400 border-blue-500/20" : "text-slate-500 border-slate-800 hover:text-slate-300"}`}
              >
                All ({allAxioms.length})
              </button>
              {categoriesData.map((cat: any) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.slug)}
                  className={`text-[9px] px-2 py-1 rounded border transition-all ${selectedCategory === cat.slug ? "bg-blue-500/10 text-blue-400 border-blue-500/20" : "text-slate-500 border-slate-800 hover:text-slate-300"}`}
                >
                  {cat.label} ({categoryCounts[cat.slug] || 0})
                </button>
              ))}
            </div>
          </div>

          <ScrollArea className="flex-1 px-3 py-2">
            <div className="space-y-0.5">
              {selectedCategory && TYPE_GUIDE[selectedCategory] && (
                <div className="mb-3 p-3 rounded-lg border border-blue-500/15 bg-blue-500/5">
                  <div className="flex items-center gap-2 mb-1">
                    <BookOpen className="w-3 h-3 text-blue-400" />
                    <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">{TYPE_GUIDE[selectedCategory].name}</span>
                    <span className="text-[7px] text-slate-600 uppercase ml-auto">{TYPE_GUIDE[selectedCategory].role}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-relaxed">{TYPE_GUIDE[selectedCategory].description}</p>
                </div>
              )}

              {filteredAxioms.map((axiom: any) => (
                <button
                  key={axiom.id}
                  onClick={() => handleAxiomSelect(axiom.nodeId)}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-xs rounded-lg transition-all border ${activeAxiomId === axiom.nodeId ? "bg-blue-500/5 text-blue-400 border-blue-500/20" : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40"}`}
                >
                  <span className={`font-mono text-[10px] shrink-0 ${activeAxiomId === axiom.nodeId ? "text-blue-400" : "text-slate-600"}`}>{axiom.nodeId}</span>
                  <span className="flex-1 text-left truncate font-medium">{axiom.title}</span>
                  <StatusDot status={axiom.status} />
                </button>
              ))}

              {filteredAxioms.length === 0 && (
                <p className="text-xs text-slate-600 text-center py-8">No axioms match your search.</p>
              )}
            </div>
          </ScrollArea>

          <div className="p-3 border-t border-slate-800/40 flex gap-2">
            <button onClick={() => setViewMode("workspace")} className={`flex-1 text-[9px] py-2 rounded border transition-all ${viewMode === "workspace" ? "border-blue-500/30 text-blue-400 bg-blue-500/10" : "border-slate-800 text-slate-500"}`}>Workspace</button>
            <button onClick={() => setViewMode("graph")} className={`flex-1 text-[9px] py-2 rounded border transition-all ${viewMode === "graph" ? "border-blue-500/30 text-blue-400 bg-blue-500/10" : "border-slate-800 text-slate-500"}`}>Graph View</button>
          </div>
        </aside>
      )}

      <main className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
        <header className="h-12 border-b border-slate-800/40 flex items-center justify-between px-6 bg-[#010409]/60 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono tracking-wider">
            <span className="uppercase">Theophysics</span>
            <ChevronRight className="w-3 h-3 text-slate-700" />
            <span className="text-slate-200 font-bold uppercase tracking-widest">{activeAxiom ? `${activeAxiom.nodeId} \u2014 ${activeAxiom.title?.toUpperCase()}` : "SELECT AN AXIOM"}</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-slate-900 text-slate-500 border-slate-800 text-[8px]">{viewMode === "graph" ? "GRAPH" : "WORKSPACE"}</Badge>
          </div>
        </header>

        <div className="flex-1 min-h-0 overflow-hidden">
          {viewMode === "graph" ? (
            <KnowledgeGraph activeNodeId={activeAxiomId} onSelectNode={handleAxiomSelect} />
          ) : (
            <BoxLayout axiom={activeAxiom} onNavigate={handleAxiomSelect} onViewRawJson={() => setJsonDialogOpen(true)} />
          )}
        </div>
      </main>

      <Dialog open={jsonDialogOpen} onOpenChange={setJsonDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col bg-[#0d1117] border-slate-800">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm">
              <Code2 className="w-4 h-4 text-blue-400" />
              Raw JSON \u2014 {activeAxiom?.nodeId}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 min-h-0">
            <pre className="text-[10px] text-slate-300 font-mono p-4 whitespace-pre-wrap leading-relaxed">
              {activeAxiom ? JSON.stringify(activeAxiom, null, 2) : "No axiom selected"}
            </pre>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
