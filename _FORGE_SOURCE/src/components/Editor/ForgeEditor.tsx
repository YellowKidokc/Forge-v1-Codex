import { useEffect, useRef, useCallback, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import Underline from '@tiptap/extension-underline';
import Strike from '@tiptap/extension-strike';
import { PromotedBlock } from './PromotedBlockExtension';
import EditorToolbar from './EditorToolbar';
import { markdownToHtml, tiptapJsonToMarkdown } from '../../lib/markdown';
import { invoke } from '@tauri-apps/api/core';
import { Save } from 'lucide-react';
import { EditorSettings, NoteMetadata } from '../../lib/types';
import { extractNoteMetadata } from '../../lib/noteMeta';
import { useGrid } from '../../hooks/useGrid';
import InlineAiChat, { InlineContext } from './InlineAiChat';
import GridLayer from './GridLayer';
import { runAiRoleChat, type ChatTurn } from '../../lib/ai';

interface EditorContextMenu {
  x: number;
  y: number;
  selectedText: string;
}

interface ForgeEditorProps {
  filePath: string | null;
  onContentChange?: (modified: boolean) => void;
  onMetadataChange?: (metadata: NoteMetadata) => void;
  onDocumentSnapshot?: (markdown: string) => void;
  onOpenWikiLink?: (target: string) => void;
  onSendPromptToAi?: (prompt: string) => void;
  onRunPythonPlan?: (prompt: string, selection?: string) => Promise<boolean>;
  editorSettings: EditorSettings;
  workspaceContext?: string;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const ForgeEditor = ({
  filePath,
  onContentChange,
  onMetadataChange,
  onDocumentSnapshot,
  onOpenWikiLink,
  onSendPromptToAi,
  onRunPythonPlan,
  editorSettings,
  workspaceContext = '',
}: ForgeEditorProps) => {
  const saveTimeoutRef = useRef<number | null>(null);
  const metadataTimeoutRef = useRef<number | null>(null);
  const lastSavedRef = useRef<string>('');
  const isLoadingRef = useRef(false);
  const [contextMenu, setContextMenu] = useState<EditorContextMenu | null>(null);
  const [linkWizardOpen, setLinkWizardOpen] = useState(false);
  const [linkSource, setLinkSource] = useState('');
  const [linkTarget, setLinkTarget] = useState('');
  const [linkAllMatches, setLinkAllMatches] = useState(true);
  const [createNewPage, setCreateNewPage] = useState(true);
  const [showLinkedWords, setShowLinkedWords] = useState(false);
  const [buildStory, setBuildStory] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [showInlineChat, setShowInlineChat] = useState(false);
  const inlineAiAbortRef = useRef<AbortController | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: ({ node }) => (node.type.name === 'heading' ? 'Heading...' : 'Start writing...'),
      }),
      Underline,
      Strike,
      TaskList,
      TaskItem.configure({ nested: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      PromotedBlock,
    ],
    content: '<p></p>',
    editorProps: {
      attributes: {
        class: 'forge-editor-content',
        spellcheck: String(editorSettings.spellcheck),
      },
    },
    onUpdate: ({ editor: editorInstance }) => {
      if (isLoadingRef.current) return;
      onContentChange?.(true);
      const markdown = tiptapJsonToMarkdown(editorInstance.getJSON());
      if (metadataTimeoutRef.current) {
        clearTimeout(metadataTimeoutRef.current);
      }
      metadataTimeoutRef.current = window.setTimeout(() => {
        onMetadataChange?.(extractNoteMetadata(markdown));
        onDocumentSnapshot?.(markdown);
      }, 1000);

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = window.setTimeout(() => {
        saveCurrentFile(editorInstance, markdown);
      }, editorSettings.autosaveDelayMs);
    },
  }, [editorSettings.spellcheck, editorSettings.autosaveDelayMs]);

  // Grid Layer — addressable substrate under the editor
  const grid = useGrid(editor, filePath);

  useEffect(() => {
    if (!filePath || !editor) return;
    isLoadingRef.current = true;

    invoke<string>('read_note', { path: filePath })
      .then((content) => {
        const html = markdownToHtml(content);
        editor.commands.setContent(html);
        lastSavedRef.current = content;
        onMetadataChange?.(extractNoteMetadata(content));
        onDocumentSnapshot?.(content);
        onContentChange?.(false);
      })
      .catch((err) => {
        console.error('Failed to load file:', err);
        editor.commands.setContent(`<p>Error loading file: ${escapeHtml(String(err))}</p>`);
      })
      .finally(() => {
        setTimeout(() => {
          isLoadingRef.current = false;
        }, 100);
      });
  }, [filePath, editor, onContentChange, onMetadataChange, onDocumentSnapshot]);

  useEffect(() => {
    if (editorSettings.vimMode) {
      console.info('FORGE vim mode is coming soon.');
    }
  }, [editorSettings.vimMode]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      if (metadataTimeoutRef.current) clearTimeout(metadataTimeoutRef.current);
      if (inlineAiAbortRef.current) inlineAiAbortRef.current.abort();
    };
  }, []);

  useEffect(() => {
    if (filePath) return;
    onMetadataChange?.({ tags: [], links: [] });
    onDocumentSnapshot?.('');
  }, [filePath, onMetadataChange, onDocumentSnapshot]);

  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    window.addEventListener('click', close);
    window.addEventListener('keydown', onEscape);
    return () => {
      window.removeEventListener('click', close);
      window.removeEventListener('keydown', onEscape);
    };
  }, [contextMenu]);

  const saveCurrentFile = useCallback(
    async (editorInstance?: any, precomputedMarkdown?: string) => {
      const ed = editorInstance || editor;
      if (!filePath || !ed) return;

      const markdown = precomputedMarkdown ?? tiptapJsonToMarkdown(ed.getJSON());
      if (markdown === lastSavedRef.current) return;

      try {
        await invoke('write_note', { path: filePath, content: markdown });
        lastSavedRef.current = markdown;
        onContentChange?.(false);
      } catch (err) {
        console.error('Failed to save:', err);
      }
    },
    [filePath, editor, onContentChange]
  );

  const getSelectionText = useCallback(() => {
    if (!editor) return '';
    const { from, to } = editor.state.selection;
    return editor.state.doc.textBetween(from, to, ' ').trim();
  }, [editor]);

  const openWikiLinkFromPrompt = () => {
    if (!onOpenWikiLink) return;
    const target = prompt('Open wiki link (example: My Note or folder/note):');
    if (!target?.trim()) return;
    onOpenWikiLink(target.trim());
  };

  const openLinkWizard = (seedText = '') => {
    const cleaned = seedText.trim();
    setLinkSource(cleaned);
    setLinkTarget(cleaned);
    setLinkWizardOpen(true);
  };

  const applyLinkWizard = async () => {
    if (!editor || !filePath) return;
    const source = linkSource.trim();
    const target = (linkTarget.trim() || source).trim();
    if (!target) return;

    let markdown = tiptapJsonToMarkdown(editor.getJSON());
    const linkMarkup = source && source.toLowerCase() !== target.toLowerCase()
      ? `[[${target}|${source}]]`
      : `[[${target}]]`;

    if (linkAllMatches && source) {
      const pattern = new RegExp(`\\b${escapeRegExp(source)}\\b`, 'g');
      markdown = markdown.replace(pattern, linkMarkup);
      editor.commands.setContent(markdownToHtml(markdown));
    } else if (source) {
      editor.chain().focus().insertContent(linkMarkup).run();
      markdown = tiptapJsonToMarkdown(editor.getJSON());
    } else {
      editor.chain().focus().insertContent(linkMarkup).run();
      markdown = tiptapJsonToMarkdown(editor.getJSON());
    }

    const metadata = extractNoteMetadata(markdown);
    onMetadataChange?.(metadata);
    await saveCurrentFile(editor, markdown);

    if (createNewPage && onOpenWikiLink) {
      onOpenWikiLink(target);
    }

    if (showLinkedWords) {
      const links = metadata.links.length > 0 ? metadata.links.join(', ') : 'No linked words found yet.';
      alert(`Linked words in this note:\n${links}`);
    }

    if (buildStory) {
      try {
        const storyTitle = `Story - ${target}`;
        const storyPath = await invoke<string>('open_or_create_note_by_title', { title: storyTitle });
        const currentTitle = filePath.split(/[\\/]/).pop()?.replace(/\.md$/, '') || 'Current Note';
        const related = metadata.links.slice(0, 30).map((link) => `- [[${link}]]`).join('\n') || '- (none yet)';
        const story = `# ${storyTitle}\n\n## Seed\n- [[${target}]]\n- Source: [[${currentTitle}]]\n\n## Navigation Thread\n${related}\n`;
        await invoke('write_note', { path: storyPath, content: story });
      } catch (err) {
        console.error('Failed to build story note:', err);
      }
    }

    setLinkWizardOpen(false);
    setContextMenu(null);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        saveCurrentFile();
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        openLinkWizard(getSelectionText());
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'g') {
        event.preventDefault();
        setShowGrid(prev => !prev);
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'i') {
        event.preventDefault();
        // Only open if text is selected
        if (editor) {
          const { from, to } = editor.state.selection;
          if (from !== to) setShowInlineChat(true);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [getSelectionText, saveCurrentFile, editor]);

  const handleInlineExecute = useCallback(async (instruction: string, ctx: InlineContext) => {
    if (inlineAiAbortRef.current) {
      inlineAiAbortRef.current.abort();
    }
    const controller = new AbortController();
    inlineAiAbortRef.current = controller;
    const messages: ChatTurn[] = [
      {
        role: 'user',
        content: [
          `INSTRUCTION: ${instruction}`,
          `SELECTED TEXT: ${ctx.selectedText}`,
          ctx.gridRow !== null ? `GRID POSITION: Row ${ctx.gridRow}, Col ${ctx.gridCol}` : '',
          ctx.nodeType ? `NODE TYPE: ${ctx.nodeType}` : '',
          ctx.tags.length > 0 ? `TAGS: ${ctx.tags.join(', ')}` : '',
          ctx.flags.length > 0 ? `FLAGS: ${ctx.flags.join(', ')}` : '',
          ctx.surroundingText ? `CONTEXT:\n${ctx.surroundingText}` : '',
          'Return ONLY the result text.',
        ].filter(Boolean).join('\n'),
      },
    ];
    let responseText = '';
    let responseError: string | null = null;
    try {
      await runAiRoleChat(
        'interface',
        messages,
        {
          onToken: (token) => {
            responseText += token;
          },
          onComplete: (fullText) => {
            responseText = fullText || responseText;
          },
          onError: (error) => {
            responseError = error;
          },
        },
        controller.signal,
        workspaceContext ? `Workspace context:\n${workspaceContext}` : ''
      );
      if (responseError) {
        throw new Error(responseError);
      }
      if (!responseText.trim() && onSendPromptToAi) {
        onSendPromptToAi(messages[0].content);
        return 'Inline AI was empty. Sent to AI panel fallback.';
      }
      return responseText || 'No response returned.';
    } finally {
      inlineAiAbortRef.current = null;
    }
  }, [workspaceContext, onSendPromptToAi]);

  if (!filePath) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#1a1a1a]">
        <div className="text-center max-w-md text-white">
          <h2 className="text-2xl font-black mb-2 tracking-tight uppercase italic">Logos Forge</h2>
          <div className="h-1 w-24 bg-forge-ember mx-auto rounded-full mb-6" />
          <p className="text-gray-500 text-sm">Select a note to begin construction.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-[#1a1a1a] overflow-hidden relative">
      <div className="flex items-center justify-between px-4 py-2 border-b border-forge-steel bg-forge-iron/50">
        <span className="text-xs text-gray-500 font-mono truncate max-w-[400px]">
          {filePath.split(/[\\/]/).pop()}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowGrid(prev => !prev)}
            className={`transition-colors p-1 cursor-pointer text-[10px] font-mono ${showGrid ? 'text-forge-ember' : 'text-gray-500 hover:text-forge-ember'}`}
            title="Toggle Grid Layer (Layer 2)"
          >
            {showGrid ? '⊞ GRID' : '⊞'}
          </button>
          {grid.snapshot.totalRows > 0 && (
            <span className="text-[9px] font-mono text-gray-600">
              {grid.snapshot.totalRows}r/{grid.snapshot.totalCells}c
            </span>
          )}
          <button
            onClick={() => saveCurrentFile()}
            className="text-gray-500 hover:text-forge-ember transition-colors p-1 cursor-pointer"
            title="Save (Ctrl+S)"
          >
            <Save size={14} />
          </button>
          <button
            onClick={openWikiLinkFromPrompt}
            className="text-gray-500 hover:text-forge-ember transition-colors p-1 cursor-pointer text-[10px] font-mono"
            title="Open wiki link"
          >
            [[ ]]
          </button>
        </div>
      </div>

      <EditorToolbar editor={editor} />

      <div className={`flex-1 flex overflow-hidden ${showGrid ? '' : 'flex-col'}`}>
        {/* Editor pane */}
        <div
          className={`${showGrid ? 'w-1/2 border-r border-forge-steel' : 'flex-1'} overflow-y-auto`}
          onContextMenu={(event) => {
            if (!editor) return;
            const selectedText = getSelectionText();
            setContextMenu({
              x: event.clientX,
              y: event.clientY,
              selectedText,
            });
            event.preventDefault();
          }}
        >
          <div
            className={`mx-auto py-8 px-6 relative ${editorSettings.showLineNumbers ? 'forge-editor-lines' : ''}`}
            style={{
              maxWidth: `${editorSettings.editorMaxWidth}px`,
              ['--forge-editor-font-family' as string]: editorSettings.editorFontFamily,
              ['--forge-editor-font-size' as string]: `${editorSettings.editorFontSize}px`,
              ['--forge-editor-line-height' as string]: String(editorSettings.editorLineHeight),
              ['--forge-tab-size' as string]: String(editorSettings.tabSize),
            }}
          >
            <EditorContent editor={editor} />
            {/* Inline AI Chat bubble */}
            {showInlineChat && (
              <InlineAiChat
                editor={editor}
                grid={grid}
                onClose={() => setShowInlineChat(false)}
                onExecute={handleInlineExecute}
              />
            )}
          </div>
        </div>

        {/* Grid Layer panel (Layer 2) */}
        {showGrid && <GridLayer editor={editor} grid={grid} />}
      </div>

      {contextMenu && (
        <div
          className="fixed z-40 min-w-52 rounded border border-forge-steel bg-[#151515] shadow-2xl p-1"
          style={{
            left: Math.min(contextMenu.x, window.innerWidth - 220),
            top: Math.min(contextMenu.y, window.innerHeight - 180),
          }}
          onClick={(event) => event.stopPropagation()}
        >
          <button
            onClick={() => {
              const text = contextMenu.selectedText || 'current section';
              onSendPromptToAi?.(`Explain this section and suggest improvements:\n\n${text}`);
              setContextMenu(null);
            }}
            className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-forge-steel text-gray-200 cursor-pointer"
          >
            Ask Interface AI
          </button>
          <button
            onClick={() => {
              // Grid-aware: tag the selected word(s)
              const tag = prompt('Tag this selection as:');
              if (tag && editor) {
                const { from } = editor.state.selection;
                // Find the grid cell at the cursor position
                for (const row of grid.snapshot.rows) {
                  for (const cell of row.cells) {
                    if (cell.from <= from && cell.to >= from) {
                      grid.addTag(cell.row, cell.col, tag);
                      break;
                    }
                  }
                }
              }
              setContextMenu(null);
            }}
            className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-forge-steel text-amber-300/80 cursor-pointer"
          >
            ⊞ Tag in Grid
          </button>
          <button
            onClick={() => {
              // Grid-aware: flag the row containing selection
              const flag = prompt('Flag this row as (e.g., load-bearing, axiom, definition):');
              if (flag && editor) {
                const { from } = editor.state.selection;
                for (const row of grid.snapshot.rows) {
                  if (row.from <= from && row.to >= from) {
                    grid.setFlag(row.index, flag);
                    break;
                  }
                }
              }
              setContextMenu(null);
            }}
            className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-forge-steel text-purple-300/80 cursor-pointer"
          >
            ⊞ Flag Row
          </button>
          <button
            onClick={() => {
              const text = contextMenu.selectedText || 'current section';
              onSendPromptToAi?.(`LOGIC CHECK: verify coherence, assumptions, and axiom consistency.\n\n${text}`);
              setContextMenu(null);
            }}
            className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-forge-steel text-gray-200 cursor-pointer"
          >
            Run Logic Layer Check
          </button>
          <button
            onClick={() => {
              const text = contextMenu.selectedText || 'current section';
              void onRunPythonPlan?.(`Create a structured action plan for this selection. Include links, tags, definitions, and follow-up actions where appropriate.`, text);
              setContextMenu(null);
            }}
            className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-forge-steel text-gray-200 cursor-pointer"
          >
            Python Action Plan
          </button>
          <button
            onClick={() => openLinkWizard(contextMenu.selectedText)}
            className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-forge-steel text-gray-200 cursor-pointer"
          >
            Link Builder...
          </button>
          <button
            onClick={() => {
              const seed = contextMenu.selectedText || 'Drilldown Topic';
              onOpenWikiLink?.(`${seed} Drilldown`);
              setContextMenu(null);
            }}
            className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-forge-steel text-gray-200 cursor-pointer"
          >
            Create Drilldown Page
          </button>
        </div>
      )}

      {linkWizardOpen && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="w-full max-w-lg border border-forge-steel bg-[#161616] rounded p-4 space-y-3">
            <h3 className="text-xs uppercase tracking-widest text-forge-ember font-bold">Link Builder</h3>
            <input
              value={linkSource}
              onChange={(event) => setLinkSource(event.target.value)}
              placeholder="Selected words / source phrase"
              className="w-full bg-black/30 border border-forge-steel rounded px-2 py-1.5 text-xs text-white outline-none focus:border-forge-ember/40"
            />
            <input
              value={linkTarget}
              onChange={(event) => setLinkTarget(event.target.value)}
              placeholder="Link target note title"
              className="w-full bg-black/30 border border-forge-steel rounded px-2 py-1.5 text-xs text-white outline-none focus:border-forge-ember/40"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-gray-300">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={linkAllMatches} onChange={(event) => setLinkAllMatches(event.target.checked)} />
                Link every match of these words
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={createNewPage} onChange={(event) => setCreateNewPage(event.target.checked)} />
                Create or open linked page
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={showLinkedWords} onChange={(event) => setShowLinkedWords(event.target.checked)} />
                Show all linked words now
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={buildStory} onChange={(event) => setBuildStory(event.target.checked)} />
                Build a navigation story note
              </label>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setLinkWizardOpen(false)}
                className="text-xs px-2 py-1.5 border border-forge-steel rounded text-gray-300 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={applyLinkWizard}
                className="text-xs px-2 py-1.5 border border-forge-ember/40 rounded text-forge-ember hover:text-white cursor-pointer"
              >
                Apply Link Actions
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ForgeEditor;
