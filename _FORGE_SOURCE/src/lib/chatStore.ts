import { ChatThread, ChatFolder, PromptSnippet, ChatMessage } from './types';

const THREADS_KEY = 'forge_chat_threads_v1';
const FOLDERS_KEY = 'forge_chat_folders_v1';
const SNIPPETS_KEY = 'forge_prompt_snippets_v1';
const ACTIVE_THREAD_KEY = 'forge_active_thread_v1';

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function save(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value));
}

// ─── Threads ────────────────────────────────────────────────────

export function getThreads(): ChatThread[] {
  return load<ChatThread[]>(THREADS_KEY, []);
}

export function getThread(id: string): ChatThread | undefined {
  return getThreads().find((t) => t.id === id);
}

export function createThread(title?: string): ChatThread {
  const thread: ChatThread = {
    id: uid(),
    title: title || 'New Chat',
    folderId: null,
    pinned: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    messages: [],
  };
  const threads = getThreads();
  threads.unshift(thread);
  save(THREADS_KEY, threads);
  return thread;
}

export function updateThread(id: string, patch: Partial<Omit<ChatThread, 'id'>>): ChatThread | null {
  const threads = getThreads();
  const idx = threads.findIndex((t) => t.id === id);
  if (idx === -1) return null;
  threads[idx] = { ...threads[idx], ...patch, updatedAt: Date.now() };
  save(THREADS_KEY, threads);
  return threads[idx];
}

export function appendMessage(threadId: string, msg: ChatMessage): ChatThread | null {
  const threads = getThreads();
  const idx = threads.findIndex((t) => t.id === threadId);
  if (idx === -1) return null;
  threads[idx].messages.push(msg);
  threads[idx].updatedAt = Date.now();
  // Auto-title from first user message
  if (threads[idx].title === 'New Chat' && msg.role === 'user') {
    threads[idx].title = msg.content.slice(0, 60).replace(/\n/g, ' ');
  }
  save(THREADS_KEY, threads);
  return threads[idx];
}

export function deleteThread(id: string): void {
  save(THREADS_KEY, getThreads().filter((t) => t.id !== id));
}

export function togglePin(id: string): void {
  const threads = getThreads();
  const t = threads.find((t) => t.id === id);
  if (t) {
    t.pinned = !t.pinned;
    save(THREADS_KEY, threads);
  }
}

export function moveThreadToFolder(threadId: string, folderId: string | null): void {
  updateThread(threadId, { folderId });
}

// ─── Active Thread ──────────────────────────────────────────────

export function getActiveThreadId(): string | null {
  return localStorage.getItem(ACTIVE_THREAD_KEY);
}

export function setActiveThreadId(id: string | null): void {
  if (id) localStorage.setItem(ACTIVE_THREAD_KEY, id);
  else localStorage.removeItem(ACTIVE_THREAD_KEY);
}

// ─── Folders ────────────────────────────────────────────────────

export function getFolders(): ChatFolder[] {
  return load<ChatFolder[]>(FOLDERS_KEY, []);
}

export function createFolder(name: string): ChatFolder {
  const folders = getFolders();
  const folder: ChatFolder = { id: uid(), name, order: folders.length };
  folders.push(folder);
  save(FOLDERS_KEY, folders);
  return folder;
}

export function renameFolder(id: string, name: string): void {
  const folders = getFolders();
  const f = folders.find((f) => f.id === id);
  if (f) {
    f.name = name;
    save(FOLDERS_KEY, folders);
  }
}

export function deleteFolder(id: string): void {
  save(FOLDERS_KEY, getFolders().filter((f) => f.id !== id));
  // Move threads from deleted folder to unfiled
  const threads = getThreads();
  threads.forEach((t) => {
    if (t.folderId === id) t.folderId = null;
  });
  save(THREADS_KEY, threads);
}

export function reorderFolders(folders: ChatFolder[]): void {
  save(FOLDERS_KEY, folders);
}

// ─── Snippets ───────────────────────────────────────────────────

const DEFAULT_SNIPPETS: Omit<PromptSnippet, 'id'>[] = [
  { title: 'Summarize in 5 bullets', content: 'Summarize this note in 5 bullets', tags: ['summary'], order: 0 },
  { title: 'Find contradictions', content: 'Find contradictions in current note', tags: ['logic'], order: 1 },
  { title: 'Link to Master Equation', content: 'Link this to the Master Equation', tags: ['link'], order: 2 },
  { title: 'Extract definitions', content: 'Extract canonical definitions', tags: ['definitions'], order: 3 },
  { title: 'Sermon outline', content: 'Build a sermon outline from this section', tags: ['sermon'], order: 4 },
  { title: 'Stanford sources', content: 'Find Stanford Encyclopedia sources', tags: ['research'], order: 5 },
  { title: 'Formal axiom', content: 'Turn this into a formal axiom', tags: ['logic'], order: 6 },
  { title: 'Generate links', content: 'Generate outgoing and incoming links', tags: ['link'], order: 7 },
];

export function getSnippets(): PromptSnippet[] {
  const snippets = load<PromptSnippet[]>(SNIPPETS_KEY, []);
  if (snippets.length === 0) {
    // Seed defaults on first run
    const seeded = DEFAULT_SNIPPETS.map((s, i) => ({ ...s, id: uid() + i }));
    save(SNIPPETS_KEY, seeded);
    return seeded;
  }
  return snippets;
}

export function createSnippet(title: string, content: string, tags: string[] = []): PromptSnippet {
  const snippets = getSnippets();
  const snippet: PromptSnippet = { id: uid(), title, content, tags, order: snippets.length };
  snippets.push(snippet);
  save(SNIPPETS_KEY, snippets);
  return snippet;
}

export function updateSnippet(id: string, patch: Partial<Omit<PromptSnippet, 'id'>>): void {
  const snippets = getSnippets();
  const s = snippets.find((s) => s.id === id);
  if (s) {
    Object.assign(s, patch);
    save(SNIPPETS_KEY, snippets);
  }
}

export function deleteSnippet(id: string): void {
  save(SNIPPETS_KEY, getSnippets().filter((s) => s.id !== id));
}

export function reorderSnippets(snippets: PromptSnippet[]): void {
  save(SNIPPETS_KEY, snippets);
}
