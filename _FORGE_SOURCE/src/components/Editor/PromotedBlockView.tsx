import React, { useState, useRef, useCallback } from 'react';
import { NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import {
  Zap, ChevronDown, ChevronRight, Crosshair, Shield, Waypoints,
  Loader2, X, Copy, Check
} from 'lucide-react';
import { runAiCommand, getAiProvider, getRoleConfig, hasApiKey, missingKeyMessage, providerLabel, type AiCommand } from '../../lib/ai';
import { appendAiRuntimeEvent, summarizeAiText } from '../../lib/aiRuntime';
import { AI_PROMPTS } from '../../lib/aiPrompts';

interface PromotedBlockViewProps {
  node: any;
  updateAttributes: (attrs: Record<string, any>) => void;
  editor: any;
}

const BLOCK_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  claim: { label: 'CLAIM', color: 'text-amber-400' },
  axiom: { label: 'AXIOM', color: 'text-forge-ember' },
  law: { label: 'LAW', color: 'text-blue-400' },
  operator: { label: 'OPERATOR', color: 'text-purple-400' },
  evidence: { label: 'EVIDENCE', color: 'text-green-400' },
  conjecture: { label: 'CONJECTURE', color: 'text-yellow-300' },
};

const AI_BUTTONS: { command: AiCommand; icon: typeof Crosshair; label: string; title: string }[] = [
  { command: 'probe', icon: Crosshair, label: 'PRB', title: '/PROBE — structural integrity test' },
  { command: 'east', icon: Shield, label: 'EST', title: '/EAST — steelman strongest objection' },
  { command: 'connect', icon: Waypoints, label: 'CON', title: '/CONNECT — find structural bridges' },
];

export const PromotedBlockView: React.FC<PromotedBlockViewProps> = ({
  node,
  updateAttributes,
  editor,
}) => {
  const [collapsed, setCollapsed] = useState(false);

  // AI state
  const [aiLoading, setAiLoading] = useState<AiCommand | null>(null);
  const [aiResponse, setAiResponse] = useState<string>('');
  const [aiCommand, setAiCommand] = useState<AiCommand | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const provider = getAiProvider();

  const blockId = node.attrs.blockId || '???';
  const blockType = node.attrs.blockType || 'claim';
  const typeInfo = BLOCK_TYPE_LABELS[blockType] || BLOCK_TYPE_LABELS.claim;

  const cycleType = () => {
    const types = Object.keys(BLOCK_TYPE_LABELS);
    const currentIdx = types.indexOf(blockType);
    const nextType = types[(currentIdx + 1) % types.length];
    updateAttributes({ blockType: nextType });
  };

  /**
   * Extract the plain text content from this promoted block's TipTap node.
   */
  const getBlockText = useCallback((): string => {
    if (!node.content) return '';
    let text = '';
    node.content.forEach((child: any) => {
      if (child.text) {
        text += child.text;
      } else if (child.content) {
        child.content.forEach((inline: any) => {
          if (inline.text) text += inline.text;
        });
        text += '\n';
      }
    });
    return text.trim();
  }, [node]);

  /**
   * Fire an AI command against this block.
   */
  const handleAiCommand = useCallback(async (command: AiCommand) => {
    if (!hasApiKey(provider)) {
      setAiError(missingKeyMessage(provider));
      setAiCommand(command);
      return;
    }

    const content = getBlockText();
    if (!content) {
      setAiError('Block is empty — nothing to analyze.');
      setAiCommand(command);
      return;
    }

    // Abort any in-flight request
    if (abortRef.current) {
      abortRef.current.abort();
    }

    const controller = new AbortController();
    abortRef.current = controller;

    setAiLoading(command);
    setAiCommand(command);
    setAiResponse('');
    setAiError(null);

    const systemPrompt = AI_PROMPTS[command];

    await runAiCommand(
      command,
      content,
      blockType,
      systemPrompt,
      {
        onToken: (token) => {
          setAiResponse(prev => prev + token);
        },
        onComplete: (_fullText) => {
          const roleConfig = getRoleConfig('logic');
          appendAiRuntimeEvent({
            role: 'logic',
            kind: 'command',
            summary: summarizeAiText(`${command.toUpperCase()} ${content}`),
            provider: providerLabel(roleConfig.provider),
            model: roleConfig.model,
            status: 'completed',
          }, 1000 * 60 * 2);
          setAiLoading(null);
          abortRef.current = null;
        },
        onError: (error) => {
          const roleConfig = getRoleConfig('logic');
          appendAiRuntimeEvent({
            role: 'logic',
            kind: 'error',
            summary: summarizeAiText(error),
            provider: providerLabel(roleConfig.provider),
            model: roleConfig.model,
            status: 'failed',
          }, 1000 * 45);
          setAiError(error);
          setAiLoading(null);
          abortRef.current = null;
        },
      },
      controller.signal
    );
  }, [getBlockText, blockType, provider]);

  const handleAbort = () => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
      setAiLoading(null);
    }
  };

  const handleCopy = async () => {
    if (aiResponse) {
      await navigator.clipboard.writeText(aiResponse);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const handleDismissAi = () => {
    setAiResponse('');
    setAiCommand(null);
    setAiError(null);
  };

  const commandLabel = aiCommand
    ? AI_BUTTONS.find(b => b.command === aiCommand)?.label || aiCommand.toUpperCase()
    : '';

  return (
    <NodeViewWrapper className="promoted-block-wrapper" data-block-id={blockId}>
      {/* Block header bar */}
      <div className="promoted-block-header" contentEditable={false}>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="promoted-block-collapse"
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
          </button>

          <Zap size={12} className="text-forge-ember" />

          <button
            onClick={cycleType}
            className={`promoted-block-type ${typeInfo.color}`}
            title="Click to cycle block type"
          >
            {typeInfo.label}
          </button>

          <span className="promoted-block-id">^{blockId}</span>
        </div>

        <div className="flex items-center gap-1">
          {/* AI action buttons */}
          {AI_BUTTONS.map(({ command, icon: Icon, title }) => (
            <button
              key={command}
              onClick={() => handleAiCommand(command)}
              disabled={aiLoading !== null}
              className={`promoted-block-action ${
                aiLoading === command ? 'ai-loading' : ''
              } ${aiCommand === command && aiResponse ? 'ai-active' : ''}`}
              title={title}
            >
              {aiLoading === command ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Icon size={12} />
              )}
            </button>
          ))}

          <div className="toolbar-divider" style={{ height: 12, margin: '0 2px' }} />

          <button
            onClick={() => {
              if (confirm('Demote this block? Content will be preserved.')) {
                editor.commands.unsetPromotedBlock();
              }
            }}
            className="promoted-block-action text-red-400/50 hover:text-red-400"
            title="Demote (remove block status)"
          >
            ×
          </button>
        </div>
      </div>

      {/* Block content */}
      {!collapsed && (
        <NodeViewContent className="promoted-block-content" />
      )}

      {collapsed && (
        <div className="promoted-block-collapsed" contentEditable={false}>
          <span className="text-[10px] text-gray-600 italic">collapsed</span>
        </div>
      )}

      {/* AI Response Panel */}
      {(aiResponse || aiError) && (
        <div className="ai-response-panel" contentEditable={false}>
          <div className="ai-response-header">
            <div className="flex items-center gap-2">
              <span className="ai-response-command">/{commandLabel}</span>
              <span className="text-[10px] text-gray-500">{providerLabel(provider)}</span>
              {aiLoading && (
                <span className="ai-response-streaming">
                  <Loader2 size={10} className="animate-spin inline" /> streaming...
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {aiResponse && !aiLoading && (
                <button onClick={handleCopy} className="ai-response-action" title="Copy">
                  {copied ? <Check size={10} /> : <Copy size={10} />}
                </button>
              )}
              {aiLoading && (
                <button onClick={handleAbort} className="ai-response-action text-red-400" title="Abort">
                  <X size={10} />
                </button>
              )}
              {!aiLoading && (
                <button onClick={handleDismissAi} className="ai-response-action" title="Dismiss">
                  <X size={10} />
                </button>
              )}
            </div>
          </div>
          <div className="ai-response-body">
            {aiError ? (
              <span className="text-red-400">{aiError}</span>
            ) : (
              aiResponse
            )}
          </div>
        </div>
      )}
    </NodeViewWrapper>
  );
};
