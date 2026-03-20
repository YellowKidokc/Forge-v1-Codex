import { useState, useEffect, useCallback } from 'react';
import { X, Play, RefreshCw, Settings2, FileCode2, Loader2, CheckCircle, XCircle, Plus } from 'lucide-react';
import {
  EngineEntry,
  EngineRunResult,
  scanEngines,
  runEngine,
  readEngineConfig,
  writeEngineConfig,
  parseYaml,
  getEnabledEngines,
  setEngineEnabled,
} from '../../lib/engine';

interface EngineManagerProps {
  open: boolean;
  onClose: () => void;
}

const EngineManager = ({ open, onClose }: EngineManagerProps) => {
  const [engines, setEngines] = useState<EngineEntry[]>([]);
  const [enabledEngines, setEnabledEngines] = useState<Set<string>>(new Set());
  const [selectedEngine, setSelectedEngine] = useState<string | null>(null);
  const [configText, setConfigText] = useState('');
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<EngineRunResult | null>(null);
  const [creating, setCreating] = useState(false);
  const [newEngineName, setNewEngineName] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const list = await scanEngines();
      setEngines(list);
      setEnabledEngines(getEnabledEngines());
    } catch (err) {
      console.error('Failed to scan engines:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      refresh();
      setSelectedEngine(null);
      setLastResult(null);
    }
  }, [open, refresh]);

  const handleSelect = async (engineId: string) => {
    setSelectedEngine(engineId);
    setLastResult(null);
    try {
      const config = await readEngineConfig(engineId);
      setConfigText(config);
    } catch (err) {
      setConfigText(`# Failed to load config: ${err}`);
    }
  };

  const handleToggle = (engineId: string) => {
    const enabled = !enabledEngines.has(engineId);
    setEngineEnabled(engineId, enabled);
    setEnabledEngines(getEnabledEngines());
  };

  const handleSaveConfig = async () => {
    if (!selectedEngine) return;
    try {
      await writeEngineConfig(selectedEngine, configText);
      await refresh();
    } catch (err) {
      console.error('Failed to save config:', err);
    }
  };

  const handleRun = async (engineId: string) => {
    setRunning(engineId);
    setLastResult(null);
    try {
      const result = await runEngine(engineId);
      setLastResult(result);
    } catch (err) {
      setLastResult({
        engine_id: engineId,
        ok: false,
        stdout: '',
        stderr: String(err),
      });
    } finally {
      setRunning(null);
    }
  };

  const handleCreate = async () => {
    const name = newEngineName.trim().toLowerCase().replace(/\s+/g, '_');
    if (!name) return;
    const defaultConfig = `engine: ${name}\ntrigger: manual\nenabled: true\n# Add your configuration below\n`;
    try {
      await writeEngineConfig(name, defaultConfig);
      setCreating(false);
      setNewEngineName('');
      await refresh();
      handleSelect(name);
    } catch (err) {
      console.error('Failed to create engine:', err);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative w-full max-w-4xl max-h-[80vh] rounded-lg border border-forge-steel bg-[#1a1a1a] shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-forge-steel flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings2 size={14} className="text-forge-ember" />
            <span className="text-sm font-bold uppercase tracking-widest text-gray-400">Global Engines</span>
            <span className="text-xs text-gray-600 ml-2">_engines/</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={refresh} className="text-gray-500 hover:text-forge-ember cursor-pointer" title="Rescan">
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            </button>
            <button onClick={onClose} className="text-gray-500 hover:text-white cursor-pointer">
              <X size={14} />
            </button>
          </div>
        </div>

        <div className="flex flex-1 min-h-0">
          {/* Engine list */}
          <div className="w-64 border-r border-forge-steel overflow-y-auto p-3 space-y-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase tracking-widest text-gray-500">Engines</span>
              <button
                onClick={() => setCreating(true)}
                className="text-gray-500 hover:text-forge-ember cursor-pointer"
                title="Create engine"
              >
                <Plus size={12} />
              </button>
            </div>

            {creating && (
              <div className="rounded border border-forge-ember/30 bg-black/20 p-2 space-y-1">
                <input
                  value={newEngineName}
                  onChange={(e) => setNewEngineName(e.target.value)}
                  placeholder="Engine name"
                  className="w-full bg-black/30 border border-forge-steel rounded px-2 py-1 text-xs text-white outline-none focus:border-forge-ember/50"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreate();
                    if (e.key === 'Escape') setCreating(false);
                  }}
                />
                <div className="flex gap-1 justify-end">
                  <button onClick={() => setCreating(false)} className="text-[10px] text-gray-500 px-2 py-0.5 cursor-pointer">Cancel</button>
                  <button onClick={handleCreate} className="text-[10px] text-forge-ember px-2 py-0.5 border border-forge-ember/30 rounded cursor-pointer">Create</button>
                </div>
              </div>
            )}

            {engines.length === 0 && !loading && (
              <p className="text-xs text-gray-600 mt-2">
                No engines found. Create YAML configs in the _engines/ folder of your vault.
              </p>
            )}

            {engines.map((engine) => {
              const config = parseYaml(engine.raw_yaml);
              const isEnabled = enabledEngines.has(engine.id);
              const isSelected = engine.id === selectedEngine;
              const isRunning = running === engine.id;

              return (
                <div
                  key={engine.id}
                  className={`rounded border px-2 py-2 cursor-pointer transition-colors ${
                    isSelected
                      ? 'border-forge-ember/40 bg-forge-ember/10'
                      : 'border-forge-steel hover:border-gray-600'
                  }`}
                  onClick={() => handleSelect(engine.id)}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-mono ${isSelected ? 'text-forge-ember' : 'text-gray-300'}`}>
                      {engine.id}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleToggle(engine.id); }}
                      className={`w-7 h-4 rounded-full transition-colors relative cursor-pointer ${
                        isEnabled ? 'bg-forge-ember/60' : 'bg-forge-steel'
                      }`}
                      title={isEnabled ? 'Disable' : 'Enable'}
                    >
                      <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${
                        isEnabled ? 'translate-x-3.5' : 'translate-x-0.5'
                      }`} />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[9px] text-gray-600">
                      trigger: {String(config.trigger)}
                    </span>
                    {engine.script_path && (
                      <FileCode2 size={9} className="text-gray-600" title="Has Python script" />
                    )}
                  </div>
                  {isSelected && engine.script_path && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRun(engine.id); }}
                      disabled={isRunning}
                      className="mt-2 flex items-center gap-1 text-[10px] px-2 py-1 rounded border border-forge-ember/40 text-forge-ember hover:bg-forge-ember/10 cursor-pointer disabled:opacity-40"
                    >
                      {isRunning ? <Loader2 size={9} className="animate-spin" /> : <Play size={9} />}
                      {isRunning ? 'Running...' : 'Run Now'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Config editor + results */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {!selectedEngine && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center space-y-2">
                  <Settings2 size={24} className="text-gray-700 mx-auto" />
                  <p className="text-xs text-gray-600">Select an engine to view/edit its config</p>
                  <p className="text-[10px] text-gray-700 max-w-xs">
                    Engines are YAML configs + optional Python scripts in _engines/.
                    Each engine can be triggered manually, on save, or by schedule.
                  </p>
                </div>
              </div>
            )}

            {selectedEngine && (
              <>
                <div className="flex-1 overflow-auto p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-400 font-mono">{selectedEngine}.yaml</span>
                    <button
                      onClick={handleSaveConfig}
                      className="text-[10px] px-2 py-1 rounded border border-forge-ember/40 text-forge-ember hover:bg-forge-ember/10 cursor-pointer"
                    >
                      Save Config
                    </button>
                  </div>
                  <textarea
                    value={configText}
                    onChange={(e) => setConfigText(e.target.value)}
                    className="w-full h-48 bg-black/30 border border-forge-steel rounded p-3 text-[11px] text-gray-300 font-mono outline-none focus:border-forge-ember/50 resize-none"
                    spellCheck={false}
                  />
                </div>

                {lastResult && (
                  <div className="border-t border-forge-steel p-3 max-h-48 overflow-auto">
                    <div className="flex items-center gap-2 mb-2">
                      {lastResult.ok ? (
                        <CheckCircle size={12} className="text-green-500" />
                      ) : (
                        <XCircle size={12} className="text-red-400" />
                      )}
                      <span className={`text-xs font-bold ${lastResult.ok ? 'text-green-400' : 'text-red-400'}`}>
                        {lastResult.ok ? 'Success' : 'Failed'}
                      </span>
                    </div>
                    {lastResult.stdout && (
                      <pre className="text-[10px] text-gray-400 font-mono bg-black/30 rounded p-2 mb-1 whitespace-pre-wrap">
                        {lastResult.stdout}
                      </pre>
                    )}
                    {lastResult.stderr && (
                      <pre className="text-[10px] text-red-400/80 font-mono bg-black/30 rounded p-2 whitespace-pre-wrap">
                        {lastResult.stderr}
                      </pre>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EngineManager;
