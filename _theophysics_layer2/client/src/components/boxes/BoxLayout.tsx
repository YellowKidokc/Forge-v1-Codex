import { useState, useRef, useEffect, useCallback } from "react";
import {
  Send,
  Loader2,
  BrainCircuit,
  Sparkles,
  Globe,
  FileText,
  Gavel,
  Lightbulb,
  Users,
  Zap,
  Code2,
  Play,
  Edit3,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import SevenQDeep from "./SevenQDeep";
import SevenQRail from "./SevenQRail";

interface BoxLayoutProps {
  axiom: any;
  onNavigate?: (nodeId: string) => void;
  onViewRawJson?: () => void;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTED_PROMPTS = [
  "What are the strongest objections to this axiom?",
  "How does this connect to quantum mechanics?",
  "Explain this to a non-physicist",
  "What would falsify this claim?",
  "Find structural bridges to other domains",
];

const PERSONA_OPTIONS = [
  { id: "researcher" as const, label: "Researcher" },
  { id: "physicist" as const, label: "Physicist" },
  { id: "mathematician" as const, label: "Mathematician" },
  { id: "everyday" as const, label: "Everyday" },
];

export default function BoxLayout({ axiom, onNavigate, onViewRawJson }: BoxLayoutProps) {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [persona, setPersona] = useState<"researcher" | "physicist" | "mathematician" | "everyday">("researcher");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const lastAxiomRef = useRef<string | null>(null);

  // Reset chat when axiom changes
  useEffect(() => {
    if (axiom?.nodeId && axiom.nodeId !== lastAxiomRef.current) {
      lastAxiomRef.current = axiom.nodeId;
      setChatMessages([]);
      setChatError(null);

      // Restore from session storage
      const stored = sessionStorage.getItem(`ai-chat-${axiom.nodeId}`);
      if (stored) {
        try {
          setChatMessages(JSON.parse(stored));
        } catch { /* ignore */ }
      }
    }
  }, [axiom?.nodeId]);

  // Persist chat to session storage
  useEffect(() => {
    if (axiom?.nodeId && chatMessages.length > 0) {
      sessionStorage.setItem(`ai-chat-${axiom.nodeId}`, JSON.stringify(chatMessages.slice(-20)));
    }
  }, [chatMessages, axiom?.nodeId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, chatLoading]);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || chatLoading || !axiom?.nodeId) return;

    const userMsg: ChatMessage = { role: "user", content: trimmed };
    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput("");
    setChatLoading(true);
    setChatError(null);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          axiomId: axiom.nodeId,
          prompt: trimmed,
          persona,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || `API error ${res.status}`);
      }

      const data = await res.json();
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.answer || "(no response)" },
      ]);
    } catch (err: any) {
      setChatError(err.message || "Failed to send message");
    } finally {
      setChatLoading(false);
    }
  }, [chatLoading, axiom?.nodeId, persona]);

  if (!axiom) {
    return (
      <div className="flex items-center justify-center h-full text-slate-600">
        <p className="text-sm">Select an axiom to open the workspace</p>
      </div>
    );
  }

  const objections = axiom.standardObjections || [];
  const crossExams = axiom.crossExaminations || [];
  const notClaiming = axiom.notClaiming || [];
  const persp = axiom.perspectives || [];

  return (
    <div className="flex h-full min-h-0 overflow-hidden">
      {/* LEFT — Analytical panels */}
      <div className="flex-1 min-w-0 flex flex-col border-r border-slate-800/40">
        <ScrollArea className="flex-1">
          <div className="p-8 space-y-10 pb-24">
            {/* Title block */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 px-3 py-1 text-[10px] font-black tracking-[0.2em]">
                  {axiom.nodeId}
                </Badge>
                <Badge variant="outline" className="border-slate-800 text-slate-500 text-[9px]">
                  {axiom.objectType} • Stage {axiom.stage}
                </Badge>
                <div className="h-[1px] flex-1 bg-gradient-to-r from-blue-500/20 to-transparent" />
                <span className="text-2xl font-mono font-bold text-slate-800 tracking-tighter">
                  {String(axiom.chainPosition).padStart(3, "0")}/{axiom.totalChain}
                </span>
              </div>
              <h1 className="text-4xl font-black tracking-tighter text-white">{axiom.title}</h1>
              {axiom.formalStatement && (
                <p className="text-slate-400 text-base leading-relaxed max-w-2xl font-light">
                  {axiom.formalStatement}
                </p>
              )}
            </div>

            {/* Accordion sections */}
            <Accordion type="multiple" defaultValue={["formal", "common-sense", "mappings", "jury", "perspectives"]} className="space-y-4">
              {/* Formal Statement */}
              {axiom.formalStatement && (
                <AccordionItem value="formal" className="border-slate-800/40 bg-slate-900/20 rounded-xl overflow-hidden px-3">
                  <AccordionTrigger className="hover:no-underline py-4">
                    <div className="flex items-center gap-3">
                      <FileText className="w-4 h-4 text-blue-400" />
                      <span className="text-xs font-bold tracking-widest text-slate-300 uppercase">Formal Statement</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-6 px-6">
                    <div className="p-6 bg-[#010409] rounded-xl border border-slate-800 font-mono text-lg text-white font-medium">
                      {axiom.formalStatement}
                    </div>
                    <div className="grid grid-cols-2 gap-8 mt-6 text-sm">
                      {axiom.intendedMeaning && (
                        <div>
                          <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-2">Intended Meaning</h4>
                          <p className="text-slate-400 italic text-xs leading-relaxed">{axiom.intendedMeaning}</p>
                        </div>
                      )}
                      {notClaiming.length > 0 && (
                        <div>
                          <h4 className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-2">Not Claiming</h4>
                          <ul className="space-y-1 text-slate-500 list-disc pl-4 text-xs">
                            {notClaiming.map((nc: string, i: number) => <li key={i}>{nc}</li>)}
                          </ul>
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}

              {/* Common Sense */}
              {axiom.commonSenseTruth && (
                <AccordionItem value="common-sense" className="border-slate-800/40 bg-emerald-500/5 rounded-xl overflow-hidden px-3">
                  <AccordionTrigger className="hover:no-underline py-4">
                    <div className="flex items-center gap-3">
                      <Lightbulb className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-bold tracking-widest text-slate-300 uppercase">Common Sense Truth</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-6 px-6">
                    <p className="text-base text-slate-200 italic leading-relaxed">"{axiom.commonSenseTruth}"</p>
                    {axiom.commonSenseExplanation && (
                      <p className="text-xs text-slate-400 leading-relaxed border-t border-slate-800 pt-4 mt-4">{axiom.commonSenseExplanation}</p>
                    )}
                  </AccordionContent>
                </AccordionItem>
              )}

              {/* Cross-Domain Mappings */}
              {(axiom.physicsMapping || axiom.theologyMapping) && (
                <AccordionItem value="mappings" className="border-slate-800/40 bg-slate-900/20 rounded-xl overflow-hidden px-3">
                  <AccordionTrigger className="hover:no-underline py-4">
                    <div className="flex items-center gap-3">
                      <Globe className="w-4 h-4 text-amber-500" />
                      <span className="text-xs font-bold tracking-widest text-slate-300 uppercase">Cross-Domain Mappings</span>
                      {axiom.bridgeCount > 0 && (
                        <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[8px]">{axiom.bridgeCount} BRIDGES</Badge>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-6 px-6">
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { label: "Physics", value: axiom.physicsMapping },
                        { label: "Theology", value: axiom.theologyMapping },
                        { label: "Consciousness", value: axiom.consciousnessMapping },
                        { label: "Quantum", value: axiom.quantumMapping },
                        { label: "Scripture", value: axiom.scriptureMapping },
                        { label: "Evidence", value: axiom.evidenceMapping },
                        { label: "Information", value: axiom.informationMapping },
                      ].filter((m) => m.value).map((m) => (
                        <div key={m.label} className="p-4 rounded-lg bg-[#010409] border border-slate-800">
                          <p className="text-[9px] font-bold uppercase tracking-widest mb-2 text-amber-500">{m.label}</p>
                          <p className="text-xs text-slate-300">{m.value}</p>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}

              {/* Judge & Jury */}
              {(objections.length > 0 || axiom.verdict) && (
                <AccordionItem value="jury" className="border-rose-500/10 bg-rose-950/10 rounded-xl overflow-hidden px-3">
                  <AccordionTrigger className="hover:no-underline py-4">
                    <div className="flex items-center gap-3">
                      <Gavel className="w-4 h-4 text-rose-500" />
                      <span className="text-xs font-bold tracking-widest text-slate-300 uppercase">Judge & Jury</span>
                      {objections.length > 0 && (
                        <Badge className="bg-rose-500/10 text-rose-400 border-rose-500/20 text-[8px]">
                          {objections.length} OBJECTION{objections.length > 1 ? "S" : ""}
                        </Badge>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-6 px-6 space-y-6">
                    {objections.map((obj: any, i: number) => (
                      <div key={i} className="rounded-xl border border-slate-800/60 bg-[#0d1117] overflow-hidden">
                        <div className="p-4 border-b border-slate-800/40">
                          <p className="text-[9px] font-bold text-orange-400/60 uppercase tracking-widest mb-1">Objection {i + 1}</p>
                          <p className="text-sm text-slate-200 italic">"{obj.objection}"</p>
                        </div>
                        <div className="p-4 bg-blue-500/[0.02]">
                          <p className="text-[9px] font-bold text-blue-400/60 uppercase tracking-widest mb-1">Response</p>
                          <p className="text-xs text-slate-300 leading-relaxed">{obj.response}</p>
                        </div>
                      </div>
                    ))}
                    {axiom.verdict && (
                      <div className="p-6 rounded-xl border border-rose-500/20 bg-rose-500/5">
                        <div className="flex items-center gap-2 mb-3">
                          <Gavel className="w-4 h-4 text-rose-500" />
                          <h3 className="text-sm font-black text-white uppercase tracking-tight">The Verdict</h3>
                        </div>
                        <p className="text-sm text-slate-200 italic leading-relaxed">"{axiom.verdict}"</p>
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              )}

              {/* Perspectives */}
              {persp.length > 0 && (
                <AccordionItem value="perspectives" className="border-slate-800/40 bg-slate-900/20 rounded-xl overflow-hidden px-3">
                  <AccordionTrigger className="hover:no-underline py-4">
                    <div className="flex items-center gap-3">
                      <Users className="w-4 h-4 text-purple-400" />
                      <span className="text-xs font-bold tracking-widest text-slate-300 uppercase">Perspectives ({persp.length})</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-6 px-6 space-y-3">
                    {persp.map((p: any, i: number) => (
                      <Card key={i} className="p-4 border-purple-500/20 bg-purple-500/5">
                        <p className="text-[9px] font-black text-purple-400 uppercase tracking-widest mb-2">{p.name}</p>
                        {p.quote && <p className="text-xs text-slate-300 italic mb-2">"{p.quote}"</p>}
                        {p.assessment && <p className="text-[11px] text-slate-400 leading-relaxed">{p.assessment}</p>}
                      </Card>
                    ))}
                  </AccordionContent>
                </AccordionItem>
              )}
            </Accordion>

            {/* 7Q Deep */}
            <SevenQDeep axiom={axiom} />
          </div>
        </ScrollArea>
      </div>

      {/* CENTER — AI Panel */}
      <div className="w-80 flex flex-col border-r border-slate-800/40 bg-[#0a0d14]">
        <div className="p-4 border-b border-slate-800/40">
          <div className="flex items-center gap-2 mb-3">
            <BrainCircuit className="w-4 h-4 text-blue-400" />
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">AI Analysis</span>
          </div>
          <div className="flex gap-1">
            {PERSONA_OPTIONS.map((p) => (
              <button
                key={p.id}
                onClick={() => setPersona(p.id)}
                className={`text-[9px] px-2 py-1 rounded border transition-all ${
                  persona === p.id
                    ? "border-blue-500/40 text-blue-400 bg-blue-500/10"
                    : "border-slate-800 text-slate-500 hover:text-slate-300"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Suggested prompts */}
        {chatMessages.length === 0 && (
          <div className="p-4 border-b border-slate-800/40 space-y-2">
            <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Suggested</p>
            {SUGGESTED_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                onClick={() => sendMessage(prompt)}
                className="w-full text-left text-[10px] px-3 py-2 rounded border border-slate-800 text-slate-400 hover:text-blue-400 hover:border-blue-500/30 transition-all"
              >
                {prompt}
              </button>
            ))}
          </div>
        )}

        {/* Chat messages */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-3">
            {chatMessages.map((msg, i) => (
              <div
                key={i}
                className={`rounded-lg px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-blue-500/10 text-white ml-4"
                    : "bg-slate-800/50 text-slate-300 mr-4"
                }`}
              >
                {msg.content}
              </div>
            ))}
            {chatLoading && (
              <div className="flex items-center gap-2 text-[10px] text-slate-500">
                <Loader2 className="w-3 h-3 animate-spin" />
                Thinking...
              </div>
            )}
            {chatError && (
              <div className="text-[10px] text-rose-400 px-3 py-2 rounded bg-rose-500/10 border border-rose-500/20">
                {chatError}
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="p-3 border-t border-slate-800/40">
          <div className="flex items-center gap-2 bg-slate-900/50 border border-slate-800 rounded-lg p-2">
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage(chatInput);
                }
              }}
              placeholder={`Ask about ${axiom.nodeId}...`}
              className="flex-1 bg-transparent border-none outline-none text-xs text-white placeholder:text-slate-600"
              disabled={chatLoading}
            />
            <button
              onClick={() => sendMessage(chatInput)}
              disabled={chatLoading || !chatInput.trim()}
              className="text-blue-400 disabled:opacity-30 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* RIGHT — Rail */}
      <div className="w-72 flex flex-col bg-[#010409]">
        {/* Quick Actions */}
        <div className="p-4 border-b border-slate-800/40 space-y-2">
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Quick Actions</p>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2 text-[10px] border-slate-800 bg-slate-900/50 h-8"
            onClick={onViewRawJson}
          >
            <Code2 className="w-3.5 h-3.5" /> View Raw JSON
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2 text-[10px] border-slate-800 bg-slate-900/50 h-8 opacity-50 cursor-not-allowed"
            disabled
            title="Markdown editing coming soon"
          >
            <Edit3 className="w-3.5 h-3.5" /> Edit in Markdown
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2 text-[10px] border-slate-800 bg-slate-900/50 h-8 opacity-50 cursor-not-allowed"
            disabled
            title="Math simulation engine not yet connected"
          >
            <Play className="w-3.5 h-3.5" /> Run Math Sim
          </Button>
        </div>

        <ScrollArea className="flex-1 p-4">
          <SevenQRail axiom={axiom} onNavigate={onNavigate} />
        </ScrollArea>
      </div>
    </div>
  );
}
