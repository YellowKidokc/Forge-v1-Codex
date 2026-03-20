import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit3, X, Check } from 'lucide-react';
import { PromptSnippet } from '../lib/types';
import * as store from '../lib/chatStore';

interface PromptSnippetsProps {
  searchQuery: string;
  onUseSnippet: (content: string) => void;
}

const PromptSnippets = ({ searchQuery, onUseSnippet }: PromptSnippetsProps) => {
  const [snippets, setSnippets] = useState<PromptSnippet[]>([]);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formTags, setFormTags] = useState('');

  const refresh = () => setSnippets(store.getSnippets());

  useEffect(() => {
    refresh();
  }, []);

  const filtered = snippets.filter(
    (s) =>
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreate = () => {
    if (!formTitle.trim() || !formContent.trim()) return;
    store.createSnippet(
      formTitle.trim(),
      formContent.trim(),
      formTags.split(',').map((t) => t.trim()).filter(Boolean)
    );
    resetForm();
    refresh();
  };

  const handleUpdate = (id: string) => {
    if (!formTitle.trim() || !formContent.trim()) return;
    store.updateSnippet(id, {
      title: formTitle.trim(),
      content: formContent.trim(),
      tags: formTags.split(',').map((t) => t.trim()).filter(Boolean),
    });
    resetForm();
    refresh();
  };

  const handleDelete = (id: string) => {
    store.deleteSnippet(id);
    refresh();
  };

  const startEdit = (snippet: PromptSnippet) => {
    setEditingId(snippet.id);
    setFormTitle(snippet.title);
    setFormContent(snippet.content);
    setFormTags(snippet.tags.join(', '));
    setCreating(false);
  };

  const resetForm = () => {
    setCreating(false);
    setEditingId(null);
    setFormTitle('');
    setFormContent('');
    setFormTags('');
  };

  const SnippetForm = ({ onSubmit }: { onSubmit: () => void }) => (
    <div className="space-y-2 rounded border border-forge-ember/30 bg-black/20 p-2">
      <input
        value={formTitle}
        onChange={(e) => setFormTitle(e.target.value)}
        placeholder="Title"
        className="w-full bg-black/30 border border-forge-steel rounded px-2 py-1 text-xs text-white outline-none focus:border-forge-ember/50"
        autoFocus
      />
      <textarea
        value={formContent}
        onChange={(e) => setFormContent(e.target.value)}
        placeholder="Prompt content..."
        rows={2}
        className="w-full bg-black/30 border border-forge-steel rounded px-2 py-1 text-xs text-white outline-none focus:border-forge-ember/50 resize-none"
      />
      <input
        value={formTags}
        onChange={(e) => setFormTags(e.target.value)}
        placeholder="Tags (comma-separated)"
        className="w-full bg-black/30 border border-forge-steel rounded px-2 py-1 text-[10px] text-gray-400 outline-none focus:border-forge-ember/50"
      />
      <div className="flex gap-1 justify-end">
        <button onClick={resetForm} className="text-[10px] px-2 py-1 text-gray-500 hover:text-gray-300 cursor-pointer">
          <X size={10} />
        </button>
        <button onClick={onSubmit} className="text-[10px] px-2 py-1 rounded border border-forge-ember/40 text-forge-ember hover:bg-forge-ember/10 cursor-pointer flex items-center gap-1">
          <Check size={10} /> Save
        </button>
      </div>
    </div>
  );

  return (
    <div className="p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-widest text-gray-500">Prompt Library</span>
        <button
          onClick={() => { resetForm(); setCreating(true); }}
          className="text-[10px] px-2 py-1 rounded border border-forge-steel text-gray-400 hover:text-forge-ember cursor-pointer flex items-center gap-1"
        >
          <Plus size={10} /> Add
        </button>
      </div>

      {creating && <SnippetForm onSubmit={handleCreate} />}

      {filtered.map((snippet) => (
        <div key={snippet.id}>
          {editingId === snippet.id ? (
            <SnippetForm onSubmit={() => handleUpdate(snippet.id)} />
          ) : (
            <div className="rounded border border-forge-steel bg-black/10 px-2 py-2 group">
              <div className="text-xs text-gray-200 font-medium">{snippet.title}</div>
              <div className="text-[11px] text-gray-500 mt-0.5 line-clamp-2">{snippet.content}</div>
              {snippet.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {snippet.tags.map((tag) => (
                    <span key={tag} className="text-[9px] px-1 py-0.5 rounded bg-forge-steel/50 text-gray-500">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              <div className="mt-2 flex justify-end gap-1">
                <button
                  onClick={() => startEdit(snippet)}
                  className="opacity-0 group-hover:opacity-100 text-[10px] px-1.5 py-0.5 text-gray-500 hover:text-forge-ember cursor-pointer transition-all"
                >
                  <Edit3 size={10} />
                </button>
                <button
                  onClick={() => handleDelete(snippet.id)}
                  className="opacity-0 group-hover:opacity-100 text-[10px] px-1.5 py-0.5 text-gray-500 hover:text-red-400 cursor-pointer transition-all"
                >
                  <Trash2 size={10} />
                </button>
                <button
                  onClick={() => onUseSnippet(snippet.content)}
                  className="text-[10px] px-2 py-1 rounded border border-forge-steel text-gray-400 hover:text-forge-ember cursor-pointer"
                >
                  Use now
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      {filtered.length === 0 && !creating && (
        <p className="text-[11px] text-gray-600">No prompts match this search.</p>
      )}
    </div>
  );
};

export default PromptSnippets;
