import { useMemo, useRef, useState } from 'react';
import { Bot, Send, Search, Settings, FolderOpen, Plus, Sparkles } from 'lucide-react';
import { AI_ROLE_LABELS, getAiProvider, getAiRoleRouting, getRoleConfig, hasApiKey, missingKeyMessage, providerLabel, runAiRoleChat, setAiProvider, ChatTurn } from '../lib/ai';
import { appendAiRuntimeEvent, getAiRuntimeEvents, summarizeAiText } from '../lib/aiRuntime';
import type { AiProvider, AiRole } from '../lib/types';

type LayoutPreset = 1 | 2 | 3 | 4;
type ContextMode = 'workspace' | 'note' | 'private';
type LeftRailSection = 'chats' | 'agents' | 'prompts' | 'plugins' | 'models' | 'kb' | 'settings';

interface AIWorkspaceProps {
  activeFile: string | null;
  workspaceContext: string;
  onOpenSettings: () => void;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatPaneProps {
  title: string;
  contextMode: ContextMode;
  workspaceContext: string;
  provider: AiProvider;
  role: AiRole;
  badge: string;
  onEventLogged: () => void;
}

function extractNoteExcerpt(context: string): string {
  const marker = 'Current note excerpt:';
  const index = context.indexOf(marker);
  if (index < 0) return 'none';
  return context.slice(index + marker.length).trim() || 'none';
}

function contextBlock(mode: ContextMode, context: string): string {
  if (mode === 'private') return '';
  if (mode === 'note') {
    return `\n\nCurrent note excerpt:\n${extractNoteExcerpt(context)}`;
  }
  return `\n\nWorkspace context:\n${context}`;
}

const ChatPane = ({
  title,
  contextMode,
  workspaceContext,
  provider,
  role,
  badge,
  onEventLogged,
}: ChatPaneProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [streamText, setStreamText] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const canSend = hasApiKey(provider);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || streaming) return;

    if (!canSend) {
      setError(missingKeyMessage(provider));
      return;
    }

    const nextMessages: ChatMessage[] = [...messages, { role: 'user', content: text }];
    setMessages(nextMessages);
    setInput('');
    setError(null);
    setStreaming(true);
    setStreamText('');

    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;

    const chatForModel: ChatTurn[] = nextMessages.map((item) => ({
      role: item.role,
      content: item.content,
    }));

    await runAiRoleChat(
      role,
      chatForModel,
      {
        onToken: (token) => setStreamText((prev) => prev + token),
        onComplete: (full) => {
          const roleConfig = getRoleConfig(role);
          appendAiRuntimeEvent({
            role,
            kind: 'message',
            summary: summarizeAiText(text),
            provider: providerLabel(roleConfig.provider),
            model: roleConfig.model,
            status: 'completed',
          }, 1000 * 45);
          onEventLogged();
          setMessages((prev) => [...prev, { role: 'assistant', content: full || '(no output)' }]);
          setStreamText('');
          setStreaming(false);
          abortRef.current = null;
        },
        onError: (err) => {
          const roleConfig = getRoleConfig(role);
          appendAiRuntimeEvent({
            role,
            kind: 'error',
            summary: summarizeAiText(err),
            provider: providerLabel(roleConfig.provider),
            model: roleConfig.model,
            status: 'failed',
          }, 1000 * 30);
          onEventLogged();
          setError(err);
          setStreamText('');
          setStreaming(false);
          abortRef.current = null;
        },
      },
      controller.signal,
      contextMode === 'private' ? '' : contextBlock(contextMode, workspaceContext)
    );
  };

  return (
    <div className="h-full border border-forge-steel rounded bg-[#161616] flex flex-col min-h-0">
      <div className="px-3 py-2 border-b border-forge-steel flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot size={13} className="text-forge-ember" />
          <span className="text-[11px] uppercase tracking-widest text-gray-300">{title}</span>
        </div>
        <span className="text-[10px] text-gray-500">{badge}</span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.length === 0 && !streamText && (
          <p className="text-[11px] text-gray-500">No messages yet. Start typing below.</p>
        )}
        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            className={`text-xs rounded px-2 py-1.5 whitespace-pre-wrap ${
              message.role === 'user' ? 'bg-forge-ember/20 text-white ml-6' : 'bg-black/30 text-gray-300 mr-6'
            }`}
          >
            {message.content}
          </div>
        ))}
        {streaming && (
          <div className="text-xs rounded px-2 py-1.5 bg-black/30 text-gray-300 mr-6 whitespace-pre-wrap">
            {streamText || '...'}
          </div>
        )}
        {error && <p className="text-[11px] text-red-400">{error}</p>}
      </div>

      <div className="p-2 border-t border-forge-steel space-y-2">
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            const token = `[Attached file: ${file.name} (${Math.max(1, Math.round(file.size / 1024))} KB)]`;
            setInput((prev) => (prev ? `${prev}\n${token}` : token));
            event.target.value = '';
          }}
        />
        <div className="flex items-center gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="text-[10px] px-2 py-1 rounded border border-forge-steel text-gray-300 hover:text-forge-ember cursor-pointer"
          >
            Upload
          </button>
          <span className="text-[10px] text-gray-600">Provider: {providerLabel(provider)}</span>
        </div>
        <div className="flex items-center gap-2 bg-black/40 border border-forge-steel rounded p-2">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Type message..."
            rows={1}
            className="flex-1 bg-transparent border-none outline-none text-xs text-white resize-none"
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                void sendMessage();
              }
            }}
          />
          <button
            onClick={() => {
              void sendMessage();
            }}
            disabled={streaming || !input.trim()}
            className="text-forge-ember disabled:opacity-30 cursor-pointer"
            title="Send"
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

const AIWorkspace = ({ activeFile, workspaceContext, onOpenSettings }: AIWorkspaceProps) => {
  const [layoutPreset, setLayoutPreset] = useState<LayoutPreset>(4);
  const [contextMode, setContextMode] = useState<ContextMode>('workspace');
  const [activeSection, setActiveSection] = useState<LeftRailSection>('chats');
  const [search, setSearch] = useState('');
  const [workTag, setWorkTag] = useState('active-note');
  const [provider, setProvider] = useState<AiProvider>(getAiProvider());
  const roleRouting = getAiRoleRouting();
  const [runtimeVersion, setRuntimeVersion] = useState(0);
  const runtimeEvents = useMemo(() => getAiRuntimeEvents().slice(0, 8), [provider, roleRouting, runtimeVersion]);
  const roleConfigs = useMemo(
    () => ({
      interface: getRoleConfig('interface'),
      logic: getRoleConfig('logic'),
      copilot: getRoleConfig('copilot'),
    }),
    [provider, roleRouting]
  );

  const folders = useMemo(
    () => [
      { name: 'Theophysics', count: 12 },
      { name: 'Operations', count: 6 },
      { name: 'Writing', count: 9 },
      { name: 'Code', count: 14 },
    ],
    []
  );

  const chats = useMemo(
    () => [
      'Master Equation Review',
      'Grant Revision Thread',
      'Physics of Faith Notes',
      'FORGE Build Decisions',
      'Journal Synthesis',
    ],
    []
  );

  const filteredChats = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return chats;
    return chats.filter((chat) => chat.toLowerCase().includes(needle));
  }, [chats, search]);

  const noteExcerpt = useMemo(() => extractNoteExcerpt(workspaceContext), [workspaceContext]);

  const workspaceChat = (
    <ChatPane
      title="Workspace AI"
      contextMode={contextMode}
      workspaceContext={workspaceContext}
      provider={provider}
      role="interface"
      badge="Context-aware"
      onEventLogged={() => setRuntimeVersion((prev) => prev + 1)}
    />
  );

  const navigatorPanel = (
    <div className="h-full border border-forge-steel rounded bg-[#141414] p-3 overflow-y-auto">
      <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-2">Navigator</p>
      <div className="space-y-1 text-xs text-gray-300">
        {folders.map((folder) => (
          <div key={folder.name} className="flex items-center justify-between border border-forge-steel rounded px-2 py-1">
            <span>{folder.name}</span>
            <span className="text-gray-500">{folder.count}</span>
          </div>
        ))}
      </div>
      <p className="text-[10px] uppercase tracking-widest text-gray-500 mt-4 mb-2">Recent chats</p>
      <div className="space-y-1 text-xs text-gray-400">
        {filteredChats.slice(0, 4).map((chat) => (
          <div key={chat} className="truncate border border-forge-steel rounded px-2 py-1">{chat}</div>
        ))}
      </div>
    </div>
  );

  const workPanel = (
    <div className="h-full border border-forge-steel rounded bg-[#141414] p-3 overflow-y-auto">
      <p className="text-[10px] uppercase tracking-widest text-gray-500">What I'm Working On</p>
      <p className="text-xs text-forge-ember mt-2 truncate">{activeFile ? activeFile.split(/[\\/]/).pop() : 'No active note selected'}</p>
      <p className="text-[11px] text-gray-400 mt-3 whitespace-pre-wrap">
        {noteExcerpt === 'none' ? 'Open a note to feed workspace context automatically.' : noteExcerpt.slice(0, 900)}
      </p>
    </div>
  );

  const rolesPanel = (
    <div className="h-full border border-forge-steel rounded bg-[#141414] p-3 overflow-y-auto">
      <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-2">AI Runtime</p>
      <div className="space-y-2">
        {(['interface', 'logic', 'copilot'] as AiRole[]).map((role) => (
          <div key={role} className="rounded border border-forge-steel px-2 py-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-200">{AI_ROLE_LABELS[role]}</span>
              <span className="text-[10px] text-gray-500">{providerLabel(roleConfigs[role].provider)}</span>
            </div>
            <div className="text-[10px] text-gray-500 mt-1">{roleConfigs[role].model}</div>
          </div>
        ))}
      </div>

      <p className="text-[10px] uppercase tracking-widest text-gray-500 mt-4 mb-2">Recent feed</p>
      <div className="space-y-2">
        {runtimeEvents.length === 0 && (
          <p className="text-[11px] text-gray-600">No role events logged yet.</p>
        )}
        {runtimeEvents.map((event) => (
          <div key={event.id} className="rounded border border-forge-steel px-2 py-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] uppercase tracking-widest text-forge-ember">
                {AI_ROLE_LABELS[event.role]}
              </span>
              <span className={`text-[10px] ${event.status === 'failed' ? 'text-red-400' : 'text-gray-500'}`}>
                {event.provider}
              </span>
            </div>
            <div className="text-[11px] text-gray-300 mt-1 whitespace-pre-wrap">{event.summary}</div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderLayout = () => {
    if (layoutPreset === 1) {
      return <div className="flex-1 min-h-0">{workspaceChat}</div>;
    }
    if (layoutPreset === 2) {
      return (
        <div className="flex-1 min-h-0 grid grid-cols-2 gap-2">
          {workPanel}
          {workspaceChat}
        </div>
      );
    }
    if (layoutPreset === 3) {
      return (
        <div className="flex-1 min-h-0 grid grid-cols-3 gap-2">
          {navigatorPanel}
          {workPanel}
          {rolesPanel}
        </div>
      );
    }
    return (
      <div className="flex-1 min-h-0 grid grid-cols-2 grid-rows-2 gap-2">
        {navigatorPanel}
        {workPanel}
        {workspaceChat}
        {rolesPanel}
      </div>
    );
  };

  const sections: Array<{ id: LeftRailSection; label: string }> = [
    { id: 'chats', label: 'Chats' },
    { id: 'agents', label: 'Agents' },
    { id: 'prompts', label: 'Prompts' },
    { id: 'plugins', label: 'Plugins' },
    { id: 'models', label: 'Models' },
    { id: 'kb', label: 'KB' },
    { id: 'settings', label: 'Settings' },
  ];

  return (
    <div className="flex-1 min-h-0 flex bg-[#121212]">
      <aside className="w-72 border-r border-forge-steel bg-[#0f1116] p-3 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <button className="flex-1 text-xs px-2 py-2 rounded bg-forge-ember/20 text-forge-ember hover:bg-forge-ember/30 cursor-pointer flex items-center justify-center gap-1">
            <Plus size={12} /> New chat
          </button>
          <button
            onClick={onOpenSettings}
            className="text-gray-400 hover:text-forge-ember border border-forge-steel rounded p-2 cursor-pointer"
            title="Settings"
          >
            <Settings size={12} />
          </button>
        </div>

        <div className="relative">
          <Search size={12} className="absolute left-2 top-2 text-gray-600" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search chats"
            className="w-full bg-black/40 border border-forge-steel rounded pl-6 pr-2 py-1.5 text-xs text-white outline-none focus:border-forge-ember/40"
          />
        </div>

        <div className="space-y-1">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => {
                setActiveSection(section.id);
                if (section.id === 'settings') {
                  onOpenSettings();
                }
              }}
              className={`w-full text-left text-xs rounded px-2 py-1.5 cursor-pointer ${
                activeSection === section.id
                  ? 'bg-forge-ember/15 text-forge-ember'
                  : 'text-gray-300 hover:text-forge-ember hover:bg-black/30'
              }`}
            >
              {section.label}
            </button>
          ))}
        </div>

        <p className="text-[10px] uppercase tracking-widest text-gray-500 mt-2">Folders</p>
        <div className="space-y-1 overflow-y-auto pr-1">
          {folders.map((folder) => (
            <div key={folder.name} className="text-xs border border-forge-steel rounded px-2 py-1 flex items-center justify-between text-gray-300">
              <span className="truncate flex items-center gap-1"><FolderOpen size={11} /> {folder.name}</span>
              <span className="text-gray-500">{folder.count}</span>
            </div>
          ))}

          {filteredChats.map((chat) => (
            <button
              key={chat}
              className="w-full text-left text-xs text-gray-400 hover:text-forge-ember truncate px-2 py-1 rounded hover:bg-black/30 cursor-pointer"
            >
              {chat}
            </button>
          ))}
        </div>
      </aside>

      <div className="flex-1 min-h-0 flex flex-col p-2 gap-2">
        <div className="border border-forge-steel rounded bg-[#151515] px-3 py-2 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 mr-2">
            <Sparkles size={12} className="text-forge-ember" />
            <span className="text-xs uppercase tracking-widest text-gray-300">AI Workspace</span>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-[10px] text-gray-500 uppercase tracking-widest">Context</span>
            {(['workspace', 'note', 'private'] as ContextMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setContextMode(mode)}
                className={`text-[10px] px-2 py-1 rounded border cursor-pointer ${
                  contextMode === mode
                    ? 'border-forge-ember/50 text-forge-ember bg-forge-ember/10'
                    : 'border-forge-steel text-gray-400'
                }`}
              >
                {mode === 'workspace' ? 'Workspace' : mode === 'note' ? 'Current Note' : 'Private'}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1">
            <span className="text-[10px] text-gray-500 uppercase tracking-widest">Layout</span>
            {[1, 2, 3, 4].map((preset) => (
              <button
                key={preset}
                onClick={() => setLayoutPreset(preset as LayoutPreset)}
                className={`text-[10px] w-6 h-6 rounded border cursor-pointer ${
                  layoutPreset === preset
                    ? 'border-forge-ember/50 text-forge-ember bg-forge-ember/10'
                    : 'border-forge-steel text-gray-400'
                }`}
                title={`${preset}-panel layout`}
              >
                {preset}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1">
            <span className="text-[10px] text-gray-500 uppercase tracking-widest">Provider</span>
            {(['ollama', 'anthropic', 'openai'] as AiProvider[]).map((item) => (
              <button
                key={item}
                onClick={() => {
                  setAiProvider(item);
                  setProvider(item);
                }}
                className={`text-[10px] px-2 py-1 rounded border cursor-pointer ${
                  provider === item
                    ? 'border-forge-ember/50 text-forge-ember bg-forge-ember/10'
                    : 'border-forge-steel text-gray-400'
                }`}
              >
                {providerLabel(item)}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 ml-auto">
            <span className="text-[10px] text-gray-500 uppercase tracking-widest">Role Routing</span>
            <span className="text-[10px] px-2 py-1 rounded border border-forge-steel text-gray-300">
              {roleRouting === 'shared' ? 'Shared Engine x3 Roles' : 'Split Engines'}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-[10px] text-gray-500 uppercase tracking-widest">Working On</span>
            <select
              value={workTag}
              onChange={(event) => setWorkTag(event.target.value)}
              className="bg-black/40 border border-forge-steel rounded px-2 py-1 text-[10px] text-gray-200"
            >
              <option value="active-note">Active Note</option>
              <option value="forge-build">FORGE Build</option>
              <option value="theophysics-research">Theophysics Research</option>
              <option value="writing-lab">Writing Lab</option>
            </select>
          </div>
        </div>

        {renderLayout()}
      </div>
    </div>
  );
};

export default AIWorkspace;
