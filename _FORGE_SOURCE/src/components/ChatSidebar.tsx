import { useState, useEffect } from 'react';
import { Pin, PinOff, Trash2, FolderPlus, MessageSquarePlus, ChevronRight, ChevronDown, FolderOpen } from 'lucide-react';
import { ChatThread, ChatFolder } from '../lib/types';
import * as store from '../lib/chatStore';

interface ChatSidebarProps {
  searchQuery: string;
  onSelectThread: (threadId: string) => void;
  activeThreadId: string | null;
}

const ChatSidebar = ({ searchQuery, onSelectThread, activeThreadId }: ChatSidebarProps) => {
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [folders, setFolders] = useState<ChatFolder[]>([]);
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set());

  const refresh = () => {
    setThreads(store.getThreads());
    setFolders(store.getFolders());
  };

  useEffect(() => {
    refresh();
  }, []);

  const filtered = threads.filter((t) =>
    t.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pinned = filtered.filter((t) => t.pinned);
  const unfiled = filtered.filter((t) => !t.pinned && !t.folderId);

  const handleNewChat = () => {
    const thread = store.createThread();
    store.setActiveThreadId(thread.id);
    onSelectThread(thread.id);
    refresh();
  };

  const handleNewFolder = () => {
    const name = prompt('Folder name:');
    if (!name?.trim()) return;
    store.createFolder(name.trim());
    refresh();
  };

  const handleDelete = (id: string) => {
    store.deleteThread(id);
    if (activeThreadId === id) {
      store.setActiveThreadId(null);
      onSelectThread('');
    }
    refresh();
  };

  const handleTogglePin = (id: string) => {
    store.togglePin(id);
    refresh();
  };

  const handleDeleteFolder = (id: string) => {
    store.deleteFolder(id);
    refresh();
  };

  const toggleCollapse = (folderId: string) => {
    setCollapsedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  };

  const ThreadItem = ({ thread }: { thread: ChatThread }) => {
    const isActive = thread.id === activeThreadId;
    return (
      <div
        className={`group flex items-center gap-1 rounded border px-2 py-1.5 text-[11px] cursor-pointer transition-colors ${
          isActive
            ? 'border-forge-ember/40 bg-forge-ember/10 text-forge-ember'
            : 'border-forge-steel text-gray-400 hover:border-gray-600 hover:text-gray-200'
        }`}
        onClick={() => {
          store.setActiveThreadId(thread.id);
          onSelectThread(thread.id);
        }}
      >
        <span className="flex-1 truncate">{thread.title}</span>
        <button
          onClick={(e) => { e.stopPropagation(); handleTogglePin(thread.id); }}
          className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-forge-ember transition-all cursor-pointer"
          title={thread.pinned ? 'Unpin' : 'Pin'}
        >
          {thread.pinned ? <PinOff size={10} /> : <Pin size={10} />}
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); handleDelete(thread.id); }}
          className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all cursor-pointer"
          title="Delete"
        >
          <Trash2 size={10} />
        </button>
      </div>
    );
  };

  return (
    <div className="p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-widest text-gray-500">Chat Threads</span>
        <div className="flex items-center gap-1">
          <button onClick={handleNewFolder} className="text-gray-500 hover:text-forge-ember cursor-pointer" title="New folder">
            <FolderPlus size={12} />
          </button>
          <button onClick={handleNewChat} className="text-gray-500 hover:text-forge-ember cursor-pointer" title="New chat">
            <MessageSquarePlus size={12} />
          </button>
        </div>
      </div>

      {pinned.length > 0 && (
        <div className="space-y-1">
          <span className="text-[9px] uppercase tracking-widest text-gray-600 flex items-center gap-1">
            <Pin size={8} /> Pinned
          </span>
          {pinned.map((t) => <ThreadItem key={t.id} thread={t} />)}
        </div>
      )}

      {folders.map((folder) => {
        const folderThreads = filtered.filter((t) => !t.pinned && t.folderId === folder.id);
        const collapsed = collapsedFolders.has(folder.id);
        return (
          <div key={folder.id} className="space-y-1">
            <div className="flex items-center gap-1 text-[10px] text-gray-500">
              <button onClick={() => toggleCollapse(folder.id)} className="cursor-pointer hover:text-gray-300">
                {collapsed ? <ChevronRight size={10} /> : <ChevronDown size={10} />}
              </button>
              <FolderOpen size={10} />
              <span className="flex-1 truncate">{folder.name}</span>
              <span className="text-[9px] text-gray-600">{folderThreads.length}</span>
              <button
                onClick={() => handleDeleteFolder(folder.id)}
                className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 cursor-pointer"
                title="Delete folder"
              >
                <Trash2 size={9} />
              </button>
            </div>
            {!collapsed && folderThreads.map((t) => <ThreadItem key={t.id} thread={t} />)}
          </div>
        );
      })}

      {unfiled.length > 0 && (
        <div className="space-y-1">
          {folders.length > 0 && (
            <span className="text-[9px] uppercase tracking-widest text-gray-600">Unfiled</span>
          )}
          {unfiled.map((t) => <ThreadItem key={t.id} thread={t} />)}
        </div>
      )}

      {filtered.length === 0 && (
        <p className="text-[11px] text-gray-600">
          {threads.length === 0 ? 'No chats yet. Start a new one!' : 'No chats match this search.'}
        </p>
      )}
    </div>
  );
};

export default ChatSidebar;
