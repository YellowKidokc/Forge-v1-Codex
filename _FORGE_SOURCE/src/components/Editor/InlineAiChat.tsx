/**
 * InlineAiChat — The Selection → Instruct bubble
 * 
 * When user selects text in the editor, a small chat bubble appears
 * inline near the selection. User types an instruction in natural language.
 * AI reads selection + grid context + instruction → executes → result
 * appears in Layer 1.
 * 
 * This is NOT a full chat interface. It's a command line that
 * understands English. Quick, inline, disappears after execution.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { Editor } from '@tiptap/core';
import { UseGridReturn } from '../../hooks/useGrid';
import { cacheInstruction, getInstructionCache } from '../../lib/instructionCache';
import { addCanonicalAnchor, addDisplayRule, addExpansionMacro } from '../../lib/annotations';

interface InlineAiChatProps {
  editor: Editor | null;
  grid: UseGridReturn;
  onExecute?: (instruction: string, context: InlineContext) => Promise<string>;
  onClose?: () => void;
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

function findSelectionCell(row: UseGridReturn['snapshot']['rows'][number], from: number, to: number) {
  const overlappingCell = row.cells.find((cell) => cell.from < to && cell.to > from);
  if (overlappingCell) return overlappingCell;

  if (row.cells.length === 0) return null;

  return row.cells.reduce((closest, cell) => {
    const closestDistance = Math.min(Math.abs(from - closest.from), Math.abs(from - closest.to));
    const cellDistance = Math.min(Math.abs(from - cell.from), Math.abs(from - cell.to));
    return cellDistance < closestDistance ? cell : closest;
  });
}

function getSelectionContext(editor: Editor, grid: UseGridReturn): InlineContext {
  const { from, to } = editor.state.selection;
  const selectedText = editor.state.doc.textBetween(from, to, ' ').trim();
  
  // Find grid coordinates for the selection start
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
      const selectedCell = findSelectionCell(row, from, to);
      if (selectedCell) {
        gridCol = selectedCell.col;
        tags = [...selectedCell.meta.tags];
      }
      break;
    }
  }

  // Get surrounding text for context (the paragraph before and after)
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
    selectedText,
    selectionFrom: from,
    selectionTo: to,
    gridRow,
    gridCol,
    nodeType,
    surroundingText,
    tags,
    flags,
  };
}

export default function InlineAiChat({ editor, grid, onExecute, onClose }: InlineAiChatProps) {
  const [instruction, setInstruction] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [context, setContext] = useState<InlineContext | null>(null);
  const [cachedCount, setCachedCount] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);

  // Position the bubble near the selection
  useEffect(() => {
    if (!editor) return;
    
    const { from, to } = editor.state.selection;
    if (from === to) {
      onClose?.();
      return;
    }

    // Get the DOM coordinates of the selection
    const coords = editor.view.coordsAtPos(from);
    const editorRect = editor.view.dom.getBoundingClientRect();
    const bubbleWidth = 320;
    const maxLeft = Math.max(0, editorRect.width - bubbleWidth);
    
    setPosition({
      x: Math.max(0, Math.min(coords.left - editorRect.left, maxLeft)),
      y: coords.bottom - editorRect.top + 8,
    });

    setContext(getSelectionContext(editor, grid));
    
    // Auto-focus the input
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [editor, grid, onClose]);

  const handleSubmit = useCallback(async () => {
    if (!instruction.trim() || !context || !onExecute) return;
    
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await onExecute(instruction, context);
      cacheInstruction(instruction, context);
      setCachedCount(getInstructionCache().length);
      setResult(response);
      
      // If the instruction looks like it should replace the selection, do it
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
  }, [instruction, context, onExecute, editor]);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  useEffect(() => {
    setCachedCount(getInstructionCache().length);
  }, []);

  // Close on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (bubbleRef.current && !bubbleRef.current.contains(e.target as Node)) {
        onClose?.();
      }
    };

    let listenerAttached = false;
    const timeoutId = window.setTimeout(() => {
      window.addEventListener('mousedown', handleClick);
      listenerAttached = true;
    }, 100);

    return () => {
      window.clearTimeout(timeoutId);
      if (listenerAttached) {
        window.removeEventListener('mousedown', handleClick);
      }
    };
  }, [onClose]);

  if (!context) return null;

  return (
    <div
      ref={bubbleRef}
      className="absolute z-50 w-80 rounded-lg border border-forge-steel bg-[#111115] shadow-2xl"
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
            <span className="text-amber-400">
              {context.tags.join(', ')}
            </span>
          )}
          {context.flags.length > 0 && (
            <span className="text-purple-400">
              {context.flags.join(', ')}
            </span>
          )}
          {cachedCount > 0 && <span className="ml-auto text-gray-500">cache:{cachedCount}</span>}
        </div>
        <div className="text-[10px] text-gray-500 mt-0.5 truncate max-w-full">
          "{context.selectedText.substring(0, 60)}
          {context.selectedText.length > 60 ? '...' : ''}"
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
            placeholder="What should I do with this?"
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
          {['Tag as...', 'Flag row', 'Explain', 'Fix grammar', 'Summarize', 'Link to...'].map(action => (
            <button
              key={action}
              onClick={() => {
                if (action === 'Tag as...') {
                  const tag = prompt('Tag name:');
                  if (tag && context.gridRow !== null && context.gridCol !== null) {
                    grid.addTag(context.gridRow, context.gridCol, tag);
                    addDisplayRule({
                      trigger: context.selectedText || tag,
                      color: '#e8a912',
                      shape: 'background',
                      opacity: 0.25,
                      scope: 'local',
                    });
                    onClose?.();
                  }
                } else if (action === 'Flag row') {
                  const flag = prompt('Flag (e.g., load-bearing, axiom):');
                  if (flag && context.gridRow !== null) {
                    grid.setFlag(context.gridRow, flag);
                    addCanonicalAnchor({
                      label: flag,
                      text: context.selectedText,
                      grain: 'selection',
                      scope: 'local',
                      locked: false,
                    });
                    onClose?.();
                  }
                } else if (action === 'Link to...') {
                  const macro = prompt('Macro shorthand (example LOW1):');
                  if (macro) {
                    addExpansionMacro({
                      abbreviation: macro,
                      expansion: context.selectedText,
                      scope: 'local',
                    });
                    setInstruction(`Link "${context.selectedText}" to ${macro}`);
                    inputRef.current?.focus();
                  }
                } else {
                  setInstruction(action + ': ');
                  inputRef.current?.focus();
                }
              }}
              className="px-1.5 py-0.5 text-[9px] font-mono rounded border border-forge-steel/50 text-gray-600 hover:text-gray-300 hover:border-gray-500 cursor-pointer transition-colors"
            >
              {action}
            </button>
          ))}
        </div>
      </div>

      {/* Result */}
      {result && (
        <div className="px-3 pb-2 border-t border-forge-steel/30 mt-1">
          <div className="text-[9px] font-mono text-forge-ember mt-1.5 mb-0.5 uppercase tracking-wider">Result</div>
          <div className="text-xs text-gray-300 max-h-32 overflow-y-auto whitespace-pre-wrap leading-relaxed">
            {result}
          </div>
          <div className="flex gap-1 mt-1.5">
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
            <button
              onClick={() => {
                navigator.clipboard.writeText(result);
              }}
              className="px-2 py-0.5 text-[9px] font-mono rounded border border-forge-steel text-gray-500 hover:text-gray-300 cursor-pointer"
            >
              Copy
            </button>
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
    </div>
  );
}
