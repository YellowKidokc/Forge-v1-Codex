import { useState } from 'react';
import { Tag, Link2, Layers, Hash, ChevronDown, ChevronRight, Zap, Copy } from 'lucide-react';
import { NoteMetadata } from '../lib/types';

interface NodeSidePanelProps {
  filePath: string | null;
  metadata: NoteMetadata;
  onOpenWikiLink: (target: string) => void;
  onSendPromptToAi: (prompt: string) => void;
  onRunPythonPlan: (prompt: string, selection?: string) => Promise<boolean>;
}

const DOMAIN_PACKS = [
  { id: 'physics',    label: 'Physics',    color: 'text-blue-400',   tags: ['entropy', 'quantum', 'gravity', 'wavefunction', 'coherence'] },
  { id: 'theology',  label: 'Theology',   color: 'text-yellow-400', tags: ['logos', 'pneuma', 'grace', 'covenant', 'incarnation'] },
  { id: 'logic',     label: 'Logic',      color: 'text-green-400',  tags: ['axiom', 'theorem', 'proof', 'falsification', 'coherence'] },
  { id: 'history',   label: 'History',    color: 'text-orange-400', tags: ['pattern', 'cycle', 'event', 'causation', 'era'] },
  { id: 'conscious', label: 'Conscious',  color: 'text-purple-400', tags: ['observer', 'collapse', 'substrate', 'emergence', 'will'] },
];

function generateUUID(filePath: string | null): string {
  if (!filePath) return '—';
  const stem = filePath.split(/[\\/]/).pop()?.replace(/\.md$/, '') ?? 'node';
  const prefix = stem.slice(0, 3).toLowerCase().replace(/[^a-z0-9]/g, 'x');
  const hash = Array.from(stem).reduce((acc, c) => ((acc << 5) - acc + c.charCodeAt(0)) | 0, 0);
  const hex = Math.abs(hash).toString(16).padStart(8, '0').slice(0, 8);
  return `${prefix}-${hex}`;
}

const NodeSidePanel = ({ filePath, metadata, onOpenWikiLink, onSendPromptToAi, onRunPythonPlan }: NodeSidePanelProps) => {
  const [openSection, setOpenSection] = useState<string | null>('meta');
  const [activePack, setActivePack] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const uuid = generateUUID(filePath);

  const toggle = (id: string) => setOpenSection((prev) => (prev === id ? null : id));

  const copyUUID = () => {
    navigator.clipboard.writeText(uuid);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const Section = ({ id, label, icon, children }: { id: string; label: string; icon: React.ReactNode; children: React.ReactNode }) => (
    <div className="border-b border-forge-steel/40">
      <button onClick={() => toggle(id)}
        className="w-full flex items-center gap-2 px-3 py-2 text-[10px] uppercase tracking-widest text-gray-500 hover:text-gray-300 transition-colors cursor-pointer">
        {icon}
        <span className="flex-1 text-left">{label}</span>
        {openSection === id ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
      </button>
      {openSection === id && <div className="px-3 pb-3">{children}</div>}
    </div>
  );

  return (
    <div className="w-52 flex-shrink-0 bg-[#161616] border-l border-forge-steel flex flex-col overflow-y-auto text-xs">
      {/* UUID header */}
      <div className="px-3 py-2.5 border-b border-forge-steel/40 flex items-center gap-2">
        <Hash size={11} className="text-forge-ember flex-shrink-0" />
        <span className="font-mono text-[10px] text-gray-400 flex-1 truncate">{uuid}</span>
        <button onClick={copyUUID} title="Copy UUID" className="text-gray-600 hover:text-forge-ember cursor-pointer transition-colors">
          {copied ? <span className="text-[9px] text-green-400">✓</span> : <Copy size={10} />}
        </button>
      </div>

      {/* Meta */}
      <Section id="meta" label="Block Meta" icon={<Layers size={10} />}>
        <div className="space-y-2">
          <div>
            <div className="text-[9px] text-gray-600 mb-1 uppercase tracking-widest">Tags</div>
            <div className="flex flex-wrap gap-1">
              {metadata.tags.length === 0
                ? <span className="text-[10px] text-gray-700">None</span>
                : metadata.tags.map((t) => (
                  <span key={t} className="text-[10px] rounded border border-forge-steel px-1.5 py-0.5 text-gray-300 bg-black/20">#{t}</span>
                ))}
            </div>
          </div>
          <div>
            <div className="text-[9px] text-gray-600 mb-1 uppercase tracking-widest">Block Type</div>
            <select className="w-full bg-black/30 border border-forge-steel rounded px-1.5 py-1 text-[10px] text-gray-300 outline-none cursor-pointer">
              {['claim','axiom','theorem','question','evidence','note','definition'].map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <div className="text-[9px] text-gray-600 mb-1 uppercase tracking-widest">Confidence</div>
            <select className="w-full bg-black/30 border border-forge-steel rounded px-1.5 py-1 text-[10px] text-gray-300 outline-none cursor-pointer">
              {['high','medium','low','speculative'].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
      </Section>

      {/* Links */}
      <Section id="links" label="Wiki Links" icon={<Link2 size={10} />}>
        <div className="space-y-1 max-h-36 overflow-y-auto">
          {metadata.links.length === 0
            ? <span className="text-[10px] text-gray-700">None yet</span>
            : metadata.links.map((l) => (
              <button key={l} onClick={() => onOpenWikiLink(l)}
                className="w-full text-left text-[10px] text-forge-ember/80 hover:text-forge-ember truncate cursor-pointer transition-colors">
                [[{l}]]
              </button>
            ))}
        </div>
      </Section>

      {/* Domain Packs */}
      <Section id="domains" label="Domain Packs" icon={<Tag size={10} />}>
        <div className="space-y-1.5">
          {DOMAIN_PACKS.map((pack) => (
            <div key={pack.id}>
              <button
                onClick={() => setActivePack(activePack === pack.id ? null : pack.id)}
                className={`w-full text-left text-[10px] px-2 py-1 rounded border transition-all cursor-pointer ${
                  activePack === pack.id
                    ? 'border-forge-ember/40 bg-forge-ember/5'
                    : 'border-forge-steel hover:border-gray-500'
                } ${pack.color}`}
              >
                {pack.label}
              </button>
              {activePack === pack.id && (
                <div className="mt-1 pl-2 flex flex-wrap gap-1">
                  {pack.tags.map((tag) => (
                    <button key={tag}
                      onClick={() => onSendPromptToAi(`/ai define "${tag}" within ${pack.label} domain and link to Theophysics framework`)}
                      className="text-[9px] px-1.5 py-0.5 rounded border border-forge-steel text-gray-400 hover:text-forge-ember cursor-pointer transition-colors">
                      {tag}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </Section>

      {/* AI Quick Actions */}
      <Section id="ai" label="Quick AI" icon={<Zap size={10} />}>
        <div className="space-y-1">
          {[
            { label: 'Probe this node',    cmd: '/logic PROBE: test structural integrity of current node' },
            { label: 'Find contradictions', cmd: '/logic CHAIN: walk full logic of this note, find weakest link' },
            { label: 'Domain crosslink',   cmd: '/ai CONNECT: find structural isomorphism with another domain' },
            { label: 'Build deeper',       cmd: '/ai DEEPER: go 3 layers down on the core claim here' },
            { label: 'Python action plan', cmd: 'python-action-plan' },
          ].map((action) => (
            <button key={action.label}
              onClick={() => {
                if (action.cmd === 'python-action-plan') {
                  void onRunPythonPlan(
                    'Build a structured Python sidecar plan for this note. Identify definitions, links, tags, and action opportunities.',
                    filePath ?? 'current-note'
                  );
                  return;
                }
                onSendPromptToAi(action.cmd);
              }}
              className="w-full text-left text-[10px] px-2 py-1.5 rounded border border-forge-steel text-gray-400 hover:text-forge-ember hover:border-forge-ember/40 cursor-pointer transition-colors">
              {action.label}
            </button>
          ))}
        </div>
      </Section>
    </div>
  );
};

export default NodeSidePanel;
