import { Command } from 'cmdk';
import { SavedNotebook, ForgeSettings, AiProvider } from '../lib/types';
import { getAllPluginCommands } from '../lib/plugins';

type CenterView = 'editor' | 'logic_sheet' | 'truth_layer';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  savedNotebooks: SavedNotebook[];
  onActivateNotebook: (path: string) => Promise<boolean>;
  onOpenSettings: () => void;
  onOpenAi: () => void;
  onSetCenterView: (view: CenterView) => void;
  onSubmitPrompt: (prompt: string) => Promise<boolean>;
  settings: ForgeSettings;
  onUpdateSettings: (settings: ForgeSettings) => void;
}

const CommandPalette = ({
  open,
  onClose,
  savedNotebooks,
  onActivateNotebook,
  onOpenSettings,
  onOpenAi,
  onSetCenterView,
  onSubmitPrompt,
  settings,
  onUpdateSettings,
}: CommandPaletteProps) => {
  if (!open) return null;

  const runAndClose = (fn: () => void) => {
    fn();
    onClose();
  };

  const providers: AiProvider[] = ['ollama', 'anthropic', 'openai'];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative w-full max-w-lg rounded-lg border border-forge-steel bg-[#1a1a1a] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <Command
          className="[&_[cmdk-input]]:w-full [&_[cmdk-input]]:bg-transparent [&_[cmdk-input]]:border-none [&_[cmdk-input]]:outline-none [&_[cmdk-input]]:text-sm [&_[cmdk-input]]:text-white [&_[cmdk-input]]:p-4 [&_[cmdk-input]]:border-b [&_[cmdk-input]]:border-forge-steel"
          label="Command palette"
        >
          <div className="border-b border-forge-steel">
            <Command.Input
              placeholder="Type a command or search..."
              autoFocus
              className="w-full bg-transparent border-none outline-none text-sm text-white p-4 placeholder:text-gray-500"
            />
          </div>

          <Command.List className="max-h-80 overflow-y-auto p-2">
            <Command.Empty className="p-4 text-xs text-gray-500 text-center">
              No results found.
            </Command.Empty>

            {savedNotebooks.length > 0 && (
              <Command.Group
                heading="Notebooks"
                className="[&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-widest [&_[cmdk-group-heading]]:text-gray-500 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5"
              >
                {savedNotebooks.map((notebook) => (
                  <Command.Item
                    key={notebook.path}
                    value={`notebook ${notebook.name} ${notebook.path}`}
                    onSelect={() => runAndClose(() => void onActivateNotebook(notebook.path))}
                    className="flex items-center gap-2 px-3 py-2 text-xs text-gray-300 rounded cursor-pointer data-[selected=true]:bg-forge-ember/10 data-[selected=true]:text-forge-ember transition-colors"
                  >
                    <span className="text-forge-ember/60">&#9671;</span>
                    {notebook.name}
                    <span className="ml-auto text-[10px] text-gray-600 truncate max-w-[200px]">{notebook.path}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            <Command.Group
              heading="Views"
              className="[&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-widest [&_[cmdk-group-heading]]:text-gray-500 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5"
            >
              <Command.Item
                value="editor view"
                onSelect={() => runAndClose(() => onSetCenterView('editor'))}
                className="flex items-center gap-2 px-3 py-2 text-xs text-gray-300 rounded cursor-pointer data-[selected=true]:bg-forge-ember/10 data-[selected=true]:text-forge-ember transition-colors"
              >
                Editor
              </Command.Item>
              <Command.Item
                value="logic sheet view"
                onSelect={() => runAndClose(() => onSetCenterView('logic_sheet'))}
                className="flex items-center gap-2 px-3 py-2 text-xs text-gray-300 rounded cursor-pointer data-[selected=true]:bg-forge-ember/10 data-[selected=true]:text-forge-ember transition-colors"
              >
                Logic Sheet
              </Command.Item>
              <Command.Item
                value="truth layer view"
                onSelect={() => runAndClose(() => onSetCenterView('truth_layer'))}
                className="flex items-center gap-2 px-3 py-2 text-xs text-gray-300 rounded cursor-pointer data-[selected=true]:bg-forge-ember/10 data-[selected=true]:text-forge-ember transition-colors"
              >
                Truth Layer
              </Command.Item>
            </Command.Group>

            <Command.Group
              heading="AI"
              className="[&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-widest [&_[cmdk-group-heading]]:text-gray-500 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5"
            >
              <Command.Item
                value="open ai panel"
                onSelect={() => runAndClose(onOpenAi)}
                className="flex items-center gap-2 px-3 py-2 text-xs text-gray-300 rounded cursor-pointer data-[selected=true]:bg-forge-ember/10 data-[selected=true]:text-forge-ember transition-colors"
              >
                Open AI Panel
                <span className="ml-auto text-[10px] text-gray-600">Ctrl+Shift+A</span>
              </Command.Item>
              {providers.map((p) => (
                <Command.Item
                  key={p}
                  value={`use ${p} provider`}
                  onSelect={() =>
                    runAndClose(() =>
                      onUpdateSettings({ ...settings, aiProvider: p })
                    )
                  }
                  className="flex items-center gap-2 px-3 py-2 text-xs text-gray-300 rounded cursor-pointer data-[selected=true]:bg-forge-ember/10 data-[selected=true]:text-forge-ember transition-colors"
                >
                  Use {p.charAt(0).toUpperCase() + p.slice(1)}
                  {settings.aiProvider === p && (
                    <span className="ml-auto text-[10px] text-forge-ember">active</span>
                  )}
                </Command.Item>
              ))}
            </Command.Group>

            <Command.Group
              heading="Actions"
              className="[&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-widest [&_[cmdk-group-heading]]:text-gray-500 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5"
            >
              <Command.Item
                value="open settings"
                onSelect={() => runAndClose(onOpenSettings)}
                className="flex items-center gap-2 px-3 py-2 text-xs text-gray-300 rounded cursor-pointer data-[selected=true]:bg-forge-ember/10 data-[selected=true]:text-forge-ember transition-colors"
              >
                Settings
                <span className="ml-auto text-[10px] text-gray-600">Ctrl+,</span>
              </Command.Item>
            </Command.Group>

            <Command.Group
              heading="Slash Commands"
              className="[&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-widest [&_[cmdk-group-heading]]:text-gray-500 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5"
            >
              {[
                { cmd: '/ai', desc: 'Send prompt to Interface AI' },
                { cmd: '/logic', desc: 'Send prompt to Logic AI' },
                { cmd: '/copilot', desc: 'Send prompt to Copilot AI' },
                { cmd: '/open', desc: 'Open a note by name' },
                { cmd: '/link', desc: 'Open or create wiki link' },
                { cmd: '/logicsheet', desc: 'Open Logic Sheet view' },
                { cmd: '/truth', desc: 'Open Truth Layer view' },
                { cmd: '/editor', desc: 'Switch to Editor view' },
                { cmd: '/settings', desc: 'Open settings' },
                { cmd: '/python', desc: 'Run Python sidecar command' },
                { cmd: '/mirror', desc: 'Open data mirror browser' },
                { cmd: '/versions', desc: 'Open version history' },
                { cmd: '/engines', desc: 'Open engine manager' },
                { cmd: '/ingest', desc: 'Import data (CSV, JSON, text)' },
                { cmd: '/plugins', desc: 'Manage plugins and extensions' },
              ].map((item) => (
                <Command.Item
                  key={item.cmd}
                  value={`slash command ${item.cmd} ${item.desc}`}
                  onSelect={() => runAndClose(() => void onSubmitPrompt(item.cmd + ' '))}
                  className="flex items-center gap-2 px-3 py-2 text-xs text-gray-300 rounded cursor-pointer data-[selected=true]:bg-forge-ember/10 data-[selected=true]:text-forge-ember transition-colors"
                >
                  <span className="font-mono text-forge-ember/70">{item.cmd}</span>
                  <span className="text-gray-500">{item.desc}</span>
                </Command.Item>
              ))}
            </Command.Group>

            {(() => {
              const pluginCommands = getAllPluginCommands();
              if (pluginCommands.length === 0) return null;
              return (
                <Command.Group
                  heading="Plugin Commands"
                  className="[&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-widest [&_[cmdk-group-heading]]:text-gray-500 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5"
                >
                  {pluginCommands.map((cmd) => (
                    <Command.Item
                      key={cmd.id}
                      value={`plugin ${cmd.pluginName} ${cmd.title} ${cmd.id}`}
                      onSelect={() => runAndClose(() => void onSubmitPrompt(`/plugin:${cmd.id} `))}
                      className="flex items-center gap-2 px-3 py-2 text-xs text-gray-300 rounded cursor-pointer data-[selected=true]:bg-forge-ember/10 data-[selected=true]:text-forge-ember transition-colors"
                    >
                      <span className="text-purple-400/60 text-[9px]">{cmd.pluginName}</span>
                      <span>{cmd.title}</span>
                    </Command.Item>
                  ))}
                </Command.Group>
              );
            })()}
          </Command.List>
        </Command>
      </div>
    </div>
  );
};

export default CommandPalette;
