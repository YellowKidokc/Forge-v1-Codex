// src/components/Editor/InlineAiBubble.tsx
//
// FORGE Layer 2b — The Inline AI Bubble
//
// When the user selects text in the editor, a small floating command bubble
// appears near the selection. The user types a plain-English instruction.
// The instruction is sent to the AI with the selection as context. The result
// streams back into the bubble, and the user can Accept (replace selection)
// or Dismiss.
//
// This component does NOT depend on the Grid (Layer 2a). It uses TipTap's
// native selection API. When the Grid lands, swap `getSelectionContext()`
// to use `grid.getRange()` for richer context (tags, marks, neighbors).
//
// IMPORT PATHS — adjust if your repo layout differs:
//   - Editor type from '@tiptap/react'
//   - streamFromClaude from '../../lib/ai' (existing — used by AiPanel.tsx)
//   - SYSTEM_PROMPT_INLINE from '../../lib/aiPrompts' (add to existing file)

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Editor } from '@tiptap/react';
import { streamFromClaude } from '../../lib/ai';
import { SYSTEM_PROMPT_INLINE } from '../../lib/aiPrompts';

type Props = {
  editor: Editor | null;
};

type BubbleState = 'idle' | 'typing' | 'streaming' | 'done' | 'error';

type Position = { top: number; left: number };

export function InlineAiBubble({ editor }: Props) {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState<Position>({ top: 0, left: 0 });
  const [instruction, setInstruction] = useState('');
  const [response, setResponse] = useState('');
  const [state, setState] = useState<BubbleState>('idle');
  const [selectionText, setSelectionText] = useState('');
  const selectionRangeRef = useRef<{ from: number; to: number } | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // ── Selection listener ────────────────────────────────────────────────
  useEffect(() => {
    if (!editor) return;

    const handleSelectionUpdate = () => {
      const { from, to, empty } = editor.state.selection;
      if (empty || to - from < 1) {
        // No selection — hide bubble unless user is actively typing
        if (state === 'idle') setVisible(false);
        return;
      }

      const text = editor.state.doc.textBetween(from, to, ' ');
      if (!text.trim()) {
        setVisible(false);
        return;
      }

      // Compute screen position from the end of the selection
      const coords = editor.view.coordsAtPos(to);
      const editorRect = editor.view.dom.getBoundingClientRect();

      setPosition({
        top: coords.bottom - editorRect.top + 8,
        left: Math.max(0, coords.left - editorRect.left),
      });
      setSelectionText(text);
      selectionRangeRef.current = { from, to };
      setVisible(true);
      setState('typing');
      setInstruction('');
      setResponse('');
    };

    editor.on('selectionUpdate', handleSelectionUpdate);
    return () => {
      editor.off('selectionUpdate', handleSelectionUpdate);
    };
  }, [editor, state]);

  // ── Focus input when bubble appears ───────────────────────────────────
  useEffect(() => {
    if (visible && state === 'typing') {
      // Small delay so the textarea exists in DOM
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [visible, state]);

  // ── Esc to dismiss, Enter to submit ───────────────────────────────────
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        dismiss();
      } else if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        submit();
      }
    },
    [instruction, selectionText],
  );

  // ── Submit instruction to AI ──────────────────────────────────────────
  const submit = async () => {
    if (!instruction.trim() || !editor) return;
    setState('streaming');
    setResponse('');

    const ctx = getSelectionContext(editor);
    const userMessage = buildPrompt(ctx, instruction);

    abortRef.current = new AbortController();

    try {
      let accumulated = '';
      await streamFromClaude({
        system: SYSTEM_PROMPT_INLINE,
        messages: [{ role: 'user', content: userMessage }],
        signal: abortRef.current.signal,
        onChunk: (chunk: string) => {
          accumulated += chunk;
          setResponse(accumulated);
        },
      });
      setState('done');
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error('[InlineAiBubble] stream error:', err);
        setState('error');
        setResponse((err as Error).message ?? 'Unknown error');
      }
    }
  };

  // ── Accept: replace selection with response ───────────────────────────
  const accept = () => {
    if (!editor || !selectionRangeRef.current) return;
    const { from, to } = selectionRangeRef.current;
    editor
      .chain()
      .focus()
      .deleteRange({ from, to })
      .insertContentAt(from, response)
      .run();
    dismiss();
  };

  // ── Dismiss bubble ────────────────────────────────────────────────────
  const dismiss = () => {
    abortRef.current?.abort();
    setVisible(false);
    setState('idle');
    setInstruction('');
    setResponse('');
    selectionRangeRef.current = null;
  };

  if (!visible) return null;

  return (
    <div
      className="forge-inline-bubble"
      style={{
        position: 'absolute',
        top: position.top,
        left: position.left,
        zIndex: 100,
        background: 'var(--bubble-bg, #1a1a1a)',
        border: '1px solid var(--bubble-border, #3a3a3a)',
        borderRadius: 8,
        boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
        padding: 12,
        minWidth: 360,
        maxWidth: 520,
        fontFamily: 'system-ui, sans-serif',
        fontSize: 14,
        color: 'var(--bubble-fg, #e0e0e0)',
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Selection preview */}
      <div
        style={{
          fontSize: 11,
          opacity: 0.6,
          marginBottom: 6,
          maxHeight: 32,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        ❝ {selectionText} ❞
      </div>

      {/* Instruction input */}
      {state === 'typing' && (
        <textarea
          ref={inputRef}
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Tell me what to do… (Enter to send, Esc to cancel)"
          style={{
            width: '100%',
            background: 'transparent',
            color: 'inherit',
            border: 'none',
            outline: 'none',
            resize: 'none',
            fontFamily: 'inherit',
            fontSize: 14,
            minHeight: 40,
          }}
        />
      )}

      {/* Streaming / done response */}
      {(state === 'streaming' || state === 'done' || state === 'error') && (
        <>
          <div
            style={{
              background: 'var(--bubble-response-bg, #0d0d0d)',
              padding: 8,
              borderRadius: 4,
              maxHeight: 280,
              overflowY: 'auto',
              whiteSpace: 'pre-wrap',
              fontFamily: state === 'error' ? 'monospace' : 'inherit',
              color: state === 'error' ? '#ff7777' : 'inherit',
              marginBottom: 8,
            }}
          >
            {response || (state === 'streaming' ? '…' : '')}
          </div>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
            {state === 'done' && (
              <button onClick={accept} style={btnPrimary}>
                Replace
              </button>
            )}
            <button onClick={dismiss} style={btnSecondary}>
              {state === 'streaming' ? 'Stop' : 'Dismiss'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────

type SelectionContext = {
  selectedText: string;
  precedingText: string;
  followingText: string;
  nodeType: string;
};

function getSelectionContext(editor: Editor): SelectionContext {
  const { from, to } = editor.state.selection;
  const doc = editor.state.doc;

  const selectedText = doc.textBetween(from, to, ' ');

  // Grab ~200 chars before and after for context
  const precedingFrom = Math.max(0, from - 200);
  const followingTo = Math.min(doc.content.size, to + 200);
  const precedingText = doc.textBetween(precedingFrom, from, ' ');
  const followingText = doc.textBetween(to, followingTo, ' ');

  // Find the node type containing the selection
  let nodeType = 'paragraph';
  doc.nodesBetween(from, to, (node) => {
    if (node.isBlock) {
      nodeType = node.type.name;
      return false;
    }
    return true;
  });

  return { selectedText, precedingText, followingText, nodeType };
}

function buildPrompt(ctx: SelectionContext, instruction: string): string {
  return `You are operating on a selection inside a Forge document.

NODE TYPE: ${ctx.nodeType}

CONTEXT BEFORE:
${ctx.precedingText}

SELECTION:
${ctx.selectedText}

CONTEXT AFTER:
${ctx.followingText}

INSTRUCTION:
${instruction}

Return ONLY the replacement text for the selection. No preamble, no explanation, no markdown fences. If the instruction asks for analysis or a question, return the analysis/answer as the replacement. If the instruction is unclear, return a single line starting with "CLARIFY:" followed by your question.`;
}

// ── Styles ──────────────────────────────────────────────────────────────

const btnBase: React.CSSProperties = {
  padding: '4px 12px',
  borderRadius: 4,
  fontSize: 12,
  cursor: 'pointer',
  border: '1px solid transparent',
  fontFamily: 'inherit',
};

const btnPrimary: React.CSSProperties = {
  ...btnBase,
  background: '#4a7fff',
  color: 'white',
};

const btnSecondary: React.CSSProperties = {
  ...btnBase,
  background: 'transparent',
  color: '#a0a0a0',
  borderColor: '#3a3a3a',
};
