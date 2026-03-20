/**
 * InlineAiChat — The Selection → Instruct bubble
 *
 * When user selects text in the editor, a small chat bubble appears
 * inline near the selection. User types an instruction in natural language.
 *
 * Two modes:
 * 1. DECLARE — instruction is parsed into a stored annotation (anchor/rule/macro)
 *    instantly, no AI needed. "This is canonical", "highlight amber", "LOW1 = ..."
 * 2. AI — instruction is sent to the AI for execution (explain, fix, rewrite, etc.)
 *
 * The system tries DECLARE first. If it can't parse, it falls through to AI.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { Editor } from '@tiptap/core';
import { UseGridReturn } from '../../hooks/useGrid';
import {
  parseInstruction, addAnchor, addRule, addMacro,
  getAnchors, getRules, getMacros,
  type CanonicalAnchor, type DisplayRule, type ExpansionMacro,
} from '../../lib/annotations';

interface InlineAiChatProps {
  editor: Editor | null;
  grid: UseGridReturn;
  docPath?: string;
  onExecute?: (instruction: string, context: InlineContext) => Promise<string>;
  onClose?: () => void;
  onAnnotationChange?: () => void;
}

export interface InlineContext {
  selectedText: string;
  selectionFrom: number;
  selectionTo: number;
  gridRow: number | null;
  gridCol: number | null;
  nodeType: string | null;
  surroundingText: string;
  tags: string[];
  flags: string[];
}

function getSelectionContext(editor: Editor, grid: UseGridReturn): InlineContext {
  const { from, to } = editor.state.selection;
  const selectedText = editor.state.doc.textBetween(from, to, ' ').trim();

  let gridRow: number | null = null;
  let gridCol: number | null = null;
  let nodeType: string | null = null;
  let tags: string[] = [];
  let flags: string[] = [];

  for (const row of grid.snapshot.rows) {
    if (row.from <= from && row.to >= from) {
      gridRow = row.index;
      nodeType = row.nodeType;
      flags = [...row.meta.flags];
      for (const cell of row.cells) {
        if (cell.from <= from && cell.to >= from) {
          gridCol = cell.col;
          tags = [...cell.meta.tags];
          break;
        }
      }
      break;
    }
  }

  let surroundingText = '';
  if (gridRow !== null) {
    const prevRow = grid.getRow(gridRow - 1);
    const currRow = grid.getRow(gridRow);
    const nextRow = grid.getRow(gridRow + 1);
    const parts: string[] = [];
    if (prevRow) parts.push(prevRow.cells.map(c => c.word).join(' '));
    if (currRow) parts.push(currRow.cells.map(c => c.word).join(' '));
    if (nextRow) parts.push(nextRow.cells.map(c => c.word).join(' '));
    surroundingText = parts.join('\n');
  }

  return {
    selectedText, selectionFrom: from, selectionTo: to,
    gridRow, gridCol, nodeType, surroundingText, tags, flags,
  };
}

export default function InlineAiChat({ editor, grid, docPath, onExecute, onClose, onAnnotationChange }: InlineAiChatProps) {
  const [instruction, setInstruction] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [resultType, setResultType] = useState<'declare' | 'ai' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [context, setContext] = useState<InlineContext | null>(null);
  const [showAnnotations, setShowAnnotations] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!editor) return;

    const { from, to } = editor.state.selection;
    if (from === to) {
      onClose?.();
      return;
    }

    const coords = editor.view.coordsAtPos(from);
    const editorRect = editor.view.dom.getBoundingClientRect();

    setPosition({
      x: Math.min(coords.left - editorRect.left, editorRect.width - 380),
      y: coords.bottom - editorRect.top + 8,
    });

    setContext(getSelectionContext(editor, grid));
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [editor, grid, onClose]);

  const handleSubmit = useCallback(async () => {
    if (!instruction.trim() || !context) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setResultType(null);

    // Try to parse as a declaration first
    const parsed = parseInstruction(instruction, context.selectedText, docPath);

    if (parsed.type === 'anchor' && parsed.anchor) {
      addAnchor(parsed.anchor);
      setResult(parsed.description);
      setResultType('declare');
      setLoading(false);
      onAnnotationChange?.();
      return;
    }

    if (parsed.type === 'rule' && parsed.rule) {
      addRule(parsed.rule);
      setResult(parsed.description);
      setResultType('declare');
      setLoading(false);
      onAnnotationChange?.();
      return;
    }

    if (parsed.type === 'macro' && parsed.macro) {
      addMacro(parsed.macro);
      setResult(parsed.description);
      setResultType('declare');
      setLoading(false);
      onAnnotationChange?.();
      return;
    }

    // Fall through to AI execution
    if (!onExecute) {
      setError('AI handler not connected. Configure in Settings.');
      setLoading(false);
      return;
    }

    try {
      const response = await onExecute(instruction, context);
      setResult(response);
      setResultType('ai');

      if (editor && response && !response.startsWith('ERROR')) {
        const lowerInst = instruction.toLowerCase();
        const isReplace = lowerInst.includes('fix') || lowerInst.includes('rewrite') ||
          lowerInst.includes('replace') || lowerInst.includes('correct') ||
          lowerInst.includes('improve') || lowerInst.includes('translate') ||
          lowerInst.includes('simplify') || lowerInst.includes('expand');

        if (isReplace) {
          editor.chain()
            .focus()
            .setTextSelection({ from: context.selectionFrom, to: context.selectionTo })
            .insertContent(response)
            .run();
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to execute');
    } finally {
      setLoading(false);
    }
  }, [instruction, context, onExecute, editor, docPath, onAnnotationChange]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (bubbleRef.current && !bubbleRef.current.contains(e.target as Node)) {
        onClose?.();
      }
    };
    setTimeout(() => window.addEventListener('mousedown', handleClick), 100);
    return () => window.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  if (!context) return null;

  const anchors = showAnnotations ? getAnchors() : [];
  const rules = showAnnotations ? getRules() : [];
  const macros = showAnnotations ? getMacros() : [];
  const totalAnnotations = showAnnotations ? anchors.length + rules.length + macros.length : 0;

  return (
    <div
      ref={bubbleRef}
      className="absolute z-50 w-[22rem] rounded-lg border border-forge-steel bg-[#111115] shadow-2xl"
      style={{ left: position.x, top: position.y }}
    >
      {/* Context indicator */}
      <div className="px-3 pt-2 pb-1 border-b border-forge-steel/50">
        <div className="text-[9px] font-mono text-gray-600 flex items-center gap-2">
          <span className="text-forge-ember">
            [{context.gridRow ?? '?'},{context.gridCol ?? '?'}]
          </span>
          <span>{context.nodeType}</span>
          {context.tags.length > 0 && (
            <span className="text-amber-400">{context.tags.join(', ')}</span>
          )}
          {context.flags.length > 0 && (
            <span className="text-purple-400">{context.flags.join(', ')}</span>
          )}
          <button
            onClick={() => setShowAnnotations(prev => !prev)}
            className="ml-auto text-gray-700 hover:text-gray-400 cursor-pointer text-[8px]"
            title="View stored annotations"
          >
            {showAnnotations ? 'HIDE' : 'ANNO'}
          </button>
        </div>
        <div className="text-[10px] text-gray-500 mt-0.5 truncate max-w-full">
          &ldquo;{context.selectedText.substring(0, 60)}
          {context.selectedText.length > 60 ? '...' : ''}&rdquo;
        </div>
      </div>

      {/* Input */}
      <div className="px-3 py-2">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder="Declare, instruct, or ask..."
            className="flex-1 bg-black/30 border border-forge-steel rounded px-2 py-1.5 text-xs text-white outline-none focus:border-forge-ember/40 placeholder:text-gray-700"
            disabled={loading}
          />
          <button
            onClick={handleSubmit}
            disabled={loading || !instruction.trim()}
            className="px-3 py-1.5 text-[10px] font-mono font-bold rounded border border-forge-ember/30 text-forge-ember hover:bg-forge-ember/10 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
          >
            {loading ? '...' : 'GO'}
          </button>
        </div>

        {/* Quick action buttons */}
        <div className="flex gap-1 mt-1.5 flex-wrap">
          {[
            { label: 'Canonical', prefill: 'This is the canonical ' },
            { label: 'Highlight', prefill: 'Highlight amber' },
            { label: 'Load-bearing', prefill: 'This is load-bearing. Flag if anything contradicts it.' },
            { label: 'Macro', prefill: '' },
            { label: 'Tag', action: 'tag' },
            { label: 'Flag row', action: 'flag' },
            { label: 'Explain', prefill: 'Explain: ' },
            { label: 'Fix', prefill: 'Fix grammar: ' },
          ].map(item => (
            <button
              key={item.label}
              onClick={() => {
                if (item.action === 'tag') {
                  const tag = prompt('Tag name:');
                  if (tag && context.gridRow !== null && context.gridCol !== null) {
                    grid.addTag(context.gridRow, context.gridCol, tag);
                    onClose?.();
                  }
                } else if (item.action === 'flag') {
                  const flag = prompt('Flag (e.g., load-bearing, axiom):');
                  if (flag && context.gridRow !== null) {
                    grid.setFlag(context.gridRow, flag);
                    onClose?.();
                  }
                } else if (item.label === 'Macro') {
                  setInstruction(`ABBR = ${context.selectedText}`);
                  inputRef.current?.focus();
                } else {
                  setInstruction(item.prefill || '');
                  inputRef.current?.focus();
                }
              }}
              className="px-1.5 py-0.5 text-[9px] font-mono rounded border border-forge-steel/50 text-gray-600 hover:text-gray-300 hover:border-gray-500 cursor-pointer transition-colors"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Result */}
      {result && (
        <div className="px-3 pb-2 border-t border-forge-steel/30 mt-1">
          <div className="text-[9px] font-mono mt-1.5 mb-0.5 uppercase tracking-wider flex items-center gap-2">
            {resultType === 'declare' ? (
              <span className="text-green-400">Stored</span>
            ) : (
              <span className="text-forge-ember">AI Result</span>
            )}
          </div>
          <div className="text-xs text-gray-300 max-h-32 overflow-y-auto whitespace-pre-wrap leading-relaxed">
            {result}
          </div>
          <div className="flex gap-1 mt-1.5">
            {resultType === 'ai' && (
              <button
                onClick={() => {
                  if (editor && result) {
                    editor.chain()
                      .focus()
                      .setTextSelection({ from: context.selectionFrom, to: context.selectionTo })
                      .insertContent(result)
                      .run();
                    onClose?.();
                  }
                }}
                className="px-2 py-0.5 text-[9px] font-mono rounded border border-green-500/30 text-green-400 hover:bg-green-500/10 cursor-pointer"
              >
                Replace
              </button>
            )}
            {resultType === 'ai' && (
              <button
                onClick={() => { navigator.clipboard.writeText(result); }}
                className="px-2 py-0.5 text-[9px] font-mono rounded border border-forge-steel text-gray-500 hover:text-gray-300 cursor-pointer"
              >
                Copy
              </button>
            )}
            <button
              onClick={onClose}
              className="px-2 py-0.5 text-[9px] font-mono rounded border border-forge-steel text-gray-500 hover:text-gray-300 cursor-pointer ml-auto"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="px-3 pb-2 text-[10px] text-red-400">{error}</div>
      )}

      {/* Annotation browser */}
      {showAnnotations && (
        <div className="px-3 pb-2 border-t border-forge-steel/30 max-h-48 overflow-y-auto">
          <div className="text-[9px] font-mono text-gray-600 mt-1.5 mb-1">
            {totalAnnotations} stored annotation{totalAnnotations !== 1 ? 's' : ''}
          </div>
          {anchors.map((a: CanonicalAnchor) => (
            <div key={a.id} className="text-[10px] text-cyan-300/80 mb-0.5 flex items-center gap-1">
              <span className="text-cyan-500/50">A</span>
              <span className="truncate">{a.label}</span>
              <span className="text-gray-700 truncate max-w-[100px]">&ldquo;{a.text}&rdquo;</span>
              {a.locked && <span className="text-amber-500/60">locked</span>}
            </div>
          ))}
          {rules.map((r: DisplayRule) => (
            <div key={r.id} className="text-[10px] text-amber-300/80 mb-0.5 flex items-center gap-1">
              <span className="text-amber-500/50">R</span>
              <span className="truncate">{r.trigger}</span>
              <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: r.color }} />
              <span className="text-gray-700">{r.shape}</span>
            </div>
          ))}
          {macros.map((m: ExpansionMacro) => (
            <div key={m.id} className="text-[10px] text-purple-300/80 mb-0.5 flex items-center gap-1">
              <span className="text-purple-500/50">M</span>
              <span className="font-mono">{m.shorthand}</span>
              <span className="text-gray-700 truncate">&rarr; {m.expansion}</span>
            </div>
          ))}
          {totalAnnotations === 0 && (
            <div className="text-[10px] text-gray-700">No annotations yet. Declare something!</div>
          )}
        </div>
      )}
    </div>
  );
}
