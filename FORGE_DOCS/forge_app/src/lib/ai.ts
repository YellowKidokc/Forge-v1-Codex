/**
 * FORGE AI Service
 * Supports Anthropic Claude and OpenAI GPT with streaming responses.
 */

import type { AiProvider } from './types';
import { SETTINGS_STORAGE_KEY } from './settings';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

const ANTHROPIC_MODEL = 'claude-sonnet-4-20250514';
const OPENAI_MODEL = 'gpt-4.1';

const AI_PROVIDER_STORAGE_KEY = 'forge_ai_provider';
const ANTHROPIC_KEY_STORAGE = 'forge_anthropic_key';
const OPENAI_KEY_STORAGE = 'forge_openai_key';

export type AiCommand = 'probe' | 'east' | 'connect';
export type ChatRole = 'user' | 'assistant';

export interface ChatTurn {
  role: ChatRole;
  content: string;
}

export interface AiStreamCallbacks {
  onToken: (text: string) => void;
  onComplete: (fullText: string) => void;
  onError: (error: string) => void;
}

function keyStorageFor(provider: AiProvider): string {
  return provider === 'openai' ? OPENAI_KEY_STORAGE : ANTHROPIC_KEY_STORAGE;
}

function validProvider(value: unknown): value is AiProvider {
  return value === 'anthropic' || value === 'openai';
}

function providerFromSettingsBlob(): AiProvider | null {
  const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (validProvider(parsed?.aiProvider)) {
      return parsed.aiProvider;
    }
  } catch {
    // ignore
  }
  return null;
}

export function getAiProvider(): AiProvider {
  const direct = localStorage.getItem(AI_PROVIDER_STORAGE_KEY);
  if (validProvider(direct)) {
    return direct;
  }
  return providerFromSettingsBlob() ?? 'anthropic';
}

export function setAiProvider(provider: AiProvider): void {
  localStorage.setItem(AI_PROVIDER_STORAGE_KEY, provider);
}

export function providerLabel(provider: AiProvider = getAiProvider()): string {
  return provider === 'openai' ? 'GPT' : 'Claude';
}

export function getApiKey(provider: AiProvider = getAiProvider()): string | null {
  return localStorage.getItem(keyStorageFor(provider));
}

export function setApiKey(key: string, provider: AiProvider = getAiProvider()): void {
  const trimmed = key.trim();
  const storageKey = keyStorageFor(provider);
  if (!trimmed) {
    localStorage.removeItem(storageKey);
    return;
  }
  localStorage.setItem(storageKey, trimmed);
}

export function hasApiKey(provider: AiProvider = getAiProvider()): boolean {
  const key = getApiKey(provider);
  if (!key) return false;
  if (provider === 'anthropic') {
    return key.startsWith('sk-ant-');
  }
  return key.startsWith('sk-');
}

export function missingKeyMessage(provider: AiProvider = getAiProvider()): string {
  if (provider === 'openai') {
    return 'No OpenAI key configured. Open Settings and add your GPT key.';
  }
  return 'No Anthropic key configured. Open Settings and add your Claude key.';
}

async function streamAnthropic(
  systemPrompt: string,
  messages: ChatTurn[],
  callbacks: AiStreamCallbacks,
  abortSignal?: AbortSignal
): Promise<void> {
  const apiKey = getApiKey('anthropic');
  if (!apiKey) {
    callbacks.onError(missingKeyMessage('anthropic'));
    return;
  }

  let fullText = '';

  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 2048,
        stream: true,
        system: systemPrompt,
        messages,
      }),
      signal: abortSignal,
    });

    if (!response.ok) {
      const errBody = await response.text();
      let errMsg = `API error ${response.status}`;
      try {
        const parsed = JSON.parse(errBody);
        errMsg = parsed?.error?.message || errMsg;
      } catch {
        // ignore
      }
      callbacks.onError(errMsg);
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      callbacks.onError('No response stream available');
      return;
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (data === '[DONE]') continue;

        try {
          const event = JSON.parse(data);
          if (event.type === 'content_block_delta' && event.delta?.text) {
            const token = event.delta.text;
            fullText += token;
            callbacks.onToken(token);
          }
        } catch {
          // ignore malformed events
        }
      }
    }

    callbacks.onComplete(fullText);
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      callbacks.onComplete(fullText || '(aborted)');
    } else if (err instanceof Error) {
      callbacks.onError(err.message || 'Unknown error');
    } else {
      callbacks.onError('Unknown error');
    }
  }
}

async function streamOpenAi(
  systemPrompt: string,
  messages: ChatTurn[],
  callbacks: AiStreamCallbacks,
  abortSignal?: AbortSignal
): Promise<void> {
  const apiKey = getApiKey('openai');
  if (!apiKey) {
    callbacks.onError(missingKeyMessage('openai'));
    return;
  }

  let fullText = '';

  try {
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        stream: true,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
      }),
      signal: abortSignal,
    });

    if (!response.ok) {
      const errBody = await response.text();
      let errMsg = `API error ${response.status}`;
      try {
        const parsed = JSON.parse(errBody);
        errMsg = parsed?.error?.message || errMsg;
      } catch {
        // ignore
      }
      callbacks.onError(errMsg);
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      callbacks.onError('No response stream available');
      return;
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (data === '[DONE]') continue;

        try {
          const event = JSON.parse(data);
          const token = event?.choices?.[0]?.delta?.content;
          if (typeof token === 'string' && token.length > 0) {
            fullText += token;
            callbacks.onToken(token);
          }
        } catch {
          // ignore malformed events
        }
      }
    }

    callbacks.onComplete(fullText);
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      callbacks.onComplete(fullText || '(aborted)');
    } else if (err instanceof Error) {
      callbacks.onError(err.message || 'Unknown error');
    } else {
      callbacks.onError('Unknown error');
    }
  }
}

async function streamByProvider(
  provider: AiProvider,
  systemPrompt: string,
  messages: ChatTurn[],
  callbacks: AiStreamCallbacks,
  abortSignal?: AbortSignal
): Promise<void> {
  if (provider === 'openai') {
    await streamOpenAi(systemPrompt, messages, callbacks, abortSignal);
    return;
  }
  await streamAnthropic(systemPrompt, messages, callbacks, abortSignal);
}

/**
 * Run an AI command against a promoted block's content.
 * Streams the response token by token.
 */
export async function runAiCommand(
  command: AiCommand,
  blockContent: string,
  blockType: string,
  systemPrompt: string,
  callbacks: AiStreamCallbacks,
  abortSignal?: AbortSignal,
  workspaceContext?: string
): Promise<void> {
  const userMessage = buildUserMessage(command, blockContent, blockType, workspaceContext);
  await streamByProvider(
    getAiProvider(),
    systemPrompt,
    [{ role: 'user', content: userMessage }],
    callbacks,
    abortSignal
  );
}

export async function runAiChat(
  messages: ChatTurn[],
  systemPrompt: string,
  callbacks: AiStreamCallbacks,
  abortSignal?: AbortSignal
): Promise<void> {
  const sanitized = messages
    .filter((message) => message.content.trim().length > 0)
    .slice(-20);

  await streamByProvider(getAiProvider(), systemPrompt, sanitized, callbacks, abortSignal);
}

function buildUserMessage(
  command: AiCommand,
  content: string,
  blockType: string,
  workspaceContext?: string
): string {
  const prefix = `[Block type: ${blockType.toUpperCase()}]`;
  const workspace = workspaceContext?.trim()
    ? `\n\n[Current note context]\n${workspaceContext.trim()}`
    : '';

  switch (command) {
    case 'probe':
      return `${prefix}\n\nAnalyze this block for structural integrity:\n\n${content}${workspace}`;
    case 'east':
      return `${prefix}\n\nSteelman the strongest objection to this block:\n\n${content}${workspace}`;
    case 'connect':
      return `${prefix}\n\nFind unexpected structural connections from this block to other domains:\n\n${content}${workspace}`;
  }
}
