/**
 * PluginManagerView — Enable/disable plugins, view permissions, register new ones.
 */

import { useState, useCallback, useRef } from 'react';
import { X, Shield, AlertTriangle, Plus, Trash2 } from 'lucide-react';
import {
  getRegisteredPlugins, setPluginEnabled, registerPlugin,
  unregisterPlugin, validateManifest, seedExamplePlugins,
  PERMISSION_LABELS, PERMISSION_RISK,
  type PluginInstance,
} from '../../lib/plugins';

interface PluginManagerViewProps {
  open: boolean;
  onClose: () => void;
}

const PluginManagerView = ({ open, onClose }: PluginManagerViewProps) => {
  const [plugins, setPlugins] = useState<PluginInstance[]>(() => {
    seedExamplePlugins();
    return getRegisteredPlugins();
  });
  const [selectedPlugin, setSelectedPlugin] = useState<string | null>(null);
  const [showRegister, setShowRegister] = useState(false);
  const [manifestJson, setManifestJson] = useState('');
  const [registerError, setRegisterError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const refresh = useCallback(() => {
    setPlugins(getRegisteredPlugins());
  }, []);

  const handleToggle = useCallback((pluginId: string, enabled: boolean) => {
    setPluginEnabled(pluginId, enabled);
    refresh();
  }, [refresh]);

  const handleRegister = useCallback(() => {
    setRegisterError(null);
    try {
      const parsed = JSON.parse(manifestJson);
      const result = validateManifest(parsed);
      if (!result.valid || !result.manifest) {
        setRegisterError(result.error || 'Invalid manifest');
        return;
      }
      registerPlugin(result.manifest);
      refresh();
      setManifestJson('');
      setShowRegister(false);
    } catch (err: any) {
      setRegisterError('Invalid JSON: ' + err.message);
    }
  }, [manifestJson, refresh]);

  const handleUnregister = useCallback((pluginId: string) => {
    unregisterPlugin(pluginId);
    if (selectedPlugin === pluginId) setSelectedPlugin(null);
    refresh();
  }, [selectedPlugin, refresh]);

  if (!open) return null;

  const selected = selectedPlugin ? plugins.find(p => p.manifest.id === selectedPlugin) : null;

  const riskColor = (risk: 'low' | 'medium' | 'high') => {
    if (risk === 'high') return 'text-red-400';
    if (risk === 'medium') return 'text-amber-400';
    return 'text-green-400';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70" />
      <div
        className="relative w-full max-w-4xl h-[70vh] rounded-lg border border-forge-steel bg-[#111115] shadow-2xl flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-forge-steel">
          <div className="flex items-center gap-3">
            <span className="text-forge-ember text-[10px] uppercase tracking-widest font-bold">Plugin Manager</span>
            <span className="text-gray-600 text-[9px]">{plugins.length} plugin{plugins.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowRegister(true)}
              className="text-[10px] px-2 py-1 rounded border border-forge-steel text-gray-400 hover:text-white hover:border-forge-ember/40 cursor-pointer"
            >
              <Plus size={10} className="inline mr-1" />
              Register
            </button>
            <button onClick={onClose} className="text-gray-600 hover:text-white cursor-pointer">
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Left: Plugin list */}
          <div className="w-64 border-r border-forge-steel overflow-y-auto p-2">
            {plugins.map(plugin => (
              <div
                key={plugin.manifest.id}
                onClick={() => setSelectedPlugin(plugin.manifest.id)}
                className={`px-3 py-2 rounded cursor-pointer mb-1 transition-colors ${
                  selectedPlugin === plugin.manifest.id
                    ? 'bg-forge-ember/10 text-white'
                    : 'text-gray-400 hover:bg-white/5'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium truncate">{plugin.manifest.name}</span>
                  <label
                    className="relative inline-flex items-center cursor-pointer"
                    onClick={e => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={plugin.enabled}
                      onChange={e => handleToggle(plugin.manifest.id, e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-7 h-4 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:bg-forge-ember/60 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:after:translate-x-full" />
                  </label>
                </div>
                <div className="text-[9px] text-gray-600 mt-0.5">
                  v{plugin.manifest.version}
                  {plugin.manifest.author && <span className="ml-1">by {plugin.manifest.author}</span>}
                </div>
                <div className="text-[9px] text-gray-700 mt-0.5">
                  {plugin.manifest.permissions.length} permission{plugin.manifest.permissions.length !== 1 ? 's' : ''}
                  {plugin.manifest.contributes.commands && (
                    <span className="ml-1">· {plugin.manifest.contributes.commands.length} cmd{plugin.manifest.contributes.commands.length !== 1 ? 's' : ''}</span>
                  )}
                </div>
              </div>
            ))}

            {plugins.length === 0 && (
              <div className="text-[10px] text-gray-700 text-center mt-8">No plugins registered</div>
            )}
          </div>

          {/* Right: Plugin detail */}
          <div className="flex-1 overflow-y-auto p-4">
            {selected ? (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm text-white font-bold">{selected.manifest.name}</h3>
                    <div className="text-[10px] text-gray-500">
                      {selected.manifest.id} · v{selected.manifest.version} · API {selected.manifest.forgeApiVersion}
                    </div>
                  </div>
                  <button
                    onClick={() => handleUnregister(selected.manifest.id)}
                    className="text-gray-600 hover:text-red-400 cursor-pointer p-1"
                    title="Unregister plugin"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {selected.manifest.description && (
                  <p className="text-xs text-gray-400 mb-4">{selected.manifest.description}</p>
                )}

                {/* Permissions */}
                <div className="mb-4">
                  <div className="text-[10px] uppercase tracking-widest text-gray-500 mb-2 flex items-center gap-1">
                    <Shield size={10} />
                    Permissions
                  </div>
                  <div className="space-y-1">
                    {selected.manifest.permissions.map(perm => (
                      <div key={perm} className="flex items-center gap-2 text-[10px]">
                        <span className={riskColor(PERMISSION_RISK[perm])}>
                          {PERMISSION_RISK[perm] === 'high' ? (
                            <AlertTriangle size={10} />
                          ) : (
                            <Shield size={10} />
                          )}
                        </span>
                        <span className="text-gray-300">{PERMISSION_LABELS[perm]}</span>
                        <span className={`text-[8px] uppercase ${riskColor(PERMISSION_RISK[perm])}`}>
                          {PERMISSION_RISK[perm]}
                        </span>
                      </div>
                    ))}
                    {selected.manifest.permissions.length === 0 && (
                      <div className="text-[10px] text-gray-700">No permissions requested</div>
                    )}
                  </div>
                </div>

                {/* Commands */}
                {selected.manifest.contributes.commands && selected.manifest.contributes.commands.length > 0 && (
                  <div className="mb-4">
                    <div className="text-[10px] uppercase tracking-widest text-gray-500 mb-2">Commands</div>
                    <div className="space-y-1">
                      {selected.manifest.contributes.commands.map(cmd => (
                        <div key={cmd.id} className="flex items-center gap-2 text-[10px]">
                          <span className="text-forge-ember/50 font-mono">{cmd.id}</span>
                          <span className="text-gray-400">{cmd.title}</span>
                          {cmd.keybinding && (
                            <span className="text-gray-600 text-[9px] ml-auto">{cmd.keybinding}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Panels */}
                {selected.manifest.contributes.panels && selected.manifest.contributes.panels.length > 0 && (
                  <div className="mb-4">
                    <div className="text-[10px] uppercase tracking-widest text-gray-500 mb-2">Panels</div>
                    <div className="space-y-1">
                      {selected.manifest.contributes.panels.map(panel => (
                        <div key={panel.id} className="flex items-center gap-2 text-[10px]">
                          {panel.icon && <span>{panel.icon}</span>}
                          <span className="text-gray-400">{panel.title}</span>
                          <span className="text-gray-700 font-mono">{panel.id}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Dock items */}
                {selected.manifest.contributes.dock && selected.manifest.contributes.dock.length > 0 && (
                  <div className="mb-4">
                    <div className="text-[10px] uppercase tracking-widest text-gray-500 mb-2">Dock Items</div>
                    <div className="space-y-1">
                      {selected.manifest.contributes.dock.map(dock => (
                        <div key={dock.id} className="flex items-center gap-2 text-[10px]">
                          {dock.icon && <span>{dock.icon}</span>}
                          <span className="text-gray-400">{dock.title}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Entry point */}
                <div className="mt-4 pt-3 border-t border-forge-steel">
                  <div className="text-[10px] text-gray-600">
                    Entry: <span className="font-mono text-gray-500">{selected.manifest.entry}</span>
                  </div>
                  <div className="text-[10px] text-gray-700 mt-0.5">
                    Status: {selected.enabled ? (
                      <span className="text-green-400">Enabled</span>
                    ) : (
                      <span className="text-gray-600">Disabled</span>
                    )}
                    {selected.error && (
                      <span className="text-red-400 ml-2">{selected.error}</span>
                    )}
                  </div>
                </div>
              </div>
            ) : showRegister ? (
              <div>
                <h3 className="text-xs uppercase tracking-widest text-forge-ember font-bold mb-3">Register Plugin</h3>
                <p className="text-[10px] text-gray-500 mb-3">
                  Paste a plugin manifest JSON to register it with FORGE.
                </p>
                <textarea
                  ref={textareaRef}
                  value={manifestJson}
                  onChange={e => setManifestJson(e.target.value)}
                  placeholder={`{
  "id": "com.example.my-plugin",
  "name": "My Plugin",
  "version": "1.0.0",
  "forgeApiVersion": "1.x",
  "entry": "main.js",
  "permissions": ["notes.read", "ui.command.register"],
  "contributes": {
    "commands": [
      { "id": "my-plugin.hello", "title": "Say Hello" }
    ]
  }
}`}
                  className="w-full h-48 bg-black/30 border border-forge-steel rounded p-3 text-[10px] font-mono text-white outline-none focus:border-forge-ember/40 placeholder:text-gray-700 resize-none"
                />
                {registerError && (
                  <div className="text-[10px] text-red-400 mt-2">{registerError}</div>
                )}
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => { setShowRegister(false); setManifestJson(''); setRegisterError(null); }}
                    className="px-3 py-1.5 text-xs border border-forge-steel rounded text-gray-400 hover:text-white cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRegister}
                    className="px-3 py-1.5 text-xs border border-forge-ember/40 rounded text-forge-ember hover:bg-forge-ember/10 cursor-pointer"
                  >
                    Register
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center h-full">
                <div className="text-center text-gray-700 text-xs">
                  Select a plugin to view details, or click Register to add a new one.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PluginManagerView;
