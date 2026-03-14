import { FormEvent, useState } from 'react';
import {
  Sparkles, Settings, Table2, ShieldCheck,
  Globe, AppWindow, BrainCircuit, Play, ChevronUp
} from 'lucide-react';
import { MiniApp } from '../lib/types';

type BarFace = 'apps' | 'ai' | 'web';

interface BottomBarProps {
  onSubmitPrompt: (prompt: string) => void | boolean | Promise<void | boolean>;
  onOpenSettings: () => void;
  onOpenAi: () => void;
  onOpenLogicSheet: () => void;
  onOpenTruthLayer: () => void;
  onOpenDataMirror: () => void;
  miniApps: MiniApp[];
}

const FACE_ICONS: Record<BarFace, React.ReactNode> = {
  apps: <AppWindow size={11} />,
  ai:   <BrainCircuit size={11} />,
  web:  <Globe size={11} />,
};

const BottomBar = ({
  onSubmitPrompt,
  onOpenSettings,
  onOpenAi,
  onOpenLogicSheet,
  onOpenTruthLayer,
  onOpenDataMirror,
  miniApps,
}: BottomBarProps) => {
  const [prompt, setPrompt] = useState('');
  const [face, setFace] = useState<BarFace>('apps');
  const [webUrl, setWebUrl] = useState('https://');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const next = prompt.trim();
    if (!next) return;
    const handled = await Promise.resolve(onSubmitPrompt(next));
    if (handled !== false) setPrompt('');
  };

  return (
    <div className="relative z-20 border-t border-forge-steel bg-forge-iron/80 flex-shrink-0">
      {/* Face tabs */}
      <div className="flex items-center border-b border-forge-steel/50 px-2">
        {(['apps', 'ai', 'web'] as BarFace[]).map((f) => (
          <button
            key={f}
            onClick={() => setFace(f)}
            className={`flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest border-t-2 transition-colors cursor-pointer ${
              face === f
                ? 'border-forge-ember text-forge-ember bg-forge-ember/5'
                : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            {FACE_ICONS[f]}{f}
          </button>
        ))}
        <div className="flex-1" />
        <button onClick={onOpenSettings} className="text-gray-500 hover:text-forge-ember p-2 cursor-pointer" title="Settings">
          <Settings size={12} />
        </button>
      </div>

      {/* APPS face */}
      {face === 'apps' && (
        <div className="px-3 py-2 space-y-2">
          <form onSubmit={submit} className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2 rounded border border-forge-steel bg-black/30 px-2 py-1.5">
              <Sparkles size={12} className="text-forge-ember flex-shrink-0" />
              <input
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="/open Note  |  /ai explain  |  /link term  |  /truth"
                className="w-full bg-transparent border-none outline-none text-xs text-gray-200 placeholder:text-gray-600"
              />
            </div>
            <button type="button" onClick={onOpenAi}
              className="text-xs text-gray-300 hover:text-forge-ember border border-forge-steel rounded px-2 py-1.5 cursor-pointer">AI</button>
            <button type="submit"
              className="text-xs text-forge-ember hover:text-white border border-forge-ember/40 rounded px-2 py-1.5 cursor-pointer flex items-center gap-1">
              <Play size={11} /> Run
            </button>
          </form>
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            <button onClick={onOpenLogicSheet}
              className="text-[10px] px-2 py-1 rounded border border-forge-steel text-gray-300 hover:text-forge-ember whitespace-nowrap cursor-pointer flex items-center gap-1">
              <Table2 size={11} /> Logic Sheet
            </button>
            <button onClick={onOpenTruthLayer}
              className="text-[10px] px-2 py-1 rounded border border-forge-steel text-gray-300 hover:text-forge-ember whitespace-nowrap cursor-pointer flex items-center gap-1">
              <ShieldCheck size={11} /> Forge Layer
            </button>
            <button onClick={onOpenDataMirror}
              className="text-[10px] px-2 py-1 rounded border border-forge-steel text-gray-300 hover:text-forge-ember whitespace-nowrap cursor-pointer flex items-center gap-1">
              <Table2 size={11} /> Data Mirror
            </button>
            {miniApps.map((app) => (
              <button key={app.id} onClick={() => void onSubmitPrompt(`/app ${app.id}`)}
                className="text-[10px] px-2 py-1 rounded border border-forge-steel text-gray-300 hover:text-forge-ember whitespace-nowrap cursor-pointer"
                title={app.url}>{app.name}</button>
            ))}
          </div>
        </div>
      )}

      {/* AI face */}
      {face === 'ai' && (
        <div className="px-3 py-2 space-y-2">
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Interface', desc: 'Talk · navigate · build', cmd: '/ai ' },
              { label: 'Logic Layer', desc: 'Check coherence', cmd: '/logic ' },
              { label: 'Copilot', desc: 'Predict next steps', cmd: '/copilot ' },
            ].map((item) => (
              <button
                key={item.label}
                onClick={() => { setPrompt(item.cmd); setFace('apps'); }}
                className="flex flex-col items-start px-3 py-2 rounded border border-forge-steel hover:border-forge-ember/40 bg-black/20 hover:bg-forge-ember/5 transition-all cursor-pointer group"
              >
                <span className="text-[10px] font-bold uppercase tracking-widest text-forge-ember/80 group-hover:text-forge-ember">{item.label}</span>
                <span className="text-[10px] text-gray-600 mt-0.5">{item.desc}</span>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <BrainCircuit size={11} className="text-forge-ember" />
            <span className="text-[10px] text-gray-500">3 AI layers — Interface · Logic · Copilot</span>
            <button onClick={onOpenAi} className="ml-auto text-[10px] text-forge-ember border border-forge-ember/30 rounded px-2 py-1 cursor-pointer hover:bg-forge-ember/10 transition-colors">
              Open Panel →
            </button>
          </div>
        </div>
      )}

      {/* WEB face */}
      {face === 'web' && (
        <div className="px-3 py-2 space-y-2">
          <form onSubmit={(e) => { e.preventDefault(); let url = webUrl.trim(); if (!url.startsWith('http')) url = 'https://' + url; void onSubmitPrompt(`/web ${url}`); }}
            className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2 rounded border border-forge-steel bg-black/30 px-2 py-1.5">
              <Globe size={12} className="text-forge-ember flex-shrink-0" />
              <input value={webUrl} onChange={(e) => setWebUrl(e.target.value)} placeholder="https://..."
                className="w-full bg-transparent border-none outline-none text-xs text-gray-200 font-mono" />
            </div>
            <button type="submit" className="text-xs text-forge-ember hover:text-white border border-forge-ember/40 rounded px-2 py-1.5 cursor-pointer flex items-center gap-1">
              <ChevronUp size={11} /> Fetch
            </button>
          </form>
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {['theophysics.pro', 'faiththruphysics.com', 'theophysics-dashboard.pages.dev'].map((site) => (
              <button key={site} onClick={() => setWebUrl('https://' + site)}
                className="text-[10px] px-2 py-1 rounded border border-forge-steel text-gray-400 hover:text-forge-ember cursor-pointer transition-colors whitespace-nowrap">
                {site}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default BottomBar;
