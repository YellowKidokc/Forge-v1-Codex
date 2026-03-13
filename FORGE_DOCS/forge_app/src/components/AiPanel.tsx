import { useEffect, useMemo, useRef, useState } from 'react';
import { X, Send, Sparkles, Link2, Hash, Trash2, Bot, Loader2 } from 'lucide-react';
import { NoteMetadata, SavedNotebook } from '../lib/types';
import { hasApiKey, runAiChat, ChatTurn } from '../lib/ai';

type AiMode = 'interface' | 'logic' | 'copilot';

interface PromptPacket {
  id: number;
  text: string;
  mode?: AiMode;
}

interface AiPanelProps {
  open: boolean;
  onClose: () => void;
  activeFile: string | null;
  noteMetadata: NoteMetadata;
  savedNotebooks: SavedNotebook[];
  activeNotebookPath: string | null;
  onActivateNotebook: (path: string) => Promise<boolean>;
  onRemoveNotebook: (path: string) => void | Promise<void>;
  onOpenWikiLink: (target: string) => void;
  queuedPrompt?: PromptPacket | null;
  onConsumeQueuedPrompt?: (id: number) => void;
  workspaceContext: string;
  aiUseWorkspaceContext: boolean;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const MODE_PROMPTS: Record<AiMode, string> = {
  interface:
    'You are the interface AI for FORGE. Be concise, practical, and help the user execute writing and thinking tasks quickly.',
  logic:
    'You are the logical layer AI for FORGE. Validate structure, assumptions, consistency, and potential contradictions before offering rewrites.',
  copilot:
    'You are the predictive copilot AI for FORGE. Anticipate the user’s next 2-4 useful actions and provide clickable-style, concrete next steps.',
};

const AiPanel = ({
  open,
  onClose,
  activeFile,
  noteMetadata,
  savedNotebooks,
  activeNotebookPath,
  onActivateNotebook,
  onRemoveNotebook,
  onOpenWikiLink,
  queuedPrompt,
  onConsumeQueuedPrompt,
  workspaceContext,
  aiUseWorkspaceContext,
}: AiPanelProps) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streamText, setStreamText] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [mode, setMode] = useState<AiMode>('interface');
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const canSend = hasApiKey();

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamText]);

  const quickSuggestions = useMemo(() => {
    const suggestions = [
      'Summarize this note in 5 bullets',
      'Find potential contradictions',
      'Propose next 3 writing steps',
    ];
    if (noteMetadata.links[0]) {
      suggestions.push(`Build narrative thread from [[${noteMetadata.links[0]}]]`);
    }
    return suggestions;
  }, [noteMetadata.links]);

  const sendMessage = async (messageText: string, forcedMode?: AiMode): Promise<boolean> => {
    const text = messageText.trim();
    if (!text || streaming) return false;
    if (!canSend) {
      setError('Add Anthropic API key in settings to enable AI chat.');
      return false;
    }

    const activeMode = forcedMode ?? mode;
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

    const context = aiUseWorkspaceContext && workspaceContext
      ? `\n\nWorkspace context:\n${workspaceContext}`
      : '';
    const systemPrompt = `${MODE_PROMPTS[activeMode]}${context}`;
    const chatForModel: ChatTurn[] = nextMessages.map((entry) => ({
      role: entry.role,
      content: entry.content,
    }));

    await runAiChat(
      chatForModel,
      systemPrompt,
      {
        onToken: (token) => setStreamText((prev) => prev + token),
        onComplete: (full) => {
          setMessages((prev) => [...prev, { role: 'assistant', content: full || '(no output)' }]);
          setStreaming(false);
          setStreamText('');
          abortRef.current = null;
        },
        onError: (err) => {
          setError(err);
          setStreaming(false);
          setStreamText('');
          abortRef.current = null;
        },
      },
      controller.signal
    );

    return true;
  };

  useEffect(() => {
    if (!open || !queuedPrompt || streaming) return;
    if (queuedPrompt.mode) {
      setMode(queuedPrompt.mode);
    }
    void sendMessage(queuedPrompt.text, queuedPrompt.mode).then((sent) => {
      if (sent) {
        onConsumeQueuedPrompt?.(queuedPrompt.id);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, queuedPrompt, streaming]);

  if (!open) return null;

  return (
    <div className="ai-panel bg-[#161616] border-l border-[#2a2a2a] w-96 h-screen flex flex-col">
      <div className="p-3 border-b border-[#222] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-forge-ember" />
          <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Tri-Layer AI</span>
        </div>
        <button onClick={onClose} className="text-gray-500 hover:text-white cursor-pointer">
          <X size={14} />
        </button>
      </div>

      <div className="px-3 py-2 border-b border-[#222] flex items-center gap-2">
        {(['interface', 'logic', 'copilot'] as AiMode[]).map((item) => (
          <button
            key={item}
            onClick={() => setMode(item)}
            className={`text-[10px] uppercase tracking-widest px-2 py-1 rounded border cursor-pointer ${
              mode === item
                ? 'border-forge-ember/50 text-forge-ember bg-forge-ember/10'
                : 'border-forge-steel text-gray-400'
            }`}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="border-b border-[#222] p-3 space-y-2">
        <p className="text-[10px] uppercase tracking-widest text-gray-500">Saved Notebooks</p>
        {savedNotebooks.length === 0 ? (
          <p className="text-[11px] text-gray-600">Add a notebook from the left sidebar.</p>
        ) : (
          <div className="max-h-24 overflow-y-auto space-y-1">
            {savedNotebooks.map((notebook) => {
              const isActive = notebook.path === activeNotebookPath;
              return (
                <div
                  key={notebook.path}
                  className={`group rounded border px-2 py-1 text-[11px] flex items-center gap-1 ${
                    isActive
                      ? 'border-forge-ember/40 bg-forge-ember/10 text-forge-ember'
                      : 'border-forge-steel text-gray-400'
                  }`}
                >
                  <button
                    onClick={() => onActivateNotebook(notebook.path)}
                    className="flex-1 truncate text-left cursor-pointer"
                    title={notebook.path}
                  >
                    {notebook.name}
                  </button>
                  <button
                    onClick={() => onRemoveNotebook(notebook.path)}
                    className="text-gray-600 hover:text-red-400 transition-colors cursor-pointer"
                    title="Remove notebook"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="border-b border-[#222] p-3 space-y-2">
        <p className="text-[10px] uppercase tracking-widest text-gray-500">Active Note Meta</p>
        <p className="text-[11px] text-gray-600 truncate" title={activeFile || ''}>
          {activeFile ? activeFile.split(/[\\/]/).pop() : 'No note selected'}
        </p>

        <div>
          <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-1 flex items-center gap-1">
            <Hash size={10} /> Tags
          </div>
          <div className="flex flex-wrap gap-1">
            {noteMetadata.tags.length === 0 && <span className="text-[11px] text-gray-700">None</span>}
            {noteMetadata.tags.map((tag) => (
              <span key={tag} className="text-[11px] rounded border border-forge-steel px-1.5 py-0.5 text-gray-300 bg-black/20">
                #{tag}
              </span>
            ))}
          </div>
        </div>

        <div>
          <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-1 flex items-center gap-1">
            <Link2 size={10} /> Links
          </div>
          <div className="flex flex-col gap-1 max-h-20 overflow-y-auto">
            {noteMetadata.links.length === 0 && <span className="text-[11px] text-gray-700">None</span>}
            {noteMetadata.links.map((linkTarget) => (
              <button
                key={linkTarget}
                onClick={() => onOpenWikiLink(linkTarget)}
                className="text-left text-[11px] text-forge-ember/80 hover:text-forge-ember transition-colors truncate cursor-pointer"
                title={`Open [[${linkTarget}]]`}
              >
                [[{linkTarget}]]
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-3 py-2 border-b border-[#222] flex flex-wrap gap-1">
        {quickSuggestions.map((suggestion) => (
          <button
            key={suggestion}
            onClick={() => sendMessage(suggestion)}
            className="text-[10px] px-2 py-1 border border-forge-steel rounded text-gray-300 hover:text-forge-ember cursor-pointer"
          >
            {suggestion}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((message, i) => (
          <div key={i} className={`flex gap-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {message.role === 'assistant' && (
              <div className="w-5 h-5 rounded bg-forge-ember/10 text-forge-ember flex items-center justify-center">
                <Bot size={11} />
              </div>
            )}
            <div
              className={`p-2 rounded text-xs max-w-[85%] whitespace-pre-wrap ${
                message.role === 'user' ? 'bg-forge-ember/20 text-white' : 'bg-gray-800 text-gray-300'
              }`}
            >
              {message.content}
            </div>
          </div>
        ))}
        {streaming && (
          <div className="flex gap-2">
            <div className="w-5 h-5 rounded bg-forge-ember/10 text-forge-ember flex items-center justify-center">
              <Loader2 size={11} className="animate-spin" />
            </div>
            <div className="p-2 rounded text-xs max-w-[85%] bg-gray-800 text-gray-300 whitespace-pre-wrap">
              {streamText || '...'}
            </div>
          </div>
        )}
        {error && <div className="text-xs text-red-400">{error}</div>}
        <div ref={endRef} />
      </div>

      <div className="p-3 border-t border-[#222]">
        {!canSend && (
          <p className="text-[11px] text-red-400 mb-2">Add Anthropic API key in settings to enable AI chat.</p>
        )}
        <div className="flex items-center gap-2 bg-black/40 border border-gray-800 rounded p-2">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={`Ask ${mode} AI...`}
            className="flex-1 bg-transparent border-none outline-none text-xs text-white resize-none"
            rows={1}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                sendMessage(input);
              }
            }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={streaming || !canSend}
            className="text-forge-ember disabled:opacity-30 cursor-pointer"
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AiPanel;

