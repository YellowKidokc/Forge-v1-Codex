import { useMemo, useState } from 'react';
import { X, Plus, ExternalLink, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import {
  AiProvider,
  DockInternalTarget,
  DockLauncher,
  DockLauncherType,
  ForgeSettings,
  MiniApp,
  QuickPlace,
  QuickPlaceMode,
} from '../lib/types';
import { getApiKey, hasApiKey, setAiProvider, setApiKey } from '../lib/ai';

interface SettingsPageProps {
  open: boolean;
  settings: ForgeSettings;
  onUpdateSettings: (next: ForgeSettings) => void;
  onClose: () => void;
  onLaunchMiniApp: (app: MiniApp) => void;
}

const INTERNAL_TARGETS: Array<{ value: DockInternalTarget; label: string }> = [
  { value: 'editor', label: 'Editor' },
  { value: 'logic_sheet', label: 'Logic Sheet' },
  { value: 'ai_workspace', label: 'AI Workspace' },
  { value: 'ai_panel', label: 'AI Panel' },
];

const PROVIDERS: AiProvider[] = ['anthropic', 'openai'];
const FONT_OPTIONS: Array<{ label: string; value: string }> = [
  { label: 'Inter / System', value: 'Inter, system-ui, -apple-system, "Segoe UI", sans-serif' },
  { label: 'JetBrains Mono', value: '"JetBrains Mono", "Fira Code", Consolas, monospace' },
  { label: 'Segoe UI', value: '"Segoe UI", Tahoma, Verdana, sans-serif' },
  { label: 'Georgia', value: 'Georgia, "Times New Roman", serif' },
];

function createMiniAppId(name: string): string {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return `${slug || 'mini-app'}-${Date.now().toString(36)}`;
}

function createLauncherId(name: string): string {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return `${slug || 'launcher'}-${Date.now().toString(36)}`;
}

function createQuickPlaceId(name: string): string {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return `${slug || 'place'}-${Date.now().toString(36)}`;
}

function isInternalTarget(value: string): value is DockInternalTarget {
  return INTERNAL_TARGETS.some((item) => item.value === value);
}

const SettingsPage = ({
  open,
  settings,
  onUpdateSettings,
  onClose,
  onLaunchMiniApp,
}: SettingsPageProps) => {
  const [appName, setAppName] = useState('');
  const [appUrl, setAppUrl] = useState('');

  const [launcherName, setLauncherName] = useState('');
  const [launcherIcon, setLauncherIcon] = useState('◻');
  const [launcherType, setLauncherType] = useState<DockLauncherType>('internal');
  const [launcherTarget, setLauncherTarget] = useState<string>('editor');
  const [launcherPinned, setLauncherPinned] = useState(true);
  const [placeName, setPlaceName] = useState('');
  const [placePath, setPlacePath] = useState('');
  const [placeMode, setPlaceMode] = useState<QuickPlaceMode>('notebook');
  const [placePinned, setPlacePinned] = useState(true);

  const [claudeKey, setClaudeKey] = useState(getApiKey('anthropic') || '');
  const [openAiKey, setOpenAiKey] = useState(getApiKey('openai') || '');

  const autosaveSeconds = useMemo(
    () => Math.max(0.5, settings.autosaveDelayMs / 1000),
    [settings.autosaveDelayMs]
  );

  if (!open) return null;

  const updateLauncher = (id: string, updates: Partial<DockLauncher>) => {
    onUpdateSettings({
      ...settings,
      dockLaunchers: settings.dockLaunchers.map((item) =>
        item.id === id ? { ...item, ...updates } : item
      ),
    });
  };

  const moveLauncher = (id: string, direction: -1 | 1) => {
    const index = settings.dockLaunchers.findIndex((item) => item.id === id);
    if (index < 0) return;
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= settings.dockLaunchers.length) return;
    const next = [...settings.dockLaunchers];
    const [item] = next.splice(index, 1);
    next.splice(nextIndex, 0, item);
    onUpdateSettings({
      ...settings,
      dockLaunchers: next,
    });
  };

  const updateQuickPlace = (id: string, updates: Partial<QuickPlace>) => {
    onUpdateSettings({
      ...settings,
      quickPlaces: settings.quickPlaces.map((item) =>
        item.id === id ? { ...item, ...updates } : item
      ),
    });
  };

  const moveQuickPlace = (id: string, direction: -1 | 1) => {
    const index = settings.quickPlaces.findIndex((item) => item.id === id);
    if (index < 0) return;
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= settings.quickPlaces.length) return;
    const next = [...settings.quickPlaces];
    const [item] = next.splice(index, 1);
    next.splice(nextIndex, 0, item);
    onUpdateSettings({
      ...settings,
      quickPlaces: next,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex">
      <div className="w-full max-w-5xl mx-auto my-8 border border-forge-steel bg-[#161616] rounded-lg overflow-hidden flex flex-col">
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

          <section className="space-y-3 border border-forge-steel rounded p-3">
            <h3 className="text-xs uppercase tracking-widest text-gray-400">Appearance (Global)</h3>
            <p className="text-[11px] text-gray-500">
              Control overall text size and app font for the full FORGE interface.
            </p>

            <label className="text-xs text-gray-300 flex items-center justify-between gap-3">
              App Base Text Size ({settings.uiBaseFontPx}px)
              <input
                type="range"
                min={14}
                max={21}
                step={1}
                value={settings.uiBaseFontPx}
                onChange={(event) =>
                  onUpdateSettings({
                    ...settings,
                    uiBaseFontPx: Number(event.target.value),
                  })
                }
                className="w-40"
              />
            </label>

            <label className="text-xs text-gray-300 flex items-center justify-between gap-3">
              Editor Text Size ({settings.editorFontPx}px)
              <input
                type="range"
                min={13}
                max={22}
                step={1}
                value={settings.editorFontPx}
                onChange={(event) =>
                  onUpdateSettings({
                    ...settings,
                    editorFontPx: Number(event.target.value),
                  })
                }
                className="w-40"
              />
            </label>

            <label className="text-xs text-gray-300 space-y-1 block">
              App Font Family
              <select
                value={settings.uiFontFamily}
                onChange={(event) =>
                  onUpdateSettings({
                    ...settings,
                    uiFontFamily: event.target.value,
                  })
                }
                className="w-full bg-black/30 border border-forge-steel rounded px-2 py-1.5 text-xs text-white outline-none focus:border-forge-ember/50"
              >
                {FONT_OPTIONS.map((option) => (
                  <option key={option.label} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </section>

          <section className="space-y-3 border border-forge-steel rounded p-3">
            <h3 className="text-xs uppercase tracking-widest text-gray-400">AI Provider + Keys</h3>
            <div className="flex items-center gap-2 flex-wrap">
              {PROVIDERS.map((provider) => (
                <button
                  key={provider}
                  onClick={() => {
                    setAiProvider(provider);
                    onUpdateSettings({
                      ...settings,
                      aiProvider: provider,
                    });
                  }}
                  className={`text-xs px-2 py-1 rounded border cursor-pointer ${
                    settings.aiProvider === provider
                      ? 'border-forge-ember/50 text-forge-ember bg-forge-ember/10'
                      : 'border-forge-steel text-gray-300'
                  }`}
                >
                  {provider === 'openai' ? 'GPT' : 'Claude'}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="text-xs text-gray-300 space-y-1 block">
                Claude API Key
                <input
                  type="password"
                  value={claudeKey}
                  onChange={(event) => setClaudeKey(event.target.value)}
                  onBlur={() => setApiKey(claudeKey, 'anthropic')}
                  placeholder="sk-ant-..."
                  className="w-full bg-black/30 border border-forge-steel rounded px-2 py-1.5 text-xs text-white outline-none focus:border-forge-ember/50"
                />
                <span className={`text-[11px] ${hasApiKey('anthropic') ? 'text-green-400' : 'text-gray-500'}`}>
                  {hasApiKey('anthropic') ? 'Claude key detected' : 'Claude key not configured'}
                </span>
              </label>

              <label className="text-xs text-gray-300 space-y-1 block">
                OpenAI API Key
                <input
                  type="password"
                  value={openAiKey}
                  onChange={(event) => setOpenAiKey(event.target.value)}
                  onBlur={() => setApiKey(openAiKey, 'openai')}
                  placeholder="sk-..."
                  className="w-full bg-black/30 border border-forge-steel rounded px-2 py-1.5 text-xs text-white outline-none focus:border-forge-ember/50"
                />
                <span className={`text-[11px] ${hasApiKey('openai') ? 'text-green-400' : 'text-gray-500'}`}>
                  {hasApiKey('openai') ? 'OpenAI key detected' : 'OpenAI key not configured'}
                </span>
              </label>
            </div>
          </section>

          <section className="space-y-2 border border-forge-steel rounded p-3">
            <h3 className="text-xs uppercase tracking-widest text-gray-400">AI Layers</h3>
            <p className="text-[11px] text-gray-500">
              Interface AI handles conversation. Logic AI validates structure. Copilot predicts next moves.
            </p>
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
            <h3 className="text-xs uppercase tracking-widest text-gray-400">Quick Places</h3>
            <p className="text-[11px] text-gray-500">
              Lock in notebooks and high-traffic folders (like O drive) for one-click switching.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
              <input
                value={placeName}
                onChange={(event) => setPlaceName(event.target.value)}
                placeholder="Name (Obsidian, O Drive, Docs...)"
                className="md:col-span-2 bg-black/30 border border-forge-steel rounded px-2 py-1.5 text-xs text-white outline-none focus:border-forge-ember/50"
              />
              <input
                value={placePath}
                onChange={(event) => setPlacePath(event.target.value)}
                placeholder={placeMode === 'notebook' ? 'O:\\Theophysics_v3' : 'O:\\ or C:\\Users\\...'}
                className="md:col-span-3 bg-black/30 border border-forge-steel rounded px-2 py-1.5 text-xs text-white outline-none focus:border-forge-ember/50"
              />
              <select
                value={placeMode}
                onChange={(event) => setPlaceMode(event.target.value as QuickPlaceMode)}
                className="md:col-span-1 bg-black/30 border border-forge-steel rounded px-2 py-1.5 text-xs text-white outline-none focus:border-forge-ember/50"
              >
                <option value="notebook">notebook</option>
                <option value="path">path</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-300 flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={placePinned}
                  onChange={(event) => setPlacePinned(event.target.checked)}
                />
                Show in sidebar quick places
              </label>
              <button
                onClick={() => {
                  const name = placeName.trim();
                  const path = placePath.trim();
                  if (!name || !path) return;
                  onUpdateSettings({
                    ...settings,
                    quickPlaces: [
                      ...settings.quickPlaces,
                      {
                        id: createQuickPlaceId(name),
                        name,
                        path,
                        mode: placeMode,
                        pinned: placePinned,
                      },
                    ],
                  });
                  setPlaceName('');
                  setPlacePath('');
                  setPlaceMode('notebook');
                  setPlacePinned(true);
                }}
                className="text-xs px-2 py-1 rounded border border-forge-ember/40 text-forge-ember hover:text-white cursor-pointer flex items-center gap-1"
              >
                <Plus size={11} /> Add Place
              </button>
            </div>

            <div className="space-y-2">
              {settings.quickPlaces.length === 0 && (
                <p className="text-[11px] text-gray-600">No quick places yet.</p>
              )}
              {settings.quickPlaces.map((place, index) => (
                <div key={place.id} className="border border-forge-steel rounded p-2 space-y-2 bg-black/20">
                  <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
                    <input
                      value={place.name}
                      onChange={(event) => updateQuickPlace(place.id, { name: event.target.value })}
                      className="md:col-span-2 bg-black/30 border border-forge-steel rounded px-2 py-1.5 text-xs text-white outline-none focus:border-forge-ember/50"
                    />
                    <input
                      value={place.path}
                      onChange={(event) => updateQuickPlace(place.id, { path: event.target.value })}
                      className="md:col-span-3 bg-black/30 border border-forge-steel rounded px-2 py-1.5 text-xs text-white outline-none focus:border-forge-ember/50"
                    />
                    <select
                      value={place.mode}
                      onChange={(event) => updateQuickPlace(place.id, { mode: event.target.value as QuickPlaceMode })}
                      className="md:col-span-1 bg-black/30 border border-forge-steel rounded px-2 py-1.5 text-xs text-white outline-none focus:border-forge-ember/50"
                    >
                      <option value="notebook">notebook</option>
                      <option value="path">path</option>
                    </select>
                    <label className="md:col-span-1 text-xs text-gray-300 flex items-center justify-center gap-1 border border-forge-steel rounded px-2 py-1.5">
                      <input
                        type="checkbox"
                        checked={place.pinned}
                        onChange={(event) => updateQuickPlace(place.id, { pinned: event.target.checked })}
                      />
                      Pin
                    </label>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] text-gray-500">ID: {place.id}</p>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => moveQuickPlace(place.id, -1)}
                        disabled={index === 0}
                        className="text-gray-500 hover:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                        title="Move up"
                      >
                        <ArrowUp size={12} />
                      </button>
                      <button
                        onClick={() => moveQuickPlace(place.id, 1)}
                        disabled={index === settings.quickPlaces.length - 1}
                        className="text-gray-500 hover:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                        title="Move down"
                      >
                        <ArrowDown size={12} />
                      </button>
                      <button
                        onClick={() =>
                          onUpdateSettings({
                            ...settings,
                            quickPlaces: settings.quickPlaces.filter((item) => item.id !== place.id),
                          })
                        }
                        className="text-gray-500 hover:text-red-400 cursor-pointer"
                        title="Remove place"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-3 border border-forge-steel rounded p-3">
            <h3 className="text-xs uppercase tracking-widest text-gray-400">Dock Launchers</h3>
            <p className="text-[11px] text-gray-500">
              Add launchers for internal views, web URLs, and local files/apps. Order here is the dock order.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
              <input
                value={launcherName}
                onChange={(event) => setLauncherName(event.target.value)}
                placeholder="Name"
                className="md:col-span-2 bg-black/30 border border-forge-steel rounded px-2 py-1.5 text-xs text-white outline-none focus:border-forge-ember/50"
              />
              <input
                value={launcherIcon}
                onChange={(event) => setLauncherIcon(event.target.value)}
                placeholder="Icon"
                className="md:col-span-1 bg-black/30 border border-forge-steel rounded px-2 py-1.5 text-xs text-white outline-none focus:border-forge-ember/50"
              />
              <select
                value={launcherType}
                onChange={(event) => {
                  const nextType = event.target.value as DockLauncherType;
                  setLauncherType(nextType);
                  if (nextType === 'internal' && !isInternalTarget(launcherTarget)) {
                    setLauncherTarget('editor');
                  }
                }}
                className="md:col-span-1 bg-black/30 border border-forge-steel rounded px-2 py-1.5 text-xs text-white outline-none focus:border-forge-ember/50"
              >
                <option value="internal">internal</option>
                <option value="url">url</option>
                <option value="path">path</option>
              </select>
              {launcherType === 'internal' ? (
                <select
                  value={isInternalTarget(launcherTarget) ? launcherTarget : 'editor'}
                  onChange={(event) => setLauncherTarget(event.target.value)}
                  className="md:col-span-2 bg-black/30 border border-forge-steel rounded px-2 py-1.5 text-xs text-white outline-none focus:border-forge-ember/50"
                >
                  {INTERNAL_TARGETS.map((target) => (
                    <option key={target.value} value={target.value}>
                      {target.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  value={launcherTarget}
                  onChange={(event) => setLauncherTarget(event.target.value)}
                  placeholder={launcherType === 'url' ? 'https://...' : 'C:\\path\\app.exe'}
                  className="md:col-span-2 bg-black/30 border border-forge-steel rounded px-2 py-1.5 text-xs text-white outline-none focus:border-forge-ember/50"
                />
              )}
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-300 flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={launcherPinned}
                  onChange={(event) => setLauncherPinned(event.target.checked)}
                />
                Pinned to dock
              </label>
              <button
                onClick={() => {
                  const name = launcherName.trim();
                  const target =
                    launcherType === 'internal'
                      ? launcherTarget
                      : launcherTarget.trim();
                  if (!name || !target) return;
                  onUpdateSettings({
                    ...settings,
                    dockLaunchers: [
                      ...settings.dockLaunchers,
                      {
                        id: createLauncherId(name),
                        name,
                        icon: launcherIcon.trim() || '◻',
                        type: launcherType,
                        target,
                        pinned: launcherPinned,
                      },
                    ],
                  });
                  setLauncherName('');
                  setLauncherIcon('◻');
                  setLauncherType('internal');
                  setLauncherTarget('editor');
                  setLauncherPinned(true);
                }}
                className="text-xs px-2 py-1 rounded border border-forge-ember/40 text-forge-ember hover:text-white cursor-pointer flex items-center gap-1"
              >
                <Plus size={11} /> Add Launcher
              </button>
            </div>

            <div className="space-y-2">
              {settings.dockLaunchers.length === 0 && (
                <p className="text-[11px] text-gray-600">No launchers yet.</p>
              )}
              {settings.dockLaunchers.map((launcher, index) => (
                <div key={launcher.id} className="border border-forge-steel rounded p-2 space-y-2 bg-black/20">
                  <div className="grid grid-cols-1 md:grid-cols-8 gap-2">
                    <input
                      value={launcher.name}
                      onChange={(event) => updateLauncher(launcher.id, { name: event.target.value })}
                      className="md:col-span-2 bg-black/30 border border-forge-steel rounded px-2 py-1.5 text-xs text-white outline-none focus:border-forge-ember/50"
                    />
                    <input
                      value={launcher.icon}
                      onChange={(event) => updateLauncher(launcher.id, { icon: event.target.value })}
                      className="md:col-span-1 bg-black/30 border border-forge-steel rounded px-2 py-1.5 text-xs text-white outline-none focus:border-forge-ember/50"
                    />
                    <select
                      value={launcher.type}
                      onChange={(event) => {
                        const nextType = event.target.value as DockLauncherType;
                        const nextTarget =
                          nextType === 'internal'
                            ? isInternalTarget(launcher.target)
                              ? launcher.target
                              : 'editor'
                            : launcher.type === 'internal'
                            ? ''
                            : launcher.target;
                        updateLauncher(launcher.id, { type: nextType, target: nextTarget });
                      }}
                      className="md:col-span-1 bg-black/30 border border-forge-steel rounded px-2 py-1.5 text-xs text-white outline-none focus:border-forge-ember/50"
                    >
                      <option value="internal">internal</option>
                      <option value="url">url</option>
                      <option value="path">path</option>
                    </select>

                    {launcher.type === 'internal' ? (
                      <select
                        value={isInternalTarget(launcher.target) ? launcher.target : 'editor'}
                        onChange={(event) => updateLauncher(launcher.id, { target: event.target.value })}
                        className="md:col-span-3 bg-black/30 border border-forge-steel rounded px-2 py-1.5 text-xs text-white outline-none focus:border-forge-ember/50"
                      >
                        {INTERNAL_TARGETS.map((target) => (
                          <option key={target.value} value={target.value}>
                            {target.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        value={launcher.target}
                        onChange={(event) => updateLauncher(launcher.id, { target: event.target.value })}
                        placeholder={launcher.type === 'url' ? 'https://...' : 'C:\\path\\app.exe'}
                        className="md:col-span-3 bg-black/30 border border-forge-steel rounded px-2 py-1.5 text-xs text-white outline-none focus:border-forge-ember/50"
                      />
                    )}

                    <label className="md:col-span-1 text-xs text-gray-300 flex items-center justify-center gap-1 border border-forge-steel rounded px-2 py-1.5">
                      <input
                        type="checkbox"
                        checked={launcher.pinned}
                        onChange={(event) => updateLauncher(launcher.id, { pinned: event.target.checked })}
                      />
                      Pin
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="text-[10px] text-gray-500">
                      ID: {launcher.id}
                      {launcher.core ? ' (core)' : ''}
                    </p>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => moveLauncher(launcher.id, -1)}
                        disabled={index === 0}
                        className="text-gray-500 hover:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                        title="Move up"
                      >
                        <ArrowUp size={12} />
                      </button>
                      <button
                        onClick={() => moveLauncher(launcher.id, 1)}
                        disabled={index === settings.dockLaunchers.length - 1}
                        className="text-gray-500 hover:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                        title="Move down"
                      >
                        <ArrowDown size={12} />
                      </button>
                      <button
                        disabled={Boolean(launcher.core)}
                        onClick={() =>
                          onUpdateSettings({
                            ...settings,
                            dockLaunchers: settings.dockLaunchers.filter((item) => item.id !== launcher.id),
                          })
                        }
                        className="text-gray-500 hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                        title={launcher.core ? 'Core launchers cannot be removed' : 'Remove launcher'}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-3 border border-forge-steel rounded p-3">
            <h3 className="text-xs uppercase tracking-widest text-gray-400">Mini Apps Surface</h3>
            <p className="text-[11px] text-gray-500">
              Add web apps here for quick top-bar actions. Each mini app is also pinned into the dock.
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

                const appId = createMiniAppId(name);
                const launcherId = `mini-${appId}`;
                const nextMini: MiniApp = { id: appId, name, url };

                onUpdateSettings({
                  ...settings,
                  miniApps: [...settings.miniApps, nextMini],
                  dockLaunchers: [
                    ...settings.dockLaunchers,
                    {
                      id: launcherId,
                      name,
                      icon: '✦',
                      type: 'url',
                      target: url,
                      pinned: true,
                    },
                  ],
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
                        dockLaunchers: settings.dockLaunchers.filter((item) => item.id !== `mini-${app.id}`),
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
