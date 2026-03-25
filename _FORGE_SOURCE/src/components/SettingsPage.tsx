import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { X, Plus, ExternalLink, Trash2, ChevronDown } from 'lucide-react';
import { ForgeSettings, MiniApp, AiRole } from '../lib/types';
import { providerLabel } from '../lib/ai';
import { createEngine, ensureEngineFolder, EngineEntry, getEngines, toggleEngine } from '../lib/engine';

interface SettingsPageProps {
  open: boolean;
  settings: ForgeSettings;
  onUpdateSettings: (next: ForgeSettings) => void;
  onClose: () => void;
  onLaunchMiniApp: (app: MiniApp) => void;
  activeNotebookPath: string | null;
}

type SectionKey = 'appearance' | 'behavior' | 'files' | 'ai' | 'engines' | 'miniapps';

function createMiniAppId(name: string): string {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return `${slug || 'mini-app'}-${Date.now().toString(36)}`;
}

const FONT_CHOICES = [
  { id: 'inter', label: 'Inter', value: 'Inter, system-ui, sans-serif' },
  { id: 'system', label: 'System Default', value: 'system-ui, -apple-system, Segoe UI, sans-serif' },
  { id: 'mono', label: 'Mono', value: '"JetBrains Mono", "Fira Code", monospace' },
  { id: 'serif', label: 'Serif', value: 'Georgia, Charter, serif' },
  { id: 'custom', label: 'Custom', value: '__custom__' },
] as const;

const ACCENT_SWATCHES = ['#e8a912', '#ff4d00', '#3fb950', '#58a6ff', '#d2a8ff'];

const Section = ({
  title,
  section,
  expanded,
  onToggle,
  children,
}: {
  title: string;
  section: SectionKey;
  expanded: Record<SectionKey, boolean>;
  onToggle: (key: SectionKey) => void;
  children: ReactNode;
}) => (
  <section className="space-y-2 border border-forge-steel rounded p-3">
    <button
      className="w-full flex items-center justify-between cursor-pointer"
      onClick={() => onToggle(section)}
    >
      <h3 className="text-xs uppercase tracking-widest text-gray-400">{title}</h3>
      <ChevronDown size={14} className={`text-gray-500 transition-transform ${expanded[section] ? '' : '-rotate-90'}`} />
    </button>
    {expanded[section] && children}
  </section>
);

const SettingsPage = ({
  open,
  settings,
  onUpdateSettings,
  onClose,
  onLaunchMiniApp,
  activeNotebookPath,
}: SettingsPageProps) => {
  const [appName, setAppName] = useState('');
  const [appUrl, setAppUrl] = useState('');
  const [engines, setEngines] = useState<EngineEntry[]>([]);
  const [engineError, setEngineError] = useState<string | null>(null);
  const [newEngineName, setNewEngineName] = useState('');
  const [newEngineFile, setNewEngineFile] = useState('');
  const [expanded, setExpanded] = useState<Record<SectionKey, boolean>>({
    appearance: true,
    behavior: true,
    files: true,
    ai: true,
    engines: true,
    miniapps: true,
  });

  const autosaveSeconds = useMemo(() => Math.max(0.5, settings.autosaveDelayMs / 1000), [settings.autosaveDelayMs]);
  const backgroundSeconds = useMemo(() => Math.round(settings.backgroundAiDebounce / 1000), [settings.backgroundAiDebounce]);
  const roleOrder: AiRole[] = ['interface', 'logic', 'copilot'];

  useEffect(() => {
    const load = async () => {
      if (!open || !activeNotebookPath) return;
      try {
        setEngineError(null);
        await ensureEngineFolder();
        setEngines(await getEngines());
      } catch (error: any) {
        setEngineError(error?.message ?? 'Failed to load engines');
      }
    };
    load();
  }, [open, activeNotebookPath]);

  if (!open) return null;

  const selectedFont = FONT_CHOICES.find((item) => item.value === settings.editorFontFamily);
  const useCustomFont = !selectedFont || selectedFont.id === 'custom';

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex">
      <div className="w-full max-w-4xl mx-auto my-8 border border-forge-steel bg-[#161616] rounded-lg overflow-hidden flex flex-col">
        <div className="px-4 py-3 border-b border-forge-steel flex items-center justify-between">
          <h2 className="text-sm tracking-widest uppercase font-bold text-forge-ember">Settings + Platform</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors cursor-pointer">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          <Section title="Appearance" section="appearance" expanded={expanded} onToggle={(key) => setExpanded((prev) => ({ ...prev, [key]: !prev[key] }))}>
            <label className="text-xs text-gray-300 flex items-center justify-between gap-3">
              Font Family
              <select
                value={useCustomFont ? '__custom__' : selectedFont?.value}
                onChange={(event) => {
                  const value = event.target.value;
                  if (value !== '__custom__') {
                    onUpdateSettings({ ...settings, editorFontFamily: value });
                  }
                }}
                className="w-52 bg-black/30 border border-forge-steel rounded px-2 py-1.5 text-xs"
              >
                {FONT_CHOICES.map((choice) => (
                  <option key={choice.id} value={choice.value}>{choice.label}</option>
                ))}
              </select>
            </label>
            {useCustomFont && (
              <input
                value={settings.editorFontFamily}
                onChange={(event) => onUpdateSettings({ ...settings, editorFontFamily: event.target.value })}
                placeholder="Custom CSS font stack"
                className="w-full bg-black/30 border border-forge-steel rounded px-2 py-1.5 text-xs"
              />
            )}
            <label className="text-xs text-gray-300 flex items-center justify-between gap-3">
              Font Size ({settings.editorFontSize}px)
              <input type="range" min={12} max={24} step={1} value={settings.editorFontSize} onChange={(event) => onUpdateSettings({ ...settings, editorFontSize: Number(event.target.value) })} className="w-48" />
            </label>
            <label className="text-xs text-gray-300 flex items-center justify-between gap-3">
              Line Height ({settings.editorLineHeight.toFixed(1)})
              <input type="range" min={1.2} max={2.4} step={0.1} value={settings.editorLineHeight} onChange={(event) => onUpdateSettings({ ...settings, editorLineHeight: Number(event.target.value) })} className="w-48" />
            </label>
            <label className="text-xs text-gray-300 flex items-center justify-between gap-3">
              Readable line width ({settings.editorMaxWidth}px)
              <input type="range" min={480} max={1200} step={40} value={settings.editorMaxWidth} onChange={(event) => onUpdateSettings({ ...settings, editorMaxWidth: Number(event.target.value) })} className="w-48" />
            </label>
            <div className="text-xs text-gray-300 flex items-center justify-between gap-3">
              Editor Theme
              <div className="flex gap-2">
                {(['dark', 'darker', 'midnight'] as const).map((theme) => (
                  <button key={theme} onClick={() => onUpdateSettings({ ...settings, editorTheme: theme })} className={`text-[10px] px-2 py-1 rounded border ${settings.editorTheme === theme ? 'border-forge-ember/50 text-forge-ember' : 'border-forge-steel text-gray-400'}`}>
                    {theme}
                  </button>
                ))}
              </div>
            </div>
            <div className="text-xs text-gray-300 flex items-center justify-between gap-3">
              Accent Color
              <div className="flex items-center gap-2">
                {ACCENT_SWATCHES.map((color) => (
                  <button key={color} onClick={() => onUpdateSettings({ ...settings, editorAccentColor: color })} className="w-5 h-5 rounded border" style={{ backgroundColor: color }} />
                ))}
                <input type="color" value={settings.editorAccentColor} onChange={(event) => onUpdateSettings({ ...settings, editorAccentColor: event.target.value })} />
              </div>
            </div>
          </Section>

          <Section title="Behavior" section="behavior" expanded={expanded} onToggle={(key) => setExpanded((prev) => ({ ...prev, [key]: !prev[key] }))}>
            <label className="text-xs text-gray-300 flex items-center justify-between">Autosave Delay ({autosaveSeconds.toFixed(1)}s)<input type="range" min={500} max={10000} step={100} value={settings.autosaveDelayMs} onChange={(event) => onUpdateSettings({ ...settings, autosaveDelayMs: Number(event.target.value) })} className="w-48" /></label>
            <label className="text-xs text-gray-300 flex items-center justify-between">Spellcheck<input type="checkbox" checked={settings.spellcheck} onChange={(event) => onUpdateSettings({ ...settings, spellcheck: event.target.checked })} /></label>
            <label className="text-xs text-gray-300 flex items-center justify-between">Vim Mode (coming soon)<input type="checkbox" checked={settings.vimMode} onChange={(event) => onUpdateSettings({ ...settings, vimMode: event.target.checked })} /></label>
            <label className="text-xs text-gray-300 flex items-center justify-between">Show line numbers<input type="checkbox" checked={settings.showLineNumbers} onChange={(event) => onUpdateSettings({ ...settings, showLineNumbers: event.target.checked })} /></label>
            <label className="text-xs text-gray-300 flex items-center justify-between">Tab size
              <select value={settings.tabSize} onChange={(event) => onUpdateSettings({ ...settings, tabSize: Number(event.target.value) as 2 | 4 | 8 })} className="w-20 bg-black/30 border border-forge-steel rounded px-2 py-1 text-xs">
                {[2,4,8].map((size) => <option key={size} value={size}>{size}</option>)}
              </select>
            </label>
            <label className="text-xs text-gray-300 flex items-center justify-between">Auto-pair brackets<input type="checkbox" checked={settings.autoPairBrackets} onChange={(event) => onUpdateSettings({ ...settings, autoPairBrackets: event.target.checked })} /></label>
            <label className="text-xs text-gray-300 flex items-center justify-between">Fold headings (coming soon)<input type="checkbox" checked={settings.foldHeadings} onChange={(event) => onUpdateSettings({ ...settings, foldHeadings: event.target.checked })} /></label>
            <label className="text-xs text-gray-300 flex items-center justify-between">Show Top Prompt Bar<input type="checkbox" checked={settings.topPromptBarEnabled} onChange={(event) => onUpdateSettings({ ...settings, topPromptBarEnabled: event.target.checked })} /></label>
          </Section>

          <Section title="Files & Vault" section="files" expanded={expanded} onToggle={(key) => setExpanded((prev) => ({ ...prev, [key]: !prev[key] }))}>
            <label className="text-xs text-gray-300 flex items-center justify-between">New note location
              <select value={settings.defaultNewNoteLocation} onChange={(event) => onUpdateSettings({ ...settings, defaultNewNoteLocation: event.target.value as 'root' | 'same-folder' })} className="w-36 bg-black/30 border border-forge-steel rounded px-2 py-1 text-xs">
                <option value="root">Root</option>
                <option value="same-folder">Same folder</option>
              </select>
            </label>
            <label className="text-xs text-gray-300 flex items-center justify-between">Trash method
              <select value={settings.trashMethod} onChange={(event) => onUpdateSettings({ ...settings, trashMethod: event.target.value as ForgeSettings['trashMethod'] })} className="w-36 bg-black/30 border border-forge-steel rounded px-2 py-1 text-xs">
                <option value="system">System</option>
                <option value="vault-trash">Vault trash</option>
                <option value="permanent">Permanent</option>
              </select>
            </label>
            <label className="text-xs text-gray-300 block">Excluded folders (comma-separated)
              <input value={settings.excludedFolders.join(', ')} onChange={(event) => onUpdateSettings({ ...settings, excludedFolders: event.target.value.split(',').map((v) => v.trim()).filter(Boolean) })} className="mt-1 w-full bg-black/30 border border-forge-steel rounded px-2 py-1.5 text-xs" />
            </label>
            <label className="text-xs text-gray-300 block">Attachment folder
              <input value={settings.attachmentFolder} onChange={(event) => onUpdateSettings({ ...settings, attachmentFolder: event.target.value })} className="mt-1 w-full bg-black/30 border border-forge-steel rounded px-2 py-1.5 text-xs" />
            </label>
          </Section>

          <Section title="AI Layers" section="ai" expanded={expanded} onToggle={(key) => setExpanded((prev) => ({ ...prev, [key]: !prev[key] }))}>
            <label className="text-xs text-gray-300 flex items-center justify-between">Enable background AI<input type="checkbox" checked={settings.enableBackgroundAi} onChange={(event) => onUpdateSettings({ ...settings, enableBackgroundAi: event.target.checked })} /></label>
            <label className="text-xs text-gray-300 flex items-center justify-between">Background debounce ({backgroundSeconds}s)<input type="range" min={3000} max={30000} step={1000} value={settings.backgroundAiDebounce} onChange={(event) => onUpdateSettings({ ...settings, backgroundAiDebounce: Number(event.target.value) })} className="w-48" /></label>
            <label className="text-xs text-gray-300 flex items-center justify-between">AI max tokens
              <select value={settings.aiMaxTokens} onChange={(event) => onUpdateSettings({ ...settings, aiMaxTokens: Number(event.target.value) as ForgeSettings['aiMaxTokens'] })} className="w-28 bg-black/30 border border-forge-steel rounded px-2 py-1 text-xs">
                {[1024, 2048, 4096, 8192].map((token) => <option key={token} value={token}>{token}</option>)}
              </select>
            </label>
            <label className="text-xs text-gray-300 flex items-center justify-between">Include workspace context in AI replies<input type="checkbox" checked={settings.aiUseWorkspaceContext} onChange={(event) => onUpdateSettings({ ...settings, aiUseWorkspaceContext: event.target.checked })} /></label>

            <div className="space-y-2"><div className="text-[11px] text-gray-500">Primary AI provider</div><div className="flex gap-2">{(['ollama', 'anthropic', 'openai'] as const).map((provider) => (
              <button key={provider} onClick={() => onUpdateSettings({ ...settings, aiProvider: provider })} className={`text-[10px] px-2 py-1 rounded border ${settings.aiProvider === provider ? 'border-forge-ember/50 text-forge-ember bg-forge-ember/10' : 'border-forge-steel text-gray-400'}`}>{providerLabel(provider)}</button>
            ))}</div></div>
            <div className="space-y-2"><div className="text-[11px] text-gray-500">Role routing</div><div className="flex gap-2">{(['shared', 'split'] as const).map((routing) => (
              <button key={routing} onClick={() => onUpdateSettings({ ...settings, aiRoleRouting: routing })} className={`text-[10px] px-2 py-1 rounded border ${settings.aiRoleRouting === routing ? 'border-forge-ember/50 text-forge-ember bg-forge-ember/10' : 'border-forge-steel text-gray-400'}`}>{routing === 'shared' ? 'Shared Engine' : 'Split Engines'}</button>
            ))}</div></div>
            <label className="text-xs text-gray-300 flex items-center justify-between gap-3">Ollama model<input type="text" value={settings.ollamaModel} onChange={(event) => onUpdateSettings({ ...settings, ollamaModel: event.target.value })} className="w-56 bg-black/30 border border-forge-steel rounded px-2 py-1.5 text-xs" /></label>
            <div className="space-y-3 border border-forge-steel rounded p-3 bg-black/10">
              {roleOrder.map((role) => (
                <div key={role} className="grid grid-cols-1 md:grid-cols-[110px_1fr_1fr] gap-2 items-center">
                  <div className="text-[11px] uppercase tracking-widest text-gray-300">{role}</div>
                  <div className="flex items-center gap-2">{(['ollama', 'anthropic', 'openai'] as const).map((provider) => (
                    <button key={`${role}-${provider}`} onClick={() => onUpdateSettings({ ...settings, aiRoles: { ...settings.aiRoles, [role]: { ...settings.aiRoles[role], provider } } })} className={`text-[10px] px-2 py-1 rounded border ${settings.aiRoles[role].provider === provider ? 'border-forge-ember/50 text-forge-ember bg-forge-ember/10' : 'border-forge-steel text-gray-400'}`}>{providerLabel(provider)}</button>
                  ))}</div>
                  <input type="text" value={settings.aiRoles[role].model} onChange={(event) => onUpdateSettings({ ...settings, aiRoles: { ...settings.aiRoles, [role]: { ...settings.aiRoles[role], model: event.target.value } } })} className="bg-black/30 border border-forge-steel rounded px-2 py-1.5 text-xs" />
                </div>
              ))}
            </div>
          </Section>

          <Section title="Global Engines" section="engines" expanded={expanded} onToggle={(key) => setExpanded((prev) => ({ ...prev, [key]: !prev[key] }))}>
            {!activeNotebookPath && <p className="text-[11px] text-gray-600">Select a notebook to view engines.</p>}
            {engineError && <p className="text-[11px] text-red-400">{engineError}</p>}
            {activeNotebookPath && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <input value={newEngineName} onChange={(event) => setNewEngineName(event.target.value)} placeholder="Engine name" className="bg-black/30 border border-forge-steel rounded px-2 py-1.5 text-xs" />
                <input value={newEngineFile} onChange={(event) => setNewEngineFile(event.target.value)} placeholder="file (e.g. tts_engine)" className="bg-black/30 border border-forge-steel rounded px-2 py-1.5 text-xs" />
                <button onClick={async () => { const name = newEngineName.trim(); const file = newEngineFile.trim(); if (!name || !file) return; await createEngine(file, name, 'manual', false); setEngines(await getEngines()); setNewEngineName(''); setNewEngineFile(''); }} className="text-xs px-2 py-1 rounded border border-forge-ember/40 text-forge-ember hover:text-white cursor-pointer">Create engine</button>
              </div>
            )}
            <div className="space-y-1">{engines.map((engine) => (
              <label key={engine.id} className="flex items-center justify-between gap-2 border border-forge-steel rounded px-2 py-1"><div className="min-w-0"><div className="text-xs text-gray-200 truncate">{engine.name}</div><div className="text-[10px] text-gray-600">{engine.file} · trigger:{engine.trigger}</div></div><input type="checkbox" checked={engine.enabled} onChange={async (event) => { await toggleEngine(engine.file, event.target.checked); setEngines(await getEngines()); }} /></label>
            ))}</div>
          </Section>

          <Section title="Mini Apps" section="miniapps" expanded={expanded} onToggle={(key) => setExpanded((prev) => ({ ...prev, [key]: !prev[key] }))}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <input value={appName} onChange={(event) => setAppName(event.target.value)} placeholder="App name" className="bg-black/30 border border-forge-steel rounded px-2 py-1.5 text-xs" />
              <input value={appUrl} onChange={(event) => setAppUrl(event.target.value)} placeholder="https://app.example.com" className="bg-black/30 border border-forge-steel rounded px-2 py-1.5 text-xs" />
            </div>
            <button onClick={() => { const name = appName.trim(); const url = appUrl.trim(); if (!name || !url) return; onUpdateSettings({ ...settings, miniApps: [...settings.miniApps, { id: createMiniAppId(name), name, url }] }); setAppName(''); setAppUrl(''); }} className="text-xs px-2 py-1 rounded border border-forge-ember/40 text-forge-ember hover:text-white cursor-pointer flex items-center gap-1"><Plus size={11} /> Add Mini App</button>
            <div className="space-y-1">{settings.miniApps.map((app) => (
              <div key={app.id} className="flex items-center gap-2 border border-forge-steel rounded px-2 py-1"><button onClick={() => onLaunchMiniApp(app)} className="flex-1 text-left text-xs text-gray-200 hover:text-forge-ember truncate cursor-pointer" title={app.url}>{app.name}</button><button onClick={() => onLaunchMiniApp(app)} className="text-gray-500 hover:text-gray-200 cursor-pointer" title="Open app"><ExternalLink size={11} /></button><button onClick={() => onUpdateSettings({ ...settings, miniApps: settings.miniApps.filter((item) => item.id !== app.id) })} className="text-gray-500 hover:text-red-400 cursor-pointer" title="Remove app"><Trash2 size={11} /></button></div>
            ))}</div>
          </Section>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
