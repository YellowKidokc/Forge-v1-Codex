import { useEffect, useMemo, useState } from 'react';
import { X, Plus, ExternalLink, Trash2 } from 'lucide-react';
import { ForgeSettings, MiniApp, AiRole } from '../lib/types';
import { providerLabel } from '../lib/ai';
import { ensureEngineFolder, EngineEntry, getEngines, toggleEngine } from '../lib/engine';

interface SettingsPageProps {
  open: boolean;
  settings: ForgeSettings;
  onUpdateSettings: (next: ForgeSettings) => void;
  onClose: () => void;
  onLaunchMiniApp: (app: MiniApp) => void;
  activeNotebookPath: string | null;
}

function createMiniAppId(name: string): string {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return `${slug || 'mini-app'}-${Date.now().toString(36)}`;
}

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

  const autosaveSeconds = useMemo(
    () => Math.max(0.5, settings.autosaveDelayMs / 1000),
    [settings.autosaveDelayMs]
  );
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

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex">
      <div className="w-full max-w-3xl mx-auto my-8 border border-forge-steel bg-[#161616] rounded-lg overflow-hidden flex flex-col">
        <div className="px-4 py-3 border-b border-forge-steel flex items-center justify-between">
          <h2 className="text-sm tracking-widest uppercase font-bold text-forge-ember">Settings + Platform</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors cursor-pointer">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          <section className="space-y-2 border border-forge-steel rounded p-3">
            <h3 className="text-xs uppercase tracking-widest text-gray-400">General</h3>
            <label className="text-xs text-gray-300 flex items-center justify-between gap-3">
              Autosave Delay ({autosaveSeconds.toFixed(1)}s)
              <input
                type="range"
                min={500}
                max={10000}
                step={100}
                value={settings.autosaveDelayMs}
                onChange={(event) =>
                  onUpdateSettings({
                    ...settings,
                    autosaveDelayMs: Number(event.target.value),
                  })
                }
                className="w-40"
              />
            </label>
            <label className="text-xs text-gray-300 flex items-center justify-between gap-3">
              Show Top Prompt Bar
              <input
                type="checkbox"
                checked={settings.topPromptBarEnabled}
                onChange={(event) =>
                  onUpdateSettings({
                    ...settings,
                    topPromptBarEnabled: event.target.checked,
                  })
                }
              />
            </label>
          </section>

          <section className="space-y-2 border border-forge-steel rounded p-3">
            <h3 className="text-xs uppercase tracking-widest text-gray-400">AI Layers</h3>
            <p className="text-[11px] text-gray-500">
              Interface AI handles conversation. Logic AI validates structure. Copilot predicts next moves.
            </p>
            <div className="space-y-2">
              <div className="text-[11px] text-gray-500">Primary AI provider</div>
              <div className="flex items-center gap-2">
                {(['ollama', 'anthropic', 'openai'] as const).map((provider) => (
                  <button
                    key={provider}
                    onClick={() =>
                      onUpdateSettings({
                        ...settings,
                        aiProvider: provider,
                      })
                    }
                    className={`text-[10px] px-2 py-1 rounded border cursor-pointer ${
                      settings.aiProvider === provider
                        ? 'border-forge-ember/50 text-forge-ember bg-forge-ember/10'
                        : 'border-forge-steel text-gray-400'
                    }`}
                  >
                    {providerLabel(provider)}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-[11px] text-gray-500">Role routing</div>
              <div className="flex items-center gap-2">
                {(['shared', 'split'] as const).map((routing) => (
                  <button
                    key={routing}
                    onClick={() =>
                      onUpdateSettings({
                        ...settings,
                        aiRoleRouting: routing,
                      })
                    }
                    className={`text-[10px] px-2 py-1 rounded border cursor-pointer ${
                      settings.aiRoleRouting === routing
                        ? 'border-forge-ember/50 text-forge-ember bg-forge-ember/10'
                        : 'border-forge-steel text-gray-400'
                    }`}
                  >
                    {routing === 'shared' ? 'Shared Engine' : 'Split Engines'}
                  </button>
                ))}
              </div>
            <p className="text-[11px] text-gray-600">
              Use `Shared Engine` for now. All three roles run through one provider/model but stay logically separate.
            </p>
            </div>
            <label className="text-xs text-gray-300 flex items-center justify-between gap-3">
              Ollama model
              <input
                type="text"
                value={settings.ollamaModel}
                onChange={(event) =>
                  onUpdateSettings({
                    ...settings,
                    ollamaModel: event.target.value,
                  })
                }
                placeholder="llama3.1:8b"
                className="w-56 bg-black/30 border border-forge-steel rounded px-2 py-1.5 text-xs text-white outline-none focus:border-forge-ember/50"
              />
            </label>
            <p className="text-[11px] text-gray-600">
              Local Ollama runs without API keys. Pull a model first, for example `ollama pull llama3.1:8b`.
            </p>
            <div className="space-y-3 border border-forge-steel rounded p-3 bg-black/10">
              <div className="text-[11px] text-gray-500">Role slots</div>
              {roleOrder.map((role) => (
                <div key={role} className="grid grid-cols-1 md:grid-cols-[110px_1fr_1fr] gap-2 items-center">
                  <div className="text-[11px] uppercase tracking-widest text-gray-300">{role}</div>
                  <div className="flex items-center gap-2">
                    {(['ollama', 'anthropic', 'openai'] as const).map((provider) => (
                      <button
                        key={`${role}-${provider}`}
                        onClick={() =>
                          onUpdateSettings({
                            ...settings,
                            aiRoles: {
                              ...settings.aiRoles,
                              [role]: {
                                ...settings.aiRoles[role],
                                provider,
                              },
                            },
                          })
                        }
                        className={`text-[10px] px-2 py-1 rounded border cursor-pointer ${
                          settings.aiRoles[role].provider === provider
                            ? 'border-forge-ember/50 text-forge-ember bg-forge-ember/10'
                            : 'border-forge-steel text-gray-400'
                        }`}
                      >
                        {providerLabel(provider)}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={settings.aiRoles[role].model}
                    onChange={(event) =>
                      onUpdateSettings({
                        ...settings,
                        aiRoles: {
                          ...settings.aiRoles,
                          [role]: {
                            ...settings.aiRoles[role],
                            model: event.target.value,
                          },
                        },
                      })
                    }
                    placeholder="model name"
                    className="bg-black/30 border border-forge-steel rounded px-2 py-1.5 text-xs text-white outline-none focus:border-forge-ember/50"
                  />
                </div>
              ))}
              <p className="text-[11px] text-gray-600">
                In `Shared Engine`, these stay dormant and all roles use the main provider/model. In `Split Engines`, each role uses its own slot.
              </p>
            </div>
            <label className="text-xs text-gray-300 flex items-center justify-between gap-3">
              Include workspace context in AI replies
              <input
                type="checkbox"
                checked={settings.aiUseWorkspaceContext}
                onChange={(event) =>
                  onUpdateSettings({
                    ...settings,
                    aiUseWorkspaceContext: event.target.checked,
                  })
                }
              />
            </label>
          </section>

          <section className="space-y-3 border border-forge-steel rounded p-3">
            <h3 className="text-xs uppercase tracking-widest text-gray-400">Global Engines (YAML)</h3>
            <p className="text-[11px] text-gray-500">
              Engines are loaded from <code>_engines/</code> in the active notebook.
            </p>
            {!activeNotebookPath && <p className="text-[11px] text-gray-600">Select a notebook to view engines.</p>}
            {engineError && <p className="text-[11px] text-red-400">{engineError}</p>}
            {activeNotebookPath && engines.length === 0 && !engineError && (
              <p className="text-[11px] text-gray-600">No engine YAML files found yet.</p>
            )}
            <div className="space-y-1">
              {engines.map((engine) => (
                <label key={engine.id} className="flex items-center justify-between gap-2 border border-forge-steel rounded px-2 py-1">
                  <div className="min-w-0">
                    <div className="text-xs text-gray-200 truncate">{engine.name}</div>
                    <div className="text-[10px] text-gray-600">{engine.file} · trigger:{engine.trigger}</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={engine.enabled}
                    onChange={async (event) => {
                      await toggleEngine(engine.file, event.target.checked);
                      setEngines(await getEngines());
                    }}
                  />
                </label>
              ))}
            </div>
          </section>

          <section className="space-y-3 border border-forge-steel rounded p-3">
            <h3 className="text-xs uppercase tracking-widest text-gray-400">Mini Apps Surface</h3>
            <p className="text-[11px] text-gray-500">
              Add web apps here. This gives you a launcher layer while we build deeper native plugins.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <input
                value={appName}
                onChange={(event) => setAppName(event.target.value)}
                placeholder="App name"
                className="bg-black/30 border border-forge-steel rounded px-2 py-1.5 text-xs text-white outline-none focus:border-forge-ember/50"
              />
              <input
                value={appUrl}
                onChange={(event) => setAppUrl(event.target.value)}
                placeholder="https://app.example.com"
                className="bg-black/30 border border-forge-steel rounded px-2 py-1.5 text-xs text-white outline-none focus:border-forge-ember/50"
              />
            </div>
            <button
              onClick={() => {
                const name = appName.trim();
                const url = appUrl.trim();
                if (!name || !url) return;
                onUpdateSettings({
                  ...settings,
                  miniApps: [...settings.miniApps, { id: createMiniAppId(name), name, url }],
                });
                setAppName('');
                setAppUrl('');
              }}
              className="text-xs px-2 py-1 rounded border border-forge-ember/40 text-forge-ember hover:text-white cursor-pointer flex items-center gap-1"
            >
              <Plus size={11} /> Add Mini App
            </button>

            <div className="space-y-1">
              {settings.miniApps.length === 0 && (
                <p className="text-[11px] text-gray-600">No mini apps yet.</p>
              )}
              {settings.miniApps.map((app) => (
                <div key={app.id} className="flex items-center gap-2 border border-forge-steel rounded px-2 py-1">
                  <button
                    onClick={() => onLaunchMiniApp(app)}
                    className="flex-1 text-left text-xs text-gray-200 hover:text-forge-ember truncate cursor-pointer"
                    title={app.url}
                  >
                    {app.name}
                  </button>
                  <button
                    onClick={() => onLaunchMiniApp(app)}
                    className="text-gray-500 hover:text-gray-200 cursor-pointer"
                    title="Open app"
                  >
                    <ExternalLink size={11} />
                  </button>
                  <button
                    onClick={() =>
                      onUpdateSettings({
                        ...settings,
                        miniApps: settings.miniApps.filter((item) => item.id !== app.id),
                      })
                    }
                    className="text-gray-500 hover:text-red-400 cursor-pointer"
                    title="Remove app"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
