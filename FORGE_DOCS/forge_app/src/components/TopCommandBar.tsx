import { FormEvent, useState } from 'react';
import { Sparkles, Settings, Table2, Play } from 'lucide-react';
import { MiniApp } from '../lib/types';

interface TopCommandBarProps {
  onSubmitPrompt: (prompt: string) => void | boolean | Promise<void | boolean>;
  onOpenSettings: () => void;
  onOpenAi: () => void;
  onOpenLogicSheet: () => void;
  miniApps: MiniApp[];
}

const TopCommandBar = ({
  onSubmitPrompt,
  onOpenSettings,
  onOpenAi,
  onOpenLogicSheet,
  miniApps,
}: TopCommandBarProps) => {
  const [prompt, setPrompt] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const nextPrompt = prompt.trim();
    if (!nextPrompt) return;

    const handled = await Promise.resolve(onSubmitPrompt(nextPrompt));
    if (handled !== false) {
      setPrompt('');
    }
  };

  return (
    <div className="relative z-20 border-b border-forge-steel bg-forge-iron/70 px-3 py-2 space-y-2">
      <form onSubmit={submit} className="flex items-center gap-2">
        <div className="flex-1 flex items-center gap-2 rounded border border-forge-steel bg-black/30 px-2 py-1.5">
          <Sparkles size={13} className="text-forge-ember" />
          <input
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Prompt bar: /open Note | /ai explain this section | /link Holy Spirit"
            className="w-full bg-transparent border-none outline-none text-xs text-gray-200"
          />
        </div>
        <button
          type="button"
          onClick={onOpenAi}
          className="text-xs text-gray-300 hover:text-forge-ember border border-forge-steel rounded px-2 py-1.5 cursor-pointer"
          title="Open AI panel"
        >
          AI
        </button>
        <button
          type="submit"
          className="text-xs text-forge-ember hover:text-white border border-forge-ember/40 rounded px-2 py-1.5 cursor-pointer flex items-center gap-1"
          title="Run prompt"
        >
          <Play size={11} /> Run
        </button>
        <button
          type="button"
          onClick={onOpenSettings}
          className="text-xs text-gray-400 hover:text-forge-ember border border-forge-steel rounded px-2 py-1.5 cursor-pointer"
          title="Open settings"
        >
          <Settings size={12} />
        </button>
      </form>

      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
        <button
          onClick={onOpenLogicSheet}
          className="text-[10px] px-2 py-1 rounded border border-forge-steel text-gray-300 hover:text-forge-ember whitespace-nowrap cursor-pointer flex items-center gap-1"
          title="Open built-in spreadsheet layer"
        >
          <Table2 size={11} /> Logic Sheet
        </button>
        {miniApps.map((app) => (
          <button
            key={app.id}
            onClick={() => {
              void onSubmitPrompt(`/app ${app.id}`);
            }}
            className="text-[10px] px-2 py-1 rounded border border-forge-steel text-gray-300 hover:text-forge-ember whitespace-nowrap cursor-pointer"
            title={app.url}
          >
            {app.name}
          </button>
        ))}
      </div>
    </div>
  );
};

export default TopCommandBar;
